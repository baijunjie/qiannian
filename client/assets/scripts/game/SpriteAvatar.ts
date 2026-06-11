import {
  _decorator, Color, Component, Graphics, Layers, Node, Rect, resources,
  Sprite, SpriteFrame, Texture2D, UITransform,
} from 'cc';
import { Appearance } from '../core/appearance';
import { Dir8 } from '../core/character';
import { Action } from '../core/rig';

const { ccclass } = _decorator;

const FRAME = 128;          // 单帧尺寸
const SCALE = 1.8;          // 渲染缩放（角色原始约 50px 高）
const ANCHOR_Y = 32 / 128;  // 脚底锚点：帧内 (64, 96)，自下而上 32px

/** 我们的 Dir8（东起逆时针）→ 图集行（Flare：西起顺时针 W,NW,N,NE,E,SE,S,SW） */
const ROW_OF_DIR = [4, 3, 2, 1, 0, 7, 6, 5];

/**
 * 武器层位（按图集行，源自 flare-game hero_layers.txt）：
 * 0 = 画在身体后面，1 = 身体与头之间，2 = 最上层
 * 行序 W, NW, N, NE, E, SE, S, SW
 */
const WEAPON_LAYER_BY_ROW = [0, 0, 2, 2, 2, 1, 0, 0];

// 外观 → 贴图名映射
const OUTFIT_SHEET: Record<string, string> = {
  qingshan: 'clothes', baiyi: 'leather_armor', xuanyi: 'steel_armor', jiangyi: 'clothes',
};
const HAIR_SHEET: Record<string, string> = {
  hair_topknot: 'male_head1', hair_ponytail: 'male_head2', hair_scarf: 'male_head3',
};
const WEAPON_SHEET: Record<string, string> = {
  weapon_jian: 'longsword', weapon_dao: 'shortsword', weapon_none: '',
};

// Flare 动画定义（hero.txt）：列 = 帧
const STANCE_SEQ = [0, 1, 2, 3, 2, 1]; // back_forth
const RUN_POS = 4;
const SWING_POS = 12;
const BLOCK_POS = 16;

type LayerKey = 'armor' | 'head' | 'weapon';
const LAYER_KEYS: LayerKey[] = ['armor', 'head', 'weapon'];

const C_AURA = new Color(126, 232, 168, 0);
const C_ARROW = new Color(140, 220, 255, 130);

/**
 * 序列帧纸娃娃渲染器（Isometric Hero 素材，CC-BY 3.0 by Clint Bellanger）。
 * 与 AvatarRenderer 实现同一 IAvatarView 接口，可互换。
 * 分层：衣装（含身体）/ 头部 / 武器，层序按朝向行查表。
 */
@ccclass('SpriteAvatar')
export class SpriteAvatar extends Component {
  private view!: Node;
  private fxNode!: Node;
  private fxG!: Graphics;
  private sprites = {} as Record<LayerKey, Sprite>;
  private textures: Record<LayerKey, Texture2D | null> = { armor: null, head: null, weapon: null };
  private wanted: Record<LayerKey, string> = { armor: '', head: '', weapon: '' };
  private texCache = new Map<string, Texture2D>();
  /** 帧缓存：sheet:row:col → SpriteFrame（整体替换 spriteFrame 才能可靠触发重绘） */
  private sfCache = new Map<string, SpriteFrame>();

  private action: Action = 'idle';
  private dir: Dir8 = Dir8.S;
  private time = 0;
  private progress = 0;

  onLoad() {
    // 特效层（光环/朝向箭头），画在角色下方
    this.fxNode = new Node('Fx');
    this.fxNode.layer = Layers.Enum.UI_2D;
    this.node.addChild(this.fxNode);
    this.fxG = this.fxNode.addComponent(Graphics)!;

    // 精灵层容器
    this.view = new Node('SpriteView');
    this.view.layer = Layers.Enum.UI_2D;
    this.view.setScale(SCALE, SCALE, 1);
    this.node.addChild(this.view);
    for (const key of LAYER_KEYS) this.sprites[key] = this.makeLayer(key);
  }

  onEnable() {
    this.view.active = true;
    this.fxNode.active = true;
  }

  onDisable() {
    this.view.active = false;
    this.fxG.clear();
    this.fxNode.active = false;
  }

  private makeLayer(name: string): Sprite {
    const n = new Node(name);
    n.layer = Layers.Enum.UI_2D;
    this.view.addChild(n);
    const tf = n.addComponent(UITransform)!;
    tf.setContentSize(FRAME, FRAME);
    tf.setAnchorPoint(0.5, ANCHOR_Y);
    const sp = n.addComponent(Sprite)!;
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    return sp;
  }

  setAppearance(a: Appearance) {
    this.assign('armor', OUTFIT_SHEET[a.outfit ?? 'qingshan'] ?? 'clothes');
    this.assign('head', HAIR_SHEET[a.parts.hair ?? ''] ?? 'male_head1');
    this.assign('weapon', WEAPON_SHEET[a.parts.weapon ?? ''] ?? '');
  }

