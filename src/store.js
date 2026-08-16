/**
 * Learning-loop state kernel for dsh-learn.
 *
 * Owns the durable per-domain learning state (skill tree, resources, drills,
 * attempts, retrospectives, learner profile) as one JSON document per domain,
 * plus the SM-2 spaced-repetition scheduler that decides what to practice next.
 *
 * State lives in a JSON store outside the session log (like a plugin sidecar),
 * so a domain's progress persists across sessions and is not reconstructable
 * from a single conversation transcript.
 *
 * @module dsh-learn/store
 */

import { promises as fs } from 'node:fs'
import { randomUUID } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import lockfile from 'proper-lockfile'

/** Bumped only on incompatible on-disk format changes. */
export const STORE_VERSION = 1

/** One day in milliseconds; the scheduler's time unit. */
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Resolve the directory that holds one JSON file per learning domain.
 * @param {string} configured - the plugin's `storeDir` config; empty means derive a default.
 * @returns {string} an absolute directory path.
 */
export function resolveStoreDir(configured) {
  if (configured && configured.trim().length > 0) return path.resolve(configured)
  const home = process.env.DSH_HOME
  if (home && home.trim().length > 0) return path.join(home, 'dsh-learn')
  return path.join(os.homedir(), '.dsh-learn')
}

/**
 * Normalize a free-form domain name into a stable, filesystem-safe id.
 * @param {string} name - the human domain title (e.g. "Reinforcement Learning").
 * @returns {string} a slug id (e.g. "reinforcement-learning").
 */
export function domainId(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'domain'
}

/**
 * Persistent learning store. One instance per plugin activation; mutations of
 * the same domain run as serialized read-modify-write transactions. Different
 * domains may progress concurrently. A filesystem lock coordinates separate
 * host processes sharing a store directory; unique temporary files and atomic
 * renames prevent torn JSON.
 */
export class LearnStore {
  /**
   * @param {string} dir - absolute directory holding one JSON file per domain.
   */
  constructor(dir) {
    this.dir = dir
    /** @type {string | null} the last domain touched, used when a tool omits `domain`. */
    this.activeDomain = null
    /** @type {Map<string, Promise<unknown>>} last queued transaction per domain. */
    this.transactions = new Map()
    /** @type {Set<() => void>} companion snapshot change listeners. */
    this.changeListeners = new Set()
  }

  /**
   * Absolute path of one domain's JSON document.
   * @param {string} id - the domain slug id.
   * @returns {string} the file path.
   */
  filePath(id) {
    return path.join(this.dir, `${id}.json`)
  }

  /**
   * Load a domain document, or return null when it does not exist yet.
   * @param {string} id - the domain slug id.
   * @returns {Promise<object | null>} the parsed domain, or null.
   */
  async load(id) {
    try {
      const raw = await fs.readFile(this.filePath(id), 'utf8')
      return JSON.parse(raw)
    } catch (err) {
      if (err && err.code === 'ENOENT') return null
      throw err
    }
  }

  /**
   * Atomically persist a domain document (temp file + rename).
   * @param {object} domain - the domain document to write.
   * @returns {Promise<void>}
   */
  async save(domain) {
    return await this.enqueue(domain.id, async () => {
      await this.write(domain)
    })
  }

  /**
   * Serialize one read-modify-write transaction for a required domain.
   * The mutator may return a value that is passed back after the write commits.
   * @template T
   * @param {string | undefined} name - explicit domain title, or the active domain.
   * @param {(domain: object) => T | Promise<T>} mutator - operation applied to the latest document.
   * @returns {Promise<T>} the mutator result after a successful atomic write.
   */
  async update(name, mutator) {
    const id = this.resolveId(name)
    return await this.enqueue(id, async () => {
      const domain = await this.load(id)
      if (!domain) throw new Error(`unknown learning domain '${id}'; create its curriculum first`)
      const result = await mutator(domain)
      await this.write(domain)
      return result
    })
  }

