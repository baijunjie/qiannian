import {
  _decorator, Camera, Canvas, Color, Component, EventKeyboard, Input, input,
  KeyCode, Label, Layers, Node, UITransform, view, Widget,
} from 'cc';
import { HAIR_STYLES, makeAppearance, OUTFITS, WEAPONS } from '../core/appearance';
import { AvatarRenderer } from './AvatarRenderer';
import { CharacterController } from './CharacterController';
import { GridFloor } from './GridFloor';
import { SpriteAvatar } from './SpriteAvatar';

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

  private procAvatar!: AvatarRenderer;
  private spriteAvatar!: SpriteAvatar;
  /** true = 序列帧渲染（Isometric Hero 素材），false = 程序化矢量 */
  private useSprite = true;

  // 外观索引（1/2/3 键循环切换）
  private hairIdx = 0;
  private outfitIdx = 0;
  private weaponIdx = 0;

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

    // 角色（双渲染器：序列帧 / 程序化矢量，4 键切换）
    this.charNode = this.makeNode('Player', this.world);
    this.procAvatar = this.charNode.addComponent(AvatarRenderer)!;
    this.spriteAvatar = this.charNode.addComponent(SpriteAvatar)!;
    this.controller = this.charNode.addComponent(CharacterController)!;
    this.applyAppearance();
    this.applyRendererChoice();

    // 状态与操作提示
    this.statusLabel = this.makeCornerLabel(canvasNode, true);
    const hint = this.makeCornerLabel(canvasNode, false);
    hint.string = 'W A S D / 方向键 移动　Shift 奔跑　R 跑/走　J 攻击（三段连击）　X 打坐　Q / E 原地转向\n'
      + '换装：1 发型/头部　2 衣装　3 武器　·　4 切换渲染器（序列帧/矢量）';

    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    this.syncViewport();
  }

  onDestroy() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
  }

  private onKeyDown(e: EventKeyboard) {
    if (e.keyCode === KeyCode.DIGIT_1) this.hairIdx++;
    else if (e.keyCode === KeyCode.DIGIT_2) this.outfitIdx++;
    else if (e.keyCode === KeyCode.DIGIT_3) this.weaponIdx++;
    else if (e.keyCode === KeyCode.DIGIT_4) { this.useSprite = !this.useSprite; this.applyRendererChoice(); return; }
    else return;
    this.applyAppearance();
  }

  /** 外观同步到两个渲染器（切换渲染器时无需重新设置） */
  private applyAppearance() {
    const a = makeAppearance(this.hairIdx, this.outfitIdx, this.weaponIdx);
    this.procAvatar.setAppearance(a);
    this.spriteAvatar.setAppearance(a);
  }

  private applyRendererChoice() {
    this.procAvatar.enabled = !this.useSprite;
    this.spriteAvatar.enabled = this.useSprite;
    this.controller.avatar = this.useSprite ? this.spriteAvatar : this.procAvatar;
  }

  private get appearanceText(): string {
    const hair = HAIR_STYLES[this.hairIdx % HAIR_STYLES.length].name;
    const outfit = OUTFITS[this.outfitIdx % OUTFITS.length].name;
    const weapon = WEAPONS[this.weaponIdx % WEAPONS.length].name;
    const mode = this.useSprite ? '序列帧' : '矢量';
    return `外观：${hair} · ${outfit} · ${weapon}　渲染：${mode}`;
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

    this.statusLabel.string = this.controller.statusText + '\n' + this.appearanceText;
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
