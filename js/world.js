/* ============ 千年 · 世界与地图 ============ */

// 可复现随机数
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 地块类型
const T_GRASS = 0, T_PATH = 1, T_WATER = 2;

function makeEmptyMap(def) {
  const { w, h } = def;
  return {
    id: def.id, name: def.name, w, h, safe: def.safe,
    ground: new Uint8Array(w * h),       // 地表
    blocked: new Uint8Array(w * h),      // 阻挡
    decos: [],                           // 装饰物（树/屋/井…）
    portals: [],                         // 传送点
    spawns: [],                          // 怪物刷新点
    npcs: [],                            // NPC位置
    rng: mulberry32(def.seed),
  };
}

function tileIdx(map, x, y) { return y * map.w + x; }
function inMap(map, x, y) { return x >= 0 && y >= 0 && x < map.w && y < map.h; }
function isBlocked(map, x, y) {
  if (!inMap(map, x, y)) return true;
  return map.blocked[tileIdx(map, x, y)] === 1;
}
function setGround(map, x, y, t) {
  if (!inMap(map, x, y)) return;
  map.ground[tileIdx(map, x, y)] = t;
  if (t === T_WATER) map.blocked[tileIdx(map, x, y)] = 1;
}
function block(map, x, y) { if (inMap(map, x, y)) map.blocked[tileIdx(map, x, y)] = 1; }
function blockRect(map, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) block(map, i, j);
}

function addTree(map, x, y) {
  if (!inMap(map, x, y) || isBlocked(map, x, y)) return;
  map.decos.push({ type: 'tree', x, y, variant: Math.floor(map.rng() * 3) });
  block(map, x, y);
}
function addRock(map, x, y) {
  if (!inMap(map, x, y) || isBlocked(map, x, y)) return;
  map.decos.push({ type: 'rock', x, y, variant: Math.floor(map.rng() * 2) });
  block(map, x, y);
}
// 房屋：占地 w*h，锚点为左上角
function addHouse(map, x, y, w, h, label, roofColor) {
  map.decos.push({ type: 'house', x, y, w, h, label, roofColor });
  blockRect(map, x, y, w, h);
}
function addDeco(map, type, x, y, blockIt) {
  map.decos.push({ type, x, y });
  if (blockIt) block(map, x, y);
}

// 清理区域阻挡（传送点等关键位置），移除树木岩石
function clearArea(map, x, y, r) {
  for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) {
    if (!inMap(map, i, j)) continue;
    const idx = tileIdx(map, i, j);
    if (map.ground[idx] === T_WATER) continue;
    map.blocked[idx] = 0;
  }
  map.decos = map.decos.filter((d) =>
    !((d.type === 'tree' || d.type === 'rock') && Math.abs(d.x - x) <= r && Math.abs(d.y - y) <= r));
}

function drawPathLine(map, x1, y1, x2, y2, width) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let s = 0; s <= steps; s++) {
    const x = Math.round(x1 + (x2 - x1) * s / steps);
    const y = Math.round(y1 + (y2 - y1) * s / steps);
    for (let dy = 0; dy < width; dy++) for (let dx = 0; dx < width; dx++) {
      if (inMap(map, x + dx, y + dy) && map.ground[tileIdx(map, x + dx, y + dy)] !== T_WATER) {
        setGround(map, x + dx, y + dy, T_PATH);
      }
    }
  }
}

/* ---------- 玄菟村 ---------- */
function buildVillage() {
  const map = makeEmptyMap(MAP_DEFS.village);
  const rng = map.rng;

  // 边界树林
  for (let i = 0; i < map.w; i++) {
    for (const j of [0, 1, map.h - 2, map.h - 1]) if (rng() < 0.8) addTree(map, i, j);
  }
  for (let j = 0; j < map.h; j++) {
    for (const i of [0, 1, map.w - 2, map.w - 1]) if (rng() < 0.8) addTree(map, i, j);
  }

  // 村内道路：十字路 + 通向东门
  drawPathLine(map, 4, 15, 30, 15, 2);
  drawPathLine(map, 15, 4, 15, 27, 2);

  // 建筑
  addHouse(map, 5, 7, 5, 4, '王记铁铺', '#7a3a28');
  addHouse(map, 21, 7, 5, 4, '回春药铺', '#3a5a3a');
  addHouse(map, 11, 21, 6, 4, '村长家', '#5a4a32');
  // 水井
  addDeco(map, 'well', 18, 17, true);
  // 旗杆
  addDeco(map, 'flag', 13, 13, true);

  // 池塘
  for (let j = 23; j <= 26; j++) for (let i = 23; i <= 27; i++) {
    if ((i - 25) * (i - 25) + (j - 24.5) * (j - 24.5) < 5) setGround(map, i, j, T_WATER);
  }

  // 零散树木
  for (let n = 0; n < 14; n++) {
    const x = 3 + Math.floor(rng() * 26), y = 3 + Math.floor(rng() * 26);
    const g = map.ground[tileIdx(map, x, y)];
    if (g === T_GRASS && !isBlocked(map, x, y) && Math.abs(x - 15) > 3 && Math.abs(y - 15) > 3) addTree(map, x, y);
  }

  // NPC
  map.npcs.push({ id: 'tiejiang', x: 8, y: 12 });
  map.npcs.push({ id: 'dafu', x: 23, y: 12 });
  map.npcs.push({ id: 'cunzhang', x: 14, y: 20 });

  // 东门传送点
  map.portals.push({ x: 30, y: 15, to: 'wild', tx: 3, ty: 24, label: '城外荒野' });
  map.portals.push({ x: 30, y: 16, to: 'wild', tx: 3, ty: 24, label: '城外荒野' });
  for (const portal of map.portals) clearArea(map, portal.x, portal.y, 1);

  return map;
}