  private assign(key: LayerKey, sheet: string) {
    this.wanted[key] = sheet;
    const sp = this.sprites[key];
    if (!sp) return; // onLoad 之前调用时，等 update 自然恢复
    if (!sheet) {
      sp.node.active = false;
      this.textures[key] = null;
      return;
    }
    sp.node.active = true;
    const cached = this.texCache.get(sheet);
    if (cached) {
      this.applyTexture(key, sheet, cached);
      return;
    }
    resources.load(`hero/${sheet}/texture`, Texture2D, (err, tex) => {
      if (err || !tex) {
        console.warn(`[SpriteAvatar] 贴图加载失败 hero/${sheet}:`, err);
        return;
      }
      this.texCache.set(sheet, tex);
      if (this.wanted[key] === sheet) this.applyTexture(key, sheet, tex);
    });
  }

  private applyTexture(key: LayerKey, sheet: string, tex: Texture2D) {
    this.textures[key] = tex;
    this.applyFrame();
  }

  /** IAvatarView */
  setPose(action: Action, dir: Dir8, progress = 0) {
    if (action !== this.action) this.time = 0;
    this.action = action;
    this.dir = dir;
    this.progress = progress;
  }

  update(dt: number) {
    // setAppearance 早于 onLoad 调用时，补一次指派
    for (const key of LAYER_KEYS) {
      if (this.wanted[key] && !this.textures[key]) this.assign(key, this.wanted[key]);
    }
    this.time += dt;
    this.applyFrame();
    this.drawFx();
  }

  /** 取/建指定图集格的 SpriteFrame */
  private frameFor(sheet: string, tex: Texture2D, row: number, col: number): SpriteFrame {
    const id = `${sheet}:${row}:${col}`;
    let sf = this.sfCache.get(id);
    if (!sf) {
      sf = new SpriteFrame();
      sf.texture = tex;
      sf.rect = new Rect(col * FRAME, row * FRAME, FRAME, FRAME);
      this.sfCache.set(id, sf);
    }
    return sf;
  }

  /** 当前动作对应的图集列 */
  private frameCol(): number {
    switch (this.action) {
      case 'idle':
        return STANCE_SEQ[Math.floor(this.time / 0.8 * STANCE_SEQ.length) % STANCE_SEQ.length];
      case 'walk':
        return RUN_POS + Math.floor(this.time / 0.85 * 8) % 8;
      case 'run':
        return RUN_POS + Math.floor(this.time / 0.533 * 8) % 8;
      case 'sit':
        return BLOCK_POS + 1; // 无打坐动画：以格挡收势帧定格，配合灵气环
      default:
        return SWING_POS + Math.min(3, Math.floor(this.progress * 4));
    }
  }

  private applyFrame() {
    const row = ROW_OF_DIR[this.dir];
    const col = this.frameCol();
    for (const key of LAYER_KEYS) {
      const tex = this.textures[key];
      if (!tex) continue;
      const sf = this.frameFor(this.wanted[key], tex, row, col);
      const sp = this.sprites[key];
      if (sp.spriteFrame !== sf) sp.spriteFrame = sf;
    }
    // 武器层序按朝向调整（armor/head 维持先后，weapon 插入对应层位）
    const wl = WEAPON_LAYER_BY_ROW[row];
    const armorN = this.sprites.armor.node;
    const headN = this.sprites.head.node;
    const weaponN = this.sprites.weapon.node;
    if (wl === 0) { weaponN.setSiblingIndex(0); armorN.setSiblingIndex(1); headN.setSiblingIndex(2); }
    else if (wl === 1) { armorN.setSiblingIndex(0); weaponN.setSiblingIndex(1); headN.setSiblingIndex(2); }
    else { armorN.setSiblingIndex(0); headN.setSiblingIndex(1); weaponN.setSiblingIndex(2); }
  }

  /** 灵气环（打坐）与朝向箭头 */
  private drawFx() {
    const g = this.fxG;
    g.clear();
    const fx = [1, 0.7071, 0, -0.7071, -1, -0.7071, 0, 0.7071][this.dir];
    const fy = [0, 0.7071, 1, 0.7071, 0, -0.7071, -1, -0.7071][this.dir];
    // 朝向箭头
    const cx = fx * 30;
    const cy = fy * 14 - 1;
    const ang = Math.atan2(fy * 0.5, fx);
    g.fillColor = C_ARROW;
    g.moveTo(cx + Math.cos(ang) * 7, cy + Math.sin(ang) * 7);
    g.lineTo(cx + Math.cos(ang + 2.5) * 4, cy + Math.sin(ang + 2.5) * 4);
    g.lineTo(cx + Math.cos(ang - 2.5) * 4, cy + Math.sin(ang - 2.5) * 4);
    g.close();
    g.fill();
    // 打坐灵气
    if (this.action === 'sit') {
      const pulse = (Math.sin(this.time * 2.4) + 1) / 2;
      C_AURA.a = 36 + pulse * 50;
      g.strokeColor = C_AURA;
      g.lineWidth = 2;
      g.ellipse(0, 6, 34 + pulse * 5, 14 + pulse * 2.5);
      g.stroke();
      C_AURA.a = 22 + (1 - pulse) * 36;
      g.ellipse(0, 6, 43 + (1 - pulse) * 5, 18 + (1 - pulse) * 2.5);
      g.stroke();
    }
  }
}