  /**
   * Atomically write a domain while its transaction is held.
   * @param {object} domain - the complete domain document.
   * @returns {Promise<void>}
   */
  async write(domain) {
    await fs.mkdir(this.dir, { recursive: true })
    const previousUpdate = Date.parse(domain.updatedAt)
    const now = Date.now()
    domain.updatedAt = new Date(Number.isFinite(previousUpdate) && now <= previousUpdate
      ? previousUpdate + 1
      : now).toISOString()
    const target = this.filePath(domain.id)
    const tmp = `${target}.${process.pid}.${randomUUID()}.tmp`
    try {
      await fs.writeFile(tmp, JSON.stringify(domain, null, 2), 'utf8')
      await fs.rename(tmp, target)
    } catch (error) {
      await fs.rm(tmp, { force: true })
      throw error
    }
    this.activeDomain = domain.id
    for (const listener of [...this.changeListeners]) {
      try {
        listener()
      } catch {
        // Observers are advisory UI wakeups and must never turn a committed
        // durable write into an apparent transaction failure.
      }
    }
  }

  /**
   * Queue one operation after the preceding transaction for the same domain.
   * A rejected predecessor never poisons later work.
   * @template T
   * @param {string} id - domain slug id.
   * @param {() => T | Promise<T>} operation - exclusive operation.
   * @returns {Promise<T>} operation result.
   */
  async enqueue(id, operation) {
    const previous = this.transactions.get(id) ?? Promise.resolve()
    const current = previous.catch(() => undefined).then(async () => {
      await fs.mkdir(this.dir, { recursive: true })
      const release = await lockfile.lock(this.filePath(id), {
        realpath: false,
        stale: 30_000,
        update: 5_000,
        retries: {
          retries: 50,
          factor: 1.2,
          minTimeout: 10,
          maxTimeout: 200,
          randomize: true,
        },
      })
      try {
        return await operation()
      } finally {
        await release()
      }
    })
    this.transactions.set(id, current)
    try {
      return await current
    } finally {
      if (this.transactions.get(id) === current) this.transactions.delete(id)
    }
  }

  /**
   * Resolve which domain a tool call targets: the explicit name, else the most
   * recently touched one. Throws when neither is available.
   * @param {string | undefined} name - an explicit domain title, if the tool supplied one.
   * @returns {string} the resolved domain slug id.
   */
  resolveId(name) {
    if (name && name.trim().length > 0) return domainId(name)
    if (this.activeDomain) return this.activeDomain
    throw new Error('no active learning domain; pass `domain` or create a curriculum first')
  }

  /**
   * Load a domain and fail loud when it is missing — the caller needs it to exist.
   * @param {string | undefined} name - an explicit domain title, if any.
   * @returns {Promise<object>} the domain document.
   */
  async require(name) {
    const id = this.resolveId(name)
    const pending = this.transactions.get(id)
    if (pending) await pending.catch(() => undefined)
    const domain = await this.load(id)
    if (!domain) throw new Error(`unknown learning domain '${id}'; create its curriculum first`)
    this.activeDomain = id
    return domain
  }

  /**
   * Subscribe to successful local writes. Cross-process writers are observed by
   * the long-poll timeout in {@link waitForCompanionSnapshot}.
   * @param {() => void} listener - callback invoked after an atomic commit.
   * @returns {() => void} disposer.
   */
  subscribe(listener) {
    this.changeListeners.add(listener)
    return () => this.changeListeners.delete(listener)
  }

