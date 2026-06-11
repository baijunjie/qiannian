import { PartPainter, sleeveTo } from './types';

/** 交领长袍：裙摆 / 上身（含领口腰带绦带）/ 远近双袖 */
export const clothes_robe: PartPainter = {
  /* —— 裙摆 —— */
  skirt(g, pose, s) {
    if (pose.sitting) {
      // 铺地袍摆
      g.fillColor = s.c.robeDark;
      g.ellipse(0, 8, 19, 8.5);
      g.fill();
      g.strokeColor = s.c.trim;
      g.lineWidth = 1.6;
      g.ellipse(0, 8, 19, 8.5);
      g.stroke();
      return;
    }
    const { beltY, lean, skirtSway: sway, skirtTrail: trail, fx, fy } = pose;
    g.fillColor = s.c.robeDark;
    g.moveTo(-11 + lean * 0.3, beltY);
    g.lineTo(11 + lean * 0.3, beltY);
    g.lineTo(17 + sway + trail, 15);
    g.lineTo(-17 + sway + trail, 15);
    g.close();
    g.fill();
    g.strokeColor = s.c.trim;
    g.lineWidth = 2;
    g.moveTo(-17 + sway + trail, 15);
    g.lineTo(17 + sway + trail, 15);
    g.stroke();
    // 前襟开衩（面向镜头时可见）
    if (fy < 0 && !pose.attack) {
      g.strokeColor = s.c.robe;
      g.lineWidth = 1.5;
      g.moveTo(lean * 0.3 + fx * 2, beltY - 2);
      g.lineTo(sway * 0.6 + trail + fx * 2, 16);
      g.stroke();
    }
  },

  /* —— 上身 + 交领 + 腰带绦带 —— */
  torso(g, pose, s) {
    const { beltY, shoulderY, lean, fx, fy, flow, phase, t } = pose;

    if (pose.sitting) {
      g.fillColor = s.c.robe;
      g.moveTo(-12, 10);
      g.lineTo(12, 10);
      g.lineTo(8, shoulderY);
      g.lineTo(-8, shoulderY);
      g.close();
      g.fill();
    } else {
      g.fillColor = s.c.robe;
      g.moveTo(-11 + lean * 0.4, beltY - 1);
      g.lineTo(11 + lean * 0.4, beltY - 1);
      g.lineTo(9 + lean, shoulderY + 2);
      g.lineTo(-9 + lean, shoulderY + 2);
      g.close();
      g.fill();
    }

    // 交领
    g.strokeColor = s.c.trim;
    g.lineWidth = 2.5;
    if (fy < 0) {
      g.moveTo(-6 + lean, shoulderY);
      g.lineTo(1 + lean * 0.7, beltY + 4);
      g.stroke();
      g.moveTo(6 + lean, shoulderY);
      g.lineTo(0 + lean * 0.7, beltY + 7);
      g.stroke();
    } else if (fy > 0) {
      g.moveTo(-6 + lean, shoulderY);
      g.lineTo(6 + lean, shoulderY);
      g.stroke();
    } else {
      g.moveTo(fx * 2 + lean, shoulderY);
      g.lineTo(fx * 7 + lean, beltY + 6);
      g.stroke();
    }

    // 腰带
    g.fillColor = s.c.sash;
    if (pose.sitting) {
      g.rect(-10, beltY - 1, 20, 4);
      g.fill();
      return;
    }
    g.rect(-11 + lean * 0.4, beltY - 1, 22, 5);
    g.fill();
    g.fillColor = s.c.gold;
    g.rect(-2 + lean * 0.4, beltY - 0.5, 4, 4);
    g.fill();

    // 垂绦带：静止轻摆，移动时向行进反方向飘
    const drift = flow > 0 ? -fx * flow * 0.45 + Math.sin(phase) * 2 : Math.sin(t * 1.5) * 2;
    const knotX = lean * 0.4 + fx * 3;
    g.strokeColor = s.c.sash;
    g.lineWidth = 2.5;
    g.moveTo(knotX - 1.5, beltY);
    g.quadraticCurveTo(knotX - 2 + drift * 0.4, beltY - 12, knotX - 3 + drift, beltY - 22);
    g.stroke();
    g.moveTo(knotX + 1.5, beltY);
    g.quadraticCurveTo(knotX + 2 + drift * 0.5, beltY - 10, knotX + 3 + drift * 0.8, beltY - 19);
    g.stroke();
  },

  /* —— 远侧手臂 —— */
  armFar(g, pose, s) {
    const { shoulderY, lean } = pose;
    if (pose.sitting) {
      // 左袖收于身前
      g.fillColor = s.c.robe;
      g.moveTo(-8, shoulderY - 2);
      g.lineTo(-2, 20);
      g.lineTo(4, 22);
      g.lineTo(-4, shoulderY - 6);
      g.close();
      g.fill();
      g.fillColor = s.c.skin;
      g.circle(-1.5, 20, 2.4);
      g.fill();
      return;
    }
    const swing = pose.attack ? -9 : pose.armSwing;
    const sx = -9 + lean;
    const ex = -13 + lean + pose.fx * -swing * 0.8;
    const ey = shoulderY - 24 + pose.fy * -swing * 0.3;
    sleeveTo(g, s, sx, shoulderY, ex, ey, s.c.robeDark);
  },

  /* —— 近侧手臂（攻击时由武器画笔负责持械臂）—— */
  armNear(g, pose, s) {
    const { shoulderY, lean } = pose;
    if (pose.sitting) {
      g.fillColor = s.c.robe;
      g.moveTo(8, shoulderY - 2);
      g.lineTo(2, 20);
      g.lineTo(-4, 22);
      g.lineTo(4, shoulderY - 6);
      g.close();
      g.fill();
      g.fillColor = s.c.skin;
      g.circle(2, 20.5, 2.4);
      g.fill();
      return;
    }
    if (pose.attack) return; // 持械臂交给 weapon:active
    const swing = pose.armSwing;
    const sx = 9 + lean;
    const ex = 13 + lean + pose.fx * swing * 0.8;
    const ey = shoulderY - 24 + pose.fy * swing * 0.3;
    sleeveTo(g, s, sx, shoulderY, ex, ey, s.c.robe);
  },
};
