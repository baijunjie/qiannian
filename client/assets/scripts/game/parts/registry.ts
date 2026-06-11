import { PartPainter } from './types';
import { legs_boots } from './legs';
import { clothes_robe } from './clothes';
import { face_default, head_default } from './headface';
import { hair_ponytail, hair_scarf, hair_topknot } from './hair';
import { weapon_dao, weapon_jian, weapon_none } from './weapons';

/** 部件画笔注册表：partId → 画笔。新增部件只需在此登记。 */
export const PART_PAINTERS: Record<string, PartPainter> = {
  legs_boots,
  clothes_robe,
  head_default,
  face_default,
  hair_topknot,
  hair_ponytail,
  hair_scarf,
  weapon_jian,
  weapon_dao,
  weapon_none,
};
