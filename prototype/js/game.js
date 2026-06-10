/* ============ 千年 · 游戏主逻辑 ============ */

const SAVE_KEY = 'qiannian_save_v1';

const G = {
  running: false,
  player: null,
  world: {},          // mapId -> { map, monsters, npcs, drops }
  map: null, monsters: [], npcs: [], drops: [],
  effects: [], texts: [],
  target: null, pending: null, autoChase: false,
  shopNpc: null,
  camX: 0, camY: 0,
  now: 0, timeMin: 8 * 60,
  moveMark: null,
  keys: {},
  repathTimer: 0,
  saveTimer: 0,
};

/* ---------- 世界与地图 ---------- */
G.ensureWorld = function (id) {
  if (G.world[id]) return G.world[id];
  const map = MAP_BUILDERS[id]();
  const monsters = [];
  for (const sp of map.spawns) {
    for (let i = 0; i < sp.n; i++) {
      const pos = randomWalkable(map, sp.cx, sp.cy, sp.r);
      monsters.push(createMonster(sp.monster, pos.x, pos.y, { cx: sp.cx, cy: sp.cy, r: sp.r, respawn: sp.respawn }));
    }
  }
  const npcs = map.npcs.map((n) => createNpc(n.id, n.x, n.y));
  G.world[id] = { map, monsters, npcs, drops: [] };
  return G.world[id];
};

G.switchMap = function (id, x, y) {
  const w = G.ensureWorld(id);
  G.map = w.map; G.monsters = w.monsters; G.npcs = w.npcs; G.drops = w.drops;
  const p = G.player;
  p.map = id; p.x = x; p.y = y; p.path = []; p.moving = false;
  G.target = null; G.pending = null; G.autoChase = false;
  UI.closeDialog(); UI.closeWindow('win-shop');
  UI.log('—— 来到了【' + w.map.name + '】——', 'sys');
};

/* ---------- 时辰昼夜 ---------- */
G.darkness = function () {
  const h = (G.timeMin / 60) % 24;
  const MAXD = 0.42;
  if (h >= 6 && h < 17) return 0;
  if (h >= 17 && h < 19.5) return (h - 17) / 2.5 * MAXD;
  if (h >= 4.5 && h < 6) return (6 - h) / 1.5 * MAXD;
  return MAXD;
};

/* ---------- 任务 ---------- */
G.questAvailable = function (qid) {
  const q = QUESTS[qid], p = G.player;
  if (p.quests[qid]) return false;
  if (q.require && (!p.quests[q.require] || p.quests[q.require].state !== 'rewarded')) return false;
  return true;
};
G.questHintFor = function (npcId) {
  const p = G.player;
  if (!p) return false;
  for (const qid in QUESTS) {
    const q = QUESTS[qid];
    if (q.giver !== npcId) continue;
    if (G.questAvailable(qid)) return true;
    const st = p.quests[qid];
    if (st && st.state === 'active' && st.count >= q.targetCount) return true;
  }
  return false;
};
G.onMonsterKilled = function (monsterId) {
  const p = G.player;
  for (const qid in p.quests) {
    const st = p.quests[qid];
    if (st.state !== 'active') continue;
    const q = QUESTS[qid];
    if (q.targetMonster !== monsterId || st.count >= q.targetCount) continue;
    st.count++;
    UI.log(`【${q.name}】${MONSTERS[monsterId].name} ${st.count}/${q.targetCount}`, 'gain');
    if (st.count >= q.targetCount) UI.log(`【${q.name}】已完成，回去找村长复命吧！`, 'sys');
    if (!$('win-quest').classList.contains('hidden')) UI.renderQuests();
  }
};

