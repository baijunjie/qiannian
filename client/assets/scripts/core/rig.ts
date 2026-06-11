/**
 * 角色骨架（Rig）：由 (动作, 朝向, 时间/进度) 计算姿态与挂点（引擎无关）。
 * 所有部件画笔只从 Pose 取坐标，保证换部件不会错位。
 */
import { Dir8, dirToVector } from './character';

/** 渲染动作（与逻辑状态解耦：attack 按连击段展开） */
export type Action = 'idle' | 'walk' | 'run' | 'sit' | 'attack1' | 'attack2' | 'attack3';

export interface AttackPose {
  step: number;       // 0 横斩 / 1 回斩 / 2 突刺
  p: number;          // 进度 0~1
  theta: number;      // 朝向角（屏幕系，已透视压扁）
  ang: number;        // 当前剑指角
  reach: number;      // 手距身体的伸展
  pivotX: number;
  pivotY: number;
  handX: number;
  handY: number;
}

export interface Pose {
  action: Action;
  t: number;           // 动作内时间（循环动作用）
  fx: number;          // 朝向单位向量
  fy: number;
  sitting: boolean;
  // 动态参数
  lean: number;        // 身体前倾（奔跑/出招）
  bob: number;         // 上下颠簸
  breath: number;      // 呼吸起伏
  phase: number;       // 摆动相位
  flow: number;        // 飘带/衣摆后飘强度
  legSwing: number;
  armSwing: number;
  skirtSway: number;   // 裙摆横向摆动
  skirtTrail: number;  // 裙摆拖尾（奔跑）
  lungeY: number;      // 沿朝向的纵向前突（南北向出招时的前压）
  // 挂点
  beltY: number;
  shoulderY: number;
  headX: number;
  headY: number;
  attack?: AttackPose;
}

export function computePose(action: Action, dir: Dir8, t: number, progress: number): Pose {
  const f = dirToVector(dir);
  const fx = f.x;
  const fy = f.y;

  const pose: Pose = {
    action, t, fx, fy,
    sitting: false,
    lean: 0, bob: 0, breath: 0, phase: 0, flow: 0,
    legSwing: 0, armSwing: 0, skirtSway: 0, skirtTrail: 0, lungeY: 0,
    beltY: 0, shoulderY: 0, headX: 0, headY: 0,
  };

  switch (action) {
    case 'idle':
      pose.breath = Math.sin(t * 2.6) * 1.5;
      pose.skirtSway = Math.sin(t * 1.2) * 1.2;
      break;
    case 'walk':
      pose.phase = t * 8;
      pose.legSwing = Math.sin(pose.phase) * 9;
      pose.armSwing = -Math.sin(pose.phase) * 7;
      pose.bob = Math.abs(Math.cos(pose.phase)) * 2;
      pose.flow = 10;
      pose.skirtSway = Math.sin(pose.phase) * 2.5;
      break;
    case 'run':
      pose.phase = t * 13;
      pose.legSwing = Math.sin(pose.phase) * 16;
      pose.armSwing = -Math.sin(pose.phase) * 13;
      pose.bob = Math.abs(Math.cos(pose.phase)) * 4;
      pose.lean = fx * 5;
      pose.flow = 22;
      pose.skirtSway = Math.sin(pose.phase) * 2.5;
      pose.skirtTrail = -fx * 5;
      break;
    case 'sit':
      pose.sitting = true;
      pose.breath = Math.sin(t * 1.8) * 1.2;
      break;
    default: {
      // attack1/2/3：全身发力——蓄力后仰、重心下沉、髋身前压、副手反摆
      const step = action === 'attack1' ? 0 : action === 'attack2' ? 1 : 2;
      const p = Math.min(1, progress);
      const ease = 1 - (1 - p) * (1 - p);
      const surge = Math.sin(p * Math.PI);                    // 0→1→0 发力包络
      const drive = p < 0.25 ? -(p / 0.25)                    // 蓄力：-1
        : -1 + ((p - 0.25) / 0.75) * 2;                       // 发力：→ +1

      const lunge = 2 + drive * (step === 2 ? 9 : 6);         // 突刺前压更深
      pose.lean = fx * lunge;
      pose.lungeY = fy * lunge * 0.45;
      pose.bob = -2.2 * surge;                                // 重心下沉
      pose.armSwing = -(5 + ease * 9);                        // 副手反摆平衡
      pose.flow = 6 + 16 * (1 - p);
      pose.phase = p * 6;
      pose.skirtSway = -fx * 4 * (1 - p);

      const theta = Math.atan2(fy * 0.55, fx);
      let ang = theta;
      let reach = 12 + ease * 6;                              // 手臂随挥击伸展
      if (step === 0) ang = theta + 1.3 - ease * 2.1;
      else if (step === 1) ang = theta - 1.0 + ease * 2.1;
      else reach = 14 + surge * 18;

      const pivotX = pose.lean * 0.6 + fx * 3;
      const pivotY = 46 + pose.bob + pose.lungeY;
      pose.attack = {
        step, p, theta, ang, reach, pivotX, pivotY,
        handX: pivotX + Math.cos(ang) * reach,
        handY: pivotY + Math.sin(ang) * reach * 0.55,
      };
      break;
    }
  }

  // 挂点
  if (pose.sitting) {
    pose.beltY = 26 + pose.breath * 0.4;
    pose.shoulderY = 46 + pose.breath;
    pose.headX = fx * 2.5;
    pose.headY = 58 + pose.breath;
  } else {
    pose.beltY = 42 + pose.bob + pose.breath * 0.4 + pose.lungeY;
    pose.shoulderY = 64 + pose.bob + pose.breath + pose.lungeY * 1.1;
    pose.headX = fx * 4 + pose.lean;
    pose.headY = 78 + pose.bob + pose.breath + pose.lungeY * 1.2;
  }
  return pose;
}
