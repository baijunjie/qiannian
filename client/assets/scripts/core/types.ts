/**
 * 核心类型定义（引擎无关）
 * 该目录下的代码不允许 import 'cc'，以便将来直接复用到服务端。
 */

export type WeaponKind = 'fist' | 'sword' | 'blade';
export type MartialKind = WeaponKind | 'inner';
export type ItemType = 'weapon' | 'armor' | 'potion' | 'material';

export interface ItemDef {
  id: string;
  name: string;
  type: ItemType;
  kind?: WeaponKind;
  atk?: number;
  def?: number;
  heal?: number;
  mp?: number;
  price: number;
  stack?: boolean;
  desc: string;
}

export interface MonsterDrop {
  item: string;
  chance: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  exp: number;
  gold: [number, number];
  aggressive: boolean;
  speed: number;
  atkCd: number;
  aggroR: number;
  kind: string;
  boss?: boolean;
  drops: MonsterDrop[];
}

export interface QuestReward {
  gold: number;
  exp: number;
  items: { id: string; n: number }[];
}

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  targetMonster: string;
  targetCount: number;
  require?: string;
  desc: string;
  accept: string;
  progress: string;
  complete: string;
  reward: QuestReward;
}

export interface NpcDef {
  id: string;
  name: string;
  role: 'quest' | 'shop';
  greeting: string;
  shop?: string[];
  shopTitle?: string;
  canHeal?: boolean;
}

export type QuestState = 'active' | 'rewarded';

export interface QuestProgress {
  state: QuestState;
  count: number;
}

export interface SkillState {
  lv: number;   // 重数 1~12
  prof: number; // 当前熟练度
}

export interface InvSlot {
  id: string;
  n: number;
}

export interface PlayerState {
  name: string;
  gender: 'm' | 'f';
  level: number;
  exp: number;
  gold: number;
  hp: number;
  mp: number;
  map: string;
  x: number;
  y: number;
  equip: { weapon: string | null; armor: string | null };
  inv: (InvSlot | null)[];
  skills: Record<MartialKind, SkillState>;
  quests: Record<string, QuestProgress>;
  quickbar: string[];
}

/** 全部配置表的聚合，由表加载器在游戏启动时填充 */
export interface GameTables {
  items: Record<string, ItemDef>;
  monsters: Record<string, MonsterDef>;
  quests: Record<string, QuestDef>;
  npcs: Record<string, NpcDef>;
}
