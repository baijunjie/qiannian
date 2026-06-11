import { Color, Graphics } from 'cc';
import { Pose } from '../../core/rig';

/** 渲染层样式：由 Appearance.palette 解析出的颜色对象 */
export interface AvatarStyle {
  c: Record<string, Color>;
}

/** 部件画笔：pass 名 → 绘制函数（pass 见 core/appearance.ts 的 LAYER_ORDER） */
export type PaintFn = (g: Graphics, pose: Pose, s: AvatarStyle) => void;
export type PartPainter = Record<string, PaintFn>;

/** 共用：喇叭袖（肩点 → 手位），并画手 */
export function sleeveTo(
  g: Graphics, s: AvatarStyle,
  sx: number, sy: number, ex: number, ey: number, color: Color,
) {
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * 5;
  const py = (dx / len) * 5;
  g.fillColor = color;
  g.moveTo(sx - px * 0.4, sy - py * 0.4);
  g.lineTo(sx + px * 0.4, sy + py * 0.4);
  g.lineTo(ex + px, ey + py);
  g.lineTo(ex - px, ey - py);
  g.close();
  g.fill();
  g.strokeColor = s.c.trim;
  g.lineWidth = 1.8;
  g.moveTo(ex + px, ey + py);
  g.lineTo(ex - px, ey - py);
  g.stroke();
  g.fillColor = s.c.skin;
  g.circle(ex + (dx / len) * 2.5, ey + (dy / len) * 2.5, 2.6);
  g.fill();
}
