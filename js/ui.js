/* ============ 千年 · UI ============ */

const UI = {};

function $(id) { return document.getElementById(id); }

/* ---------- 音效 ---------- */
let audioCtx = null;
let soundOn = true;

UI.sfx = function (type) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const play = (freq, dur, type2, vol, delay) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type2 || 'square';
      o.frequency.setValueAtTime(freq, t + (delay || 0));
      g.gain.setValueAtTime(vol || 0.08, t + (delay || 0));
      g.gain.exponentialRampToValueAtTime(0.001, t + (delay || 0) + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(t + (delay || 0)); o.stop(t + (delay || 0) + dur);
    };
    switch (type) {
      case 'swing': play(160, 0.08, 'sawtooth', 0.04); break;
      case 'hit': play(110, 0.1, 'square', 0.07); play(70, 0.12, 'square', 0.05, 0.02); break;
      case 'hurt': play(90, 0.18, 'sawtooth', 0.08); break;
      case 'coin': play(900, 0.07, 'sine', 0.06); play(1300, 0.12, 'sine', 0.05, 0.06); break;
      case 'heal': play(500, 0.15, 'sine', 0.05); play(700, 0.2, 'sine', 0.05, 0.1); break;
      case 'level': [440, 554, 659, 880].forEach((f, i) => play(f, 0.22, 'sine', 0.07, i * 0.1)); break;
      case 'die': play(220, 0.3, 'sawtooth', 0.07); play(140, 0.5, 'sawtooth', 0.06, 0.15); break;
      case 'click': play(660, 0.04, 'sine', 0.04); break;
      case 'drink': play(330, 0.08, 'sine', 0.05); play(440, 0.1, 'sine', 0.04, 0.07); break;
      case 'levelup_skill': play(523, 0.15, 'sine', 0.06); play(784, 0.25, 'sine', 0.06, 0.12); break;
    }
  } catch (e) { /* 忽略音频错误 */ }
};

/* ---------- 消息栏 ---------- */
UI.log = function (msg, cls) {
  const logEl = $('log');
  const line = document.createElement('div');
  line.className = 'line ' + (cls || 'sys');
  line.textContent = msg;
  logEl.appendChild(line);
  while (logEl.children.length > 9) logEl.removeChild(logEl.firstChild);
};

/* ---------- HUD ---------- */
UI.updateHUD = function () {
  const p = G.player;
  if (!p) return;
  const maxHp = calcMaxHp(p), maxMp = calcMaxMp(p);
  $('hp-fill').style.height = Math.max(0, p.hp / maxHp * 100) + '%';
  $('mp-fill').style.height = Math.max(0, p.mp / maxMp * 100) + '%';
  $('hp-text').textContent = Math.ceil(p.hp) + '/' + maxHp;
  $('mp-text').textContent = Math.ceil(p.mp) + '/' + maxMp;
  const need = expNeed(p.level);
  $('exp-fill').style.width = Math.min(100, p.exp / need * 100) + '%';
  $('exp-text').textContent = `${p.level} 级　${p.exp}/${need}`;
  UI.updateQuickbar();
};

/* ---------- 目标信息 ---------- */
UI.updateTargetInfo = function () {
  const t = G.target;
  if (t && !t.dead && t.type === 'monster') {
    $('target-info').classList.remove('hidden');
    $('target-name').textContent = t.name;
    $('target-hp-fill').style.width = Math.max(0, t.hp / t.maxHp * 100) + '%';
  } else {
    $('target-info').classList.add('hidden');
  }
};

/* ---------- 时钟 ---------- */
UI.updateClock = function () {
  const hour = Math.floor(G.timeMin / 60) % 24;
  const sc = SHICHEN[Math.floor(((hour + 1) % 24) / 2)];
  $('game-clock').textContent = sc + '时';
  $('map-name').textContent = G.map ? G.map.name : '';
};

