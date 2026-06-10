/**
 * 背包操作（引擎无关、纯逻辑）
 */
import type { GameTables, PlayerState } from './types';

/** 添加物品，背包满时返回 false */
export function addItem(p: PlayerState, tables: GameTables, itemId: string, n = 1): boolean {
  const item = tables.items[itemId];
  if (!item) return false;
  if (item.stack) {
    for (const slot of p.inv) {
      if (slot && slot.id === itemId) {
        slot.n += n;
        return true;
      }
    }
  }
  for (let i = 0; i < p.inv.length; i++) {
    if (!p.inv[i]) {
      p.inv[i] = { id: itemId, n: item.stack ? n : 1 };
      if (!item.stack && n > 1) return addItem(p, tables, itemId, n - 1);
      return true;
    }
  }
  return false;
}

/** 移除指定数量物品，数量不足时返回 false（已尽量扣除） */
export function removeItem(p: PlayerState, itemId: string, n = 1): boolean {
  for (let i = 0; i < p.inv.length && n > 0; i++) {
    const slot = p.inv[i];
    if (slot && slot.id === itemId) {
      const take = Math.min(slot.n, n);
      slot.n -= take;
      n -= take;
      if (slot.n <= 0) p.inv[i] = null;
    }
  }
  return n === 0;
}

export function countItem(p: PlayerState, itemId: string): number {
  let c = 0;
  for (const slot of p.inv) {
    if (slot && slot.id === itemId) c += slot.n;
  }
  return c;
}
