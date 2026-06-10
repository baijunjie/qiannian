import { _decorator, Component, Graphics, Color } from 'cc';
import { CharState, Dir8, dirToVector } from '../core/character';

const { ccclass } = _decorator;

const C_ROBE = new Color(58, 90, 138, 255);
const C_ROBE_DARK = new Color(44, 70, 110, 255);
const C_BELT = new Color(201, 162, 86, 255);
const C_SKIN = new Color(232, 200, 160, 255);
const C_HAIR = new Color(26, 20, 16, 255);
const C_PANTS = new Color(42, 42, 50, 255);
const C_SHADOW = new Color(0, 0, 0, 70);
const C_EYE = new Color(20, 16, 12, 255);
const C_ARROW = new Color(140, 220, 255, 140);
const C_AURA = new Color(126, 232, 168, 0);

/**
 * 程序化绘制的角色形象：八方向身位 + 站立/走路/奔跑/打坐 姿态动画。
 * 暂以矢量绘制代替美术资源，后续替换为序列帧/骨骼动画时只需重写本组件。
 */
@ccclass('CharacterAvatar')
export class CharacterAvatar extends Component {
  private g!: Graphics;
  private dir: Dir8 = Dir8.S;
  private state: CharState = CharState.Idle;
  private animTime = 0;