/* ---------- 窗口管理 ---------- */
UI.toggleWindow = function (id) {
  const w = $(id);
  if (w.classList.contains('hidden')) UI.openWindow(id);
  else UI.closeWindow(id);
};
UI.openWindow = function (id) {
  const w = $(id);
  w.classList.remove('hidden');
  if (!w.style.left) {
    w.style.left = Math.max(10, (window.innerWidth - w.offsetWidth) / 2 + (Math.random() * 60 - 30)) + 'px';
    w.style.top = Math.max(10, (window.innerHeight - w.offsetHeight) / 2 - 60 + (Math.random() * 40 - 20)) + 'px';
  }
  // 刷新内容
  if (id === 'win-bag') UI.renderBag();
  if (id === 'win-char') UI.renderChar();
  if (id === 'win-skill') UI.renderSkills();
  if (id === 'win-quest') UI.renderQuests();
  UI.sfx('click');
};
UI.closeWindow = function (id) {
  $(id).classList.add('hidden');
  if (id === 'win-shop') G.shopNpc = null;
};

// 拖拽
(function setupDrag() {
  let dragWin = null, offX = 0, offY = 0;
  document.addEventListener('mousedown', (e) => {
    const title = e.target.closest('.window-title');
    if (!title || e.target.classList.contains('window-close')) return;
    dragWin = title.parentElement;
    const rect = dragWin.getBoundingClientRect();
    offX = e.clientX - rect.left; offY = e.clientY - rect.top;
  });
  document.addEventListener('mousemove', (e) => {
    if (!dragWin) return;
    dragWin.style.left = (e.clientX - offX) + 'px';
    dragWin.style.top = (e.clientY - offY) + 'px';
  });
  document.addEventListener('mouseup', () => { dragWin = null; });
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('window-close')) {
      UI.closeWindow(e.target.closest('.game-window').id);
    }
  });
})();

/* ---------- 提示框 ---------- */
UI.showTooltip = function (item, x, y, sellMode) {
  const tt = $('tooltip');
  const typeName = { weapon: '武器', armor: '防具', potion: '药品', material: '材料' }[item.type];
  let html = `<div class="tt-name">${item.name}</div><div class="tt-type">${typeName}`;
  if (item.kind) html += ' · ' + MARTIAL[item.kind].name;
  html += '</div>';
  if (item.atk) html += `<div class="tt-stat">攻击力 +${item.atk}</div>`;
  if (item.def) html += `<div class="tt-stat">防御力 +${item.def}</div>`;
  if (item.heal) html += `<div class="tt-stat">恢复体力 ${item.heal}</div>`;
  if (item.mp) html += `<div class="tt-stat">恢复内力 ${item.mp}</div>`;
  html += `<div class="tt-desc">${item.desc}</div>`;
  if (sellMode) html += `<div class="tt-price">出售价：${Math.floor(item.price / 2)} 两</div>`;
  tt.innerHTML = html;
  tt.classList.remove('hidden');
  tt.style.left = Math.min(x + 14, window.innerWidth - 260) + 'px';
  tt.style.top = Math.min(y + 14, window.innerHeight - 150) + 'px';
};
UI.hideTooltip = function () { $('tooltip').classList.add('hidden'); };

/* ---------- 背包 ---------- */
UI.renderBag = function () {
  const p = G.player;
  const grid = $('bag-grid');
  grid.innerHTML = '';
  p.inv.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = 'bag-slot';
    if (slot) {
      const item = ITEMS[slot.id];
      const cv = document.createElement('canvas');
      cv.width = 38; cv.height = 38;
      drawItemIconAt(cv.getContext('2d'), item, 4, 4, 30);
      el.appendChild(cv);
      if (slot.n > 1) {
        const cnt = document.createElement('span');
        cnt.className = 'count'; cnt.textContent = slot.n;
        el.appendChild(cnt);
      }
      el.addEventListener('click', () => G.useBagSlot(i));
      el.addEventListener('mousemove', (e) => UI.showTooltip(item, e.clientX, e.clientY, !!G.shopNpc));
      el.addEventListener('mouseleave', UI.hideTooltip);
    }
    grid.appendChild(el);
  });
  $('bag-gold').textContent = p.gold;
};

