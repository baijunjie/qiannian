import { _decorator, Component, EventKeyboard, Input, input, KeyCode, Vec3 } from 'cc';
import {
  CharState, Dir8, DIR_NAMES, dirFromVector, isFacingNear,
  RUN_SPEED, STATE_NAMES, TURN_RATE, turnStep, WALK_SPEED,
} from '../core/character';
import { CharacterAvatar } from './CharacterAvatar';

const { ccclass } = _decorator;

/**
 * 角色控制：
 * - WASD / 方向键 八方向移动，朝向以 45° 一步平滑转向
 * - Shift 按住奔跑；R 切换 跑/走 模式
 * - X 打坐 / 起身；移动会自动起身
 * - Q / E 原地转向
 */
@ccclass('CharacterController')
export class CharacterController extends Component {
  private avatar!: CharacterAvatar;
  private pressed = new Set<KeyCode>();

  private facing: Dir8 = Dir8.S;
  private state: CharState = CharState.Idle;
  private runMode = false;
  private turnTimer = 0;

  private tmpPos = new Vec3();

  onLoad() {
    this.avatar = this.getComponent(CharacterAvatar)!;
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  onDestroy() {
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  /** 供 HUD 显示的状态文本 */
  get statusText(): string {
    const mode = this.runMode ? '跑' : '走';
    return `状态：${STATE_NAMES[this.state]}　朝向：${DIR_NAMES[this.facing]}　模式：${mode}`;
  }

  private onKeyDown(e: EventKeyboard) {
    this.pressed.add(e.keyCode);
    switch (e.keyCode) {
      case KeyCode.KEY_X:
        this.toggleSit();
        break;
      case KeyCode.KEY_R:
        this.runMode = !this.runMode;
        break;
      case KeyCode.KEY_Q:
        this.turnInPlace(1);
        break;
      case KeyCode.KEY_E:
        this.turnInPlace(-1);
        break;
    }
  }

  private onKeyUp(e: EventKeyboard) {
    this.pressed.delete(e.keyCode);
  }

  private toggleSit() {
    this.state = this.state === CharState.Sit ? CharState.Idle : CharState.Sit;
  }

  private turnInPlace(step: 1 | -1) {
    if (this.state === CharState.Sit) return;
    this.facing = ((this.facing + step + 8) % 8) as Dir8;
  }

  private inputVector(): { x: number; y: number } {
    const p = this.pressed;
    let x = 0;
    let y = 0;
    if (p.has(KeyCode.KEY_W) || p.has(KeyCode.ARROW_UP)) y += 1;
    if (p.has(KeyCode.KEY_S) || p.has(KeyCode.ARROW_DOWN)) y -= 1;
    if (p.has(KeyCode.KEY_A) || p.has(KeyCode.ARROW_LEFT)) x -= 1;
    if (p.has(KeyCode.KEY_D) || p.has(KeyCode.ARROW_RIGHT)) x += 1;
    return { x, y };
  }

  private get wantRun(): boolean {
    return this.runMode
      || this.pressed.has(KeyCode.SHIFT_LEFT)
      || this.pressed.has(KeyCode.SHIFT_RIGHT);
  }

  update(dt: number) {
    const v = this.inputVector();
    const moving = v.x !== 0 || v.y !== 0;

    if (moving) {
      // 移动会打断打坐
      if (this.state === CharState.Sit) this.state = CharState.Idle;

      // 朝向以固定速率逐步转向目标方向
      const target = dirFromVector(v.x, v.y)!;
      this.turnTimer += dt;
      const stepDur = 1 / TURN_RATE;
      while (this.turnTimer >= stepDur && this.facing !== target) {
        this.turnTimer -= stepDur;
        this.facing = turnStep(this.facing, target);
      }
      if (this.facing === target) this.turnTimer = 0;

      this.state = this.wantRun ? CharState.Run : CharState.Walk;

      // 转身未完成时减速移动，朝向接近后全速
      const speed = (this.state === CharState.Run ? RUN_SPEED : WALK_SPEED)
        * (isFacingNear(this.facing, target) ? 1 : 0.35);
      const len = Math.hypot(v.x, v.y);
      this.node.getPosition(this.tmpPos);
      this.tmpPos.x += (v.x / len) * speed * dt;
      this.tmpPos.y += (v.y / len) * speed * dt;
      this.node.setPosition(this.tmpPos);
    } else {
      this.turnTimer = 0;
      if (this.state === CharState.Walk || this.state === CharState.Run) {
        this.state = CharState.Idle;
      }
    }

    this.avatar.setPose(this.facing, this.state);
  }
}
