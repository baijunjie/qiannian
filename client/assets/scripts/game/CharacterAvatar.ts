import { _decorator, Component, Graphics, Color } from 'cc';
import { CharState, Dir8, dirToVector } from '../core/character';

const { ccclass } = _decorator;

// —— 配色：青衫侠客 ——
const C_ROBE = new Color(50, 76, 120, 255);        // 长袍主色
const C_ROBE_DARK = new Color(36, 56, 92, 255);    // 袍裙/远侧
const C_TRIM = new Color(216, 205, 180, 255);      // 领口/袖口滚边
const C_SASH = new Color(150, 40, 28, 255);        // 腰间绦带
const C_GOLD = new Color(201, 162, 86, 255);       // 簪/扣/剑格
const C_SKIN = new Color(232, 200, 160, 255);
const C_HAIR = new Color(26, 20, 16, 255);
const C_BOOT = new Color(32, 30, 36, 255);
const C_SHEATH = new Color(44, 38, 32, 255);       // 剑鞘
const C_EYE = new Color(20, 16, 12, 255);
const C_SHADOW = new Color(0, 0, 0, 70);
const C_ARROW = new Color(140, 220, 255, 130);
const C_AURA = new Color(126, 232, 168, 0);

/**
 * 程序化绘制的武侠角色：八方向身位 + 站立/走路/奔跑/打坐。
 * 交领长袍、束腰绦带、发髻飘带、背负长剑，细节随状态产生动画。
 * 后续替换为序列帧/骨骼动画时只需重写本组件。
 */
@ccclass('CharacterAvatar')
export class CharacterAvatar extends Component {
  private g!: Graphics;
  private dir: Dir8 = Dir8.S;
  private state: CharState = CharState.Idle;
  private animTime = 0;

