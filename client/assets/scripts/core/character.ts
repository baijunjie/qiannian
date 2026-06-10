/**
 * 角色朝向与状态（引擎无关、纯逻辑）
 */

/** 八方向身位，0 = 东，逆时针每步 45° */
export enum Dir8 {
  E = 0,
  NE = 1,
  N = 2,
  NW = 3,
  W = 4,
  SW = 5,
  S = 6,
  SE = 7,
}

export const DIR_COUNT = 8;

/** 方向的中文名 */
export const DIR_NAMES: Record<Dir8, string> = {
  [Dir8.E]: '东',
  [Dir8.NE]: '东北',
  [Dir8.N]: '北',
  [Dir8.NW]: '西北',
  [Dir8.W]: '西',
  [Dir8.SW]: '西南',
  [Dir8.S]: '南',
  [Dir8.SE]: '东南',
};

/** 角色状态 */
export enum CharState {
  Idle = 'idle',
  Walk = 'walk',
  Run = 'run',
  Sit = 'sit',
}

export const STATE_NAMES: Record<CharState, string> = {
  [CharState.Idle]: '站立',
  [CharState.Walk]: '走路',
  [CharState.Run]: '奔跑',
  [CharState.Sit]: '打坐',
};

/** 移动速度（像素/秒） */
export const WALK_SPEED = 130;
export const RUN_SPEED = 280;
/** 原地转向速度（45° 步/秒） */
export const TURN_RATE = 14;

const SQRT1_2 = Math.SQRT1_2;

/** 各方向单位向量（屏幕坐标，y 向上） */
const DIR_VECTORS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 1, y: 0 },
  { x: SQRT1_2, y: SQRT1_2 },
  { x: 0, y: 1 },
  { x: -SQRT1_2, y: SQRT1_2 },
  { x: -1, y: 0 },
  { x: -SQRT1_2, y: -SQRT1_2 },
  { x: 0, y: -1 },
  { x: SQRT1_2, y: -SQRT1_2 },
];

export function dirToVector(d: Dir8): { x: number; y: number } {
  return DIR_VECTORS[d];
}

/** 由移动向量得到最接近的八方向；零向量返回 null */
export function dirFromVector(x: number, y: number): Dir8 | null {
  if (x === 0 && y === 0) return null;
  const angle = Math.atan2(y, x); // -PI ~ PI
  const step = Math.round(angle / (Math.PI / 4));
  return ((step + DIR_COUNT) % DIR_COUNT) as Dir8;
}

/**
 * 当前朝向到目标朝向的最短角差（单位：45° 步，范围 -4 ~ 4）
 * 正值表示沿逆时针（枚举增大方向）转更近。
 */
export function dirDelta(cur: Dir8, target: Dir8): number {
  let d = (target - cur) % DIR_COUNT;
  if (d > 4) d -= DIR_COUNT;
  if (d < -4) d += DIR_COUNT;
  return d;
}

/** 沿最短弧朝目标转一步（45°）；已对准时原样返回 */
export function turnStep(cur: Dir8, target: Dir8): Dir8 {
  const d = dirDelta(cur, target);
  if (d === 0) return cur;
  const step = d > 0 ? 1 : -1;
  return ((cur + step + DIR_COUNT) % DIR_COUNT) as Dir8;
}

/** 朝向是否相同或相邻（用于"边转向边起步"的判定） */
export function isFacingNear(cur: Dir8, target: Dir8): boolean {
  return Math.abs(dirDelta(cur, target)) <= 1;
}