/* ---------- 人物 ---------- */
UI.renderChar = function () {
  const p = G.player;
  const kind = weaponKind(p);
  const title = p.level >= 15 ? '一代宗师' : p.level >= 8 ? '江湖豪侠' : p.level >= 4 ? '初窥门径' : '初出茅庐';
  const wItem = p.equip.weapon ? ITEMS[p.equip.weapon] : null;
  const aItem = p.equip.armor ? ITEMS[p.equip.armor] : null;
  $('char-body').innerHTML = `
    <div class="char-head">
      <canvas class="char-avatar" id="char-avatar" width="64" height="64"></canvas>
      <div>
        <div class="char-name">${p.name}</div>
        <div class="char-title">称号：${title}</div>
        <div class="char-title">武功：${MARTIAL[kind].name} ${ZHONG[p.skills[kind].lv - 1]}重</div>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat"><span class="k">等级</span><span class="v">${p.level}</span></div>
      <div class="stat"><span class="k">经验</span><span class="v">${p.exp}/${expNeed(p.level)}</span></div>
      <div class="stat"><span class="k">体力</span><span class="v">${Math.ceil(p.hp)}/${calcMaxHp(p)}</span></div>
      <div class="stat"><span class="k">内力</span><span class="v">${Math.ceil(p.mp)}/${calcMaxMp(p)}</span></div>
      <div class="stat"><span class="k">攻击力</span><span class="v">${calcAtk(p)}</span></div>
      <div class="stat"><span class="k">防御力</span><span class="v">${calcDef(p)}</span></div>
      <div class="stat"><span class="k">银两</span><span class="v">${p.gold}</span></div>
      <div class="stat"><span class="k">身法</span><span class="v">${p.qinggong ? '轻功疾行' : '常步'}</span></div>
    </div>
    <div class="equip-row">
      <div class="equip-slot" id="eq-weapon">
        <div class="es-label">武器</div>
        <div class="es-name">${wItem ? wItem.name + '（攻+' + wItem.atk + '）' : '赤手空拳'}</div>
      </div>
      <div class="equip-slot" id="eq-armor">
        <div class="es-label">防具</div>
        <div class="es-name">${aItem ? aItem.name + '（防+' + aItem.def + '）' : '无'}</div>
      </div>
    </div>
    <div class="bag-tip">点击装备栏可卸下装备</div>`;
  // 头像
  const av = $('char-avatar').getContext('2d');
  av.fillStyle = '#15100a'; av.fillRect(0, 0, 64, 64);
  av.fillStyle = p.gender === 'f' ? '#8a3a5a' : '#3a5a8a';
  av.beginPath(); av.moveTo(16, 60); av.lineTo(48, 60); av.lineTo(44, 34); av.lineTo(20, 34); av.closePath(); av.fill();
  av.fillStyle = '#e8c8a0'; av.beginPath(); av.arc(32, 24, 11, 0, Math.PI * 2); av.fill();
  av.fillStyle = '#1a1410'; av.beginPath(); av.arc(32, 18, 10, Math.PI, 0); av.fill();
  av.beginPath(); av.arc(32, 11, 4, 0, Math.PI * 2); av.fill();
  $('eq-weapon').addEventListener('click', () => G.unequip('weapon'));
  $('eq-armor').addEventListener('click', () => G.unequip('armor'));
};

