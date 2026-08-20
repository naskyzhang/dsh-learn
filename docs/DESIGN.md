# dsh-learn 设计文档

## 目标

把「更轻松地学习一个领域」固化成一个可跨会话恢复的阶段式引擎：

1. **技能解构** —— 拆出基本要素，标出最重要的（20% 努力拿 80% 结果）。
2. **顺序学习** —— 按课程节点顺序完成第一遍，不在普通对话中主动插入复习。
3. **文献阅读** —— 第一遍结束后，集中阅读 3 篇权威材料、2 篇近一年热门材料，并研究 3 位权威人物的关键原始观点。
4. **从头答对** —— 文献完成后从第一个节点复习，当前节点达到 3–5 分才进入下一章。
5. **开源借鉴** —— 全章答对后，对比 2–3 个优秀开源实现并生成从 0→1 的模块借鉴路线。

人脑做这个循环最容易断在两处：**状态没人记**（学到哪、哪薄弱、该复习什么）和**反馈不及时**。dsh-learn 就补这两块。

## 架构落点（DSH「一切皆插件」）

| 需求 | 承载方式 |
|------|---------|
| 记住每个领域的进度 | 每领域一个 JSON 文档（`LearnStore`），存于会话日志之外的 sidecar |
| 让模型能"建课/出题/批改" | 注册到 `ctx.tools` 的 `learn_*` 工具（`src/tools.js`） |
| 让 Agent 知道每阶段怎么做 | 6 个 `SKILL.md`（编排 + 五阶段） |
| 决定下一步学习阶段 | JSON 中的 `workflow` 状态机；复习阶段再使用 SM-2 调度器 |
| 可视化学习进度 | DSH 原生页面内可拖动的猫与知识植物悬浮窗（`docs/UI-INTEGRATION.md`），复用同一 JSON |

插件是 **function plugin**：具名导出 `name` / `inject` / `Config` / `apply`，无默认导出（否则 Loader 会丢掉注入元数据）。

## 数据模型

每个领域是一个 JSON 文件 `<storeDir>/<domain-id>.json`：

```jsonc
{
  "version": 1,
  "id": "rust-ownership",          // 由标题 slug 化得到，稳定
  "title": "Rust ownership",
  "shortTitle": "Rust所有权",       // 卡片语义摘要，≤8 字，不机械截断
  "createdAt": "...", "updatedAt": "...",
  "lifecycle": {                    // 同时最多一个 active
    "state": "active|paused|completed",
    "pausedAt": null, "completedAt": null, "resumedAt": null
  },
  "nodes": {                        // 技能树，键为节点 id
    "borrowing": {
      "id": "borrowing", "title": "借用检查", "titleEn": "Borrow Checker", // 中文名 ≤8 字
      "parent": null, "deps": [],
      "leverage": 90,               // 0-100 Pareto 杠杆分
      "mastery": 40,                // 0-100 掌握度（分级练习更新）
      "resources": [                // 该技能推荐的学习资料（名字 + 链接）
        { "title": "The Rust Book — Ownership",
          "url": "https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html" }
      ],
      "ease": 2.5, "intervalDays": 6, "reps": 2, "lapses": 0,  // SM-2 状态
      "dueAt": "..."                // 下次复习时间
    }
  },
  "resources": [                    // 溯源得到的资料（含作者/类型/摘要），并回写到节点 resources
    { "id": "res_..", "author": "..", "title": "..", "url": "..",
      "type": "repo|paper|doc|video|course|other", "summary": "..", "nodeIds": ["borrowing"] }
  ],
  "workflow": {
    "phase": "learning|literature|review|capstone|completed",
    "completedLessons": ["borrowing"], // 严格按 nodes 插入顺序完成
    "literature": {
      "authoritative": [],             // 固定 3 篇权威材料
      "trending": [],                  // 固定 2 篇近一年热门材料，含 publishedAt/heatEvidence
      "experts": [],                   // 固定 3 人，含权威依据、原始资料与关键观点
      "recommendedAt": null,
      "completedAt": null
    },
    "reviewStartedAt": null,
    "capstone": {
      "projects": [],                   // 2–3 个开源项目的实现、优缺点与可借鉴模块
      "blueprint": null,                // 推荐基座 + 3–12 步从 0→1 路线
      "completedAt": null
    }
  },
  "drills":   [ { "id": "drill_..", "nodeId": "borrowing", "type": "recall|apply|explain|debug|build", "prompt": "..", "answer": ".." } ],
  "attempts": [ { "id": "att_..", "nodeId": "borrowing", "drillId": null, "grade": 4,
                  "note": "..", "source": "scheduled|card", "ts": ".." } ],
  "reviews":  [ { "id": "rev_..", "summary": "..", "adjustments": [ { "nodeId": "borrowing", "leverage": 95 } ], "ts": ".." } ],
  "profile":  { "xp": 120, "level": 2, "streak": 3, "lastPracticeDay": "2026-08-16" }
}
```

`workflow` 决定当前允许的主路径；`SkillNode` 承载课程顺序、资料、掌握度与复习排程。卡片点击是一条显式的定向复习旁路，不会改变主流程阶段。

## 存储一致性与输入边界

`LearnStore.update()` 是领域级读改写事务。同一插件实例先通过 Promise 队列保持调用顺序，再通过 `proper-lockfile` 的 store-wide 生命周期锁协调共享 `storeDir` 的其他进程。事务持锁后重新读取最新 JSON，只有 mutator 成功才写回；写回采用随机临时文件 + 原子 `rename`。因此并发练习不会丢失 `attempts` / XP，失败事务也不会留下部分修改，同时最多只有一个 `active` 课程。

