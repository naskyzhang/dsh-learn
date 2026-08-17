# DSH 页面内学习伙伴设计

状态：**已实现**。浏览器 bundle 位于 `lib/client.js`，Host 状态桥位于 `src/bridge.js`。

## 决策

`dsh-learn` 不提供独立 Web 页面，也不复制 DeepSeek Harness 的会话、输入框或导航。安装插件后，它通过 DSH Client 的原生 slot，在现有页面上增加一个可拖动的“学习伙伴”悬浮窗：

- 一只平时始终趴睡、只在用户点击时醒来的像素猫；
- 一盆随学习进度生长的知识植物。

组件是学习状态的只读投影。练习、反馈和复盘仍在 DSH 主对话中完成。

## 视觉方向

- **幻想**：安静陪读的桌角伙伴，而不是新的游戏主场景。
- **材质**：暖色 16-bit 宠物像素画；猫、植物使用固定的八色复古调色板，展开卡片使用 DSH 主题 token。
- **位置**：`shell.overlay`，初始位于页面右侧中下区域，可拖动并记住位置。
- **尺寸**：收起时只显示 196×68px 的猫和植物；点击后显示 166px 宽的像素文字卡，相对角色组合的居中位置向左偏移 5px，不改变 DSH 的栏宽和主会话布局。盆栽累计向右偏移 60px，猫累计向右偏移 50px；猫趴下时与花盆底边对齐。
- **动作**：猫平时面向植物趴睡并显示 `ZZZ`，不会自主走动。点击场景后，它先保持趴姿睁眼东张西望，向右走一步（16px），再缓慢向左走 45px 到睡觉位置左侧 29px；随后沿左侧向上走两步，并用约 0.4 秒直接跳回原来的睡觉位置。落地后眼睛眯成像素细线，露出带粉色舌头和腮红的圆形小嘴，并显示一次灰色「Miao~」；随即趴下闭眼并恢复 `ZZZ`，不再额外行走。地面与垂直行走阶段的猫头均朝向移动方向。学习分数变化或植物升阶时播放一次奖励动画。
- **信息层级**：猫和植物是三级状态提示，永远不与会话标题、消息、权限请求和输入框竞争。

## 为什么选择 Shell Overlay

DeepSeek Harness 已由 `ui-layout` 声明 `shell.overlay` additive list slot。该层覆盖整个 App Frame，但容器默认 `pointer-events: none`，每个插件只为自己的有限交互区域恢复指针事件。`dsh-learn` 等待该 slot 出现后注册，不修改 Harness 核心页面：

```ts
ctx.slots.inject('shell.overlay', () => ctx.slots.register({
  name: 'shell.overlay',
  id: 'dsh-learn-companion',
}, LearnCompanion))
```

这个位置有四个好处：

1. 用户可把伙伴拖到不影响当前工作的区域；
2. 不挤压侧栏、会话区或 Details 栏；
3. 根容器保持 click-through，只有猫和植物所在的 196×68px 场景接收指针；
4. 插件卸载或 HMR 时，slot 生命周期会自动移除组件。

悬浮窗相对 DSH App Frame 绝对定位，不使用 `position: fixed`、常驻顶部栏、底部栏或全屏点击捕获层。

## 拖动与位置

- 不显示导航栏或拖动条；直接拖动猫和植物场景，Pointer Capture 同时支持鼠标和触摸。
- 单击展开文字卡时触发约 14 秒的完整冒险动作；单击收起时立即中断完整动作，改播约 3.6 秒的“趴着张望 → 张大嘴显示灰色可爱字体「Miao~」→ 继续睡觉”短动作。移动超过 5px 才进入拖动，避免把单击误判成拖动。
- 聚焦场景后，Enter/空格切换文字卡；方向键每次移动 12px，按住 Shift 时每次移动 32px。
- 位置夹在当前视口安全边距内；窗口尺寸变化时自动移回可见范围。
- `localStorage` 只保存悬浮窗坐标，不保存 XP、植物阶段或任何学习状态。
- 猫和植物的像素块保持 `pointer-events: none`，由透明场景统一接收交互；展开内容使用非打断式 status，装饰像素块标记为 `aria-hidden`。

## 植物成长

成长只读取 `LearnStore.profile`，不建立第二份分数：

- Level 1：种子；
- Level 2：嫩芽；
- Level 3：叶丛；
- Level 4：花苞；
- Level 5+：开花。

盆栽使用带高光、土层和金色菱形纹样的青绿色像素陶盆；叶片使用三档绿色区分层次。同一阶段内，根据当前等级到下一等级的 XP 百分比，把植株整体高度从 94% 增加到 100%。学习分数增长时播放一次 450ms 的阶梯式生长动画。

## 猫的状态

