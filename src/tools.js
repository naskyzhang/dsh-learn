/**
 * Model-facing tools for the dsh-learn learning loop. Each tool maps to one step
 * of the methodology: deconstruct (curriculum), source (resources), practice
 * (next + drill), feedback (attempt), and retrospective (review), plus a status
 * read. All state changes go through {@link LearnStore}.
 *
 * @module dsh-learn/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  applyGrade,
  awardProgress,
  dueCount,
  makeId,
  newDomain,
  newNode,
  selectPractice,
} from './store.js'

/**
 * Build every learn_* tool bound to one store and pacing config.
 * @param {import('./store.js').LearnStore} store - the shared learning store.
 * @param {{ newSkillsPerDay: number, dailyReviewLimit: number }} pacing - SRS pacing config.
 * @returns {object[]} the tool definitions ready for ctx.tools.register.
 */
export function buildTools(store, pacing) {
  return [
    curriculumTool(store),
    addResourceTool(store),
    nextPracticeTool(store, pacing),
    generateDrillTool(store),
    logAttemptTool(store),
    reviewTool(store),
    statusTool(store),
  ]
}

/** Step 1 — deconstruct: create or replace a domain's Pareto skill tree. */
function curriculumTool(store) {
  return defineTool({
    name: 'learn_curriculum',
    description:
      'Deconstruct a domain into a skill tree and save it as the learning curriculum. '
      + 'Rank each node by `leverage` (0-100): the Pareto weight — how much of the 80% '
      + 'result this element carries. Set `deps` to prerequisite node ids so practice '
      + 'follows learning order. Replaces any existing curriculum for the domain.',
    parameters: {
      domain: { type: 'string', required: true, description: 'The domain title, e.g. "Rust ownership".' },
      nodes: {
        type: 'array',
        required: true,
        description: 'The skill tree. Start with the highest-leverage 20% before breadth.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            id: { type: 'string', required: true, description: 'Stable short id, e.g. "borrowing".' },
            title: { type: 'string', required: true, description: 'Human-readable skill name.' },
            parent: { type: 'string', description: 'Parent node id, if this is a sub-skill.' },
            leverage: { type: 'integer', required: true, description: '0-100 Pareto weight.' },
            deps: { type: 'array', items: { type: 'string' }, description: 'Prerequisite node ids.' },
          },
        },
      },
    },
    output: outputText(),
    async execute(args) {
      const domain = newDomain(args.domain)
      for (const spec of args.nodes) domain.nodes[spec.id] = newNode(spec)
      await store.save(domain)
      const top = args.nodes.slice().sort((a, b) => b.leverage - a.leverage).slice(0, 3)
        .map(n => `${n.title} (${n.leverage})`).join(', ')
      return text(
        `Saved curriculum for "${domain.title}" with ${args.nodes.length} skills. `
        + `Highest-leverage first: ${top}. Tip: render the tree with the drawio-skill, `
        + `then call learn_next_practice to start.`,
      )
    },
    presentCall: args => ({ card: 'generic', title: `Deconstruct ${args.domain}`, kind: 'other', rawInput: args.nodes }),
  })
}

/** Step 2 — source: attach an expert's repo/paper/doc to skill nodes. */
function addResourceTool(store) {
  return defineTool({
    name: 'learn_add_resource',
    description:
      'Record a top-quality learning resource (a leading practitioner\'s open source, '
      + 'technical doc, or paper) and link it to the skill nodes it teaches. Prefer '
      + 'primary sources from the strongest people in the field.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      author: { type: 'string', required: true, description: 'Who made it — the expert or org.' },
      title: { type: 'string', required: true, description: 'Resource title.' },
      url: { type: 'string', required: true, description: 'Link to the resource.' },
      type: { type: 'string', required: true, enum: ['repo', 'paper', 'doc', 'video', 'course', 'other'], description: 'Resource kind.' },
      summary: { type: 'string', description: 'One-paragraph why-it-matters summary.' },
      nodeIds: { type: 'array', items: { type: 'string' }, description: 'Skill node ids this resource teaches.' },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const resource = {
        id: makeId('res'),
        author: args.author,
        title: args.title,
        url: args.url,
        type: args.type,
        summary: args.summary ?? '',
        nodeIds: args.nodeIds ?? [],
        addedAt: new Date().toISOString(),
      }
      domain.resources.push(resource)
      await store.save(domain)
      return text(`Added ${args.type} "${args.title}" by ${args.author} (${domain.resources.length} resources total).`)
    },
    presentCall: args => ({ card: 'generic', title: `Add resource: ${args.title}`, kind: 'other', rawInput: args }),
  })
}

