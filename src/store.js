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
import os from 'node:os'
import path from 'node:path'

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
 * Persistent learning store. One instance per plugin activation; every mutation
 * reads the target domain file, applies the change, and atomically writes it
 * back, so concurrent tool calls never corrupt a domain document.
 */
export class LearnStore {
  /**
   * @param {string} dir - absolute directory holding one JSON file per domain.
   */
  constructor(dir) {
    this.dir = dir
    /** @type {string | null} the last domain touched, used when a tool omits `domain`. */
    this.activeDomain = null
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
    await fs.mkdir(this.dir, { recursive: true })
    domain.updatedAt = new Date().toISOString()
    const target = this.filePath(domain.id)
    const tmp = `${target}.${process.pid}.tmp`
    await fs.writeFile(tmp, JSON.stringify(domain, null, 2), 'utf8')
    await fs.rename(tmp, target)
    this.activeDomain = domain.id
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
    const domain = await this.load(id)
    if (!domain) throw new Error(`unknown learning domain '${id}'; create its curriculum first`)
    this.activeDomain = id
    return domain
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
  const g = clamp(Math.round(grade), 0, 5)
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
  const masteryOf = id => (domain.nodes[id] ? domain.nodes[id].mastery : 100)
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
  const xpGained = 5 + clamp(Math.round(grade), 0, 5) * 3
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