- 行走姿态缩小头部比例，并增加耳内粉色、眼睛高光、微笑和浅色爪尖，使侧身轮廓更接近可爱的复古像素猫；
- 平时：蜷身趴睡，并显示阶梯上浮的 `ZZZ`；
- 没有用户操作时：不自主走动；
- 收起卡片：不继续走完整路线；保持趴姿张望，眯眼并露出带舌头、腮红的圆形小嘴显示一次 `Miao~`，再闭眼恢复 `ZZZ`；
- 点击场景：保持趴姿睁眼并左右张望；
- 随后：起身面向右侧走一步，再转身缓慢向左走 45px，转为头朝上并沿左侧向上走两步，再面向右侧快速跳回睡觉位置；
- 落地后：站着张大嘴显示一次 `Miao~`，随后直接趴下闭眼并恢复 `ZZZ`，不再走动；
- 刚完成练习：尾巴摆动一次；

不使用声音，不做持续跳动，不用红色警报催促用户；开启 reduced-motion 时不播放行走动画，只短暂切换站立姿势。

## 数据路径

保持一份真相源：

```text
learn_* 工具
    → LearnStore（领域 JSON）
    → Host 只读状态服务
    → DSH API gateway / Remote
    → Client observable
    → LearnCompanion
```

Host 返回精简快照，而不是把完整学习文档暴露给浏览器：

```ts
interface LearnCompanionSnapshot {
  domainId: string | null
  domainTitle: string | null
  xp: number
  level: number
  levelProgress: number
  streak: number
  dueCount: number
  revision: string
}
```

Client 通过 DSH Connection 的受信 `/dsh-learn` RPC 通道发起长轮询。初次挂载立即读取快照；`learn_log_attempt`、`learn_review` 或课程切换成功后，Store 写入通知当前请求并发布新 revision。20 秒超时会检查其他进程的写入。断线时保留最后快照，3 秒退避后重连，不使用高频轮询，也不暴露无鉴权 HTTP 路由。

## 插件结构

包仍是一个 `dsh-learn` bundle，包含 Node 和 Browser 两个面：

```text
dsh-learn/
├── src/
│   ├── index.js                 # Host：工具、存储、只读状态服务
│   ├── store.js
│   ├── tools.js
│   └── client/
│       ├── index.ts             # inject slots/connection；注册 shell overlay
│       ├── LearnCompanion.tsx   # 纯展示组件
│       ├── controller.ts        # 长轮询 observable
│       ├── runtime-types.ts     # 第三方包所需的最小结构类型
│       └── styles.ts            # DSH token 驱动的像素样式
├── lib/
│   └── client.js                # DSH Client loader 可加载的构建产物
├── tsdown.config.ts             # __ModuleLoader__ bundle envelope
└── package.json                 # exports ./client + dsh.client
```

`package.json` 已经：

- 导出已构建的 `./client`；
- 声明 `dsh.client.platform = "web"`；
- 在 `dsh.client.inject` 中列出 connection、runtime 与 ui-layout 的包依赖；
- 把 `lib/client.js` 纳入发布文件。

Client 注册必须使用 `ctx.slots.inject(...)`，不能假设 UI 插件加载顺序。样式由 bundle 内联；文字卡使用 `--dsw-*` 语义 token，像素角色使用有限的固定调色板，并保持透明底。

## 响应式与动效约束

- 收起：透明背景，只显示猫和植物，交互区域 196×68px。
- 展开：在猫和植物下方显示 166px 宽的主题文字卡，相对居中位置向左偏移 5px。
- 拖动范围始终夹在视口内，并为展开卡片预留安全区域。
- `prefers-reduced-motion: reduce`：关闭猫行走、`ZZZ` 上浮、尾巴及植物生长动画；点击时只短暂切换站立姿势。
- 同一分数 revision 只触发一次奖励动画，重新挂载不补播。

## 明确不做

- 独立 dashboard、学习屋或第二套路由；
- 捕获整个对话区点击的全屏 HUD；
- 常驻任务卡、技能树、排行榜和控制说明；
- 点击猫或植物才能继续学习；
- 使用 `localStorage` 保存 XP 或植物阶段；
- 修改 DeepSeek Harness 核心布局源码；
- 持续摇摆、闪烁、粒子雨或声音。

## 验证

1. `npm test`：存储、并发、状态快照、Host bridge 与工具集成测试。
2. `npm run typecheck:client`：Browser half 类型检查。
3. `npm run bundle`：生成 `lib/client.js` 与 sourcemap。
4. `npm pack --dry-run`：确认发布包包含 Browser bundle。
5. 启动 `dsh web`，确认 boot manifest 出现 `dsh-learn`，并验证拖动、键盘移动、窄屏约束、亮暗主题和 reduced-motion。

