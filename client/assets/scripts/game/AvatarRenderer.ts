import { _decorator, Color, Component, Graphics } from 'cc';
import { Dir8 } from '../core/character';
import { Appearance, LAYER_ORDER, layerGroupOf, makeAppearance, Slot } from '../core/appearance';
import { Action, computePose, Pose } from '../core/rig';
import { PART_PAINTERS } from './parts/registry';
import { AvatarStyle } from './parts/types';

const { ccclass } = _decorator;

const C_SHADOW = new Color(0, 0, 0, 70);
const C_ARROW = new Color(140, 220, 255, 130);
const C_AURA = new Color(126, 232, 168, 0);

/**
 * 纸娃娃渲染器：外观(Appearance) + 姿态(action/dir/progress) → 分层绘制。
 * 逻辑层只调用 setAppearance / setPose；部件与层级顺序全部数据驱动
 * （见 core/appearance.ts），将来替换为序列帧渲染器时接口不变。
 */
@ccclass('AvatarRenderer')
export class AvatarRenderer extends Component {
  private g!: Graphics;
  private appearance: Appearance = makeAppearance(0, 0, 0);
  private style: AvatarStyle = { c: {} };
  private action: Action = 'idle';
  private dir: Dir8 = Dir8.S;
  private time = 0;
  private progress = 0;

  onLoad() {
    this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics)!;
    this.g.lineCap = Graphics.LineCap.ROUND;
    this.g.lineJoin = Graphics.LineJoin.ROUND;
    this.applyPalette();
  }

  setAppearance(a: Appearance) {
    this.appearance = a;
    this.applyPalette();
  }

  /** progress 仅对非循环动作（攻击）有意义 */
  setPose(action: Action, dir: Dir8, progress = 0) {
    if (action !== this.action) this.time = 0;
    this.action = action;
    this.dir = dir;
    this.progress = progress;
  }

  update(dt: number) {
    this.time += dt;
    this.draw();
  }

  private applyPalette() {
    const c: Record<string, Color> = {};
    for (const key of Object.keys(this.appearance.palette)) {
      c[key] = new Color().fromHEX(this.appearance.palette[key]);
    }
    this.style = { c };
  }

  private draw() {
    const g = this.g;
    const pose = computePose(this.action, this.dir, this.time, this.progress);
    g.clear();

    // 落地阴影
    g.fillColor = C_SHADOW;
    g.ellipse(0, 0, 17, 7);
    g.fill();

    if (pose.sitting) this.drawAura(pose);

    // 数据驱动的分层绘制
    const order = LAYER_ORDER[layerGroupOf(this.dir, pose.sitting)];
    for (const token of order) {
      const sep = token.indexOf(':');
      const slot = token.slice(0, sep) as Slot;
      const pass = token.slice(sep + 1);
      const partId = this.appearance.parts[slot];
      if (!partId) continue;
      const painter = PART_PAINTERS[partId];
      const fn = painter && painter[pass];
      if (fn) fn(g, pose, this.style);
    }

    this.drawFacingArrow(pose);
  }

  /** 打坐入定灵气：双环脉动 */
  private drawAura(pose: Pose) {
    const g = this.g;
    const pulse = (Math.sin(pose.t * 2.4) + 1) / 2;
    C_AURA.a = 36 + pulse * 50;
    g.strokeColor = C_AURA;
    g.lineWidth = 2;
    g.ellipse(0, 4, 27 + pulse * 4, 11 + pulse * 2);
    g.stroke();
    C_AURA.a = 22 + (1 - pulse) * 36;
    g.ellipse(0, 4, 34 + (1 - pulse) * 4, 14 + (1 - pulse) * 2);
    g.stroke();
  }

  /** 脚下朝向指示箭头 */
  private drawFacingArrow(pose: Pose) {
    const g = this.g;
    const { fx, fy } = pose;
    const cx = fx * 25;
    const cy = fy * 12 - 1;
    const ang = Math.atan2(fy * 0.5, fx);
    g.fillColor = C_ARROW;
    g.moveTo(cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7);
    g.lineTo(cx + Math.cos(ang + 2.5) * 4, cy + Math.sin(ang + 2.5) * 4);
    g.lineTo(cx + Math.cos(ang - 2.5) * 4, cy + Math.sin(ang - 2.5) * 4);
    g.close();
    g.fill();
  }
}