  /**
   * Return the compact, browser-safe state rendered by the sidebar companion.
   * The most recently updated domain is selected after a Host restart.
   * @returns {Promise<object>} companion snapshot.
   */
  async companionSnapshot() {
    const id = this.activeDomain ?? await this.latestDomainId()
    if (id === null) return emptyCompanionSnapshot()
    const pending = this.transactions.get(id)
    if (pending) await pending.catch(() => undefined)
    const domain = await this.load(id)
    if (!domain) {
      if (this.activeDomain === id) this.activeDomain = null
      return emptyCompanionSnapshot()
    }
    this.activeDomain = id
    const xp = domain.profile.xp
    const level = domain.profile.level
    const levelStartXp = 50 * (level - 1) * level
    const nextLevelXp = 50 * level * (level + 1)
    const levelProgress = Math.round(clamp(
      ((xp - levelStartXp) / Math.max(1, nextLevelXp - levelStartXp)) * 100,
      0,
      100,
    ))
    return {
      domainId: domain.id,
      domainTitle: domain.title,
      xp,
      level,
      levelProgress,
      streak: domain.profile.streak,
      dueCount: dueCount(domain),
      revision: domain.updatedAt,
    }
  }

  /**
   * Long-poll until the compact snapshot revision changes or the timeout
   * expires. This gives the browser prompt updates without a busy polling loop.
   * @param {string | null | undefined} revision - revision already held by the browser.
   * @param {AbortSignal} signal - transport cancellation.
   * @param {number} [timeoutMs] - maximum wait before checking cross-process writes.
   * @returns {Promise<object>} latest companion snapshot.
   */
  async waitForCompanionSnapshot(revision, signal, timeoutMs = 20_000) {
    const current = await this.companionSnapshot()
    if (current.revision !== revision || signal.aborted) return current
    await new Promise((resolve, reject) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        off()
        signal.removeEventListener('abort', abort)
        resolve()
      }
      const abort = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        off()
        reject(signal.reason ?? new Error('companion snapshot request aborted'))
      }
      const fail = (error) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        off()
        signal.removeEventListener('abort', abort)
        reject(error)
      }
      const off = this.subscribe(finish)
      const timer = setTimeout(finish, timeoutMs)
      timer.unref?.()
      signal.addEventListener('abort', abort, { once: true })
      // Close the read→subscribe race: a commit between the first snapshot and
      // listener registration is visible here even though its notification was missed.
      void this.companionSnapshot().then((latest) => {
        if (latest.revision !== revision) finish()
      }, fail)
    })
    return await this.companionSnapshot()
  }

  /**
   * Locate the newest persisted domain when no domain has been touched since
   * this Host process started.
   * @returns {Promise<string | null>} latest domain id.
   */
  async latestDomainId() {
    let entries
    try {
      entries = await fs.readdir(this.dir, { withFileTypes: true })
    } catch (error) {
      if (error && error.code === 'ENOENT') return null
      throw error
    }
    const candidates = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => entry.name.slice(0, -'.json'.length))
    let latest = null
    let latestMtime = -1
    await Promise.all(candidates.map(async (id) => {
      const stat = await fs.stat(this.filePath(id))
      if (stat.mtimeMs > latestMtime) {
        latest = id
        latestMtime = stat.mtimeMs
      }
    }))
    return latest
  }
}

/**
 * Stable empty state shown before the first curriculum exists.
 * @returns {object} empty companion snapshot.
 */
function emptyCompanionSnapshot() {
  return {
    domainId: null,
    domainTitle: null,
    xp: 0,
    level: 1,
    levelProgress: 0,
    streak: 0,
    dueCount: 0,
    revision: 'none',
  }
}

/**
 * Build a fresh, empty domain document.
 * @param {string} title - the human domain title.
 * @returns {object} a new domain document.
 */
export function newDomain(title) {
  const now = new Date().toISOString()
  return {
    version: STORE_VERSION,
    id: domainId(title),
    title: title.trim(),
    createdAt: now,
    updatedAt: now,
    nodes: {},
    resources: [],
    drills: [],
    attempts: [],
    reviews: [],
    profile: { xp: 0, level: 1, streak: 0, lastPracticeDay: null },
  }
}

/**
 * Create a scheduling record for a newly deconstructed skill node. New nodes are
 * due immediately so the first practice session can reach them.
 * @param {{ id: string, title: string, parent?: string, leverage?: number, deps?: string[] }} spec - the node spec.
 * @returns {object} the stored node with SM-2 fields.
 */
