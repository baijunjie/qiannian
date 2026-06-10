import {
  _decorator, Camera, Canvas, Color, Component, Label, Layers,
  Node, UITransform, view, Widget,
} from 'cc';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterController } from './CharacterController';
import { GridFloor } from './GridFloor';

const { ccclass } = _decorator;

/** 固定视野高度（世界单位）：相机始终显示这么高的范围，宽度随窗口比例适配 */
const VIEW_HEIGHT = 720;

/**
 * 演示入口：场景中只挂这一个组件，运行时以代码构建
 * 相机 / 画布 / 网格地面 / 角色 / 状态文本，避免手工维护场景结构。
 */
@ccclass('GameRoot')
export class GameRoot extends Component {
  private canvasTf!: UITransform;
  private camera!: Camera;
  private world!: Node;
  private charNode!: Node;
  private controller!: CharacterController;
  private grid!: GridFloor;
  private statusLabel!: Label;

  onLoad() {
    // 画布与相机
    const canvasNode = this.makeNode('Canvas', this.node);
    const canvas = canvasNode.addComponent(Canvas)!;
    // 运行时创建的 Canvas 不做自动屏幕对齐（时机不可靠），尺寸由 syncViewport 显式驱动
    canvas.alignCanvasWithScreen = false;
    this.canvasTf = canvasNode.getComponent(UITransform)!;

    const camNode = this.makeNode('UICamera', canvasNode);
    camNode.setPosition(0, 0, 1000);
    const cam = camNode.addComponent(Camera)!;
    cam.projection = Camera.ProjectionType.ORTHO;
    cam.near = 1;
    cam.far = 2000;
    cam.clearFlags = Camera.ClearFlag.SOLID_COLOR;
    cam.clearColor = new Color(24, 28, 22, 255);
    cam.visibility = Layers.Enum.UI_2D;
    this.camera = cam;
    canvas.cameraComponent = cam;

    // 网格地面（参照物）
    const gridNode = this.makeNode('Grid', canvasNode);
    this.grid = gridNode.addComponent(GridFloor)!;

    // 世界容器：反向移动以实现"相机跟随角色"
    this.world = this.makeNode('World', canvasNode);

    // 角色
    this.charNode = this.makeNode('Player', this.world);
    this.charNode.addComponent(CharacterAvatar);
    this.controller = this.charNode.addComponent(CharacterController)!;

    // 状态与操作提示
    this.statusLabel = this.makeCornerLabel(canvasNode, true);
    const hint = this.makeCornerLabel(canvasNode, false);
    hint.string = 'W A S D / 方向键 移动　Shift 按住奔跑　R 切换跑/走　X 打坐　Q / E 原地转向';

    this.syncViewport();
  }

  /** 画布与相机按固定视野高度适配当前窗口比例 */
  private syncViewport() {
    const vs = view.getVisibleSize();
    const aspect = vs.height > 0 ? vs.width / vs.height : 16 / 9;
    const w = Math.round(VIEW_HEIGHT * aspect);
    if (this.canvasTf.width !== w || this.canvasTf.height !== VIEW_HEIGHT) {
      this.canvasTf.setContentSize(w, VIEW_HEIGHT);
    }
    this.camera.orthoHeight = VIEW_HEIGHT / 2;
  }

  lateUpdate() {
    this.syncViewport();

    const p = this.charNode.position;
    this.world.setPosition(-p.x, -p.y);
    this.grid.refresh(p.x, p.y, this.canvasTf.width, this.canvasTf.height);

    this.statusLabel.string = this.controller.statusText;
  }

  private makeNode(name: string, parent: Node): Node {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    parent.addChild(n);
    return n;
  }

  private makeCornerLabel(parent: Node, top: boolean): Label {
    const n = this.makeNode(top ? 'StatusLabel' : 'HintLabel', parent);
    const tf = n.getComponent(UITransform) ?? n.addComponent(UITransform)!;
    tf.setAnchorPoint(0, top ? 1 : 0);

    const label = n.addComponent(Label)!;
    label.fontSize = 15;
    label.lineHeight = 22;
    label.color = new Color(216, 205, 180, 235);
    label.horizontalAlign = Label.HorizontalAlign.LEFT;

    const widget = n.addComponent(Widget)!;
    widget.isAlignLeft = true;
    widget.left = 14;
    if (top) {
      widget.isAlignTop = true;
      widget.top = 12;
    } else {
      widget.isAlignBottom = true;
      widget.bottom = 12;
    }
    widget.alignMode = Widget.AlignMode.ALWAYS;
    return label;
  }
}
