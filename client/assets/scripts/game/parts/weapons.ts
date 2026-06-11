import { Color, Graphics } from 'cc';
import { Pose } from '../../core/rig';
import { AvatarStyle, PartPainter, sleeveTo } from './types';

const C_SLASH = new Color(255, 255, 255, 0);

/**
 * 挥击中的武器是否处于身体远端（剑尖指向画面上方）。
 * 远端 → 画在躯干之后（weapon:activeBehind），近端 → 最上层（weapon:active）。
 */
function bladeBehindBody(pose: Pose): boolean {
  return !!pose.attack && Math.sin(pose.attack.ang) > 0.15;
}

/** 刀光扇面 / 突刺残影（剑刀共用） */
function drawSlashFx(g: Graphics, pose: Pose) {
  const atk = pose.attack!;
  const { pivotX: px, pivotY: py, ang, theta, p, step } = atk;
  if (p >= 0.6) return;
  if (step < 2) {
    const trail = step === 0 ? 0.7 : -0.7;
    C_SLASH.a = Math.round((1 - p / 0.6) * 110);
    g.fillColor = C_SLASH;
    g.moveTo(px, py);
    const R = 42;
    for (let k = 0; k <= 6; k++) {
      const a2 = ang + trail * (1 - k / 6);
      g.lineTo(px + Math.cos(a2) * R, py + Math.sin(a2) * R * 0.55);
    }
    g.close();
    g.fill();
  } else {
    C_SLASH.a = Math.round((1 - p / 0.6) * 150);
    g.strokeColor = C_SLASH;
    g.lineWidth = 1.6;
    const nx = -Math.sin(theta) * 4;
    const ny = Math.cos(theta) * 4 * 0.55;
    for (const sgn of [-1, 1]) {
      g.moveTo(px + nx * sgn + Math.cos(theta) * 10, py + ny * sgn + Math.sin(theta) * 10 * 0.55);
      g.lineTo(px + nx * sgn + Math.cos(theta) * 40, py + ny * sgn + Math.sin(theta) * 40 * 0.55);
      g.stroke();
    }
  }
}

/** 持械臂（攻击时由武器画笔接管近侧手臂） */
function drawWeaponArm(g: Graphics, pose: Pose, s: AvatarStyle) {
  const atk = pose.attack!;
  sleeveTo(g, s, 9 + pose.lean, pose.shoulderY, atk.handX, atk.handY, s.c.robe);
}

/** 背负剑鞘（lift 跟随呼吸/颠簸由挂点承担） */
function drawSheathBody(g: Graphics, pose: Pose, s: AvatarStyle, wide: boolean) {
  const { fx, fy, lean } = pose;
  const lift = pose.shoulderY - 64;
  const bx = -fx * 6 + lean * 0.5;
  const x1 = bx - 7;
  const y1 = 36 + lift;
  const x2 = bx + 6;
  const y2 = 68 + lift;
  g.strokeColor = s.c.sheath;
  g.lineWidth = wide ? 6.5 : 5;
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke();
  g.strokeColor = s.c.gold;
  g.lineWidth = wide ? 6.5 : 5;
  g.moveTo(x1, y1);
  g.lineTo(x1 + 2.5, y1 + 6);
  g.stroke();
  if (fy > 0) {
    g.strokeColor = s.c.sash;
    g.lineWidth = 2;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    g.moveTo(mx - 4, my + 3);
    g.lineTo(mx + 4, my - 3);
    g.stroke();
  }
}