/* ---------- NPC 对话 ---------- */
G.talkToNpc = function (npc) {
  const p = G.player;
  p.path = []; p.moving = false;
  p.dir = Math.atan2(npc.y - p.y, npc.x - p.x);
  const def = npc.def;
  const options = [];

  // 任务选项
  for (const qid in QUESTS) {
    const q = QUESTS[qid];
    if (q.giver !== def.id) continue;
    const st = p.quests[qid];
    if (G.questAvailable(qid)) {
      options.push({
        label: `打听【${q.name}】`,
        fn: () => {
          UI.showDialog(def.name, q.accept, [
            { label: '义不容辞！（接受任务）', fn: () => {
              p.quests[qid] = { state: 'active', count: 0 };
              UI.log(`接受了任务【${q.name}】`, 'sys');
              UI.closeDialog();
            } },
            { label: '容我再想想', fn: UI.closeDialog },
          ]);
        },
      });
    } else if (st && st.state === 'active') {
      if (st.count >= q.targetCount) {
        options.push({
          label: `交还【${q.name}】`,
          fn: () => {
            st.state = 'rewarded';
            p.gold += q.reward.gold;
            for (const it of q.reward.items) addItemTo(p, it.id, it.n);
            UI.sfx('coin');
            UI.log(`完成任务【${q.name}】：获得 ${q.reward.gold} 两、经验 ${q.reward.exp}`, 'gain');
            G.gainExp(q.reward.exp);
            UI.showDialog(def.name, q.complete, [{ label: '告辞', fn: UI.closeDialog }]);
          },
        });
      } else {
        options.push({
          label: `【${q.name}】（进行中）`,
          fn: () => UI.showDialog(def.name, q.progress, [{ label: '告辞', fn: UI.closeDialog }]),
        });
      }
    }
  }

  if (def.role === 'shop') {
    options.push({ label: '看看货物', fn: () => { UI.closeDialog(); UI.openShop(npc); } });
  }
  if (def.canHeal) {
    options.push({
      label: '请大夫疗伤（免费）',
      fn: () => {
        p.hp = calcMaxHp(p); p.mp = calcMaxMp(p);
        UI.sfx('heal');
        G.addEffect('heal', p.x, p.y);
        UI.showDialog(def.name, '行气活血，已无大碍。江湖险恶，多加保重。', [{ label: '多谢大夫', fn: UI.closeDialog }]);
      },
    });
  }
  options.push({ label: '告辞', fn: UI.closeDialog });
  UI.showDialog(def.name, def.greeting, options);
};

/* ---------- 物品 ---------- */
G.refreshWindows = function () {
  if (!$('win-bag').classList.contains('hidden')) UI.renderBag();
  if (!$('win-char').classList.contains('hidden')) UI.renderChar();
  if (!$('win-skill').classList.contains('hidden')) UI.renderSkills();
};

G.useBagSlot = function (i) {
  const p = G.player;
  const slot = p.inv[i];
  if (!slot) return;
  const item = ITEMS[slot.id];

  // 商店打开时 → 出售
  if (G.shopNpc) {
    const price = Math.floor(item.price / 2);
    slot.n--; if (slot.n <= 0) p.inv[i] = null;
    p.gold += price;
    UI.sfx('coin');
    UI.log(`卖出 ${item.name}，得 ${price} 两`, 'gain');
    UI.hideTooltip(); UI.renderBag(); UI.updateHUD();
    return;
  }

  if (item.type === 'potion') {
    G.useItemById(slot.id);
  } else if (item.type === 'weapon' || item.type === 'armor') {
    const eqSlot = item.type;
    const old = p.equip[eqSlot];
    slot.n--; if (slot.n <= 0) p.inv[i] = null;
    p.equip[eqSlot] = item.id;
    if (old) addItemTo(p, old, 1);
    p.hp = Math.min(p.hp, calcMaxHp(p));
    UI.sfx('click');
    UI.log(`装备了 ${item.name}`, 'sys');
    UI.hideTooltip(); G.refreshWindows();
  } else {
    UI.log(`${item.name}：${item.desc}`, 'sys');
  }
};

G.useItemById = function (itemId) {
  const p = G.player;
  const item = ITEMS[itemId];
  if (!item || countItem(p, itemId) <= 0) { UI.log('没有 ' + (item ? item.name : '该物品') + ' 了', 'bad'); return; }
  const cdEnd = p.cooldowns[itemId] || 0;
  if (G.now < cdEnd) return;
  p.cooldowns[itemId] = G.now + 1000;
  removeItemFrom(p, itemId, 1);
  if (item.heal) {
    p.hp = Math.min(calcMaxHp(p), p.hp + item.heal);
    G.addText(p.x, p.y, '+' + item.heal, '#7ee87e');
  }
  if (item.mp) {
    p.mp = Math.min(calcMaxMp(p), p.mp + item.mp);
    G.addText(p.x, p.y, '+' + item.mp, '#8cb4ff');
  }
  UI.sfx('drink');
  if (!$('win-bag').classList.contains('hidden')) UI.renderBag();
};

