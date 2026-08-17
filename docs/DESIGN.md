# dsh-learn 设计文档

## 目标

把「更轻松地学习一个领域」固化成一个可复用的闭环引擎。它对应一套四步学习法：

1. **技能解构** —— 拆出基本要素，标出最重要的（20% 努力拿 80% 结果）。
2. **溯源** —— 找到领域最强的人，收集其开源 / 文档 / 论文并整理。
3. **重复练习** —— 以游戏化方式刻意练习。
4. **即时反馈** —— 小步反馈 → 复盘 → 调整行为 → 回到第 3 步。

人脑做这个循环最容易断在两处：**状态没人记**（学到哪、哪薄弱、该复习什么）和**反馈不及时**。dsh-learn 就补这两块。

## 架构落点（DSH「一切皆插件」）

| 需求 | 承载方式 |
|------|---------|
| 记住每个领域的进度 | 每领域一个 JSON 文档（`LearnStore`），存于会话日志之外的 sidecar |
| 让模型能"建课/出题/批改" | 注册到 `ctx.tools` 的 `learn_*` 工具（`src/tools.js`） |
| 让 Agent 知道每阶段怎么做 | 5 个 `SKILL.md`（编排 + 四阶段） |
| 决定"下一步练什么" | `src/store.js` 里的 SM-2 间隔重复调度器 |
| 可视化学习进度 | DSH 原生页面内可拖动的猫与知识植物悬浮窗（`docs/UI-INTEGRATION.md`），复用同一 JSON |

插件是 **function plugin**：具名导出 `name` / `inject` / `Config` / `apply`，无默认导出（否则 Loader 会丢掉注入元数据）。

## 数据模型

每个领域是一个 JSON 文件 `<storeDir>/<domain-id>.json`：

```jsonc
{
  "version": 1,
  "id": "rust-ownership",          // 由标题 slug 化得到，稳定
  "title": "Rust ownership",
  "createdAt": "...", "updatedAt": "...",
  "lifecycle": {                    // 同时最多一个 active
    "state": "active|paused|completed",
    "pausedAt": null, "completedAt": null, "resumedAt": null
  },
  "nodes": {                        // 技能树，键为节点 id
    "borrowing": {
      "id": "borrowing", "title": "借用检查", "parent": null, "deps": [],
      "leverage": 90,               // 0-100 Pareto 杠杆分
      "mastery": 40,                // 0-100 掌握度（分级练习更新）
      "ease": 2.5, "intervalDays": 6, "reps": 2, "lapses": 0,  // SM-2 状态
      "dueAt": "..."                // 下次复习时间
    }
  },
  "resources": [                    // 溯源得到的资料
    { "id": "res_..", "author": "..", "title": "..", "url": "..",
      "type": "repo|paper|doc|video|course|other", "summary": "..", "nodeIds": ["borrowing"] }
  ],
  "drills":   [ { "id": "drill_..", "nodeId": "borrowing", "type": "recall|apply|explain|debug|build", "prompt": "..", "answer": ".." } ],
  "attempts": [ { "id": "att_..", "nodeId": "borrowing", "drillId": null, "grade": 4, "note": "..", "ts": ".." } ],
  "reviews":  [ { "id": "rev_..", "summary": "..", "adjustments": [ { "nodeId": "borrowing", "leverage": 95 } ], "ts": ".." } ],
  "profile":  { "xp": 120, "level": 2, "streak": 3, "lastPracticeDay": "2026-08-16" }
}
```

一切围绕 `SkillNode`：解构生成它 → 溯源给它挂资料 → 练习消耗它 → 反馈更新它的 `mastery` 与 SM-2 排程。

## 存储一致性与输入边界

`LearnStore.update()` 是领域级读改写事务。同一插件实例先通过 Promise 队列保持调用顺序，再通过 `proper-lockfile` 的 store-wide 生命周期锁协调共享 `storeDir` 的其他进程。事务持锁后重新读取最新 JSON，只有 mutator 成功才写回；写回采用随机临时文件 + 原子 `rename`。因此并发练习不会丢失 `attempts` / XP，失败事务也不会留下部分修改，同时最多只有一个 `active` 课程。