/** 鞘口剑柄 + 剑穗（收剑状态） */
function drawHiltOnBack(g: Graphics, pose: Pose, s: AvatarStyle, ring: boolean) {
  const { fx, lean, flow, phase, t } = pose;
  const lift = pose.shoulderY - 64;
  const bx = -fx * 6 + lean * 0.5;
  const gx = bx + 6;
  const gy = 68 + lift;
  const hx = gx + 5;
  const hy = gy + 9;
  g.fillColor = s.c.gold;
  g.ellipse(gx, gy, 3, 2);
  g.fill();
  g.strokeColor = s.c.sash;
  g.lineWidth = 3;
  g.moveTo(gx + 1, gy + 2);
  g.lineTo(hx, hy);
  g.stroke();
  if (ring) {
    // 刀的环首
    g.strokeColor = s.c.gold;
    g.lineWidth = 1.5;
    g.circle(hx + 1, hy + 2, 2.2);
    g.stroke();
  } else {
    g.fillColor = s.c.gold;
    g.circle(hx + 0.8, hy + 1.5, 1.8);
    g.fill();
    // 剑穗
    const sway = flow > 0 ? -fx * flow * 0.3 + Math.sin(phase * 1.2) * 1.5 : Math.sin(t * 2) * 1.5;
    g.strokeColor = s.c.sash;
    g.lineWidth = 1.5;
    g.moveTo(hx + 1, hy);
    g.quadraticCurveTo(hx + 2 + sway * 0.5, hy - 5, hx + 1.5 + sway, hy - 9);
    g.stroke();
    g.fillColor = s.c.sash;
    g.circle(hx + 1.5 + sway, hy - 10, 1.4);
    g.fill();
  }
}

/** 打坐：兵器横膝 */
function drawLapWeapon(g: Graphics, pose: Pose, s: AvatarStyle, wide: boolean) {
  g.strokeColor = s.c.sheath;
  g.lineWidth = wide ? 5 : 4;
  g.moveTo(-18, 16);
  g.lineTo(12, 16.5);
  g.stroke();
  g.strokeColor = s.c.gold;
  g.lineWidth = wide ? 5 : 4;
  g.moveTo(-18, 16);
  g.lineTo(-15, 16);
  g.stroke();
  g.fillColor = s.c.gold;
  g.ellipse(12.5, 16.5, 2.4, 1.8);
  g.fill();
  g.strokeColor = s.c.sash;
  g.lineWidth = 2.6;
  g.moveTo(14, 16.5);
  g.lineTo(20, 16.8);
  g.stroke();
  g.fillColor = s.c.gold;
  g.circle(21.2, 16.8, 1.6);
  g.fill();
}

/** 长剑出鞘挥击（持械臂 + 刀光 + 剑身） */
function drawJianActive(g: Graphics, pose: Pose, s: AvatarStyle) {
  const atk = pose.attack!;
  drawSlashFx(g, pose);
  drawWeaponArm(g, pose, s);
  const { handX: hx, handY: hy, ang } = atk;
  const bdx = Math.cos(ang);
  const bdy = Math.sin(ang) * 0.55;
  g.strokeColor = s.c.sash;
  g.lineWidth = 2.5;
  g.moveTo(hx, hy);
  g.lineTo(hx - bdx * 4, hy - bdy * 4);
  g.stroke();
  g.fillColor = s.c.gold;
  g.ellipse(hx + bdx * 3, hy + bdy * 3, 2.2, 1.6);
  g.fill();
  g.strokeColor = s.c.blade;
  g.lineWidth = 3;
  g.moveTo(hx + bdx * 5, hy + bdy * 5);
  g.lineTo(hx + bdx * 30, hy + bdy * 30);
  g.stroke();
  g.lineWidth = 1.5;
  g.moveTo(hx + bdx * 30, hy + bdy * 30);
  g.lineTo(hx + bdx * 34, hy + bdy * 34);
  g.stroke();
}

/* —— 长剑 —— */
export const weapon_jian: PartPainter = {
  sheathed(g, pose, s) {
    if (pose.sitting) { drawLapWeapon(g, pose, s, false); return; }
    drawSheathBody(g, pose, s, false);
    if (!pose.attack) drawHiltOnBack(g, pose, s, false); // 出招时剑在手，背上只剩空鞘
  },
  activeBehind(g, pose, s) {
    if (pose.attack && bladeBehindBody(pose)) drawJianActive(g, pose, s);
  },
  active(g, pose, s) {
    if (pose.attack && !bladeBehindBody(pose)) drawJianActive(g, pose, s);
  },
};