模型工具参数不能只依赖 JSON Schema 的基础类型检查，业务边界还会执行：

- 课程节点 ID 唯一，父节点和依赖均存在，父子图与依赖图都无环；
- `grade` 必须是 0–5 整数，`leverage` / `mastery` 必须是 0–100 整数，不再静默截断；
- 资源、练习和复盘中的节点引用必须存在，`drillId` 必须存在且属于本次练习节点；挂资料时 `nodeIds` 至少指向一个已有技能；
- 标题、题目、答案、复盘等文本必须非空并有长度上限，资源地址仅接受绝对 HTTP(S) URL；每个技能节点最多 20 条推荐资料，URL 不可重复。
- 课程第一遍只能按节点顺序完成；文献推荐严格要求 3 篇权威 + 2 篇近一年热门 + 3 位权威人物，链接不可重复，热门材料必须提供日期与热度证据。
- 开源终章严格要求 2–3 个唯一仓库，逐个保存实现方式、优缺点与可借鉴模块；0→1 路线的每一步必须引用其中一个项目。

## 课程生命周期

- 新建或恢复主题前检查当前 `active` 课程；完成开源终章，或所有节点掌握度达到 80，均可视为课程完成。
- 切换未完成课程时，工具拒绝直接切换并要求 Agent 先询问用户：`pause` 保留全部进度，`end` 永久删除对应 JSON。
- 所有节点掌握度均达到 80 的课程可在切换时自动标记为 `completed` 并保留。
- `paused` / `completed` 课程不能继续写入或练习，必须先通过 `learn_course resume` 恢复为唯一活跃课程。
- `learn_course end` 需要显式确认；删除活跃课程后，学习伙伴回到空状态。

## 阶段状态机与复习调度

- **learning**：`learn_lesson next` 返回第一个未完成节点；`complete` 只接受该节点。完成最后一个节点后进入 `literature`。
- **literature**：`learn_literature recommend` 保存固定配额的阅读清单；只有用户实际完成阅读后才调用 `complete` 并进入 `review`。
- **review**：按课程顺序从第一个节点开始，一次只返回一个节点；3–5 分视为答对并前进，0–2 分保留当前节点。所有节点都有一次正确的 scheduled attempt 后进入 `capstone`。
- **capstone**：`learn_open_source` 保存 2–3 个开源实现的同维度对比、可借鉴模块和 0→1 构建路线，完成后进入 `completed`。
- **completed**：完整学习旅程结束，课程切换时可直接归档。
- **显式旁路**：用户点击技能卡片可随时定向复习该节点；attempt 记录为 `source: "card"`，既不会提前切换主阶段，也不会让该节点在文献后的首轮顺序复习中被跳过。

- **重排**（`applyGrade`）：分级 0–5（SuperMemo）。0–2 视为遗忘，重置间隔为 1 天；3–5 递进（1 → 6 → `interval × ease`），并按 SM-2 公式调整 `ease`（夹在 1.3–3.0）。`mastery` 用指数滑动平均跟踪近期回忆水平。
- **选题**（`selectPractice`）：完成性复习严格按节点顺序，一次一个，且错误节点不会被跳过；卡片 attempt 不计入全局完成门槛。
- **游戏化**（`awardProgress`）：每次练习给 XP（基础 5 + 分级×3），按累计 XP 升级；跨天维护连续打卡 streak。

## 工具清单（model-facing）

| 工具 | 阶段 | 作用 |
|------|------|------|
| `learn_course` | 生命周期 | 列出、恢复或永久结束课程 |
| `learn_curriculum` | ① 解构 | 建/替换某领域的 Pareto 技能树；节点可带 `resources: [{ title, url }]` |
| `learn_add_resource` | 课程资料 | 记录资料并挂到技能节点（必填 `nodeIds`） |
| `learn_lesson` | ② 顺序学习 | 获取或完成严格顺序的第一遍课程节点 |
| `learn_literature` | ③ 文献阅读 | 保存固定配额的权威/热门材料与人物观点；完成后切换阶段 |
| `learn_next_practice` | ④ 复习 | 从头逐章返回；当前章答对后才前进 |
| `learn_generate_drill` | ④ 复习 | 保存可复用的练习题 |
| `learn_log_attempt` | ④ 反馈 | 记录一次分级结果，更新 SM-2 / 掌握度 / XP |
| `learn_open_source` | ⑤ 开源借鉴 | 对比 2–3 个实现并保存从 0→1 的模块借鉴路线 |
| `learn_review` | ④ 复盘 | 记录复盘并调整技能树权重 |
| `learn_status` | 读 | 返回当前阶段与进度仪表盘摘要 |

## 里程碑

- **M1（已实现）**：顺序学习 → 文献阅读 → 从头答对 → 开源借鉴的持久化状态机、工具、技能与 SM-2 评分。
- **M2**：`source-experts` 的联网研究可交给 subagent 深度检索；把练习历史导出。
- **M3（已实现）**：通过 `dsh.client` 和 `shell.overlay` slot，把可拖动的猫与知识植物嵌入 DSH 原页面；不新增独立前端。

## 已知限制

- 学习状态存于 JSON sidecar，不进会话日志，因此单次会话记录无法完整重建学习进度（与 dsh-diagram 的 sidecar 取舍一致）。
- 插件层针对 DeepSeek Harness 预发布 API（0.1.0-rc）编写，未在本机联调；升级 DSH 时需按下述清单校验工具注册与 `defineTool` 契约。
- DSH 页面内的小组件依赖当前预发布版 Client slot 与 Connection RPC API；升级 DSH 时需重新验证 browser bundle envelope 和 slot key。