  // 当前帧绘制参数
  private fx = 0;
  private fy = -1;
  private t = 0;
  private lean = 0;

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
    const f = dirToVector(this.dir);
    this.fx = f.x;
    this.fy = f.y;
    this.t = this.animTime;
    this.draw();
  }

  private draw() {
    const g = this.g;
    g.clear();

    // 落地阴影
    g.fillColor = C_SHADOW;
    g.ellipse(0, 0, 17, 7);
    g.fill();

    if (this.state === CharState.Sit) this.drawSitting();
    else this.drawStanding();

    this.drawFacingArrow();
  }

  /* ================= 站立 / 走路 / 奔跑 ================= */

  private drawStanding() {
    const { g, fx, fy, t } = this;
    let legSwing = 0;
    let armSwing = 0;
    let bob = 0;
    let breath = 0;
    let flow = 0;        // 飘带/衣摆后飘强度
    let phase = 0;

    if (this.state === CharState.Walk) {
      phase = t * 8;
      legSwing = Math.sin(phase) * 9;
      armSwing = -Math.sin(phase) * 7;
      bob = Math.abs(Math.cos(phase)) * 2;
      this.lean = 0;
      flow = 10;
    } else if (this.state === CharState.Run) {
      phase = t * 13;
      legSwing = Math.sin(phase) * 16;
      armSwing = -Math.sin(phase) * 13;
      bob = Math.abs(Math.cos(phase)) * 4;
      this.lean = fx * 5;
      flow = 22;
    } else {
      breath = Math.sin(t * 2.6) * 1.5;
      this.lean = 0;
      flow = 0;
    }
    const lean = this.lean;

    const beltY = 42 + bob + breath * 0.4;
    const shoulderY = 64 + bob + breath;
    const headX = fx * 4 + lean;
    const headY = 78 + bob + breath;

    // —— 发带飘带（最远层，先画）——
    this.drawHairRibbon(headX, headY + 11.5, flow, phase);

    // —— 背负长剑：面向镜头时整把剑画在最底层（被身体遮挡），
    //    背向镜头时才压在袍上（见下方 swordFront 分支）——
    const swordFront = fy > 0;
    if (!swordFront) {
      this.drawSheath(lean, bob + breath);
      this.drawHilt(lean, bob + breath, flow, phase);
    }

    // —— 双腿（袍裙下露出的小腿与靴）——
    const stepX = fx * legSwing;
    const stepY = fy * legSwing * 0.45;
    g.strokeColor = C_BOOT;
    g.lineWidth = 6;
    g.moveTo(-5, beltY - 20);
    g.lineTo(-5 - stepX, 1 + Math.max(0, stepY));
    g.stroke();
    g.moveTo(5, beltY - 20);
    g.lineTo(5 + stepX, 1 + Math.max(0, -stepY));
    g.stroke();

    // —— 袍裙（下摆随动作摆动 / 奔跑后飘）——
    const sway = this.state === CharState.Idle
      ? Math.sin(t * 1.2) * 1.2
      : Math.sin(phase) * 2.5;
    const trail = -fx * (this.state === CharState.Run ? 5 : 0);
    g.fillColor = C_ROBE_DARK;
    g.moveTo(-11 + lean * 0.3, beltY);
    g.lineTo(11 + lean * 0.3, beltY);
    g.lineTo(17 + sway + trail, 15);
    g.lineTo(-17 + sway + trail, 15);
    g.close();
    g.fill();
    // 下摆滚边
    g.strokeColor = C_TRIM;
    g.lineWidth = 2;
    g.moveTo(-17 + sway + trail, 15);
    g.lineTo(17 + sway + trail, 15);
    g.stroke();
    // 前襟开衩（面向镜头时可见）
    if (fy < 0) {
      g.strokeColor = C_ROBE;
      g.lineWidth = 1.5;
      g.moveTo(lean * 0.3 + fx * 2, beltY - 2);
      g.lineTo(sway * 0.6 + trail + fx * 2, 16);
      g.stroke();
    }

    // —— 远侧手臂（宽袖）——
    this.drawSleeveArm(-1, shoulderY, lean, armSwing, C_ROBE_DARK);

    // —— 上身 ——
    g.fillColor = C_ROBE;
    g.moveTo(-11 + lean * 0.4, beltY - 1);
    g.lineTo(11 + lean * 0.4, beltY - 1);
    g.lineTo(9 + lean, shoulderY + 2);
    g.lineTo(-9 + lean, shoulderY + 2);
    g.close();
    g.fill();

    // —— 交领 ——
    this.drawCollar(lean, beltY, shoulderY);

    // —— 腰带与绦带 ——
    this.drawSash(lean, beltY, flow, phase);

    // —— 近侧手臂（宽袖）——
    this.drawSleeveArm(1, shoulderY, lean, armSwing, C_ROBE);

    // —— 头部 ——
    this.drawHead(headX, headY, false);

    // —— 背面视角：剑离镜头最近，最后画（压在袍与后脑上）——
    if (swordFront) {
      this.drawSheath(lean, bob + breath);
      this.drawHilt(lean, bob + breath, flow, phase);
    }
  }

  /** 宽袖手臂。side: 1 近侧(右) / -1 远侧(左) */
  private drawSleeveArm(side: number, shoulderY: number, lean: number, armSwing: number, color: Color) {
    const { g, fx, fy } = this;
    const sx = side * 9 + lean;
    const sy = shoulderY;
    // 手的位置：垂在腰侧，移动时沿行进方向前后摆
    const swing = armSwing * side;
    const ex = side * 13 + lean + fx * swing * 0.8;
    const ey = shoulderY - 24 + fy * swing * 0.3;

    // 袖身（肩窄、袖口宽的喇叭形）
    const dx = ex - sx;
    const dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * 5; // 袖口半宽方向
    const py = (dx / len) * 5;
    g.fillColor = color;
    g.moveTo(sx - px * 0.4, sy - py * 0.4);
    g.lineTo(sx + px * 0.4, sy + py * 0.4);
    g.lineTo(ex + px, ey + py);
    g.lineTo(ex - px, ey - py);
    g.close();
    g.fill();
    // 袖口滚边
    g.strokeColor = C_TRIM;
    g.lineWidth = 1.8;
    g.moveTo(ex + px, ey + py);
    g.lineTo(ex - px, ey - py);
    g.stroke();
    // 手
    g.fillColor = C_SKIN;
    g.circle(ex + (dx / len) * 2.5, ey + (dy / len) * 2.5, 2.6);
    g.fill();
  }

  /** 交领：正面 V 形滚边，背面横领，侧面单边 */
  private drawCollar(lean: number, beltY: number, shoulderY: number) {
    const { g, fx, fy } = this;
    g.strokeColor = C_TRIM;
    g.lineWidth = 2.5;
    if (fy < 0) {
      // 正面：右衽交领
      g.moveTo(-6 + lean, shoulderY);
      g.lineTo(1 + lean * 0.7, beltY + 4);
      g.stroke();
      g.moveTo(6 + lean, shoulderY);
      g.lineTo(0 + lean * 0.7, beltY + 7);
      g.stroke();
    } else if (fy > 0) {
      // 背面：后领横线
      g.moveTo(-6 + lean, shoulderY);
      g.lineTo(6 + lean, shoulderY);
      g.stroke();
    } else {
      // 侧面：单边领线
      g.moveTo(fx * 2 + lean, shoulderY);
      g.lineTo(fx * 7 + lean, beltY + 6);
      g.stroke();
    }
  }

  /** 腰带 + 结 + 双垂绦带（随移动后飘） */
  private drawSash(lean: number, beltY: number, flow: number, phase: number) {
    const { g, fx, t } = this;
    g.fillColor = C_SASH;
    g.rect(-11 + lean * 0.4, beltY - 1, 22, 5);
    g.fill();
    g.fillColor = C_GOLD;
    g.rect(-2 + lean * 0.4, beltY - 0.5, 4, 4);
    g.fill();

    // 垂带：静止轻摆，移动时向行进反方向飘
    const drift = flow > 0 ? -fx * flow * 0.45 + Math.sin(phase) * 2 : Math.sin(t * 1.5) * 2;
    const knotX = lean * 0.4 + fx * 3;
    g.strokeColor = C_SASH;
    g.lineWidth = 2.5;
    g.moveTo(knotX - 1.5, beltY);
    g.quadraticCurveTo(knotX - 2 + drift * 0.4, beltY - 12, knotX - 3 + drift, beltY - 22);
    g.stroke();
    g.moveTo(knotX + 1.5, beltY);
    g.quadraticCurveTo(knotX + 2 + drift * 0.5, beltY - 10, knotX + 3 + drift * 0.8, beltY - 19);
    g.stroke();
  }

  /** 背上的剑鞘（左腰至右肩的斜背） */
  private drawSheath(lean: number, lift: number) {
    const { g, fx, fy } = this;
    // 剑鞘锚点：身体背面，偏离面向的反方向
    const bx = -fx * 6 + lean * 0.5;
    const x1 = bx - 7;
    const y1 = 36 + lift;
    const x2 = bx + 6;
    const y2 = 68 + lift;
    g.strokeColor = C_SHEATH;
    g.lineWidth = 5;
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
    // 鞘尾镖（金属包头）
    g.strokeColor = C_GOLD;
    g.lineWidth = 5;
    g.moveTo(x1, y1);
    g.lineTo(x1 + 2.5, y1 + 6);
    g.stroke();
    // 背向镜头时能看到鞘上的束带
    if (fy > 0) {
      g.strokeColor = C_SASH;
      g.lineWidth = 2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      g.moveTo(mx - 4, my + 3);
      g.lineTo(mx + 4, my - 3);
      g.stroke();
    }
  }

  /** 剑柄、剑格、剑穗（露在右肩上方） */
  private drawHilt(lean: number, lift: number, flow: number, phase: number) {
    const { g, fx, t } = this;
    const bx = -fx * 6 + lean * 0.5;
    const gx = bx + 6;          // 剑格位置（鞘口）
    const gy = 68 + lift;
    const hx = gx + 5;          // 柄首
    const hy = gy + 9;
    // 剑格
    g.fillColor = C_GOLD;
    g.ellipse(gx, gy, 3, 2);
    g.fill();
    // 缠绳剑柄
    g.strokeColor = C_SASH;
    g.lineWidth = 3;
    g.moveTo(gx + 1, gy + 2);
    g.lineTo(hx, hy);
    g.stroke();
    // 柄首
    g.fillColor = C_GOLD;
    g.circle(hx + 0.8, hy + 1.5, 1.8);
    g.fill();
    // 剑穗
    const sway = flow > 0 ? -fx * flow * 0.3 + Math.sin(phase * 1.2) * 1.5 : Math.sin(t * 2) * 1.5;
    g.strokeColor = C_SASH;
    g.lineWidth = 1.5;
    g.moveTo(hx + 1, hy);
    g.quadraticCurveTo(hx + 2 + sway * 0.5, hy - 5, hx + 1.5 + sway, hy - 9);
    g.stroke();
    g.fillColor = C_SASH;
    g.circle(hx + 1.5 + sway, hy - 10, 1.4);
    g.fill();
  }

  /** 发带飘带（从发髻向后飘出两条） */
  private drawHairRibbon(headX: number, bunY: number, flow: number, phase: number) {
    const { g, fx, fy, t } = this;
    // 静止：自然下垂轻摆；移动：向行进反方向水平飘
    const driftX = flow > 0 ? -fx * flow : Math.sin(t * 1.6) * 3;
    const driftY = flow > 0 ? -6 - fy * flow * 0.4 + Math.sin(phase * 1.3) * 2 : -12;
    g.strokeColor = C_SASH;
    g.lineWidth = 2;
    g.moveTo(headX, bunY);
    g.quadraticCurveTo(headX + driftX * 0.5, bunY + driftY * 0.5 + 2, headX + driftX, bunY + driftY);
    g.stroke();
    g.moveTo(headX, bunY - 1);
    g.quadraticCurveTo(headX + driftX * 0.4, bunY + driftY * 0.45 - 2, headX + driftX * 0.85, bunY + driftY - 5);
    g.stroke();
  }

  /** 头部：束发武生头 + 按朝向显示面容 */
  private drawHead(x: number, y: number, eyesClosed: boolean) {
    const { g, fx, fy } = this;

    // 后层头发
    g.fillColor = C_HAIR;
    g.circle(x, y + 1.5, 10);
    g.fill();
    // 面部（背向镜头时不画 → 整个后脑勺）
    if (fy <= 0) {
      g.fillColor = C_SKIN;
      g.circle(x + fx * 2.2, y - 1.4, 8.6);
      g.fill();
    } else {
      // 后颈
      g.fillColor = C_SKIN;
      g.rect(x - 2.5, y - 11, 5, 4);
      g.fill();
    }
    // 发髻与金簪（贴在头顶）
    g.fillColor = C_HAIR;
    g.circle(x, y + 11, 4.2);
    g.fill();
    g.strokeColor = C_GOLD;
    g.lineWidth = 1.6;
    g.moveTo(x - 5.5, y + 11.8);
    g.lineTo(x + 5.5, y + 10.5);
    g.stroke();

    if (fy > 0) return;

    // 眉与眼
    const faceX = x + fx * 2.2;
    const eyeY = y - 1;
    const drawEye = (ex: number) => {
      if (eyesClosed) {
        g.strokeColor = C_EYE;
        g.lineWidth = 1.4;
        g.moveTo(ex - 1.8, eyeY);
        g.lineTo(ex + 1.8, eyeY);
        g.stroke();
      } else {
        g.fillColor = C_EYE;
        g.circle(ex, eyeY, 1.3);
        g.fill();
      }
      // 剑眉
      g.strokeColor = C_HAIR;
      g.lineWidth = 1.3;
      g.moveTo(ex - 2.2, eyeY + 3.6);
      g.lineTo(ex + 2, eyeY + 4.6);
      g.stroke();
    };
    if (fy < 0) {
      drawEye(faceX - 3.6 + fx * 1.5);
      drawEye(faceX + 3.6 + fx * 1.5);
    } else {
      drawEye(faceX + fx * 4.5); // 纯侧面单眼
    }
  }

  /* ================= 打坐 ================= */

  private drawSitting() {
    const { g, fx, fy, t } = this;
    const breath = Math.sin(t * 1.8) * 1.2;

    // 入定灵气：双环脉动
    const pulse = (Math.sin(t * 2.4) + 1) / 2;
    C_AURA.a = 36 + pulse * 50;
    g.strokeColor = C_AURA;
    g.lineWidth = 2;
    g.ellipse(0, 4, 27 + pulse * 4, 11 + pulse * 2);
    g.stroke();
    C_AURA.a = 22 + (1 - pulse) * 36;
    g.ellipse(0, 4, 34 + (1 - pulse) * 4, 14 + (1 - pulse) * 2);
    g.stroke();

    // 发带（静坐垂落轻摆）
    const headX = fx * 2.5;
    const headY = 58 + breath;
    this.drawHairRibbon(headX, headY + 11.5, 0, 0);

    // 铺地袍摆
    g.fillColor = C_ROBE_DARK;
    g.ellipse(0, 8, 19, 8.5);
    g.fill();
    g.strokeColor = C_TRIM;
    g.lineWidth = 1.6;
    g.ellipse(0, 8, 19, 8.5);
    g.stroke();

    // 上身
    const beltY = 26 + breath * 0.4;
    const shoulderY = 46 + breath;
    g.fillColor = C_ROBE;
    g.moveTo(-12, 10);
    g.lineTo(12, 10);
    g.lineTo(8, shoulderY);
    g.lineTo(-8, shoulderY);
    g.close();
    g.fill();
    this.drawCollar(0, beltY, shoulderY);
    // 腰带
    g.fillColor = C_SASH;
    g.rect(-10, beltY - 1, 20, 4);
    g.fill();

    // 双袖收于身前，双手结印
    g.fillColor = C_ROBE;
    g.moveTo(-8, shoulderY - 2);
    g.lineTo(-2, 20);
    g.lineTo(4, 22);
    g.lineTo(-4, shoulderY - 6);
    g.close();
    g.fill();
    g.moveTo(8, shoulderY - 2);
    g.lineTo(2, 20);
    g.lineTo(-4, 22);
    g.lineTo(4, shoulderY - 6);
    g.close();
    g.fill();
    g.fillColor = C_SKIN;
    g.circle(-1.5, 20, 2.4);
    g.circle(2, 20.5, 2.4);
    g.fill();

    // 长剑横膝
    g.strokeColor = C_SHEATH;
    g.lineWidth = 4;
    g.moveTo(-18, 16);
    g.lineTo(12, 16.5);
    g.stroke();
    g.strokeColor = C_GOLD;
    g.lineWidth = 4;
    g.moveTo(-18, 16);
    g.lineTo(-15, 16);
    g.stroke();
    g.fillColor = C_GOLD;
    g.ellipse(12.5, 16.5, 2.4, 1.8);
    g.fill();
    g.strokeColor = C_SASH;
    g.lineWidth = 2.6;
    g.moveTo(14, 16.5);
    g.lineTo(20, 16.8);
    g.stroke();
    g.fillColor = C_GOLD;
    g.circle(21.2, 16.8, 1.6);
    g.fill();

    // 头（闭目入定）
    this.drawHead(headX, headY, true);
  }

  /** 脚下朝向指示箭头（按地面透视压扁） */
  private drawFacingArrow() {
    const { g, fx, fy } = this;
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