/** 单刀挥击（弯刃 + 环首） */
function drawDaoActive(g: Graphics, pose: Pose, s: AvatarStyle) {
  const atk = pose.attack!;
  drawSlashFx(g, pose);
  drawWeaponArm(g, pose, s);
  const { handX: hx, handY: hy, ang } = atk;
  const bdx = Math.cos(ang);
  const bdy = Math.sin(ang) * 0.55;
  // 护手盘
  g.fillColor = s.c.gold;
  g.ellipse(hx + bdx * 3, hy + bdy * 3, 2.8, 2);
  g.fill();
  // 弯刃（背厚刃曲）
  const nx = -Math.sin(ang) * 3;
  const ny = Math.cos(ang) * 3 * 0.55;
  g.strokeColor = s.c.blade;
  g.lineWidth = 4.5;
  g.moveTo(hx + bdx * 5, hy + bdy * 5);
  g.quadraticCurveTo(
    hx + bdx * 18 + nx, hy + bdy * 18 + ny,
    hx + bdx * 30 + nx * 2, hy + bdy * 30 + ny * 2,
  );
  g.stroke();
  // 环首
  g.strokeColor = s.c.gold;
  g.lineWidth = 1.6;
  g.circle(hx - bdx * 4, hy - bdy * 4, 2.4);
  g.stroke();
}

/* —— 单刀：宽背弯刃、环首 —— */
export const weapon_dao: PartPainter = {
  sheathed(g, pose, s) {
    if (pose.sitting) { drawLapWeapon(g, pose, s, true); return; }
    drawSheathBody(g, pose, s, true);
    if (!pose.attack) drawHiltOnBack(g, pose, s, true);
  },
  activeBehind(g, pose, s) {
    if (pose.attack && bladeBehindBody(pose)) drawDaoActive(g, pose, s);
  },
  active(g, pose, s) {
    if (pose.attack && !bladeBehindBody(pose)) drawDaoActive(g, pose, s);
  },
};

/** 空手拳击 */
function drawFistActive(g: Graphics, pose: Pose, s: AvatarStyle) {
  const atk = pose.attack!;
  const { p, step, theta } = atk;
  // 拳的伸展比持械更靠前
  const punch = 10 + Math.sin(Math.min(1, p) * Math.PI) * (step === 2 ? 22 : 14);
  const hx = atk.pivotX + Math.cos(atk.ang) * punch;
  const hy = atk.pivotY + Math.sin(atk.ang) * punch * 0.55;
  // 拳风
  if (p < 0.5) {
    C_SLASH.a = Math.round((1 - p / 0.5) * 120);
    g.strokeColor = C_SLASH;
    g.lineWidth = 2;
    g.circle(hx + Math.cos(theta) * 6, hy + Math.sin(theta) * 6 * 0.55, 4 + p * 10);
    g.stroke();
  }
  sleeveTo(g, s, 9 + pose.lean, pose.shoulderY, hx, hy, s.c.robe);
  // 攥起的拳
  g.fillColor = s.c.skin;
  g.circle(hx + Math.cos(atk.ang) * 2, hy + Math.sin(atk.ang) * 2, 3.4);
  g.fill();
}

/* —— 空手：拳击 —— */
export const weapon_none: PartPainter = {
  sheathed() { /* 无佩械 */ },
  activeBehind(g, pose, s) {
    if (pose.attack && bladeBehindBody(pose)) drawFistActive(g, pose, s);
  },
  active(g, pose, s) {
    if (pose.attack && !bladeBehindBody(pose)) drawFistActive(g, pose, s);
  },
};
