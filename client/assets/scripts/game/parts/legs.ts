import { PartPainter } from './types';

/** 下装：长靴。打坐时被袍摆盖住不画。 */
export const legs_boots: PartPainter = {
  main(g, pose, s) {
    if (pose.sitting) return;
    g.strokeColor = s.c.boot;
    g.lineWidth = 6;
    const topY = pose.beltY - 20;
    if (pose.attack) {
      // 出招弓步
      g.moveTo(-5, topY);
      g.lineTo(-7 - pose.fx * 2.5, 1);
      g.stroke();
      g.moveTo(5, topY);
      g.lineTo(7 + pose.fx * 2.5, 1);
      g.stroke();
      return;
    }
    const stepX = pose.fx * pose.legSwing;
    const stepY = pose.fy * pose.legSwing * 0.45;
    g.moveTo(-5, topY);
    g.lineTo(-5 - stepX, 1 + Math.max(0, stepY));
    g.stroke();
    g.moveTo(5, topY);
    g.lineTo(5 + stepX, 1 + Math.max(0, -stepY));
    g.stroke();
  },
};
