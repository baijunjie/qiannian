/* ============ 千年 · 渲染（2.5D 等距视角） ============ */

const TILE_HW = 32; // 半宽
const TILE_HH = 16; // 半高

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 世界坐标(格) → 屏幕坐标(px)
function worldToScreen(x, y) {
  return {
    x: (x - y) * TILE_HW - G.camX + canvas.width / 2,
    y: (x + y) * TILE_HH - G.camY + canvas.height / 2,
  };
}
function screenToWorld(sx, sy) {
  const rx = sx - canvas.width / 2 + G.camX;
  const ry = sy - canvas.height / 2 + G.camY;
  return { x: (rx / TILE_HW + ry / TILE_HH) / 2, y: (ry / TILE_HH - rx / TILE_HW) / 2 };
}

// 简单坐标哈希（地表颜色微变化）
function tileHash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

/* ---------- 地表 ---------- */
const GRASS_COLORS = ['#4a6b35', '#46662f', '#507238', '#43622e'];
const PATH_COLORS = ['#8a744e', '#84704a', '#907a52'];

function drawTileDiamond(sx, sy, color) {
  ctx.beginPath();
  ctx.moveTo(sx, sy - TILE_HH);
  ctx.lineTo(sx + TILE_HW, sy);
  ctx.lineTo(sx, sy + TILE_HH);
  ctx.lineTo(sx - TILE_HW, sy);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawGround(map) {
  const margin = 2;
  for (let y = 0; y < map.h; y++) {
    for (let x = 0; x < map.w; x++) {
      const s = worldToScreen(x, y);
      if (s.x < -TILE_HW * margin || s.x > canvas.width + TILE_HW * margin ||
          s.y < -TILE_HH * 4 || s.y > canvas.height + TILE_HH * 4) continue;
      const g = map.ground[y * map.w + x];
      const h = tileHash(x, y);
      let color;
      if (g === T_WATER) {
        const wave = Math.sin(G.now / 600 + x * 0.7 + y * 1.3) * 8;
        color = `rgb(${40 + wave | 0}, ${80 + wave | 0}, ${130 + wave | 0})`;
      } else if (g === T_PATH) {
        color = PATH_COLORS[(h * PATH_COLORS.length) | 0];
      } else {
        color = GRASS_COLORS[(h * GRASS_COLORS.length) | 0];
      }
      drawTileDiamond(s.x, s.y, color);
      // 草地小点缀
      if (g === T_GRASS && h > 0.82) {
        ctx.fillStyle = 'rgba(120,160,80,.5)';
        ctx.fillRect(s.x - 6 + h * 10, s.y - 3, 2, 4);
        ctx.fillRect(s.x + 4 - h * 6, s.y + 2, 2, 3);
      }
    }
  }
}

/* ---------- 传送点 ---------- */
function drawPortal(p) {
  const s = worldToScreen(p.x, p.y);
  const pulse = 0.6 + Math.sin(G.now / 300) * 0.25;
  ctx.save();
  ctx.globalAlpha = pulse;
  const grad = ctx.createRadialGradient(s.x, s.y, 2, s.x, s.y, 26);
  grad.addColorStop(0, 'rgba(140,220,255,.9)');
  grad.addColorStop(1, 'rgba(140,220,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(s.x, s.y, 26, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#bfe8ff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('→ ' + p.label, s.x, s.y - 22);
}

/* ---------- 装饰物 ---------- */
function drawTree(d, s) {
  const v = d.variant || 0;
  ctx.fillStyle = '#5a4228';
  ctx.fillRect(s.x - 3, s.y - 26, 6, 26);
  const greens = ['#2e5b28', '#356633', '#28522e'];
  ctx.fillStyle = greens[v];
  ctx.beginPath(); ctx.arc(s.x, s.y - 40, 17, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s.x - 11, s.y - 30, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(s.x + 11, s.y - 31, 13, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath(); ctx.arc(s.x - 4, s.y - 45, 8, 0, Math.PI * 2); ctx.fill();
}

function drawRock(d, s) {
  ctx.fillStyle = '#777f86';
  ctx.beginPath();
  ctx.moveTo(s.x - 14, s.y + 3);
  ctx.lineTo(s.x - 8, s.y - 11);
  ctx.lineTo(s.x + 4, s.y - 14);
  ctx.lineTo(s.x + 13, s.y - 3);
  ctx.lineTo(s.x + 9, s.y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.beginPath();
  ctx.moveTo(s.x - 8, s.y - 11); ctx.lineTo(s.x + 4, s.y - 14); ctx.lineTo(s.x + 2, s.y - 6); ctx.closePath();
  ctx.fill();
}

function drawWell(d, s) {
  ctx.fillStyle = '#6e7478';
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 4, 16, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a3b50';
  ctx.beginPath(); ctx.ellipse(s.x, s.y - 6, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5a4228'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(s.x - 13, s.y - 4); ctx.lineTo(s.x - 13, s.y - 34); ctx.moveTo(s.x + 13, s.y - 4); ctx.lineTo(s.x + 13, s.y - 34); ctx.stroke();
  ctx.fillStyle = '#4a3424';
  ctx.beginPath();
  ctx.moveTo(s.x - 20, s.y - 32); ctx.lineTo(s.x, s.y - 46); ctx.lineTo(s.x + 20, s.y - 32); ctx.closePath();
  ctx.fill();
}

function drawFlag(d, s) {
  ctx.strokeStyle = '#5a4228'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x, s.y - 64); ctx.stroke();
  const wave = Math.sin(G.now / 250) * 3;
  ctx.fillStyle = '#8a2418';
  ctx.beginPath();
  ctx.moveTo(s.x, s.y - 62);
  ctx.quadraticCurveTo(s.x + 14, s.y - 60 + wave, s.x + 28, s.y - 58 + wave);
  ctx.lineTo(s.x + 28, s.y - 40 + wave);
  ctx.quadraticCurveTo(s.x + 14, s.y - 42 + wave, s.x, s.y - 40);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8c878';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillText('千', s.x + 14, s.y - 46 + wave);
}

function drawTent(d, s) {
  ctx.fillStyle = '#6a5238';
  ctx.beginPath();
  ctx.moveTo(s.x - 22, s.y + 4); ctx.lineTo(s.x, s.y - 30); ctx.lineTo(s.x + 22, s.y + 4); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3a2c1c';
  ctx.beginPath();
  ctx.moveTo(s.x - 7, s.y + 3); ctx.lineTo(s.x, s.y - 12); ctx.lineTo(s.x + 7, s.y + 3); ctx.closePath();
  ctx.fill();
}

function drawHouse(d) {
  // 等距房屋：占地 w*h，墙体 + 坡屋顶
  const wallH = 42;
  const c1 = worldToScreen(d.x, d.y);             // 北角
  const c2 = worldToScreen(d.x + d.w, d.y);       // 东角
  const c3 = worldToScreen(d.x + d.w, d.y + d.h); // 南角
  const c4 = worldToScreen(d.x, d.y + d.h);       // 西角
  // 左墙（西南面）
  ctx.fillStyle = '#9a8868';
  ctx.beginPath();
  ctx.moveTo(c4.x, c4.y); ctx.lineTo(c3.x, c3.y);
  ctx.lineTo(c3.x, c3.y - wallH); ctx.lineTo(c4.x, c4.y - wallH);
  ctx.closePath(); ctx.fill();
  // 右墙（东南面）
  ctx.fillStyle = '#857354';
  ctx.beginPath();
  ctx.moveTo(c3.x, c3.y); ctx.lineTo(c2.x, c2.y);
  ctx.lineTo(c2.x, c2.y - wallH); ctx.lineTo(c3.x, c3.y - wallH);
  ctx.closePath(); ctx.fill();
  // 门（朝南墙中央）
  const doorX = (c4.x + c3.x) / 2, doorY = (c4.y + c3.y) / 2;
  ctx.fillStyle = '#3a2c1c';
  ctx.fillRect(doorX - 8, doorY - wallH + 12, 16, wallH - 14);
  // 屋顶（双坡）
  const ridge1 = { x: (c1.x + c4.x) / 2, y: (c1.y + c4.y) / 2 - wallH - 22 };
  const ridge2 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 - wallH - 22 };
  const roof = d.roofColor || '#5a4a32';
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(c4.x - 6, c4.y - wallH + 4); ctx.lineTo(c3.x + 2, c3.y - wallH + 8);
  ctx.lineTo(ridge2.x, ridge2.y); ctx.lineTo(ridge1.x, ridge1.y);
  ctx.closePath(); ctx.fill();
  // 屋顶亮面
  ctx.fillStyle = shadeColor(roof, 28);
  ctx.beginPath();
  ctx.moveTo(c1.x + 2, c1.y - wallH + 2); ctx.lineTo(c2.x + 6, c2.y - wallH + 4);
  ctx.lineTo(ridge2.x, ridge2.y); ctx.lineTo(ridge1.x, ridge1.y);
  ctx.closePath(); ctx.fill();
  // 匾额
  if (d.label) {
    ctx.fillStyle = 'rgba(20,14,8,.85)';
    const lw = d.label.length * 14 + 14;
    ctx.fillRect(doorX - lw / 2, doorY - wallH - 8, lw, 18);
    ctx.strokeStyle = '#c9a256'; ctx.lineWidth = 1;
    ctx.strokeRect(doorX - lw / 2, doorY - wallH - 8, lw, 18);
    ctx.fillStyle = '#e8c878';
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(d.label, doorX, doorY - wallH + 5);
  }
}

function shadeColor(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt), g = Math.min(255, ((n >> 8) & 255) + amt), b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/* ---------- 人物绘制 ---------- */
function drawShadow(s, w) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(s.x, s.y, w, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}

// 通用人形：robe 衣色, skin 肤色, hair 发型, weapon 武器类型
function drawHumanoid(ent, s, opt) {
  const t = G.now / 1000;
  const facing = Math.cos(ent.dir) >= 0 ? 1 : -1; // 朝右/朝左
  const bob = ent.moving ? Math.sin(t * 12 + (ent.eid || 0)) * 1.5 : 0;
  const legSwing = ent.moving ? Math.sin(t * 12 + (ent.eid || 0)) * 5 : 0;
  const scale = opt.scale || 1;
  const swing = ent.swingT > 0 ? (1 - ent.swingT / 280) : 0; // 攻击挥动 0→1

  ctx.save();
  ctx.translate(s.x, s.y + bob);
  ctx.scale(scale * facing, scale);

  drawShadowLocal(0, 0, 11);
  // 腿
  ctx.strokeStyle = opt.pants || '#2a2a32'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-3 - legSwing * 0.5, -1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(3 + legSwing * 0.5, -1); ctx.stroke();
  // 袍身
  ctx.fillStyle = opt.robe;
  ctx.beginPath();
  ctx.moveTo(-8, -13); ctx.lineTo(8, -13); ctx.lineTo(6, -30); ctx.lineTo(-6, -30);
  ctx.closePath(); ctx.fill();
  // 腰带
  ctx.fillStyle = opt.belt || '#c9a256';
  ctx.fillRect(-7, -20, 14, 3);
  // 手臂（持武器手随攻击挥动）
  ctx.strokeStyle = opt.robe; ctx.lineWidth = 4;
  const armAng = swing > 0 ? (-1.2 + swing * 1.8) : (ent.moving ? Math.sin(t * 12) * 0.4 : 0.25);
  ctx.beginPath(); ctx.moveTo(5, -27); ctx.lineTo(5 + Math.cos(armAng) * 9, -27 + Math.sin(armAng) * 9); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-5, -27); ctx.lineTo(-8, -19); ctx.stroke();
  const hx = 5 + Math.cos(armAng) * 9, hy = -27 + Math.sin(armAng) * 9;
  // 武器
  if (opt.weapon === 'sword') {
    ctx.strokeStyle = '#d8dde2'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(armAng - 0.5) * 22, hy + Math.sin(armAng - 0.5) * 22); ctx.stroke();
    ctx.strokeStyle = '#8a6a30'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(armAng - 0.5) * 5, hy - Math.sin(armAng - 0.5) * 5); ctx.stroke();
  } else if (opt.weapon === 'blade') {
    ctx.strokeStyle = opt.bladeColor || '#c8d0d8'; ctx.lineWidth = 5; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + Math.cos(armAng - 0.5) * 20, hy + Math.sin(armAng - 0.5) * 20); ctx.stroke();
    ctx.lineCap = 'round';
  }
  // 头
  ctx.fillStyle = opt.skin || '#e8c8a0';
  ctx.beginPath(); ctx.arc(0, -36, 7, 0, Math.PI * 2); ctx.fill();
  // 发髻 / 头巾
  if (opt.headband) {
    ctx.fillStyle = opt.headband;
    ctx.fillRect(-7, -41, 14, 4);
  } else {
    ctx.fillStyle = '#1a1410';
    ctx.beginPath(); ctx.arc(0, -40, 6, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -44, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawShadowLocal(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}

/* ---------- 怪物绘制 ---------- */
function drawWolf(m, s) {
  const t = G.now / 1000;
  const facing = Math.cos(m.dir) >= 0 ? 1 : -1;
  const run = m.moving ? Math.sin(t * 14 + m.eid) * 3 : 0;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(facing, 1);
  drawShadowLocal(0, 0, 13);
  ctx.fillStyle = m.hitFlash > 0 ? '#d88' : '#787a80';
  // 身体
  ctx.beginPath(); ctx.ellipse(0, -10, 14, 7, 0, 0, Math.PI * 2); ctx.fill();
  // 腿
  ctx.strokeStyle = '#5a5c62'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-8, -6); ctx.lineTo(-8 - run, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(8, -6); ctx.lineTo(8 + run, 0); ctx.stroke();
  // 头
  ctx.fillStyle = m.hitFlash > 0 ? '#d88' : '#84868c';
  ctx.beginPath(); ctx.arc(13, -15, 6, 0, Math.PI * 2); ctx.fill();
  // 吻部 / 耳朵 / 尾巴
  ctx.beginPath(); ctx.moveTo(17, -16); ctx.lineTo(23, -13); ctx.lineTo(17, -11); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, -20); ctx.lineTo(12, -26); ctx.lineTo(14, -20); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#787a80'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-13, -12); ctx.quadraticCurveTo(-20, -16 + run, -22, -22 + run); ctx.stroke();
  // 眼
  ctx.fillStyle = '#e84a3a';
  ctx.beginPath(); ctx.arc(14, -16, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawDeer(m, s) {
  const t = G.now / 1000;
  const facing = Math.cos(m.dir) >= 0 ? 1 : -1;
  const run = m.moving ? Math.sin(t * 12 + m.eid) * 3 : 0;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(facing, 1);
  drawShadowLocal(0, 0, 12);
  ctx.fillStyle = m.hitFlash > 0 ? '#d88' : '#a07848';
  ctx.beginPath(); ctx.ellipse(0, -12, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#86643c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-7, -7); ctx.lineTo(-7 - run, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(7, -7); ctx.lineTo(7 + run, 0); ctx.stroke();
  // 颈和头
  ctx.fillStyle = m.hitFlash > 0 ? '#d88' : '#aa8050';
  ctx.beginPath(); ctx.ellipse(11, -22, 4, 7, 0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(14, -28, 4.5, 0, Math.PI * 2); ctx.fill();
  // 鹿角
  ctx.strokeStyle = '#d8c098'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(13, -32); ctx.lineTo(10, -39); ctx.moveTo(11.5, -35.5); ctx.lineTo(8, -36); ctx.stroke();
  // 白斑
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.beginPath(); ctx.arc(-3, -14, 1.5, 0, Math.PI * 2); ctx.arc(3, -11, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSnake(m, s) {
  const t = G.now / 1000;
  const facing = Math.cos(m.dir) >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(facing, 1);
  drawShadowLocal(0, 0, 12);
  ctx.strokeStyle = m.hitFlash > 0 ? '#d88' : '#3a8a4a';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const px = -14 + i * 2.6;
    const py = -5 + Math.sin(t * 6 + i * 0.9 + m.eid) * 3.5;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  // 头
  ctx.fillStyle = m.hitFlash > 0 ? '#d88' : '#2e7a3e';
  ctx.beginPath(); ctx.ellipse(14, -6 + Math.sin(t * 6 + 9.9 + m.eid) * 3.5, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e8d04a';
  ctx.beginPath(); ctx.arc(16, -8, 1.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMonsterEnt(m, s) {
  switch (m.def.kind) {
    case 'wolf': drawWolf(m, s); break;
    case 'deer': drawDeer(m, s); break;
    case 'snake': drawSnake(m, s); break;
    case 'bandit':
      drawHumanoid(m, s, { robe: m.hitFlash > 0 ? '#b86a5a' : '#6a4a32', headband: '#a02818', weapon: 'blade', bladeColor: '#9aa0a8' });
      break;
    case 'boss':
      drawHumanoid(m, s, { robe: m.hitFlash > 0 ? '#c87a6a' : '#7a2a1e', headband: '#181410', weapon: 'blade', bladeColor: '#5ac8b0', scale: 1.35, belt: '#181410' });
      break;
  }
}

/* ---------- 名字与血条 ---------- */
function drawNameplate(ent, s) {
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  let ny = s.y - 52;
  if (ent.type === 'monster') {
    if (ent.def.kind === 'boss') ny = s.y - 78;
    if (ent.def.kind === 'snake') ny = s.y - 30;
    if (ent.def.kind === 'wolf' || ent.def.kind === 'deer') ny = s.y - 44;
    ctx.fillStyle = ent.def.boss ? '#ffb04a' : (ent.def.aggressive ? '#e87a6a' : '#e8d8a0');
    ctx.fillText(ent.name, s.x, ny);
    if (ent.hp < ent.maxHp || ent === G.target) {
      ctx.fillStyle = 'rgba(0,0,0,.6)';
      ctx.fillRect(s.x - 16, ny + 4, 32, 4);
      ctx.fillStyle = '#d83a2a';
      ctx.fillRect(s.x - 16, ny + 4, 32 * Math.max(0, ent.hp / ent.maxHp), 4);
    }
  } else if (ent.type === 'npc') {
    ctx.fillStyle = '#8ae89a';
    ctx.fillText(ent.name, s.x, s.y - 54);
    const tag = ent.def.role === 'shop' ? '【商】' : '【任务】';
    ctx.fillStyle = '#c9a256';
    ctx.font = '10px sans-serif';
    ctx.fillText(tag, s.x, s.y - 66);
    // 任务提示
    if (ent.def.role === 'quest' && G.questHintFor(ent.def.id)) {
      ctx.fillStyle = '#ffd84a';
      ctx.font = 'bold 16px serif';
      ctx.fillText('！', s.x, s.y - 78 + Math.sin(G.now / 280) * 3);
    }
  } else if (ent.type === 'player') {
    ctx.fillStyle = '#fff';
    ctx.fillText(ent.name, s.x, s.y - 54);
  }
}

/* ---------- 掉落物 ---------- */
function drawDrop(drop, s) {
  const bobY = Math.sin(G.now / 350 + drop.bob) * 2;
  ctx.save();
  ctx.translate(s.x, s.y + bobY - 5);
  if (drop.gold > 0 && !drop.itemId) {
    ctx.fillStyle = '#e8c040';
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#a8842a';
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    const item = ITEMS[drop.itemId];
    drawItemIconAt(ctx, item, -9, -9, 18);
  }
  ctx.restore();
  // 微光
  ctx.fillStyle = 'rgba(255,240,160,.18)';
  ctx.beginPath(); ctx.ellipse(s.x, s.y, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
}

/* ---------- 物品图标（共用，背包/商店也用） ---------- */
function drawItemIconAt(c, item, x, y, size) {
  c.save();
  c.translate(x + size / 2, y + size / 2);
  const r = size / 2;
  switch (item.icon) {
    case 'sword':
      c.strokeStyle = item.color; c.lineWidth = size / 8; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.55, r * 0.55); c.lineTo(r * 0.55, -r * 0.55); c.stroke();
      c.strokeStyle = '#8a6a30'; c.lineWidth = size / 10;
      c.beginPath(); c.moveTo(-r * 0.25, r * 0.7); c.lineTo(-r * 0.62, r * 0.33); c.stroke();
      break;
    case 'blade':
      c.strokeStyle = item.color; c.lineWidth = size / 5; c.lineCap = 'butt';
      c.beginPath(); c.moveTo(-r * 0.5, r * 0.5); c.quadraticCurveTo(r * 0.1, -r * 0.1, r * 0.55, -r * 0.55); c.stroke();
      c.strokeStyle = '#6a4a26'; c.lineWidth = size / 9;
      c.beginPath(); c.moveTo(-r * 0.5, r * 0.5); c.lineTo(-r * 0.7, r * 0.7); c.stroke();
      break;
    case 'fist':
      c.fillStyle = item.color;
      c.beginPath(); c.arc(0, 0, r * 0.45, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5a5a62';
      for (let i = 0; i < 4; i++) c.fillRect(-r * 0.4 + i * r * 0.25, -r * 0.6, r * 0.16, r * 0.3);
      break;
    case 'armor':
      c.fillStyle = item.color;
      c.beginPath();
      c.moveTo(-r * 0.55, -r * 0.5); c.lineTo(r * 0.55, -r * 0.5);
      c.lineTo(r * 0.4, r * 0.6); c.lineTo(-r * 0.4, r * 0.6);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)';
      c.fillRect(-r * 0.1, -r * 0.5, r * 0.2, r * 1.1);
      break;
    case 'potion':
      c.fillStyle = item.color;
      c.beginPath(); c.arc(0, r * 0.15, r * 0.45, 0, Math.PI * 2); c.fill();
      c.fillRect(-r * 0.15, -r * 0.6, r * 0.3, r * 0.4);
      c.fillStyle = '#d8c8a0'; c.fillRect(-r * 0.18, -r * 0.68, r * 0.36, r * 0.15);
      break;
    case 'pill':
      c.fillStyle = item.color;
      c.beginPath(); c.arc(0, 0, r * 0.4, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.4)';
      c.beginPath(); c.arc(-r * 0.12, -r * 0.12, r * 0.13, 0, Math.PI * 2); c.fill();
      break;
    case 'fur':
      c.fillStyle = item.color;
      c.beginPath();
      c.moveTo(-r * 0.55, -r * 0.4); c.quadraticCurveTo(0, -r * 0.7, r * 0.55, -r * 0.4);
      c.quadraticCurveTo(r * 0.4, r * 0.1, r * 0.5, r * 0.55);
      c.quadraticCurveTo(0, r * 0.3, -r * 0.5, r * 0.55);
      c.quadraticCurveTo(-r * 0.4, r * 0.1, -r * 0.55, -r * 0.4);
      c.closePath(); c.fill();
      break;
    case 'horn':
      c.strokeStyle = item.color; c.lineWidth = size / 7; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-r * 0.3, r * 0.55); c.quadraticCurveTo(-r * 0.1, -r * 0.2, r * 0.35, -r * 0.55); c.stroke();
      c.beginPath(); c.moveTo(-r * 0.05, 0); c.lineTo(r * 0.3, -r * 0.05); c.stroke();
      break;
    case 'orb':
      c.fillStyle = item.color;
      c.beginPath(); c.ellipse(0, 0, r * 0.35, r * 0.5, 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.arc(-r * 0.1, -r * 0.18, r * 0.12, 0, Math.PI * 2); c.fill();
      break;
    default:
      c.fillStyle = item.color; c.fillRect(-r * 0.4, -r * 0.4, r * 0.8, r * 0.8);
  }
  c.restore();
}

/* ---------- 特效与飘字 ---------- */
function drawEffects() {
  for (const fx of G.effects) {
    const s = worldToScreen(fx.x, fx.y);
    const p = fx.t / fx.dur; // 0→1
    if (fx.type === 'slash') {
      ctx.save();
      ctx.translate(s.x, s.y - 24);
      ctx.rotate(fx.ang || 0);
      ctx.strokeStyle = `rgba(255,255,255,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + p * 14, -0.7, 0.9);
      ctx.stroke();
      ctx.restore();
    } else if (fx.type === 'heal') {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + fx.seed;
        ctx.fillStyle = `rgba(120,230,140,${1 - p})`;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * 14, s.y - 20 - p * 30 + Math.sin(a + p * 4) * 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (fx.type === 'level') {
      ctx.strokeStyle = `rgba(255,216,74,${1 - p})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 10 + p * 50, (10 + p * 50) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,240,160,${(1 - p) * 0.4})`;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, 10 + p * 40, (10 + p * 40) / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (fx.type === 'hit') {
      ctx.fillStyle = `rgba(255,90,60,${1 - p})`;
      for (let i = 0; i < 4; i++) {
        const a = fx.seed + i * 1.7;
        ctx.beginPath();
        ctx.arc(s.x + Math.cos(a) * p * 22, s.y - 20 + Math.sin(a) * p * 14, 2.5 * (1 - p), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawTexts() {
  for (const tx of G.texts) {
    const s = worldToScreen(tx.x, tx.y);
    const p = tx.t / tx.dur;
    ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
    ctx.font = (tx.crit ? 'bold 20px' : 'bold 15px') + ' sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
    ctx.strokeText(tx.txt, s.x + (tx.ox || 0), s.y - 40 - p * 36);
    ctx.fillStyle = tx.color;
    ctx.fillText(tx.txt, s.x + (tx.ox || 0), s.y - 40 - p * 36);
    ctx.globalAlpha = 1;
  }
}

/* ---------- 主渲染 ---------- */
function render() {
  const map = G.map;
  const p = G.player;
  ctx.fillStyle = '#0a0c08';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!map) return;

  drawGround(map);
  for (const portal of map.portals) drawPortal(portal);

  // 目标圈
  if (G.target && !G.target.dead) {
    const ts = worldToScreen(G.target.x, G.target.y);
    ctx.strokeStyle = 'rgba(232,90,60,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ts.x, ts.y, 18, 9, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // 移动目的地
  if (G.moveMark && G.moveMark.t > 0) {
    const ms = worldToScreen(G.moveMark.x, G.moveMark.y);
    ctx.strokeStyle = `rgba(140,220,255,${G.moveMark.t / 600})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(ms.x, ms.y, 12, 6, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // 收集可排序绘制物
  const drawables = [];
  for (const d of map.decos) drawables.push({ z: (d.x + (d.w ? d.w / 2 : 0)) + (d.y + (d.h ? d.h : 0)), deco: d });
  for (const m of G.monsters) if (!m.dead) drawables.push({ z: m.x + m.y, ent: m });
  for (const n of G.npcs) drawables.push({ z: n.x + n.y, ent: n });
  for (const dr of G.drops) drawables.push({ z: dr.x + dr.y - 0.3, ent: dr });
  if (!p.dead) drawables.push({ z: p.x + p.y, ent: p });
  drawables.sort((a, b) => a.z - b.z);

  for (const item of drawables) {
    if (item.deco) {
      const d = item.deco;
      if (d.type === 'house') { drawHouse(d); continue; }
      const s = worldToScreen(d.x, d.y);
      if (s.x < -80 || s.x > canvas.width + 80 || s.y < -100 || s.y > canvas.height + 60) continue;
      if (d.type === 'tree') drawTree(d, s);
      else if (d.type === 'rock') drawRock(d, s);
      else if (d.type === 'well') drawWell(d, s);
      else if (d.type === 'flag') drawFlag(d, s);
      else if (d.type === 'tent') drawTent(d, s);
    } else {
      const e = item.ent;
      const s = worldToScreen(e.x, e.y);
      if (s.x < -80 || s.x > canvas.width + 80 || s.y < -100 || s.y > canvas.height + 60) continue;
      if (e.type === 'player') {
        drawHumanoid(e, s, {
          robe: e.gender === 'f' ? '#8a3a5a' : '#3a5a8a',
          weapon: weaponKind(e) === 'fist' ? null : weaponKind(e),
          bladeColor: e.equip.weapon === 'qinglong_dao' ? '#5ac8b0' : '#c8d0d8',
        });
        drawNameplate(e, s);
        if (e.qinggong) { // 轻功足下气流
          ctx.strokeStyle = 'rgba(140,220,255,.5)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(s.x, s.y, 14 + Math.sin(G.now / 120) * 3, 6, 0, 0, Math.PI * 2); ctx.stroke();
        }
      } else if (e.type === 'monster') {
        drawMonsterEnt(e, s);
        drawNameplate(e, s);
      } else if (e.type === 'npc') {
        drawHumanoid(e, s, { robe: e.def.color, weapon: null });
        drawNameplate(e, s);
      } else if (e.type === 'drop') {
        drawDrop(e, s);
      }
    }
  }

  drawEffects();
  drawTexts();

  // 昼夜
  const dark = G.darkness();
  if (dark > 0) {
    ctx.fillStyle = `rgba(8,12,40,${dark})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

/* ---------- 小地图 ---------- */
const minimapCanvas = document.getElementById('minimap');
const mmCtx = minimapCanvas.getContext('2d');
let mmBase = null, mmBaseMap = null;

function buildMinimapBase(map) {
  const c = document.createElement('canvas');
  c.width = minimapCanvas.width; c.height = minimapCanvas.height;
  const cc = c.getContext('2d');
  const sx = c.width / map.w, sy = c.height / map.h;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    const g = map.ground[y * map.w + x];
    let color = '#3a5229';
    if (g === T_PATH) color = '#6e5c3e';
    if (g === T_WATER) color = '#2a4a72';
    if (map.blocked[y * map.w + x] && g !== T_WATER) color = '#22301c';
    cc.fillStyle = color;
    cc.fillRect(x * sx, y * sy, sx + 0.5, sy + 0.5);
  }
  return c;
}

function renderMinimap() {
  const map = G.map;
  if (!map) return;
  if (mmBaseMap !== map.id) { mmBase = buildMinimapBase(map); mmBaseMap = map.id; }
  mmCtx.drawImage(mmBase, 0, 0);
  const sx = minimapCanvas.width / map.w, sy = minimapCanvas.height / map.h;
  for (const portal of map.portals) {
    mmCtx.fillStyle = '#8ce0ff';
    mmCtx.fillRect(portal.x * sx - 1, portal.y * sy - 1, 3, 3);
  }
  for (const n of G.npcs) {
    mmCtx.fillStyle = '#6ae87a';
    mmCtx.fillRect(n.x * sx - 1, n.y * sy - 1, 3, 3);
  }
  for (const m of G.monsters) {
    if (m.dead) continue;
    mmCtx.fillStyle = m.def.boss ? '#ffb04a' : '#e85a4a';
    mmCtx.fillRect(m.x * sx - 1, m.y * sy - 1, m.def.boss ? 4 : 2, m.def.boss ? 4 : 2);
  }
  const p = G.player;
  mmCtx.fillStyle = '#ffe84a';
  mmCtx.beginPath(); mmCtx.arc(p.x * sx, p.y * sy, 2.5, 0, Math.PI * 2); mmCtx.fill();
}