export function newNode(spec) {
  return {
    id: spec.id,
    title: spec.title,
    parent: spec.parent ?? null,
    deps: spec.deps ?? [],
    // 0-100 Pareto leverage: how much of the "80% result" this element carries.
    leverage: clamp(spec.leverage ?? 50, 0, 100),
    // 0-100 mastery, updated by graded attempts.
    mastery: 0,
    // SM-2 scheduler state.
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    dueAt: new Date().toISOString(),
  }
}

/** Maximum curriculum size accepted from one model tool call. */
const MAX_CURRICULUM_NODES = 100
/** Stable node ids keep references compact and avoid ambiguous whitespace. */
const NODE_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/

/**
 * Validate and normalize a model-supplied curriculum before replacing durable
 * state. Rejects duplicate or malformed ids, dangling references, duplicate
 * dependencies, self references, and cycles in both parent and prerequisite
 * graphs.
 * @param {string} title - domain title.
 * @param {object[]} specs - model-supplied node specs.
 * @returns {object[]} normalized node specs.
 */
export function validateCurriculum(title, specs) {
  assertText('domain', title, 200)
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error('invalid curriculum: `nodes` must contain at least one skill')
  }
  if (specs.length > MAX_CURRICULUM_NODES) {
    throw new Error(`invalid curriculum: at most ${MAX_CURRICULUM_NODES} skills are allowed`)
  }

  const normalized = []
  const ids = new Set()
  for (const [index, raw] of specs.entries()) {
    const id = assertNodeId(`nodes[${index}].id`, raw.id)
    if (ids.has(id)) throw new Error(`invalid curriculum: duplicate node id '${id}'`)
    ids.add(id)
    const nodeTitle = assertText(`nodes[${index}].title`, raw.title, 200)
    if (!Number.isInteger(raw.leverage) || raw.leverage < 0 || raw.leverage > 100) {
      throw new Error(`invalid curriculum: nodes[${index}].leverage must be an integer from 0 to 100`)
    }
    const parent = raw.parent === undefined ? null : assertNodeId(`nodes[${index}].parent`, raw.parent)
    const deps = raw.deps === undefined ? [] : validateNodeIdList(`nodes[${index}].deps`, raw.deps)
    if (parent === id) throw new Error(`invalid curriculum: node '${id}' cannot be its own parent`)
    if (deps.includes(id)) throw new Error(`invalid curriculum: node '${id}' cannot depend on itself`)
    normalized.push({ id, title: nodeTitle, parent, leverage: raw.leverage, deps })
  }

  for (const node of normalized) {
    if (node.parent !== null && !ids.has(node.parent)) {
      throw new Error(`invalid curriculum: node '${node.id}' references unknown parent '${node.parent}'`)
    }
    for (const dep of node.deps) {
      if (!ids.has(dep)) throw new Error(`invalid curriculum: node '${node.id}' references unknown dependency '${dep}'`)
    }
  }
  assertAcyclic(normalized, node => node.parent === null ? [] : [node.parent], 'parent')
  assertAcyclic(normalized, node => node.deps, 'dependency')
  return normalized
}

/**
 * Validate a SuperMemo grade at the tool boundary.
 * @param {number} grade - candidate grade.
 * @returns {number} the unchanged valid grade.
 */
export function validateGrade(grade) {
  if (!Number.isInteger(grade) || grade < 0 || grade > 5) {
    throw new Error('invalid attempt: `grade` must be an integer from 0 to 5')
  }
  return grade
}

/**
 * Validate references to existing skill nodes.
 * @param {object} domain - target domain.
 * @param {string[]} ids - candidate node ids.
 * @param {string} field - diagnostic field name.
 * @param {{ allowEmpty?: boolean }} [options] - whether an empty list is accepted.
 * @returns {string[]} normalized unique ids.
 */