  onLoad() {
    this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics)!;
    this.g.lineCap = Graphics.LineCap.ROUND;
    this.g.lineJoin = Graphics.LineJoin.ROUND;
  }

  setPose(dir: Dir8, state: CharState) {
    if (state !== this.state) this.animTime = 0;
    this.dir = dir;
    this.state = state;
  }

  update(dt: number) {
    this.animTime += dt;
    this.draw();
  }

  private draw() {
    const g = this.g;
    const t = this.animTime;
    const f = dirToVector(this.dir);
    const fx = f.x; // -1(西) ~ 1(东)
    const fy = f.y; // -1(南/面向镜头) ~ 1(北/背向镜头)
    g.clear();

    // 落地阴影
    g.fillColor = C_SHADOW;
    g.ellipse(0, 0, 16, 7);
    g.fill();

    if (this.state === CharState.Sit) {
      this.drawSitting(fx, fy, t);
    } else {
      this.drawStanding(fx, fy, t);
    }

    this.drawFacingArrow(fx, fy);
  }

  /** 站立 / 走路 / 奔跑 */
  private drawStanding(fx: number, fy: number, t: number) {
    const g = this.g;
    let legSwing = 0;
    let armSwing = 0;
    let bob = 0;
    let lean = 0;
    let breath = 0;

    if (this.state === CharState.Walk) {
      const phase = t * 8;
      legSwing = Math.sin(phase) * 9;
      armSwing = -Math.sin(phase) * 7;
      bob = Math.abs(Math.cos(phase)) * 2;
    } else if (this.state === CharState.Run) {
      const phase = t * 13;
      legSwing = Math.sin(phase) * 16;
      armSwing = -Math.sin(phase) * 13;
      bob = Math.abs(Math.cos(phase)) * 4;
      lean = fx * 5;
    } else {
      breath = Math.sin(t * 2.6) * 1.5;
    }

    const hipY = 22 + bob;
    const shoulderY = 50 + bob + breath;
    const headY = 62 + bob + breath;
    const headX = fx * 4 + lean;

    // 腿（运动方向上前后摆，屏幕上沿朝向投影）
    const stepX = fx * legSwing;
    const stepY = fy * legSwing * 0.5;
    g.strokeColor = C_PANTS;
    g.lineWidth = 6;
    g.moveTo(-5, hipY);
    g.lineTo(-5 + stepX, 2 + Math.max(0, stepY));
    g.stroke();
    g.moveTo(5, hipY);
    g.lineTo(5 - stepX, 2 + Math.max(0, -stepY));
    g.stroke();

    // 远侧手臂（先画，被身体遮住一半）
    const armX = fx * armSwing;
    const armY = fy * armSwing * 0.4;
    g.strokeColor = C_ROBE_DARK;
    g.lineWidth = 6;
    g.moveTo(-9 + lean * 0.5, shoulderY - 4);
    g.lineTo(-11 - armX + lean * 0.5, shoulderY - 22 + armY);
    g.stroke();

    // 袍身
    g.fillColor = C_ROBE;
    g.moveTo(-12 + lean * 0.3, hipY - 4);
    g.lineTo(12 + lean * 0.3, hipY - 4);
    g.lineTo(9 + lean, shoulderY + 2);
    g.lineTo(-9 + lean, shoulderY + 2);
    g.close();
    g.fill();

    // 腰带
    g.fillColor = C_BELT;
    g.rect(-10 + lean * 0.6, hipY + 8, 20, 4);
    g.fill();

    // 近侧手臂
    g.strokeColor = C_ROBE;
    g.lineWidth = 6;
    g.moveTo(9 + lean * 0.5, shoulderY - 4);
    g.lineTo(11 + armX + lean * 0.5, shoulderY - 22 + armY);
    g.stroke();

    this.drawHead(headX, headY, fx, fy, false);
  }

  /** 打坐 */
  private drawSitting(fx: number, fy: number, t: number) {
    const g = this.g;
    const breath = Math.sin(t * 1.8) * 1.2;

    // 入定灵气（缓慢脉动的光环）
    const pulse = (Math.sin(t * 2.4) + 1) / 2;
    C_AURA.a = 40 + pulse * 50;
    g.strokeColor = C_AURA;
    g.lineWidth = 2;
    g.ellipse(0, 4, 26 + pulse * 4, 11 + pulse * 2);
    g.stroke();

    // 盘起的双腿
    g.fillColor = C_PANTS;
    g.ellipse(0, 6, 16, 7);
    g.fill();

    // 袍身（低位，肩部随呼吸起伏）
    const shoulderY = 32 + breath;
    g.fillColor = C_ROBE;
    g.moveTo(-13, 8);
    g.lineTo(13, 8);
    g.lineTo(8, shoulderY);
    g.lineTo(-8, shoulderY);
    g.close();
    g.fill();

    // 搭在膝上的双手
    g.fillColor = C_SKIN;
    g.circle(-10, 12, 3);
    g.circle(10, 12, 3);
    g.fill();

    this.drawHead(fx * 3, 44 + breath, fx, fy, true);
  }

  /** 头部：发髻 + 按朝向显示面部 */
  private drawHead(x: number, y: number, fx: number, fy: number, eyesClosed: boolean) {
    const g = this.g;

    g.fillColor = C_SKIN;
    g.circle(x, y, 9);
    g.fill();

    // 头发与发髻（背向镜头时发髻偏下，更像后脑勺）
    g.fillColor = C_HAIR;
    const hairShift = fy > 0 ? 1.5 : 0;
    g.moveTo(x - 9, y + 2 - hairShift);
    g.arc(x, y + 2 - hairShift, 9, Math.PI, 0, false);
    g.close();
    g.fill();
    g.circle(x, y + 10 - hairShift, 4);
    g.fill();

    // 面部（仅面向镜头的方向可见；东西向只见一只眼）
    if (fy > 0) return; // 背向镜头
    g.strokeColor = C_EYE;
    g.fillColor = C_EYE;
    const eyeY = y - 1;
    const drawEye = (ex: number) => {
      if (eyesClosed) {
        g.lineWidth = 1.5;
        g.moveTo(ex - 1.8, eyeY);
        g.lineTo(ex + 1.8, eyeY);
        g.stroke();
      } else {
        g.circle(ex, eyeY, 1.4);
        g.fill();
      }
    };
    if (fy < 0) {
      drawEye(x - 3.5 + fx * 2);
      drawEye(x + 3.5 + fx * 2);
    } else {
      drawEye(x + fx * 5); // 纯东/西向：侧脸单眼
    }
  }

  /** 脚下朝向指示箭头（按地面透视压扁） */
  private drawFacingArrow(fx: number, fy: number) {
    const g = this.g;
    const cx = fx * 24;
    const cy = fy * 12 - 1;
    const ang = Math.atan2(fy * 0.5, fx);
    const tip = 7;
    const back = 4;
    g.fillColor = C_ARROW;
    g.moveTo(cx + Math.cos(ang) * tip, cy + Math.sin(ang) * tip);
    g.lineTo(cx + Math.cos(ang + 2.5) * back, cy + Math.sin(ang + 2.5) * back);
    g.lineTo(cx + Math.cos(ang - 2.5) * back, cy + Math.sin(ang - 2.5) * back);
    g.close();
    g.fill();
  }
}