G.unequip = function (eqSlot) {
  const p = G.player;
  const cur = p.equip[eqSlot];
  if (!cur) return;
  if (!addItemTo(p, cur, 1)) { UI.log('背包已满', 'bad'); return; }
  p.equip[eqSlot] = null;
  p.hp = Math.min(p.hp, calcMaxHp(p));
  UI.log(`卸下了 ${ITEMS[cur].name}`, 'sys');
  G.refreshWindows();
};

G.buyItem = function (itemId) {
  const p = G.player;
  const item = ITEMS[itemId];
  if (p.gold < item.price) { UI.log('银两不足！', 'bad'); return; }
  if (!addItemTo(p, itemId, 1)) { UI.log('背包已满！', 'bad'); return; }
  p.gold -= item.price;
  UI.sfx('coin');
  UI.log(`买下了 ${item.name}（${item.price} 两）`, 'gain');
  UI.renderBag(); UI.updateHUD();
};

/* ---------- 主动技能 / 快捷栏 ---------- */
G.useQuickslot = function (i) {
  const p = G.player;
  if (p.dead) return;
  const entry = p.quickbar[i];
  if (ITEMS[entry]) { G.useItemById(entry); return; }
  if (entry === 'heal') {
    const as = ACTIVE_SKILLS.heal;
    if (G.now < (p.cooldowns.heal || 0)) return;
    if (p.mp < as.mp) { UI.log('内力不足！', 'bad'); return; }
    p.cooldowns.heal = G.now + as.cd;
    p.mp -= as.mp;
    const amount = 50 + (p.skills.inner.lv - 1) * 18;
    p.hp = Math.min(calcMaxHp(p), p.hp + amount);
    G.gainProf('inner', 12);
    G.addEffect('heal', p.x, p.y);
    G.addText(p.x, p.y, '+' + amount, '#7ee87e');
    UI.sfx('heal');
  } else if (entry === 'qinggong') {
    if (!p.qinggong && p.mp < 5) { UI.log('内力不足，无法施展轻功', 'bad'); return; }
    p.qinggong = !p.qinggong;
    UI.log(p.qinggong ? '施展轻功，健步如飞！' : '收起轻功。', 'sys');
    UI.sfx('click');
  }
};

/* ---------- 战斗 ---------- */
G.addText = function (x, y, txt, color, crit) {
  G.texts.push({ x, y, txt, color, crit, t: 0, dur: 1100, ox: Math.random() * 16 - 8 });
};
G.addEffect = function (type, x, y, ang) {
  G.effects.push({ type, x, y, ang, t: 0, dur: type === 'level' ? 800 : 350, seed: Math.random() * 6.28 });
};

G.gainExp = function (n) {
  const p = G.player;
  p.exp += n;
  while (p.exp >= expNeed(p.level)) {
    p.exp -= expNeed(p.level);
    p.level++;
    p.hp = calcMaxHp(p); p.mp = calcMaxMp(p);
    G.addEffect('level', p.x, p.y);
    UI.sfx('level');
    UI.log(`恭喜！你升到了 ${p.level} 级！`, 'gain');
  }
  G.refreshWindows();
};

G.gainProf = function (kind, amt) {
  const p = G.player;
  const sk = p.skills[kind];
  if (sk.lv >= 12) return;
  sk.prof += amt;
  while (sk.lv < 12 && sk.prof >= profNeed(sk.lv)) {
    sk.prof -= profNeed(sk.lv);
    sk.lv++;
    UI.sfx('levelup_skill');
    UI.log(`你的${MARTIAL[kind].name}修为提升到【${ZHONG[sk.lv - 1]}重】！`, 'gain');
    if (sk.lv >= 12) sk.prof = 0;
  }
  if (!$('win-skill').classList.contains('hidden')) UI.renderSkills();
};

