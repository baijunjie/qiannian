# 开发环境搭建

## 1. 安装 Cocos Creator

1. 前往官网下载 **Cocos Dashboard**：<https://www.cocos.com/creator-download>
2. 安装并启动 Dashboard，登录 Cocos 开发者账号（免费注册）
3. 在 Dashboard 的「编辑器」页签中，安装 **Cocos Creator 3.8.x**（最新的 LTS 长期支持版本）

> 项目骨架按 3.8.8 创建（见 `client/package.json` 中 `creator.version`）。
> 安装其他 3.8.x 小版本也可以，编辑器打开时会自动迁移；不要使用 3.7 及更早版本。

## 2. 打开项目

1. Dashboard →「项目」页签 → 右上角「打开其他项目」
2. 选择仓库下的 `client/` 目录
3. 首次打开时编辑器会生成 `library/`、`temp/` 等缓存目录（已被 gitignore），
   并为 `assets/` 下的每个文件生成 `.meta` 文件

### 关于 .meta 文件

- **`.meta` 文件必须提交到 git**：它记录资源的 UUID 与导入配置，丢失会导致资源引用断裂
- 新增 / 移动 / 删除资源请在 Cocos Creator 编辑器内操作（或操作后让编辑器刷新），不要只在文件系统里改

## 3. 项目结构约定

```
client/
├── assets/
│   ├── scenes/            # 场景（标题、游戏主场景）
│   ├── scripts/
│   │   ├── core/          # 引擎无关逻辑：类型、公式、背包等（禁止 import 'cc'）
│   │   ├── game/          # 游戏组件：地图、实体、战斗、相机
│   │   └── ui/            # UI 组件：窗口、HUD、对话框
│   ├── resources/         # 运行时动态加载目录（resources.load）
│   │   └── data/          # 配置表 JSON：物品 / 怪物 / 任务 / NPC
│   ├── textures/          # 图片资源
│   └── audio/             # 音频资源
├── package.json           # Cocos 项目描述（creator.version 等）
└── tsconfig.json          # 继承编辑器生成的 temp/tsconfig.cocos.json
```

**分层规则**（为将来联网做准备）：

- `core/` 只依赖 TypeScript 标准库，纯函数/纯数据结构，可直接复用到 Node 服务端
- 随机数、时间戳等不确定性由调用方注入（参考 `formulas.ts` 的 `calcDamage(atk, def, roll)`）
- `game/`、`ui/` 才允许依赖 `cc` 模块

## 4. 运行与发布

- 编辑器内点击预览按钮即可在浏览器中运行
- 发布：菜单「项目 → 构建发布」
  - **Web Mobile / Web Desktop**：网页版
  - **iOS / Android**：原生 App（需要 Xcode / Android Studio）
  - 微信小游戏等小游戏平台亦可按需勾选

## 5. 参考

- Cocos Creator 3.8 文档：<https://docs.cocos.com/creator/3.8/manual/zh/>
