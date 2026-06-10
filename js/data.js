/* ============ 千年 · 游戏数据 ============ */

// 十二时辰
const SHICHEN = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// 武功重数名称（一重 ~ 十二重）
const ZHONG = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];

// 武功定义
const MARTIAL = {
  fist:  { name: '拳法', desc: '空手搏击之术' },
  sword: { name: '剑术', desc: '持剑御敌之术' },
  blade: { name: '刀术', desc: '挥刀劈砍之术' },
  inner: { name: '内功', desc: '吐纳运气之法，增强防御与内力' },
};

// 主动技能
const ACTIVE_SKILLS = {
  heal: {
    id: 'heal', name: '治愈术', mp: 15, cd: 3000,
    desc: '运转内息疗伤，恢复体力（随内功增强）',
  },
  qinggong: {
    id: 'qinggong', name: '轻功', mp: 0, cd: 500, toggle: true,
    desc: '提气疾行，移动加快，持续消耗内力',
  },
};

// 物品定义
const ITEMS = {
  // 武器
  wood_sword:   { id:'wood_sword',   name:'木剑',   type:'weapon', kind:'sword', atk:8,   price:100,  desc:'新手习剑所用的木剑。', icon:'sword', color:'#a07840' },
  iron_sword:   { id:'iron_sword',   name:'铁剑',   type:'weapon', kind:'sword', atk:20,  price:800,  desc:'精铁打造，锋利耐用。', icon:'sword', color:'#b8c0c8' },
  chai_dao:     { id:'chai_dao',     name:'柴刀',   type:'weapon', kind:'blade', atk:14,  price:400,  desc:'樵夫砍柴的厚背刀。',   icon:'blade', color:'#8a9098' },
  qinglong_dao: { id:'qinglong_dao', name:'青龙刀', type:'weapon', kind:'blade', atk:32,  price:3000, desc:'刀身泛青光，削铁如泥。', icon:'blade', color:'#5ac8b0' },
  tie_quan:     { id:'tie_quan',     name:'铁拳套', type:'weapon', kind:'fist',  atk:12,  price:600,  desc:'套于拳上，拳劲倍增。', icon:'fist',  color:'#9098a0' },
  // 防具
  cloth:        { id:'cloth',        name:'布衣',   type:'armor', def:5,  price:80,   desc:'粗布缝制的衣衫。',     icon:'armor', color:'#7a8a9a' },
  leather:      { id:'leather',      name:'皮甲',   type:'armor', def:12, price:500,  desc:'兽皮硝制的轻甲。',     icon:'armor', color:'#a0703a' },
  iron_armor:   { id:'iron_armor',   name:'铁甲',   type:'armor', def:25, price:2500, desc:'铁片层叠的重甲。',     icon:'armor', color:'#b8c0c8' },
  // 药品
  potion_s:     { id:'potion_s',     name:'金创药',     type:'potion', heal:80,  price:20, stack:true, desc:'外敷内服皆可，恢复 80 点体力。', icon:'potion', color:'#e85a4a' },
  potion_l:     { id:'potion_l',     name:'大金创药',   type:'potion', heal:250, price:60, stack:true, desc:'药效极佳，恢复 250 点体力。',   icon:'potion', color:'#ff8a5a' },
  mp_pill:      { id:'mp_pill',      name:'回气丹',     type:'potion', mp:100,   price:30, stack:true, desc:'凝神聚气，恢复 100 点内力。',   icon:'pill',   color:'#5a8ae8' },
  // 材料
  lupi:         { id:'lupi',   name:'狼皮', type:'material', price:30, stack:true, desc:'完整的狼皮，可卖给商人。', icon:'fur',  color:'#8a8a8a' },
  lurong:       { id:'lurong', name:'鹿茸', type:'material', price:20, stack:true, desc:'珍贵的药材。',           icon:'horn', color:'#c8a060' },
  shedan:       { id:'shedan', name:'蛇胆', type:'material', price:50, stack:true, desc:'蟒蛇的胆，大补之物。',   icon:'orb',  color:'#3aa05a' },
};