G.playerAttack = function (m) {
  const p = G.player;
  p.atkTimer = 900;
  p.swingT = 280;
  p.dir = Math.atan2(m.y - p.y, m.x - p.x);
  p.combatTimer = 5;
  UI.sfx('swing');

  const atk = calcAtk(p);
  const crit = Math.random() < 0.12;
  let dmg = Math.max(1, Math.round(atk * (0.85 + Math.random() * 0.3) - m.def.def));
  if (crit) dmg = Math.round(dmg * 1.8);
  m.hp -= dmg;
  m.hitFlash = 120;
  m.aggroed = true;
  if (m.state === 'idle' || m.state === 'wander') m.state = 'chase';

  G.addEffect('slash', m.x, m.y, p.dir);
  G.addEffect('hit', m.x, m.y);
  G.addText(m.x, m.y, crit ? dmg + '！' : '' + dmg, crit ? '#ffb04a' : '#fff', crit);
  if (crit) UI.log('会心一击！', 'battle');
  UI.sfx('hit');

  G.gainProf(weaponKind(p), 2 + Math.random() * 3);

  if (m.hp <= 0) G.killMonster(m);
};

G.killMonster = function (m) {
  const p = G.player;
  m.dead = true;
  m.hp = 0;
  m.respawnTimer = m.spawn.respawn || (15000 + Math.random() * 12000);
  m.aggroed = false;
  if (G.target === m) { G.target = null; G.autoChase = false; }
  UI.sfx('die');
  UI.log(`击败了【${m.name}】，获得 ${m.def.exp} 点经验`, 'battle');
  G.gainExp(m.def.exp);
  G.onMonsterKilled(m.def.id);

  // 掉落
  const gold = m.def.gold[0] + Math.floor(Math.random() * (m.def.gold[1] - m.def.gold[0] + 1));
  if (gold > 0) {
    const pos = randomWalkable(G.map, Math.round(m.x), Math.round(m.y), 1);
    G.drops.push(createDrop(pos.x, pos.y, gold, null));
  }
  for (const d of m.def.drops) {
    if (Math.random() < d.chance) {
      const pos = randomWalkable(G.map, Math.round(m.x), Math.round(m.y), 1.5);
      G.drops.push(createDrop(pos.x, pos.y, 0, d.item, 1));
    }
  }
};

G.monsterAttack = function (m) {
  const p = G.player;
  if (p.dead) return;
  m.swingT = 280;
  const def = calcDef(p);
  const dmg = Math.max(1, Math.round(m.def.atk * (0.85 + Math.random() * 0.3) - def));
  p.hp -= dmg;
  p.combatTimer = 5;
  G.addText(p.x, p.y, '-' + dmg, '#e85a4a');
  G.addEffect('hit', p.x, p.y);
  UI.sfx('hurt');
  if (p.hp <= 0) G.playerDie();
};

G.playerDie = function () {
  const p = G.player;
  p.hp = 0; p.dead = true; p.qinggong = false;
  p.path = []; G.target = null; G.autoChase = false; G.pending = null;
  const loss = Math.floor(expNeed(p.level) * 0.02);
  p.exp = Math.max(0, p.exp - loss);
  UI.sfx('die');
  UI.log(`你被击败了……损失了 ${loss} 点经验`, 'bad');
  UI.showDeath();
  setTimeout(() => {
    p.dead = false;
    p.hp = calcMaxHp(p); p.mp = calcMaxMp(p);
    G.switchMap('village', 15, 16);
    UI.hideDeath();
    UI.log('村民把你抬回了玄菟村。', 'sys');
  }, 2500);
};

/* ---------- 拾取 ---------- */
G.pickupDrop = function (drop) {
  const p = G.player;
  const idx = G.drops.indexOf(drop);
  if (idx < 0) return;
  if (drop.gold > 0) {
    p.gold += drop.gold;
    UI.sfx('coin');
    UI.log(`拾取了 ${drop.gold} 两银子`, 'gain');
  } else if (drop.itemId) {
    if (!addItemTo(p, drop.itemId, drop.n)) { UI.log('背包已满！', 'bad'); return; }
    UI.sfx('coin');
    UI.log(`拾取了【${ITEMS[drop.itemId].name}】`, 'gain');
  }
  G.drops.splice(idx, 1);
  if (!$('win-bag').classList.contains('hidden')) UI.renderBag();
};

