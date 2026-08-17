# dsh-learn

[![topic](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件，把「学习一个领域」变成一个可闭环的引擎：

1. **技能解构** —— 拆成 Pareto 技能树，标出 20% 拿 80% 结果的关键节点
2. **溯源** —— 找领域最强的人，收集其开源 / 文档 / 论文
3. **游戏化练习** —— 基于 SM-2 间隔重复的刻意练习
4. **即时反馈 + 复盘** —— 逐题分级、更新掌握度与排程，再调整技能树，回到练习

底层不做大而全的单体，而是「1 个学习内核 + 对应四步的工具 + 阶段技能」。设计与数据模型见 [`docs/DESIGN.md`](docs/DESIGN.md)。

## 状态

- **可用**：四模块闭环的 `learn_*` 工具、5 个阶段技能、JSON 存储、SM-2 调度 —— 纯对话即可跑通。
- **可用**：Web 视觉不另起独立页面；`dsh.client` 通过 `shell.overlay` 增加可拖动的像素猫与五阶段知识植物，并从同一 `LearnStore` 实时读取进度。猫会偶尔眨眼和走动。详见 [`docs/UI-INTEGRATION.md`](docs/UI-INTEGRATION.md)。
- **注意**：插件层针对 DSH 预发布 API（`0.1.0-rc`）编写，尚未在真实 DSH 上联调；安装后请按下方“校验清单”确认。

## 安装

需要已安装并能运行 `dsh`。从本地 checkout 装入 `web` profile：

```sh
dsh plugin --profile web add ./dsh-learn
```

或发布后从 npm / GitHub 安装：

```sh
dsh plugin --profile web add dsh-learn
# 或
dsh plugin --profile web add github:naskyzhang/dsh-learn
```

确认插件行已插入：

```sh
dsh --profile web --dump-config   # 应包含 id: learn / name: dsh-learn
```

技能（`skills/`）放在会被 DSH 技能加载器扫描的目录即可生效（例如工作区的 `.dsh/skills/`，或把本仓库 `skills/*` 软链过去）。

## 用法

装好后直接说要学什么，编排技能会带着走完四步：

> 帮我学 Rust 的所有权（ownership）。

典型一轮闭环：

1. `learn_course list` —— 检查当前课程；切换未完成课程前先询问暂停还是结束
2. `learn_curriculum` —— 生成并保存技能树（可让 [drawio-skill](https://github.com/Agents365-ai/drawio-skill) 画出来）
3. `learn_add_resource` —— 挂上该领域最强的人的资料
4. `learn_next_practice` → 出题 → `learn_log_attempt`（0–5 分）逐题即时反馈
5. `learn_review` —— 复盘并调整技能树，进入下一轮
6. 随时 `learn_status` 看进度、连续打卡与薄弱点

同一时间只允许一个活跃课程。暂停会保留全部进度，之后可用 `learn_course resume` 恢复；结束会永久删除对应 JSON 文件。

## 配置

`cordis.patch.yml` 里的 `learn` 行：

| 键 | 默认 | 说明 |
|----|------|------|
| `storeDir` | `''` | 学习状态目录；空则用 `$DSH_HOME/dsh-learn`（无 `DSH_HOME` 时用 `~/.dsh-learn`） |
| `newSkillsPerDay` | `3` | 每次练习默认引入的技能数 |
| `dailyReviewLimit` | `20` | 单次 `learn_next_practice` 返回上限 |

## 存储一致性与校验

- 修改按“读取 → 修改 → 原子写回”事务串行执行；store-wide 生命周期锁会协调共享同一 `storeDir` 的多个 DSH 进程，并保证最多一个活跃课程。
- 每次写入使用独立临时文件并原子重命名；事务失败不会保存半成品，也不会阻塞后续事务。
- 课程会拒绝重复节点、悬空父节点/依赖、自引用、父子环和依赖环；节点 ID 必须是 1–64 位小写字母、数字、`_` 或 `-`。
- 分数严格限定为 0–5 整数，掌握度/杠杆严格限定为 0–100 整数；资源节点、练习题和复盘调整必须引用现有节点。

运行单元与工具集成测试：

```sh
npm install
npm test
npm run typecheck:client
npm run bundle
```

## 目录结构

```
dsh-learn/
├── package.json          # dsh.bundle 声明
├── cordis.patch.yml      # 插入 learn 插件行
├── src/
│   ├── index.js          # 插件入口：name/inject/Config/apply，注册工具
│   ├── bridge.js         # Host Connection RPC：学习伙伴长轮询快照
│   ├── client/           # shell overlay、像素猫/植物与 Browser 状态控制器
│   ├── store.js          # JSON 存储 + SM-2 间隔重复 + 数据模型
│   └── tools.js          # 八个 learn_* 工具
├── lib/client.js         # DSH Client loader 使用的浏览器 bundle
├── skills/               # 编排 + 四阶段技能（SKILL.md）
├── tests/                # 并发事务、课程图与工具边界测试
└── docs/
    ├── DESIGN.md         # 架构 / 数据模型 / 调度算法
    └── UI-INTEGRATION.md # DSH 页面内猫与知识植物的集成设计
```

## 校验清单（首次装入真实 DSH 时）

- [ ] `defineTool` 从 `@deepseek-ai/dsh-tools` 正常导入，工具出现在系统提示的工具目录里
- [ ] `learn_curriculum` 能写出 `<storeDir>/<domain>.json`
- [ ] 未完成课程切换会要求选择暂停/结束；结束后对应 JSON 文件已删除
- [ ] `learn_next_practice` → `learn_log_attempt` 后，`dueAt` / `mastery` / `xp` 正确更新
- [ ] `output` 的 `render` 返回的文本正常回显给模型
- [ ] Web 启动清单包含 `/plugins/dsh-learn/client.js`，页面显示可拖动的猫和知识植物
- [ ] 完成一次 `learn_log_attempt` 后，植物进度与猫尾奖励动画自动更新
- [ ] 依赖版本（`@deepseek-ai/dsh-tools`、`@deepseek-ai/schemastery`）与你的 DSH 版本匹配

## 许可

MIT