export function validateNodeReferences(domain, ids, field, options = {}) {
  const normalized = validateNodeIdList(field, ids)
  if (!options.allowEmpty && normalized.length === 0) {
    throw new Error(`invalid ${field}: at least one skill node is required`)
  }
  for (const id of normalized) {
    if (!Object.hasOwn(domain.nodes, id)) throw new Error(`invalid ${field}: unknown skill node '${id}'`)
  }
  return normalized
}

/**
 * Validate non-empty bounded user/model text.
 * @param {string} field - diagnostic field name.
 * @param {unknown} value - candidate text.
 * @param {number} maxLength - maximum UTF-16 code-unit length.
 * @returns {string} trimmed text.
 */
export function assertText(field, value, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`invalid ${field}: must be a non-empty string`)
  }
  const normalized = value.trim()
  if (normalized.length > maxLength) {
    throw new Error(`invalid ${field}: must be at most ${maxLength} characters`)
  }
  return normalized
}

/**
 * Validate a 0-100 integer without silently clamping model input.
 * @param {string} field - diagnostic field name.
 * @param {unknown} value - candidate value.
 * @returns {number} valid integer.
 */
export function validatePercentage(field, value) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(`invalid ${field}: must be an integer from 0 to 100`)
  }
  return value
}

/**
 * Normalize and deduplicate a node-id array.
 * @param {string} field - diagnostic field name.
 * @param {unknown} values - candidate array.
 * @returns {string[]} normalized ids.
 */
function validateNodeIdList(field, values) {
  if (!Array.isArray(values)) throw new Error(`invalid ${field}: must be an array`)
  const ids = values.map((value, index) => assertNodeId(`${field}[${index}]`, value))
  if (new Set(ids).size !== ids.length) throw new Error(`invalid ${field}: duplicate node ids are not allowed`)
  return ids
}

/**
 * Validate one stable skill-node id.
 * @param {string} field - diagnostic field name.
 * @param {unknown} value - candidate id.
 * @returns {string} valid id.
 */
function assertNodeId(field, value) {
  if (typeof value !== 'string' || !NODE_ID_PATTERN.test(value)) {
    throw new Error(`invalid ${field}: use 1-64 lowercase letters, digits, '_' or '-', starting with a letter or digit`)
  }
  return value
}

/**
 * Reject a cycle in one directed projection of the curriculum.
 * @param {object[]} nodes - validated nodes.
 * @param {(node: object) => string[]} edgesOf - outgoing references.
 * @param {string} label - graph name used in diagnostics.
 * @returns {void}
 */
function assertAcyclic(nodes, edgesOf, label) {
  const byId = new Map(nodes.map(node => [node.id, node]))
  const visiting = new Set()
  const visited = new Set()
  const visit = (id) => {
    if (visiting.has(id)) throw new Error(`invalid curriculum: ${label} cycle includes '${id}'`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const next of edgesOf(byId.get(id))) visit(next)
    visiting.delete(id)
    visited.add(id)
  }
  for (const node of nodes) visit(node.id)
}

/**
 * Apply one graded attempt to a node's SM-2 schedule and mastery.
 *
 * Grade scale (SuperMemo SM-2): 0-2 is a lapse (reset interval), 3-5 advances.
 * Mastery is an exponential moving average of normalized grades, so it tracks
 * recent recall rather than a lifetime average.
 *
 * @param {object} node - the node to update (mutated in place).
 * @param {number} grade - the recall grade, 0 (blackout) to 5 (perfect).
 * @param {Date} [now] - the evaluation time; defaults to the current time.
 * @returns {object} the mutated node.
 */
