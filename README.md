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
- **未实现**：Web 仪表盘（见 [`web/README.md`](web/README.md)，里程碑 3）。
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

1. `learn_curriculum` —— 生成并保存技能树（可让 [drawio-skill](https://github.com/Agents365-ai/drawio-skill) 画出来）
2. `learn_add_resource` —— 挂上该领域最强的人的资料
3. `learn_next_practice` → 出题 → `learn_log_attempt`（0–5 分）逐题即时反馈
4. `learn_review` —— 复盘并调整技能树，进入下一轮
5. 随时 `learn_status` 看进度、连续打卡与薄弱点

## 配置

`cordis.patch.yml` 里的 `learn` 行：

| 键 | 默认 | 说明 |
|----|------|------|
| `storeDir` | `''` | 学习状态目录；空则用 `$DSH_HOME/dsh-learn`（无 `DSH_HOME` 时用 `~/.dsh-learn`） |
| `newSkillsPerDay` | `3` | 每次练习默认引入的技能数 |
| `dailyReviewLimit` | `20` | 单次 `learn_next_practice` 返回上限 |

## 目录结构

```
dsh-learn/
├── package.json          # dsh.bundle 声明
├── cordis.patch.yml      # 插入 learn 插件行
├── src/
│   ├── index.js          # 插件入口：name/inject/Config/apply，注册工具
│   ├── store.js          # JSON 存储 + SM-2 间隔重复 + 数据模型
│   └── tools.js          # 七个 learn_* 工具
├── skills/               # 编排 + 四阶段技能（SKILL.md）
├── web/                  # Web 仪表盘设计与数据契约（里程碑 3）
└── docs/DESIGN.md        # 架构 / 数据模型 / 调度算法
```

## 校验清单（首次装入真实 DSH 时）

- [ ] `defineTool` 从 `@deepseek-ai/dsh-tools` 正常导入，工具出现在系统提示的工具目录里
- [ ] `learn_curriculum` 能写出 `<storeDir>/<domain>.json`
- [ ] `learn_next_practice` → `learn_log_attempt` 后，`dueAt` / `mastery` / `xp` 正确更新
- [ ] `output` 的 `render` 返回的文本正常回显给模型
- [ ] 依赖版本（`@deepseek-ai/dsh-tools`、`@deepseek-ai/schemastery`）与你的 DSH 版本匹配

## 许可

MIT