/** Step 3 — practice: pick what to drill next by SRS + Pareto value. */
function nextPracticeTool(store, pacing) {
  return defineTool({
    name: 'learn_next_practice',
    description:
      'Get the next skills to practice, chosen by spaced repetition (overdue first) '
      + 'and Pareto value (high leverage, low mastery), respecting prerequisites. '
      + 'Then act as a coach: pose a concrete exercise for each returned skill, ideally '
      + 'gamified, and grade the answer with learn_log_attempt.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      count: { type: 'integer', description: `How many skills to return (default ${pacing.newSkillsPerDay}).` },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const count = Math.min(args.count ?? pacing.newSkillsPerDay, pacing.dailyReviewLimit)
      const picks = selectPractice(domain, count)
      if (picks.length === 0) return text(`No skills to practice in "${domain.title}" yet — add a curriculum first.`)
      const lines = picks.map(n => {
        const res = domain.resources.filter(r => r.nodeIds.includes(n.id)).map(r => r.title).slice(0, 2)
        const refs = res.length ? ` [refs: ${res.join('; ')}]` : ''
        return `- ${n.title} (id: ${n.id}, mastery ${n.mastery}/100, leverage ${n.leverage})${refs}`
      })
      return text(`Practice these next in "${domain.title}":\n${lines.join('\n')}`)
    },
    presentCall: args => ({ card: 'generic', title: 'Next practice', kind: 'other', rawInput: args }),
  })
}

/** Step 3 — practice: persist a coach-authored drill for reuse. */
function generateDrillTool(store) {
  return defineTool({
    name: 'learn_generate_drill',
    description:
      'Save a practice drill for a skill node so it can be reused and graded. Author '
      + 'drills that force active recall or application, not passive review.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      nodeId: { type: 'string', required: true, description: 'The skill node this drill trains.' },
      type: { type: 'string', required: true, enum: ['recall', 'apply', 'explain', 'debug', 'build'], description: 'Drill kind.' },
      prompt: { type: 'string', required: true, description: 'The exercise shown to the learner.' },
      answer: { type: 'string', required: true, description: 'The reference answer or rubric for grading.' },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      if (!domain.nodes[args.nodeId]) throw new Error(`unknown skill node '${args.nodeId}' in "${domain.title}"`)
      const drill = { id: makeId('drill'), nodeId: args.nodeId, type: args.type, prompt: args.prompt, answer: args.answer, createdAt: new Date().toISOString() }
      domain.drills.push(drill)
      await store.save(domain)
      return text(`Saved ${args.type} drill ${drill.id} for "${domain.nodes[args.nodeId].title}".`)
    },
    presentCall: args => ({ card: 'generic', title: `New drill: ${args.nodeId}`, kind: 'other', rawInput: args }),
  })
}

/** Step 4 — feedback: grade one attempt, update SM-2, mastery, and gamification. */
function logAttemptTool(store) {
  return defineTool({
    name: 'learn_log_attempt',
    description:
      'Record the result of one practice attempt and update the schedule. Grade 0-5 '
      + '(SuperMemo scale): 0-2 = failed recall (resets the interval), 3 = hard, '
      + '4 = good, 5 = perfect. This reschedules the skill, updates mastery, and awards XP.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      nodeId: { type: 'string', required: true, description: 'The skill node practiced.' },
      grade: { type: 'integer', required: true, description: '0-5 recall grade (SuperMemo scale).' },
      drillId: { type: 'string', description: 'The drill attempted, if it was a saved drill.' },
      note: { type: 'string', description: 'What went wrong or right — the feedback to remember.' },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const node = domain.nodes[args.nodeId]
      if (!node) throw new Error(`unknown skill node '${args.nodeId}' in "${domain.title}"`)
      applyGrade(node, args.grade)
      const gain = awardProgress(domain, args.grade)
      domain.attempts.push({ id: makeId('att'), nodeId: args.nodeId, drillId: args.drillId ?? null, grade: args.grade, note: args.note ?? '', ts: new Date().toISOString() })
      await store.save(domain)
      const levelMsg = gain.leveledUp ? ` Level up -> ${domain.profile.level}!` : ''
      return text(
        `Logged grade ${args.grade} for "${node.title}". Mastery ${node.mastery}/100, `
        + `next review in ${node.intervalDays}d. +${gain.xpGained} XP, streak ${gain.streak}.${levelMsg}`,
      )
    },
    presentCall: args => ({ card: 'generic', title: `Grade: ${args.nodeId} (${args.grade}/5)`, kind: 'other', rawInput: args }),
  })
}