export function applyGrade(node, grade, now = new Date()) {
  const g = validateGrade(grade)
  if (g < 3) {
    node.lapses += 1
    node.reps = 0
    node.intervalDays = 1
  } else {
    node.reps += 1
    if (node.reps === 1) node.intervalDays = 1
    else if (node.reps === 2) node.intervalDays = 6
    else node.intervalDays = Math.round(node.intervalDays * node.ease)
    node.ease = clamp(node.ease + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02)), 1.3, 3.0)
  }
  node.dueAt = new Date(now.getTime() + node.intervalDays * DAY_MS).toISOString()
  // Mastery EMA: weight the newest grade at 0.4, keep 0.6 of prior mastery.
  const normalized = (g / 5) * 100
  node.mastery = Math.round(clamp(node.mastery * 0.6 + normalized * 0.4, 0, 100))
  return node
}

/**
 * Rank nodes for the next practice session: overdue first, then by learning
 * value (high leverage and low mastery), respecting unmet dependencies.
 *
 * A node whose dependency nodes are still weak (mastery < 50) is held back so
 * practice follows the skill tree's prerequisite order.
 *
 * @param {object} domain - the domain document.
 * @param {number} count - how many nodes to return.
 * @param {Date} [now] - the current time; defaults to now.
 * @returns {object[]} the selected nodes, most urgent first.
 */
export function selectPractice(domain, count, now = new Date()) {
  const nodes = Object.values(domain.nodes)
  const masteryOf = (id) => {
    if (!Object.hasOwn(domain.nodes, id)) {
      throw new Error(`invalid stored curriculum: unknown dependency '${id}'`)
    }
    const dependency = domain.nodes[id]
    return dependency.mastery
  }
  const unlocked = node => node.deps.every(dep => masteryOf(dep) >= 50)
  const ready = nodes.filter(unlocked)
  const nowMs = now.getTime()
  const scored = ready.map(node => {
    const overdueDays = Math.max(0, (nowMs - Date.parse(node.dueAt)) / DAY_MS)
    // Value blends urgency, Pareto leverage, and the mastery gap still to close.
    const value = overdueDays * 10 + node.leverage * (100 - node.mastery) / 100
    return { node, value }
  })
  scored.sort((a, b) => b.value - a.value)
  return scored.slice(0, Math.max(1, count)).map(s => s.node)
}

/**
 * Count how many nodes are due for review at a given time.
 * @param {object} domain - the domain document.
 * @param {Date} [now] - the current time; defaults to now.
 * @returns {number} the due-node count.
 */
export function dueCount(domain, now = new Date()) {
  const nowMs = now.getTime()
  return Object.values(domain.nodes).filter(n => Date.parse(n.dueAt) <= nowMs).length
}

/**
 * Update the learner's gamification profile after a practice attempt: award XP,
 * recompute level, and maintain the daily streak.
 * @param {object} domain - the domain document (profile mutated in place).
 * @param {number} grade - the attempt grade, 0-5.
 * @param {Date} [now] - the current time; defaults to now.
 * @returns {{ xpGained: number, leveledUp: boolean, streak: number }} a summary of the change.
 */
export function awardProgress(domain, grade, now = new Date()) {
  const profile = domain.profile
  const xpGained = 5 + validateGrade(grade) * 3
  profile.xp += xpGained
  const prevLevel = profile.level
  // Level curve: each level needs 100 more XP than the last (100, 300, 600...).
  profile.level = Math.floor((Math.sqrt(1 + 8 * (profile.xp / 100)) - 1) / 2) + 1
  const today = now.toISOString().slice(0, 10)
  if (profile.lastPracticeDay !== today) {
    const yesterday = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10)
    profile.streak = profile.lastPracticeDay === yesterday ? profile.streak + 1 : 1
    profile.lastPracticeDay = today
  }
  return { xpGained, leveledUp: profile.level > prevLevel, streak: profile.streak }
}

/**
 * Clamp a number into an inclusive range.
 * @param {number} n - the value.
 * @param {number} lo - the lower bound.
 * @param {number} hi - the upper bound.
 * @returns {number} the clamped value.
 */
export function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * Generate a short unique id for a resource, drill, attempt, or review record.
 * @param {string} prefix - a short kind prefix (e.g. 'drill').
 * @returns {string} a unique id.
 */
export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