/* ---------- 输入 ---------- */
function setupInput() {
  canvas.addEventListener('mousedown', (e) => {
    if (!G.running || G.player.dead) return;
    if (e.button !== 0) return;
    UI.closeDialog();
    const p = G.player;
    const w = screenToWorld(e.clientX, e.clientY);

    // 找被点击的实体（按屏幕距离）
    let best = null, bestD = 1e9;
    const tryEnt = (ent, radius, oy) => {
      const s = worldToScreen(ent.x, ent.y);
      const d = Math.hypot(e.clientX - s.x, e.clientY - (s.y + (oy || -18)));
      if (d < radius && d < bestD) { best = ent; bestD = d; }
    };
    for (const m of G.monsters) if (!m.dead) tryEnt(m, 26);
    for (const n of G.npcs) tryEnt(n, 26);
    for (const dr of G.drops) tryEnt(dr, 20, -4);

    if (best) {
      if (best.type === 'monster') {
        G.target = best; G.autoChase = true; G.pending = null;
      } else if (best.type === 'npc') {
        G.target = null; G.autoChase = false;
        if (distBetween(p, best) < 2.2) { G.talkToNpc(best); G.pending = null; }
        else {
          G.pending = { type: 'talk', ent: best };
          p.path = findPath(G.map, p.x, p.y, Math.round(best.x), Math.round(best.y)) || [];
        }
      } else if (best.type === 'drop') {
        G.target = null; G.autoChase = false;
        if (distBetween(p, best) < 1.5) { G.pickupDrop(best); G.pending = null; }
        else {
          G.pending = { type: 'pick', ent: best };
          p.path = findPath(G.map, p.x, p.y, Math.round(best.x), Math.round(best.y)) || [];
        }
      }
      return;
    }

    // 点击地面 → 移动
    G.autoChase = false; G.pending = null;
    const tx = Math.round(w.x), ty = Math.round(w.y);
    if (inMap(G.map, tx, ty)) {
      const path = findPath(G.map, p.x, p.y, tx, ty);
      if (path) {
        p.path = path;
        G.moveMark = { x: tx, y: ty, t: 600 };
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    G.keys[e.key.toLowerCase()] = true;
    if (!G.running) return;
    const k = e.key.toLowerCase();
    if (k === 'c') UI.toggleWindow('win-char');
    else if (k === 'b' || k === 'i') UI.toggleWindow('win-bag');
    else if (k === 'v') UI.toggleWindow('win-skill');
    else if (k === 'q') UI.toggleWindow('win-quest');
    else if (k === 'h') UI.toggleWindow('win-help');
    else if (k >= '1' && k <= '4') G.useQuickslot(parseInt(k) - 1);
    else if (k === 'escape') {
      UI.closeDialog();
      const open = document.querySelectorAll('.game-window:not(.hidden)');
      if (open.length) open.forEach((wd) => UI.closeWindow(wd.id));
      else UI.toggleWindow('win-sys');
    }
  });
  window.addEventListener('keyup', (e) => { G.keys[e.key.toLowerCase()] = false; });
}

/* ---------- 玩家更新 ---------- */
function updatePlayer(dt) {
  const p = G.player;
  if (p.dead) return;

  p.atkTimer -= dt * 1000;
  if (p.swingT > 0) p.swingT -= dt * 1000;
  if (p.combatTimer > 0) p.combatTimer -= dt;

  // 轻功
  p.speed = p.qinggong ? 5.6 : 3.2;
  if (p.qinggong) {
    p.mp -= 3 * dt;
    G.gainProf('inner', 1.2 * dt);
    if (p.mp <= 0) { p.mp = 0; p.qinggong = false; UI.log('内力耗尽，轻功难以为继。', 'bad'); }
  }

  // 键盘移动（屏幕方向 → 世界方向）
  let kx = 0, ky = 0;
  if (G.keys['w'] || G.keys['arrowup']) ky -= 1;
  if (G.keys['s'] || G.keys['arrowdown']) ky += 1;
  if (G.keys['a'] || G.keys['arrowleft']) kx -= 1;
  if (G.keys['d'] || G.keys['arrowright']) kx += 1;
  if (kx !== 0 || ky !== 0) {
    p.path = []; G.autoChase = false; G.pending = null;
    const inv = 0.7071;
    let wx = (kx + ky) * inv, wy = (ky - kx) * inv;
    const len = Math.hypot(wx, wy) || 1;
    wx /= len; wy /= len;
    const nx = p.x + wx * p.speed * dt, ny = p.y + wy * p.speed * dt;
    if (!isBlocked(G.map, Math.round(nx), Math.round(ny))) { p.x = nx; p.y = ny; }
    else if (!isBlocked(G.map, Math.round(nx), Math.round(p.y))) { p.x = nx; }
    else if (!isBlocked(G.map, Math.round(p.x), Math.round(ny))) { p.y = ny; }
    p.dir = Math.atan2(wy, wx);
    p.moving = true;
  } else {
    followPath(p, dt);
  }

  // 待执行动作（走到NPC/掉落物旁）
  if (G.pending) {
    const ent = G.pending.ent;
    if (G.pending.type === 'talk' && distBetween(p, ent) < 2.2) {
      G.talkToNpc(ent); G.pending = null; p.path = [];
    } else if (G.pending.type === 'pick') {
      if (G.drops.indexOf(ent) < 0) G.pending = null;
      else if (distBetween(p, ent) < 1.5) { G.pickupDrop(ent); G.pending = null; p.path = []; }
    }
    if (G.pending && p.path.length === 0 && !p.moving) G.pending = null;
  }

  // 自动追击目标
  if (G.target && G.autoChase) {
    const m = G.target;
    if (m.dead || m !== G.target) { G.target = null; G.autoChase = false; }
    else {
      const d = distBetween(p, m);
      if (d <= 1.35) {
        p.path = [];
        if (p.atkTimer <= 0) G.playerAttack(m);
      } else {
        G.repathTimer -= dt * 1000;
        if (G.repathTimer <= 0 || p.path.length === 0) {
          G.repathTimer = 450;
          p.path = findPath(G.map, p.x, p.y, Math.round(m.x), Math.round(m.y), 900) || [];
        }
      }
    }
  }

  // 传送点
  for (const portal of G.map.portals) {
    if (Math.hypot(p.x - portal.x, p.y - portal.y) < 0.75) {
      G.switchMap(portal.to, portal.tx, portal.ty);
      break;
    }
  }

  // 脱战回复
  if (p.combatTimer <= 0) {
    p.hp = Math.min(calcMaxHp(p), p.hp + calcMaxHp(p) * 0.015 * dt);
    if (!p.qinggong) p.mp = Math.min(calcMaxMp(p), p.mp + calcMaxMp(p) * 0.03 * dt);
  }

  // 相机跟随
  G.camX = (p.x - p.y) * TILE_HW;
  G.camY = (p.x + p.y) * TILE_HH;
}

/* ---------- 主循环 ---------- */
let lastTime = 0;
function gameLoop(ts) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (ts - lastTime) / 1000 || 0.016);
  lastTime = ts;
  G.now = ts;
  if (!G.running) return;

  G.timeMin += dt; // 1现实秒 = 1游戏分钟

  updatePlayer(dt);
  for (const m of G.monsters) {
    if (m.swingT > 0) m.swingT -= dt * 1000;
    updateMonster(m, dt, G.map, G.player, G);
  }

  // 掉落物过期
  for (let i = G.drops.length - 1; i >= 0; i--) {
    G.drops[i].ttl -= dt * 1000;
    if (G.drops[i].ttl <= 0) G.drops.splice(i, 1);
  }
  // 特效与飘字
  for (let i = G.effects.length - 1; i >= 0; i--) {
    G.effects[i].t += dt * 1000;
    if (G.effects[i].t >= G.effects[i].dur) G.effects.splice(i, 1);
  }
  for (let i = G.texts.length - 1; i >= 0; i--) {
    G.texts[i].t += dt * 1000;
    if (G.texts[i].t >= G.texts[i].dur) G.texts.splice(i, 1);
  }
  if (G.moveMark) { G.moveMark.t -= dt * 1000; if (G.moveMark.t <= 0) G.moveMark = null; }

  // 自动存档
  G.saveTimer += dt;
  if (G.saveTimer > 30) { G.saveTimer = 0; saveGame(false); }

  render();
  renderMinimap();
  UI.updateHUD();
  UI.updateTargetInfo();
  UI.updateClock();
}