/* ---------- 城外荒野 ---------- */
function buildWild() {
  const map = makeEmptyMap(MAP_DEFS.wild);
  const rng = map.rng;

  // 边界树林
  for (let i = 0; i < map.w; i++) {
    for (const j of [0, 1, map.h - 2, map.h - 1]) if (rng() < 0.85) addTree(map, i, j);
  }
  for (let j = 0; j < map.h; j++) {
    for (const i of [0, 1, map.w - 2, map.w - 1]) if (rng() < 0.85) addTree(map, i, j);
  }

  // 西边入口小路，蜿蜒向东北山寨
  drawPathLine(map, 2, 24, 20, 24, 2);
  drawPathLine(map, 20, 24, 34, 14, 2);
  drawPathLine(map, 34, 14, 38, 10, 2);

  // 湖
  for (let j = 30; j <= 38; j++) for (let i = 8; i <= 17; i++) {
    const d = (i - 12.5) * (i - 12.5) / 1.6 + (j - 34) * (j - 34);
    if (d < 14) setGround(map, i, j, T_WATER);
  }

  // 随机树林与岩石
  for (let n = 0; n < 130; n++) {
    const x = 2 + Math.floor(rng() * (map.w - 4)), y = 2 + Math.floor(rng() * (map.h - 4));
    const g = map.ground[tileIdx(map, x, y)];
    if (g !== T_GRASS || isBlocked(map, x, y)) continue;
    if (x > 32 && y < 16) continue; // 山寨区域留空
    if (rng() < 0.85) addTree(map, x, y); else addRock(map, x, y);
  }

  // 山贼营寨（东北）
  addHouse(map, 36, 4, 5, 3, '山贼寨', '#4a3030');
  addDeco(map, 'tent', 33, 8, true);
  addDeco(map, 'tent', 41, 9, true);
  addDeco(map, 'flag', 35, 10, true);

  // 怪物刷新
  map.spawns.push({ monster: 'deer',  cx: 10, cy: 12, r: 5, n: 5 });
  map.spawns.push({ monster: 'deer',  cx: 22, cy: 34, r: 5, n: 3 });
  map.spawns.push({ monster: 'wolf',  cx: 24, cy: 18, r: 6, n: 6 });
  map.spawns.push({ monster: 'wolf',  cx: 32, cy: 28, r: 5, n: 4 });
  map.spawns.push({ monster: 'snake', cx: 14, cy: 27, r: 4, n: 4 });
  map.spawns.push({ monster: 'bandit', cx: 37, cy: 11, r: 4, n: 5 });
  map.spawns.push({ monster: 'bandit_boss', cx: 38, cy: 9, r: 2, n: 1, respawn: 60000 });

  // 回村传送点
  map.portals.push({ x: 1, y: 24, to: 'village', tx: 28, ty: 15, label: '玄菟村' });
  map.portals.push({ x: 2, y: 24, to: 'village', tx: 28, ty: 15, label: '玄菟村' });
  for (const portal of map.portals) clearArea(map, portal.x, portal.y, 1);

  return map;
}

const MAP_BUILDERS = { village: buildVillage, wild: buildWild };

/* ---------- A* 寻路 ---------- */
function findPath(map, sx, sy, tx, ty, maxNodes) {
  sx = Math.round(sx); sy = Math.round(sy); tx = Math.round(tx); ty = Math.round(ty);
  if (!inMap(map, tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  // 目标被阻挡时，找其最近的可走邻格
  if (isBlocked(map, tx, ty)) {
    let best = null, bd = 1e9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = tx + dx, ny = ty + dy;
      if (isBlocked(map, nx, ny)) continue;
      const d = (nx - sx) * (nx - sx) + (ny - sy) * (ny - sy);
      if (d < bd) { bd = d; best = { x: nx, y: ny }; }
    }
    if (!best) return null;
    tx = best.x; ty = best.y;
    if (sx === tx && sy === ty) return [];
  }

  maxNodes = maxNodes || 2500;
  const open = [{ x: sx, y: sy, g: 0, f: 0, parent: null }];
  const visited = new Map();
  visited.set(sy * map.w + sx, 0);
  let count = 0;

  while (open.length && count < maxNodes) {
    count++;
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (cur.x === tx && cur.y === ty) {
      const path = [];
      let n = cur;
      while (n.parent) { path.push({ x: n.x, y: n.y }); n = n.parent; }
      return path.reverse();
    }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = cur.x + dx, ny = cur.y + dy;
      if (isBlocked(map, nx, ny)) continue;
      // 斜向不允许穿过阻挡角
      if (dx !== 0 && dy !== 0 && (isBlocked(map, cur.x + dx, cur.y) || isBlocked(map, cur.x, cur.y + dy))) continue;
      const g = cur.g + ((dx !== 0 && dy !== 0) ? 1.414 : 1);
      const key = ny * map.w + nx;
      if (visited.has(key) && visited.get(key) <= g) continue;
      visited.set(key, g);
      const h = Math.max(Math.abs(nx - tx), Math.abs(ny - ty));
      open.push({ x: nx, y: ny, g, f: g + h, parent: cur });
    }
  }
  return null;
}

// 在 (cx,cy) 半径 r 内找一个可走格
function randomWalkable(map, cx, cy, r, rngFn) {
  const rand = rngFn || Math.random;
  for (let tries = 0; tries < 30; tries++) {
    const x = Math.round(cx + (rand() * 2 - 1) * r);
    const y = Math.round(cy + (rand() * 2 - 1) * r);
    if (inMap(map, x, y) && !isBlocked(map, x, y)) return { x, y };
  }
  return { x: cx, y: cy };
}