模型工具参数不能只依赖 JSON Schema 的基础类型检查，业务边界还会执行：

- 课程节点 ID 唯一，父节点和依赖均存在，父子图与依赖图都无环；
- `grade` 必须是 0–5 整数，`leverage` / `mastery` 必须是 0–100 整数，不再静默截断；
- 资源、练习和复盘中的节点引用必须存在，`drillId` 必须存在且属于本次练习节点；
- 标题、题目、答案、复盘等文本必须非空并有长度上限，资源地址仅接受绝对 HTTP(S) URL。

## 课程生命周期

- 新建或恢复主题前检查当前 `active` 课程；若其任一节点掌握度低于 80，则视为未完成。
- 切换未完成课程时，工具拒绝直接切换并要求 Agent 先询问用户：`pause` 保留全部进度，`end` 永久删除对应 JSON。
- 所有节点掌握度均达到 80 的课程可在切换时自动标记为 `completed` 并保留。
- `paused` / `completed` 课程不能继续写入或练习，必须先通过 `learn_course resume` 恢复为唯一活跃课程。
- `learn_course end` 需要显式确认；删除活跃课程后，学习伙伴回到空状态。

## 调度：SM-2 间隔重复 + Pareto 排序

- **重排**（`applyGrade`）：分级 0–5（SuperMemo）。0–2 视为遗忘，重置间隔为 1 天；3–5 递进（1 → 6 → `interval × ease`），并按 SM-2 公式调整 `ease`（夹在 1.3–3.0）。`mastery` 用指数滑动平均跟踪近期回忆水平。
- **选题**（`selectPractice`）：过期越久越靠前，其次按 `leverage × (100 − mastery)`（高杠杆、低掌握优先）；依赖节点掌握度 < 50 的技能会被暂时锁住，保证按先修顺序练。
- **游戏化**（`awardProgress`）：每次练习给 XP（基础 5 + 分级×3），按累计 XP 升级；跨天维护连续打卡 streak。

## 工具清单（model-facing）

| 工具 | 阶段 | 作用 |
|------|------|------|
| `learn_course` | 生命周期 | 列出、恢复或永久结束课程 |
| `learn_curriculum` | ① 解构 | 建/替换某领域的 Pareto 技能树 |
| `learn_add_resource` | ② 溯源 | 记录专家资料并关联到技能节点 |
| `learn_next_practice` | ③ 练习 | 按 SRS + 杠杆返回该练的技能 |
| `learn_generate_drill` | ③ 练习 | 保存可复用的练习题 |
| `learn_log_attempt` | ④ 反馈 | 记录一次分级结果，更新 SM-2 / 掌握度 / XP |
| `learn_review` | ④ 复盘 | 记录复盘并调整技能树权重 |
| `learn_status` | 读 | 进度仪表盘摘要 |

## 里程碑

- **M1（已实现）**：四模块闭环的工具 + 技能 + JSON 存储 + SM-2。纯对话即可跑通。
- **M2**：`source-experts` 的联网研究可交给 subagent 深度检索；把练习历史导出。
- **M3（已实现）**：通过 `dsh.client` 和 `shell.overlay` slot，把可拖动的猫与知识植物嵌入 DSH 原页面；不新增独立前端。

## 已知限制

- 学习状态存于 JSON sidecar，不进会话日志，因此单次会话记录无法完整重建学习进度（与 dsh-diagram 的 sidecar 取舍一致）。
- 插件层针对 DeepSeek Harness 预发布 API（0.1.0-rc）编写，未在本机联调；升级 DSH 时需按下述清单校验工具注册与 `defineTool` 契约。
- DSH 页面内的小组件依赖当前预发布版 Client slot 与 Connection RPC API；升级 DSH 时需重新验证 browser bundle envelope 和 slot key。
