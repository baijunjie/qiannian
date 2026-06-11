import { Graphics } from 'cc';
import { Pose } from '../../core/rig';
import { AvatarStyle, PartPainter } from './types';

/** 飘带通用算式：静止下垂轻摆，移动时向行进反方向飘 */
function ribbonDrift(pose: Pose) {
  const { fx, fy, flow, phase, t } = pose;
  const driftX = flow > 0 ? -fx * flow : Math.sin(t * 1.6) * 3;
  const driftY = flow > 0 ? -6 - fy * flow * 0.4 + Math.sin(phase * 1.3) * 2 : -12;
  return { driftX, driftY };
}

function bunPos(pose: Pose) {
  return { x: pose.headX, y: pose.headY + 11 };
}

/* —— 束发金簪：发髻 + 金簪 + 双飘带 —— */
export const hair_topknot: PartPainter = {
  ribbon(g, pose, s) {
    const { x, y } = bunPos(pose);
    const { driftX, driftY } = ribbonDrift(pose);
    g.strokeColor = s.c.sash;
    g.lineWidth = 2;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + driftX * 0.5, y + driftY * 0.5 + 2, x + driftX, y + driftY);
    g.stroke();
    g.moveTo(x, y - 1);
    g.quadraticCurveTo(x + driftX * 0.4, y + driftY * 0.45 - 2, x + driftX * 0.85, y + driftY - 5);
    g.stroke();
  },
  main(g, pose, s) {
    const { x, y } = bunPos(pose);
    g.fillColor = s.c.hair;
    g.circle(x, y, 4.2);
    g.fill();
    g.strokeColor = s.c.gold;
    g.lineWidth = 1.6;
    g.moveTo(x - 5.5, y + 0.8);
    g.lineTo(x + 5.5, y - 0.5);
    g.stroke();
  },
};

/* —— 高马尾：束带 + 长发束随动作甩动 —— */
export const hair_ponytail: PartPainter = {
  ribbon(g, pose, s) {
    const { x, y } = bunPos(pose);
    const { driftX, driftY } = ribbonDrift(pose);
    // 长发束（比飘带粗，垂得更长）
    g.strokeColor = s.c.hair;
    g.lineWidth = 4.5;
    g.moveTo(x, y - 1);
    g.quadraticCurveTo(
      x + driftX * 0.6, y + driftY * 0.6 - 4,
      x + driftX * 1.1, y + driftY - 14,
    );
    g.stroke();
    // 发梢
    g.strokeColor = s.c.hair;
    g.lineWidth = 2.5;
    g.moveTo(x + driftX * 1.1, y + driftY - 14);
    g.lineTo(x + driftX * 1.25, y + driftY - 20);
    g.stroke();
  },
  main(g, pose, s) {
    const { x, y } = bunPos(pose);
    // 扎发束带
    g.fillColor = s.c.sash;
    g.circle(x, y - 1, 3);
    g.fill();
  },
};

/* —— 短发巾帻：额带 + 侧结，无长飘带 —— */
export const hair_scarf: PartPainter = {
  ribbon(g, pose, s) {
    if (pose.fy < 0) return; // 结带在脑后，面向镜头时不可见
    const { x, y } = bunPos(pose);
    const { driftX, driftY } = ribbonDrift(pose);
    g.strokeColor = s.c.trim;
    g.lineWidth = 1.8;
    g.moveTo(x, y - 4);
    g.quadraticCurveTo(x + driftX * 0.3, y + driftY * 0.3, x + driftX * 0.5, y + driftY * 0.5 - 2);
    g.stroke();
  },
  main(g, pose, s) {
    const { headX: x, headY: y, fx, fy } = pose;
    // 短发蓬层
    g.fillColor = s.c.hair;
    g.circle(x - 4, y + 8, 4);
    g.circle(x + 4, y + 8, 4);
    g.circle(x, y + 9.5, 4.5);
    g.fill();
    // 额带（面向镜头时横过前额）
    g.strokeColor = s.c.trim;
    g.lineWidth = 2.6;
    if (fy <= 0) {
      g.moveTo(x - 8.5 + fx * 2, y + 3.5);
      g.lineTo(x + 8.5 + fx * 2, y + 3.5);
      g.stroke();
    } else {
      g.moveTo(x - 8.5, y + 2);
      g.lineTo(x + 8.5, y + 2);
      g.stroke();
    }
  },
};