/** Step 4 — retrospective: log a review and adjust the curriculum. */
function reviewTool(store) {
  return defineTool({
    name: 'learn_review',
    description:
      'Record a retrospective and optionally adjust the curriculum: re-weight a skill\'s '
      + 'leverage or correct its mastery when a review shows the current value is wrong. '
      + 'Use this to close the loop — decide what to change before the next practice cycle.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      summary: { type: 'string', required: true, description: 'What the retrospective concluded.' },
      adjustments: {
        type: 'array',
        description: 'Per-node corrections to apply.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            nodeId: { type: 'string', required: true, description: 'The node to adjust.' },
            leverage: { type: 'integer', description: 'New 0-100 leverage, if it should change.' },
            mastery: { type: 'integer', description: 'New 0-100 mastery, if the estimate was wrong.' },
          },
        },
      },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const applied = []
      for (const adj of args.adjustments ?? []) {
        const node = domain.nodes[adj.nodeId]
        if (!node) continue
        if (typeof adj.leverage === 'number') node.leverage = clampInt(adj.leverage)
        if (typeof adj.mastery === 'number') node.mastery = clampInt(adj.mastery)
        applied.push(adj.nodeId)
      }
      domain.reviews.push({ id: makeId('rev'), summary: args.summary, adjustments: args.adjustments ?? [], ts: new Date().toISOString() })
      await store.save(domain)
      return text(`Logged retrospective for "${domain.title}"; adjusted ${applied.length} skill(s). Ready for the next cycle.`)
    },
    presentCall: args => ({ card: 'generic', title: 'Retrospective', kind: 'other', rawInput: args }),
  })
}

/** Read-only dashboard summary of a domain. */
function statusTool(store) {
  return defineTool({
    name: 'learn_status',
    description: 'Show progress for a learning domain: mastery, due reviews, streak, XP, and the weakest high-leverage skills.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const nodes = Object.values(domain.nodes)
      const avg = nodes.length ? Math.round(nodes.reduce((s, n) => s + n.mastery, 0) / nodes.length) : 0
      const weak = nodes.slice().sort((a, b) => (b.leverage * (100 - b.mastery)) - (a.leverage * (100 - a.mastery))).slice(0, 3).map(n => `${n.title} (${n.mastery}/100)`)
      const p = domain.profile
      return text(
        `"${domain.title}" — avg mastery ${avg}/100 across ${nodes.length} skills, `
        + `${dueCount(domain)} due now, ${domain.resources.length} resources. `
        + `Level ${p.level}, ${p.xp} XP, streak ${p.streak}. `
        + `Focus next: ${weak.join('; ') || 'nothing yet'}.`,
      )
    },
    presentCall: args => ({ card: 'generic', title: 'Learning status', kind: 'other', rawInput: args }),
  })
}

/**
 * Shared `output` descriptor: a single `text` string rendered verbatim to the
 * model. `render` is a sibling of `schema`, matching the tool-definition contract.
 * @returns {object} the tool `output` descriptor (schema + render).
 */
function outputText() {
  return {
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: { text: { type: 'string', required: true } },
    },
    render: (_args, value) => [{ type: 'text', text: value.text }],
  }
}

/**
 * Wrap a message string as the tool's `{ text }` result.
 * @param {string} message - the text to return.
 * @returns {{ text: string }} the result object.
 */
function text(message) {
  return { text: message }
}

/**
 * Clamp an integer into the 0-100 range.
 * @param {number} n - the value.
 * @returns {number} the clamped integer.
 */
function clampInt(n) {
  return Math.min(100, Math.max(0, Math.round(n)))
}
