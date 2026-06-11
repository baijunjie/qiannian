/**
 * 纸娃娃外观系统：槽位、外观配置、分层顺序表（引擎无关）
 */
import { Dir8 } from './character';

/** 部件槽位 */
export enum Slot {
  Legs = 'legs',         // 下装腿脚
  Clothes = 'clothes',   // 衣装（裙摆/上身/双袖/腰带）
  Head = 'head',         // 头部底（皮肤）
  Face = 'face',         // 五官
  Hair = 'hair',         // 发型（含发饰/飘带）
  Weapon = 'weapon',     // 武器
}

/** 外观 = 各槽位部件 + 调色板，纯数据，可存档/可走网络 */
export interface Appearance {
  parts: Partial<Record<Slot, string>>;
  /** 调色板：hex 颜色，渲染层负责转换 */
  palette: Record<string, string>;
}

/* ---------------- 分层顺序表 ----------------
 * 穿模问题的最终解：每个朝向组一份绘制顺序，部件只登记不判断。
 * token 格式 "slot:pass"，部件画笔按 pass 提供绘制函数。
 */
export type LayerGroup = 'front' | 'side' | 'back' | 'sit';

export const LAYER_ORDER: Record<LayerGroup, string[]> = {
  // 面向镜头：背上的剑被身体遮挡（最底层），手中的剑最上
  front: [
    'hair:ribbon', 'weapon:sheathed',
    'legs:main', 'clothes:skirt', 'clothes:armFar', 'clothes:torso', 'clothes:armNear',
    'head:main', 'face:main', 'hair:main',
    'weapon:active',
  ],
  side: [
    'hair:ribbon', 'weapon:sheathed',
    'legs:main', 'clothes:skirt', 'clothes:armFar', 'clothes:torso', 'clothes:armNear',
    'head:main', 'face:main', 'hair:main',
    'weapon:active',
  ],
  // 背向镜头：背上的剑离镜头最近，压在袍与后脑上
  back: [
    'hair:ribbon',
    'legs:main', 'clothes:skirt', 'clothes:armFar', 'clothes:torso', 'clothes:armNear',
    'head:main', 'face:main', 'hair:main',
    'weapon:sheathed', 'weapon:active',
  ],
  // 打坐：袍摆铺地，剑横膝（压在手上、头之下）
  sit: [
    'hair:ribbon',
    'clothes:skirt', 'clothes:torso', 'clothes:armFar', 'clothes:armNear',
    'weapon:sheathed',
    'head:main', 'face:main', 'hair:main',
  ],
};

export function layerGroupOf(dir: Dir8, sitting: boolean): LayerGroup {
  if (sitting) return 'sit';
  const fy = [0, 1, 1, 1, 0, -1, -1, -1][dir]; // E NE N NW W SW S SE 的 y 符号
  if (fy > 0) return 'back';
  if (fy < 0) return 'front';
  return 'side';
}

/* ---------------- 部件库与预设 ---------------- */

export interface PartOption { id: string; name: string; }
export interface OutfitOption extends PartOption { palette: Record<string, string>; }

export const HAIR_STYLES: PartOption[] = [
  { id: 'hair_topknot', name: '束发金簪' },
  { id: 'hair_ponytail', name: '高马尾' },
  { id: 'hair_scarf', name: '短发巾帻' },
];

export const WEAPONS: PartOption[] = [
  { id: 'weapon_jian', name: '长剑' },
  { id: 'weapon_dao', name: '单刀' },
  { id: 'weapon_none', name: '空手' },
];

/** 衣装配色（同形状不同调色板） */
export const OUTFITS: OutfitOption[] = [
  {
    id: 'qingshan', name: '青衫',
    palette: { robe: '#324C78', robeDark: '#24385C', trim: '#D8CDB4', sash: '#96281C', boot: '#201E24' },
  },
  {
    id: 'baiyi', name: '白衣',
    palette: { robe: '#E2DED2', robeDark: '#B9B2A0', trim: '#6B5736', sash: '#8A2418', boot: '#2A2630' },
  },
  {
    id: 'xuanyi', name: '玄衣',
    palette: { robe: '#2A2A34', robeDark: '#1C1C24', trim: '#C9A256', sash: '#C9A256', boot: '#15141A' },
  },
  {
    id: 'jiangyi', name: '绛衣',
    palette: { robe: '#7A2A1E', robeDark: '#581E14', trim: '#D8CDB4', sash: '#1A1410', boot: '#241A14' },
  },
];

/** 基础调色板（肤色/发色等不随衣装变化的部分） */
export const BASE_PALETTE: Record<string, string> = {
  skin: '#E8C8A0',
  hair: '#1A1410',
  eye: '#14100C',
  gold: '#C9A256',
  sheath: '#2C2620',
  blade: '#D6DEE8',
};

export function makeAppearance(hairIdx: number, outfitIdx: number, weaponIdx: number): Appearance {
  return {
    parts: {
      [Slot.Legs]: 'legs_boots',
      [Slot.Clothes]: 'clothes_robe',
      [Slot.Head]: 'head_default',
      [Slot.Face]: 'face_default',
      [Slot.Hair]: HAIR_STYLES[hairIdx % HAIR_STYLES.length].id,
      [Slot.Weapon]: WEAPONS[weaponIdx % WEAPONS.length].id,
    },
    palette: { ...BASE_PALETTE, ...OUTFITS[outfitIdx % OUTFITS.length].palette },
  };
}
