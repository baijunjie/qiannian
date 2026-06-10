/* ============ 千年 · 实体（玩家/怪物/NPC/掉落物） ============ */

// 沿路径移动，返回是否在移动
function followPath(ent, dt) {
  if (!ent.path || ent.path.length === 0) { ent.moving = false; return false; }
  const wp = ent.path[0];
  const dx = wp.x - ent.x, dy = wp.y - ent.y;
  const dist = Math.hypot(dx, dy);
  const step = ent.speed * dt;
  if (dist <= step) {
    ent.x = wp.x; ent.y = wp.y;
    ent.path.shift();
    if (ent.path.length === 0) { ent.moving = false; return false; }
  } else {
    ent.x += (dx / dist) * step;
    ent.y += (dy / dist) * step;
    ent.dir = Math.atan2(dy, dx);
  }
  ent.moving = true;
  return true;
}

function distBetween(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

/* ---------- 玩家 ---------- */
function createPlayer(name, gender, wskill) {
  const p = {
    type: 'player',
    name, gender,
    level: 1, exp: 0, gold: 200,
    hp: 0, mp: 0,
    x: 15, y: 15, dir: Math.PI / 4, moving: false, path: [],
    map: 'village',
    speed: 3.2,
    equip: { weapon: null, armor: 'cloth' },
    inv: new Array(24).fill(null),
    skills: {
      fist:  { lv: 1, prof: 0 },
      sword: { lv: 1, prof: 0 },
      blade: { lv: 1, prof: 0 },
      inner: { lv: 1, prof: 0 },
    },
    quests: {},          // id -> {state:'active'|'done'|'rewarded', count}
    quickbar: ['potion_s', 'mp_pill', 'heal', 'qinggong'],
    atkTimer: 0,
    combatTimer: 0,      // 脱战计时
    qinggong: false,
    dead: false,
    cooldowns: {},       // 技能/药品冷却
  };
  // 师承武功有初始修为
  p.skills[wskill].lv = 2;
  addItemTo(p, 'potion_s', 5);
  addItemTo(p, 'mp_pill', 3);
  if (wskill === 'sword') addItemTo(p, 'wood_sword', 1);
  if (wskill === 'blade') addItemTo(p, 'chai_dao', 1);
  p.hp = calcMaxHp(p); p.mp = calcMaxMp(p);
  return p;
}

// ----- 属性计算 -----
function calcMaxHp(p) { return 100 + (p.level - 1) * 30; }
function calcMaxMp(p) { return 50 + (p.level - 1) * 15 + (p.skills.inner.lv - 1) * 12; }
function weaponKind(p) {
  const w = p.equip.weapon;
  return w ? ITEMS[w].kind : 'fist';
}
function calcAtk(p) {
  const w = p.equip.weapon;
  const watk = w ? ITEMS[w].atk : 0;
  const skLv = p.skills[weaponKind(p)].lv;
  return 5 + p.level * 2 + watk + skLv * 3;
}
function calcDef(p) {
  const a = p.equip.armor;
  const adef = a ? ITEMS[a].def : 0;
  return Math.floor(p.level * 1.5) + adef + (p.skills.inner.lv - 1);
}

// ----- 背包 -----
function addItemTo(p, itemId, n) {
  n = n || 1;
  const item = ITEMS[itemId];
  if (item.stack) {
    for (const slot of p.inv) {
      if (slot && slot.id === itemId) { slot.n += n; return true; }
    }
  }
  for (let i = 0; i < p.inv.length; i++) {
    if (!p.inv[i]) {
      p.inv[i] = { id: itemId, n: item.stack ? n : 1 };
      if (!item.stack && n > 1) return addItemTo(p, itemId, n - 1);
      return true;
    }
  }
  return false; // 背包已满
}
function removeItemFrom(p, itemId, n) {
  n = n || 1;
  for (let i = 0; i < p.inv.length && n > 0; i++) {
    const slot = p.inv[i];
    if (slot && slot.id === itemId) {
      const take = Math.min(slot.n, n);
      slot.n -= take; n -= take;
      if (slot.n <= 0) p.inv[i] = null;
    }
  }
  return n === 0;
}
function countItem(p, itemId) {
  let c = 0;
  for (const slot of p.inv) if (slot && slot.id === itemId) c += slot.n;
  return c;
}

/* ---------- 怪物 ---------- */
let _entSeq = 1;
function createMonster(monsterId, x, y, spawn) {
  const def = MONSTERS[monsterId];
  return {
    type: 'monster', eid: _entSeq++,
    def, name: def.name,
    x, y, dir: Math.random() * Math.PI * 2, moving: false, path: [],
    hp: def.hp, maxHp: def.hp,
    speed: def.speed,
    spawn,                       // {cx,cy,r,respawn}
    state: 'idle',               // idle | wander | chase | return | dead
    wanderTimer: 1000 + Math.random() * 3000,
    repathTimer: 0,
    atkTimer: 0,
    respawnTimer: 0,
    dead: false,
    hitFlash: 0,
  };
}

function updateMonster(m, dt, map, player, G) {
  if (m.dead) {
    m.respawnTimer -= dt * 1000;
    if (m.respawnTimer <= 0) {
      const pos = randomWalkable(map, m.spawn.cx, m.spawn.cy, m.spawn.r);
      m.x = pos.x; m.y = pos.y;
      m.hp = m.def.hp; m.dead = false; m.state = 'idle';
      m.path = [];
    }
    return;
  }
  if (m.hitFlash > 0) m.hitFlash -= dt * 1000;
  m.atkTimer -= dt * 1000;

  const distPlayer = player.dead ? 1e9 : distBetween(m, player);
  const distSpawn = Math.hypot(m.x - m.spawn.cx, m.y - m.spawn.cy);

  // 超出活动范围 → 返回出生点并回血
  if (m.state === 'chase' && distSpawn > 14) {
    m.state = 'return';
    m.path = findPath(map, m.x, m.y, m.spawn.cx, m.spawn.cy) || [];
  }

  switch (m.state) {
    case 'idle':
    case 'wander': {
      // 主动怪侦测玩家；被攻击的怪（aggroed标记）也会追
      if (!player.dead && ((m.def.aggressive && distPlayer < m.def.aggroR) || (m.aggroed && distPlayer < 10))) {
        m.state = 'chase';
        break;
      }
      m.wanderTimer -= dt * 1000;
      if (m.wanderTimer <= 0) {
        m.wanderTimer = 2500 + Math.random() * 4000;
        const pos = randomWalkable(map, m.spawn.cx, m.spawn.cy, m.spawn.r + 1);
        m.path = findPath(map, m.x, m.y, pos.x, pos.y, 600) || [];
        m.state = 'wander';
      }
      if (!followPath(m, dt)) m.state = 'idle';
      break;
    }
    case 'chase': {
      if (player.dead || distPlayer > 12) {
        m.state = 'return'; m.aggroed = false;
        m.path = findPath(map, m.x, m.y, m.spawn.cx, m.spawn.cy) || [];
        break;
      }
      if (distPlayer <= 1.35) {
        // 攻击
        m.path = []; m.moving = false;
        m.dir = Math.atan2(player.y - m.y, player.x - m.x);
        if (m.atkTimer <= 0) {
          m.atkTimer = m.def.atkCd;
          G.monsterAttack(m);
        }
      } else {
        m.repathTimer -= dt * 1000;
        if (m.repathTimer <= 0 || !m.path || m.path.length === 0) {
          m.repathTimer = 600;
          m.path = findPath(map, m.x, m.y, Math.round(player.x), Math.round(player.y), 900) || [];
        }
        followPath(m, dt);
      }
      break;
    }
    case 'return': {
      if (!followPath(m, dt)) {
        m.state = 'idle';
        m.hp = m.def.hp; // 回满
      }
      break;
    }
  }
}

/* ---------- NPC ---------- */
function createNpc(npcId, x, y) {
  const def = NPCS[npcId];
  return { type: 'npc', eid: _entSeq++, def, name: def.name, x, y, dir: Math.PI / 2, moving: false };
}

/* ---------- 掉落物 ---------- */
function createDrop(x, y, gold, itemId, n) {
  return {
    type: 'drop', eid: _entSeq++,
    x, y, gold: gold || 0, itemId: itemId || null, n: n || 1,
    ttl: 60000, bob: Math.random() * Math.PI * 2,
  };
}