/* ---------- 武功 ---------- */
UI.renderSkills = function () {
  const p = G.player;
  const cur = weaponKind(p);
  let html = '';
  for (const key of ['fist', 'sword', 'blade', 'inner']) {
    const sk = p.skills[key];
    const need = profNeed(sk.lv);
    const pct = sk.lv >= 12 ? 100 : Math.min(100, sk.prof / need * 100);
    html += `
      <div class="skill-row">
        <div class="sk-head">
          <span class="sk-name">${MARTIAL[key].name}${key === cur ? '<span class="sk-cur">（当前）</span>' : ''}</span>
          <span class="sk-zhong">${ZHONG[sk.lv - 1]}重 ${sk.lv >= 12 ? '（圆满）' : Math.floor(pct) + '%'}</span>
        </div>
        <div class="prof-bar"><div class="prof-fill" style="width:${pct}%"></div></div>
      </div>`;
  }
  html += '<div class="skill-sep">主动武功</div>';
  for (const key of ['heal', 'qinggong']) {
    const as = ACTIVE_SKILLS[key];
    html += `
      <div class="active-skill">
        <div>
          <div class="as-name">${as.name}${as.toggle && G.player.qinggong ? '（运行中）' : ''}</div>
          <div class="as-desc">${as.desc}</div>
        </div>
        <span class="sk-zhong">${as.mp > 0 ? '内力 ' + as.mp : '持续耗内力'}</span>
      </div>`;
  }
  $('skill-body').innerHTML = html;
};

/* ---------- 任务 ---------- */
UI.renderQuests = function () {
  const p = G.player;
  let html = '';
  for (const qid in p.quests) {
    const st = p.quests[qid];
    if (st.state === 'rewarded') continue;
    const q = QUESTS[qid];
    const done = st.count >= q.targetCount;
    html += `
      <div class="quest-item">
        <div class="q-name ${done ? 'q-done' : ''}">【${q.name}】${done ? '（可交还）' : ''}</div>
        <div class="q-desc">${q.desc}</div>
        <div class="q-prog">进度：${MONSTERS[q.targetMonster].name} ${Math.min(st.count, q.targetCount)}/${q.targetCount}</div>
      </div>`;
  }
  $('quest-body').innerHTML = html || '<div class="quest-empty">暂无任务，去找村长看看吧。</div>';
};

/* ---------- 快捷栏 ---------- */
UI.buildQuickbar = function () {
  const bar = $('quickbar');
  bar.innerHTML = '';
  G.player.quickbar.forEach((entry, i) => {
    const slot = document.createElement('div');
    slot.className = 'qslot';
    slot.id = 'qslot-' + i;
    const key = document.createElement('span');
    key.className = 'qkey'; key.textContent = i + 1;
    slot.appendChild(key);
    const cv = document.createElement('canvas');
    cv.width = 36; cv.height = 36;
    slot.appendChild(cv);
    const cnt = document.createElement('span');
    cnt.className = 'qcount';
    slot.appendChild(cnt);
    const cd = document.createElement('div');
    cd.className = 'qcd';
    slot.appendChild(cd);
    slot.addEventListener('click', () => G.useQuickslot(i));
    bar.appendChild(slot);
    UI.drawQuickIcon(cv, entry);
  });
};

UI.drawQuickIcon = function (cv, entry) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, 36, 36);
  if (ITEMS[entry]) {
    drawItemIconAt(c, ITEMS[entry], 3, 3, 30);
  } else if (entry === 'heal') {
    c.strokeStyle = '#7ee87e'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(18, 8); c.lineTo(18, 28); c.moveTo(8, 18); c.lineTo(28, 18); c.stroke();
    c.strokeStyle = 'rgba(126,232,126,.4)'; c.lineWidth = 2;
    c.beginPath(); c.arc(18, 18, 13, 0, Math.PI * 2); c.stroke();
  } else if (entry === 'qinggong') {
    c.strokeStyle = '#8ce0ff'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(6, 12); c.quadraticCurveTo(18, 8, 30, 12); c.stroke();
    c.beginPath(); c.moveTo(6, 20); c.quadraticCurveTo(18, 16, 30, 20); c.stroke();
    c.beginPath(); c.moveTo(10, 28); c.quadraticCurveTo(20, 24, 28, 28); c.stroke();
  }
};

