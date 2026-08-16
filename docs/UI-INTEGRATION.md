# DSH 页面内学习伙伴设计

状态：**已实现**。浏览器 bundle 位于 `lib/client.js`，Host 状态桥位于 `src/bridge.js`。

## 决策

`dsh-learn` 不提供独立 Web 页面，也不复制 DeepSeek Harness 的会话、输入框或导航。安装插件后，它通过 DSH Client 的原生 slot，在现有页面左侧栏底部增加一个小型“学习伙伴”：

- 一只趴着的像素猫；
- 一盆随学习进度生长的知识植物。

组件是学习状态的只读投影。练习、反馈和复盘仍在 DSH 主对话中完成。

## 视觉方向

- **幻想**：安静陪读的桌角伙伴，而不是新的游戏主场景。
- **材质**：克制的 16-bit 像素轮廓；背景、边框和文字全部使用 DSH 主题 token。
- **位置**：`sidebar.footer.action`，位于侧栏底部、Settings 上方。
- **尺寸**：展开侧栏最大高度 52px；折叠成 56px rail 时为 44×40px，不改变主会话宽度。
- **动作**：默认静止；只有学习分数变化或植物升阶时播放一次短动画。
- **信息层级**：猫和植物是三级状态提示，永远不与会话标题、消息、权限请求和输入框竞争。

## 为什么选择侧栏底部

DeepSeek Harness 已由 `ui-sidebar` 声明 `sidebar.footer.action` list slot，并把它渲染在 Settings 上方。`dsh-learn` 应等待该 slot 出现后注册，而不是修改 Harness 核心页面：

```ts
ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
  name: 'sidebar.footer.action',
  id: 'dsh-learn-companion',
}, LearnCompanion))
```

这个位置有四个好处：

1. 不覆盖会话滚动区和输入区；
2. 不占用 Session Header 的操作位；
3. 手机端只在用户打开侧栏抽屉时出现；
4. 插件卸载或 HMR 时，slot 生命周期会自动移除组件。

不使用 `position: fixed`、全屏浮层、常驻顶部栏、底部栏或画布覆盖层。

## 两种侧栏状态

### 展开侧栏

左侧是 28px 猫，右侧是 30px 花盆与植物。旁边只显示一行弱化信息，例如“知识芽 · 64%”。不显示任务列表、按钮或长说明。

### 折叠侧栏

隐藏文字，把猫和植物压缩到同一个 44px 小场景中。组件不可点击，也不会请求展开侧栏。

猫和植物主体使用 `pointer-events: none`，避免截获侧栏滚动和点击。植物的可访问文本使用非打断式 status；纯装饰像素块标记为 `aria-hidden`。

## 植物成长

成长只读取 `LearnStore.profile`，不建立第二份分数：

- Level 1：种子；
- Level 2：嫩芽；
- Level 3：叶丛；
- Level 4：花苞；
- Level 5+：开花。

同一阶段内，根据当前等级到下一等级的 XP 百分比，把植物高度从 92% 缓慢增加到 100%。只有跨阶段时播放一次 450ms 的长叶/开花动画；普通加分只做一次 180ms 的轻微上扬。

## 猫的状态

- 没有学习领域：睡着；
- 有课程但当前无到期复习：安静趴着；
- 有到期复习：眼睛睁开一次，不持续闪烁；
- 刚完成练习：尾巴摆动一次；
- 连续学习达到里程碑：出现一次很小的呼噜符号。

不使用声音，不做持续跳动，不用红色警报催促用户。

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
  revision: number
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
│       ├── index.ts             # inject slots/connection；注册 sidebar slot
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
- 在 `dsh.client.inject` 中列出 runtime 与 ui-sidebar 的包依赖；
- 把 `lib/client.js` 纳入发布文件。

Client 注册必须使用 `ctx.slots.inject(...)`，不能假设 UI 插件加载顺序。样式使用 CSS Modules 和 `--dsw-*` 语义 token，不写死亮色/暗色。

## 响应式与动效约束

- 桌面：只占侧栏底部一行。
- 窄屏：跟随侧栏抽屉，不在主会话上悬浮。
- `prefers-reduced-motion: reduce`：关闭尾巴、长叶、粒子动画，只更新静态形态。
- 页面后台或组件不可见时：不运行动画计时器。
- 同一分数 revision 只触发一次奖励动画，重新挂载不补播。

## 明确不做

- 独立 dashboard、学习屋或第二套路由；
- 覆盖对话区的 HUD；
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
5. 启动 `dsh web`，确认 boot manifest 出现 `dsh-learn`，并在展开/折叠侧栏、窄屏、亮暗主题和 reduced-motion 下检查呈现。

