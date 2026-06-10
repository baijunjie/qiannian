/**
 * 数值公式（引擎无关、纯函数）
 * 与 prototype 版本保持一致，便于将来服务端校验复用。
 */
import type { GameTables, PlayerState, WeaponKind } from './types';

/** 升到 level+1 级所需经验 */
export function expNeed(level: number): number {
  return level * level * 80;
}

/** 武功从 lv 重升到 lv+1 重所需熟练度 */
export function profNeed(lv: number): number {
  return lv * 120;
}

export function calcMaxHp(p: PlayerState): number {
  return 100 + (p.level - 1) * 30;
}

export function calcMaxMp(p: PlayerState): number {
  return 50 + (p.level - 1) * 15 + (p.skills.inner.lv - 1) * 12;
}

/** 当前使用的武功类别（由所持武器决定，空手为拳法） */
export function weaponKind(p: PlayerState, tables: GameTables): WeaponKind {
  const w = p.equip.weapon;
  return w ? (tables.items[w].kind as WeaponKind) : 'fist';
}

export function calcAtk(p: PlayerState, tables: GameTables): number {
  const w = p.equip.weapon;
  const watk = w ? (tables.items[w].atk ?? 0) : 0;
  const skLv = p.skills[weaponKind(p, tables)].lv;
  return 5 + p.level * 2 + watk + skLv * 3;
}

export function calcDef(p: PlayerState, tables: GameTables): number {
  const a = p.equip.armor;
  const adef = a ? (tables.items[a].def ?? 0) : 0;
  return Math.floor(p.level * 1.5) + adef + (p.skills.inner.lv - 1);
}

/** 治愈术恢复量 */
export function healAmount(p: PlayerState): number {
  return 50 + (p.skills.inner.lv - 1) * 18;
}

/**
 * 伤害计算。
 * @param atk 攻击方攻击力
 * @param def 防御方防御力
 * @param roll 0~1 随机数（由调用方提供，便于测试与服务端复现）
 */
export function calcDamage(atk: number, def: number, roll: number): number {
  return Math.max(1, Math.round(atk * (0.85 + roll * 0.3) - def));
}
