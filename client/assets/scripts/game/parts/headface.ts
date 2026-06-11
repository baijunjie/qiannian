import { PartPainter } from './types';

/** 头部底：后发圆 + 面部皮肤 / 背向时的后颈 */
export const head_default: PartPainter = {
  main(g, pose, s) {
    const { headX: x, headY: y, fx, fy } = pose;
    // 后层头发底色（发型画笔会再覆盖造型，这里保证头部轮廓完整）
    g.fillColor = s.c.hair;
    g.circle(x, y + 1.5, 10);
    g.fill();
    if (fy <= 0) {
      g.fillColor = s.c.skin;
      g.circle(x + fx * 2.2, y - 1.4, 8.6);
      g.fill();
    } else {
      g.fillColor = s.c.skin;
      g.rect(x - 2.5, y - 11, 5, 4);
      g.fill();
    }
  },
};

/** 五官：剑眉 + 双目（打坐闭目；背向不画；纯侧面单眼） */
export const face_default: PartPainter = {
  main(g, pose, s) {
    const { headX: x, headY: y, fx, fy } = pose;
    if (fy > 0) return;
    const eyesClosed = pose.sitting;
    const faceX = x + fx * 2.2;
    const eyeY = y - 1;
    const drawEye = (ex: number) => {
      if (eyesClosed) {
        g.strokeColor = s.c.eye;
        g.lineWidth = 1.4;
        g.moveTo(ex - 1.8, eyeY);
        g.lineTo(ex + 1.8, eyeY);
        g.stroke();
      } else {
        g.fillColor = s.c.eye;
        g.circle(ex, eyeY, 1.3);
        g.fill();
      }
      g.strokeColor = s.c.hair;
      g.lineWidth = 1.3;
      g.moveTo(ex - 2.2, eyeY + 3.6);
      g.lineTo(ex + 2, eyeY + 4.6);
      g.stroke();
    };
    if (fy < 0) {
      drawEye(faceX - 3.6 + fx * 1.5);
      drawEye(faceX + 3.6 + fx * 1.5);
    } else {
      drawEye(faceX + fx * 4.5);
    }
  },
};