// 怪物定义
const MONSTERS = {
  deer: {
    id:'deer', name:'野鹿', hp:40, atk:5, def:1, exp:12, gold:[2,6],
    aggressive:false, speed:2.2, atkCd:1500, aggroR:0, kind:'deer',
    drops:[{item:'lurong', chance:0.35}],
  },
  wolf: {
    id:'wolf', name:'野狼', hp:80, atk:13, def:3, exp:25, gold:[5,12],
    aggressive:true, speed:3.0, atkCd:1200, aggroR:4.5, kind:'wolf',
    drops:[{item:'lupi', chance:0.4},{item:'potion_s', chance:0.12}],
  },
  snake: {
    id:'snake', name:'蟒蛇', hp:120, atk:18, def:5, exp:45, gold:[8,18],
    aggressive:true, speed:1.8, atkCd:1400, aggroR:3.5, kind:'snake',
    drops:[{item:'shedan', chance:0.35},{item:'mp_pill', chance:0.1}],
  },
  bandit: {
    id:'bandit', name:'山贼', hp:180, atk:24, def:8, exp:80, gold:[15,40],
    aggressive:true, speed:2.6, atkCd:1100, aggroR:5, kind:'bandit',
    drops:[{item:'potion_l', chance:0.15},{item:'chai_dao', chance:0.05},{item:'cloth', chance:0.08}],
  },
  bandit_boss: {
    id:'bandit_boss', name:'山贼头目', hp:700, atk:38, def:13, exp:450, gold:[150,350],
    aggressive:true, speed:2.4, atkCd:1000, aggroR:6, kind:'boss', boss:true,
    drops:[{item:'qinglong_dao', chance:0.5},{item:'iron_armor', chance:0.35},{item:'potion_l', chance:0.8}],
  },
};

// 任务定义
const QUESTS = {
  q_wolf: {
    id:'q_wolf', name:'狼患',
    giver:'cunzhang', targetMonster:'wolf', targetCount:5,
    desc:'村东荒野的野狼袭击了进山的村民，村长请你猎杀 5 头野狼。',
    accept:'近来村东荒野狼群肆虐，已有几位乡亲被咬伤。少侠若肯出手猎杀五头野狼，老朽必有重谢！',
    progress:'狼群可还猖獗？务必多加小心。',
    complete:'少侠真乃神人也！这是谢礼，请务必收下。',
    reward:{ gold:500, exp:200, items:[{id:'potion_s', n:5}] },
  },
  q_boss: {
    id:'q_boss', name:'剿灭山贼',
    giver:'cunzhang', targetMonster:'bandit_boss', targetCount:1, require:'q_wolf',
    desc:'盘踞在荒野东北山寨的山贼头目作恶多端，村长悬赏取其首级。',
    accept:'荒野东北有伙山贼占山为王，劫掠过往商旅。山贼头目武艺高强，少侠若能除掉他，便是为民除害，赏银两千两！',
    progress:'山贼头目就在荒野东北的山寨中，切莫轻敌。',
    complete:'山贼授首，商路重开，少侠大恩大德，玄菟村永世不忘！',
    reward:{ gold:2000, exp:1000, items:[{id:'potion_l', n:5}] },
  },
};

// NPC定义
const NPCS = {
  cunzhang: {
    id:'cunzhang', name:'村长', role:'quest', color:'#c8b890',
    greeting:'老朽是玄菟村村长。如今世道不太平，少侠行走江湖，千万小心。',
  },
  tiejiang: {
    id:'tiejiang', name:'王铁匠', role:'shop', color:'#a05030',
    greeting:'客官请看，小店的兵刃甲胄，都是上好的货色！',
    shop:['wood_sword','chai_dao','tie_quan','iron_sword','cloth','leather','iron_armor'],
    shopTitle:'王记铁铺',
  },
  dafu: {
    id:'dafu', name:'李大夫', role:'shop', color:'#5a7a5a',
    greeting:'悬壶济世，治病救人。客官是抓药，还是疗伤？',
    shop:['potion_s','potion_l','mp_pill'],
    shopTitle:'回春药铺',
    canHeal:true,
  },
};

// 地图元信息（具体地形在 world.js 生成）
const MAP_DEFS = {
  village: { id:'village', name:'玄菟村', w:32, h:32, seed:1001, safe:true },
  wild:    { id:'wild',    name:'城外荒野', w:48, h:48, seed:2002, safe:false },
};

// 经验曲线
function expNeed(level) { return level * level * 80; }
// 武功熟练度曲线（升到 lv+1 重所需）
function profNeed(lv) { return lv * 120; }
