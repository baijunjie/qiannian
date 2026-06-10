import { _decorator, Component, Graphics, Color } from 'cc';

const { ccclass } = _decorator;

const CELL = 64;
const C_MINOR = new Color(255, 255, 255, 12);
const C_MAJOR = new Color(255, 255, 255, 26);
const C_ORIGIN = new Color(201, 162, 86, 90);

/**
 * 参照网格地面：随相机（角色位置）偏移重绘，提供移动参照物。
 * 非正式地图，后续地图系统就绪后移除。
 */
@ccclass('GridFloor')
export class GridFloor extends Component {
  private g!: Graphics;

  onLoad() {
    this.g = this.getComponent(Graphics) ?? this.addComponent(Graphics)!;
  }

  /** @param camX/camY 相机中心的世界坐标 @param w/h 视口尺寸 */
  refresh(camX: number, camY: number, w: number, h: number) {
    const g = this.g;
    g.clear();
    g.lineWidth = 1;

    const left = camX - w / 2;
    const right = camX + w / 2;
    const bottom = camY - h / 2;
    const top = camY + h / 2;

    for (let x = Math.floor(left / CELL) * CELL; x <= right; x += CELL) {
      g.strokeColor = x % (CELL * 4) === 0 ? C_MAJOR : C_MINOR;
      g.moveTo(x - camX, bottom - camY);
      g.lineTo(x - camX, top - camY);
      g.stroke();
    }
    for (let y = Math.floor(bottom / CELL) * CELL; y <= top; y += CELL) {
      g.strokeColor = y % (CELL * 4) === 0 ? C_MAJOR : C_MINOR;
      g.moveTo(left - camX, y - camY);
      g.lineTo(right - camX, y - camY);
      g.stroke();
    }

    // 世界原点标记
    if (left < 40 && right > -40 && bottom < 40 && top > -40) {
      g.strokeColor = C_ORIGIN;
      g.lineWidth = 2;
      g.circle(-camX, -camY, 20);
      g.stroke();
      g.moveTo(-camX - 28, -camY);
      g.lineTo(-camX + 28, -camY);
      g.stroke();
      g.moveTo(-camX, -camY - 28);
      g.lineTo(-camX, -camY + 28);
      g.stroke();
    }
  }
}