/* ---------- 存档 ---------- */
function saveGame(verbose) {
  const p = G.player;
  if (!p) return;
  const data = {
    v: 1,
    timeMin: G.timeMin,
    player: {
      name: p.name, gender: p.gender, level: p.level, exp: p.exp, gold: p.gold,
      hp: p.hp, mp: p.mp, map: p.map, x: Math.round(p.x), y: Math.round(p.y),
      equip: p.equip, inv: p.inv, skills: p.skills, quests: p.quests, quickbar: p.quickbar,
    },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    if (verbose) UI.log('已保存进度。', 'sys');
  } catch (e) {
    if (verbose) UI.log('保存失败：' + e.message, 'bad');
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

/* ---------- 开始游戏 ---------- */
function startGame(player, timeMin) {
  G.player = player;
  G.world = {};
  G.timeMin = timeMin || 8 * 60;
  G.effects = []; G.texts = [];
  $('title-screen').classList.add('hidden');
  $('create-screen').classList.add('hidden');
  UI.showGameUI();
  UI.buildQuickbar();
  G.switchMap(player.map, player.x, player.y);
  G.running = true;
  UI.log('欢迎来到千年的世界！', 'sys');
  UI.log('点击地面移动，点击怪物攻击。按 H 查看操作说明。', 'talk');
  UI.log('村长似乎有事相求（头顶有"！"标记）。', 'talk');
}

function quitToTitle() {
  saveGame(true);
  G.running = false;
  G.player = null;
  UI.hideGameUI();
  $('title-screen').classList.remove('hidden');
  $('btn-continue').classList.toggle('hidden', !loadGame());
}

/* ---------- 标题与创建角色 ---------- */
function setupTitle() {
  $('btn-continue').classList.toggle('hidden', !loadGame());

  $('btn-new').addEventListener('click', () => {
    UI.sfx('click');
    $('title-screen').classList.add('hidden');
    $('create-screen').classList.remove('hidden');
  });

  $('btn-create-back').addEventListener('click', () => {
    $('create-screen').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
  });

  const descs = {
    fist: '赤手空拳亦可闯荡江湖，拳法入门最快。',
    sword: '仗剑天涯，附赠一柄木剑。',
    blade: '大刀阔斧，附赠一柄柴刀。',
  };
  document.querySelectorAll('input[name=wskill]').forEach((r) => {
    r.addEventListener('change', () => { $('create-desc').textContent = descs[r.value]; });
  });

  $('btn-create-ok').addEventListener('click', () => {
    const name = $('create-name').value.trim() || '无名侠客';
    const gender = document.querySelector('input[name=gender]:checked').value;
    const wskill = document.querySelector('input[name=wskill]:checked').value;
    startGame(createPlayer(name, gender, wskill));
  });

  $('btn-continue').addEventListener('click', () => {
    const data = loadGame();
    if (!data) return;
    const p = createPlayer(data.player.name, data.player.gender, 'fist');
    // 还原存档（覆盖初始背包）
    p.inv = new Array(24).fill(null);
    Object.assign(p, data.player);
    p.path = []; p.cooldowns = {}; p.dead = false;
    startGame(p, data.timeMin);
  });

  // HUD按钮
  document.querySelectorAll('#hud-buttons button').forEach((b) => {
    b.addEventListener('click', () => UI.toggleWindow(b.dataset.win));
  });
  $('btn-save').addEventListener('click', () => saveGame(true));
  $('btn-sound').addEventListener('click', UI.toggleSound);
  $('btn-help').addEventListener('click', () => UI.openWindow('win-help'));
  $('btn-quit').addEventListener('click', quitToTitle);

  window.addEventListener('beforeunload', () => { if (G.running) saveGame(false); });
}

/* ---------- 启动 ---------- */
setupTitle();
setupInput();
requestAnimationFrame(gameLoop);
