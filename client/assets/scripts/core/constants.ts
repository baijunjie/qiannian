/**
 * 通用常量（引擎无关）
 */
import type { MartialKind } from './types';

/** 十二时辰 */
export const SHICHEN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 武功重数名称（一重 ~ 十二重） */
export const ZHONG = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

/** 武功重数上限 */
export const MAX_MARTIAL_LV = 12;

/** 武功名称 */
export const MARTIAL_NAMES: Record<MartialKind, string> = {
  fist: '拳法',
  sword: '剑术',
  blade: '刀术',
  inner: '内功',
};

/** 背包容量 */
export const INV_SIZE = 24;

/** 装备/物品出售折价 */
export const SELL_RATIO = 0.5;

/** 死亡经验惩罚（占当前等级升级所需经验的比例） */
export const DEATH_EXP_PENALTY = 0.02;

/** 玩家攻击间隔（毫秒） */
export const PLAYER_ATK_CD = 900;

/** 会心一击概率与倍率 */
export const CRIT_CHANCE = 0.12;
export const CRIT_MULTIPLIER = 1.8;