UI.updateQuickbar = function () {
  const p = G.player;
  p.quickbar.forEach((entry, i) => {
    const slot = $('qslot-' + i);
    if (!slot) return;
    const cnt = slot.querySelector('.qcount');
    const cd = slot.querySelector('.qcd');
    if (ITEMS[entry]) {
      cnt.textContent = countItem(p, entry) || '';
    } else {
      cnt.textContent = '';
    }
    const remain = (p.cooldowns[entry] || 0) - G.now;
    const as = ACTIVE_SKILLS[entry];
    const total = ITEMS[entry] ? 1000 : (as ? as.cd : 1000);
    cd.style.height = remain > 0 ? Math.min(100, remain / total * 100) + '%' : '0';
    if (entry === 'qinggong') slot.classList.toggle('qactive', p.qinggong);
  });
};

/* ---------- 商店 ---------- */
UI.openShop = function (npc) {
  G.shopNpc = npc;
  $('shop-title').textContent = npc.def.shopTitle || '商店';
  const list = $('shop-list');
  list.innerHTML = '';
  npc.def.shop.forEach((itemId) => {
    const item = ITEMS[itemId];
    const row = document.createElement('div');
    row.className = 'shop-item';
    const cv = document.createElement('canvas');
    cv.width = 32; cv.height = 32;
    drawItemIconAt(cv.getContext('2d'), item, 3, 3, 26);
    row.appendChild(cv);
    const info = document.createElement('div');
    info.className = 'si-info';
    info.innerHTML = `<div class="si-name">${item.name}</div><div class="si-desc">${item.desc}</div>`;
    row.appendChild(info);
    const price = document.createElement('div');
    price.className = 'si-price';
    price.textContent = item.price + ' 两';
    row.appendChild(price);
    row.addEventListener('click', () => G.buyItem(itemId));
    row.addEventListener('mousemove', (e) => UI.showTooltip(item, e.clientX, e.clientY, false));
    row.addEventListener('mouseleave', UI.hideTooltip);
    list.appendChild(row);
  });
  UI.openWindow('win-shop');
  UI.openWindow('win-bag');
};

/* ---------- 对话框 ---------- */
UI.showDialog = function (npcName, text, options) {
  $('dialog-npc-name').textContent = '【' + npcName + '】';
  $('dialog-text').textContent = text;
  const opts = $('dialog-options');
  opts.innerHTML = '';
  options.forEach((opt) => {
    const el = document.createElement('div');
    el.className = 'dlg-opt';
    el.textContent = opt.label;
    el.addEventListener('click', () => { UI.sfx('click'); opt.fn(); });
    opts.appendChild(el);
  });
  $('dialog-box').classList.remove('hidden');
};
UI.closeDialog = function () { $('dialog-box').classList.add('hidden'); };

/* ---------- 死亡画面 ---------- */
UI.showDeath = function () { $('death-screen').classList.remove('hidden'); };
UI.hideDeath = function () { $('death-screen').classList.add('hidden'); };

/* ---------- 进入游戏后显示HUD ---------- */
UI.showGameUI = function () {
  ['topbar', 'minimap', 'log', 'hud'].forEach((id) => $(id).classList.remove('hidden'));
};
UI.hideGameUI = function () {
  ['topbar', 'minimap', 'log', 'hud', 'target-info'].forEach((id) => $(id).classList.add('hidden'));
  document.querySelectorAll('.game-window').forEach((w) => w.classList.add('hidden'));
  UI.closeDialog();
};

/* ---------- 音效开关 ---------- */
UI.toggleSound = function () {
  soundOn = !soundOn;
  $('btn-sound').textContent = '音效：' + (soundOn ? '开' : '关');
};
