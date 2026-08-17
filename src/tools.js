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
  assertText,
  awardProgress,
  dueCount,
  makeId,
  newDomain,
  newNode,
  selectPractice,
  validateCurriculum,
  validateGrade,
  validateNodeReferences,
  validatePercentage,
} from './store.js'

/**
 * Build every learn_* tool bound to one store and pacing config.
 * @param {import('./store.js').LearnStore} store - the shared learning store.
 * @param {{ newSkillsPerDay: number, dailyReviewLimit: number }} pacing - SRS pacing config.
 * @returns {object[]} the tool definitions ready for ctx.tools.register.
 */
export function buildTools(store, pacing) {
  return [
    courseTool(store),
    curriculumTool(store),
    addResourceTool(store),
    nextPracticeTool(store, pacing),
    generateDrillTool(store),
    logAttemptTool(store),
    reviewTool(store),
    statusTool(store),
  ]
}

/** Course lifecycle — list, resume, or permanently end retained courses. */
function courseTool(store) {
  return defineTool({
    name: 'learn_course',
    description:
      'Manage the single active learning course. Use action "list" to inspect active/paused/completed '
      + 'courses, "resume" to continue a retained course, or "end" to permanently delete one. '
      + 'Before resume can replace unfinished active work, ask the user whether to pause or end it.',
    parameters: {
      action: { type: 'string', required: true, enum: ['list', 'resume', 'end'], description: 'Lifecycle operation.' },
      domain: { type: 'string', description: 'Required for resume/end: course title or id.' },
      previousCourseAction: {
        type: 'string',
        enum: ['pause', 'end'],
        description: 'For resume only: the user-confirmed decision for another unfinished active course.',
      },
      confirmed: {
        type: 'boolean',
        description: 'For end only: must be true after the user explicitly confirms permanent deletion.',
      },
    },
    output: outputText(),
    async execute(args) {
      if (args.action === 'list') {
        const courses = await store.listCourses()
        if (courses.length === 0) return text('No learning courses in the library.')
        const lines = courses.map(course => (
          `- ${course.title} (id: ${course.id}, state: ${course.state}, `
          + `mastery complete: ${course.complete ? 'yes' : 'no'}, level ${course.level}, ${course.xp} XP)`
        ))
        return text(`Learning courses:\n${lines.join('\n')}`)
      }
      const domain = assertText('domain', args.domain, 200)
      if (args.action === 'resume') {
        const result = await store.resumeCourse(domain, args.previousCourseAction)
        return text(
          result.resumed
            ? `Resumed "${result.domainTitle}".${formatTransitions(result.previous)}`
            : `"${result.domainTitle}" is already the active course.`,
        )
      }
      if (args.action === 'end') {
        if (args.confirmed !== true) {
          throw new Error('ending a course permanently deletes its library file; ask the user first, then retry with confirmed true')
        }
        const ended = await store.endCourse(domain)
        return text(`Ended "${ended.title}" and permanently deleted it from the learning library.`)
      }
      throw new Error(`invalid action '${args.action}'`)
    },
    presentCall: args => ({ card: 'generic', title: `Course: ${args.action}`, kind: 'other', rawInput: args }),
  })
}

/** Step 1 — deconstruct: create or replace a domain's Pareto skill tree. */
function curriculumTool(store) {
  return defineTool({
    name: 'learn_curriculum',
    description:
      'Deconstruct a domain into a skill tree and save it as the learning curriculum. '
      + 'Rank each node by `leverage` (0-100): the Pareto weight — how much of the 80% '
      + 'result this element carries. Set `deps` to prerequisite node ids so practice '
      + 'follows learning order. Only one course can be active. If another unfinished course '
      + 'is active, ask the user whether to pause or end it before retrying.',
    parameters: {
      domain: { type: 'string', required: true, description: 'The domain title, e.g. "Rust ownership".' },
      previousCourseAction: {
        type: 'string',
        enum: ['pause', 'end'],
        description: 'User-confirmed decision for the previous unfinished course when switching topics.',
      },
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
      const specs = validateCurriculum(args.domain, args.nodes)
      const domain = newDomain(args.domain)
      for (const spec of specs) domain.nodes[spec.id] = newNode(spec)
      const transition = await store.startCourse(domain, args.previousCourseAction)
      const top = specs.slice().sort((a, b) => b.leverage - a.leverage).slice(0, 3)
        .map(n => `${n.title} (${n.leverage})`).join(', ')
      return text(
        `Saved curriculum for "${domain.title}" with ${specs.length} skills. `
        + `${formatTransitions(transition.previous)}`
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
      const author = assertText('author', args.author, 200)
      const title = assertText('title', args.title, 300)
      const url = validateUrl(args.url)
      const summary = args.summary === undefined ? '' : assertText('summary', args.summary, 4000)
      const result = await store.update(args.domain, (domain) => {
        const nodeIds = validateNodeReferences(domain, args.nodeIds ?? [], 'nodeIds', { allowEmpty: true })
        const resource = {
          id: makeId('res'),
          author,
          title,
          url,
          type: args.type,
          summary,
          nodeIds,
          addedAt: new Date().toISOString(),
        }
        domain.resources.push(resource)
        return { total: domain.resources.length, domainTitle: domain.title }
      })
      return text(`Added ${args.type} "${title}" by ${author} (${result.total} resources total in "${result.domainTitle}").`)
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
      const requested = args.count ?? pacing.newSkillsPerDay
      if (!Number.isInteger(requested) || requested < 1) {
        throw new Error('invalid count: must be a positive integer')
      }
      const count = Math.min(requested, pacing.dailyReviewLimit)
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
      const prompt = assertText('prompt', args.prompt, 10000)
      const answer = assertText('answer', args.answer, 20000)
      const result = await store.update(args.domain, (domain) => {
        const [nodeId] = validateNodeReferences(domain, [args.nodeId], 'nodeId')
        const drill = { id: makeId('drill'), nodeId, type: args.type, prompt, answer, createdAt: new Date().toISOString() }
        domain.drills.push(drill)
        return { drillId: drill.id, nodeTitle: domain.nodes[nodeId].title }
      })
      return text(`Saved ${args.type} drill ${result.drillId} for "${result.nodeTitle}".`)
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
      const grade = validateGrade(args.grade)
      const note = args.note === undefined ? '' : assertText('note', args.note, 4000)
      const result = await store.update(args.domain, (domain) => {
        const [nodeId] = validateNodeReferences(domain, [args.nodeId], 'nodeId')
        const node = domain.nodes[nodeId]
        if (args.drillId !== undefined) {
          const drill = domain.drills.find(item => item.id === args.drillId)
          if (!drill) throw new Error(`invalid drillId: unknown drill '${args.drillId}'`)
          if (drill.nodeId !== nodeId) throw new Error(`invalid drillId: drill '${args.drillId}' belongs to node '${drill.nodeId}'`)
        }
        applyGrade(node, grade)
        const gain = awardProgress(domain, grade)
        domain.attempts.push({ id: makeId('att'), nodeId, drillId: args.drillId ?? null, grade, note, ts: new Date().toISOString() })
        return {
          gain,
          level: domain.profile.level,
          mastery: node.mastery,
          intervalDays: node.intervalDays,
          nodeTitle: node.title,
        }
      })
      const levelMsg = result.gain.leveledUp ? ` Level up -> ${result.level}!` : ''
      return text(
        `Logged grade ${grade} for "${result.nodeTitle}". Mastery ${result.mastery}/100, `
        + `next review in ${result.intervalDays}d. +${result.gain.xpGained} XP, streak ${result.gain.streak}.${levelMsg}`,
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
      const summary = assertText('summary', args.summary, 10000)
      const adjustments = args.adjustments ?? []
      const nodeIds = adjustments.map(adj => adj.nodeId)
      if (new Set(nodeIds).size !== nodeIds.length) {
        throw new Error('invalid adjustments: each skill node may be adjusted only once')
      }
      const result = await store.update(args.domain, (domain) => {
        validateNodeReferences(domain, nodeIds, 'adjustments.nodeId', { allowEmpty: true })
        for (const [index, adj] of adjustments.entries()) {
          if (adj.leverage === undefined && adj.mastery === undefined) {
            throw new Error(`invalid adjustments[${index}]: provide leverage or mastery`)
          }
          const node = domain.nodes[adj.nodeId]
          if (adj.leverage !== undefined) node.leverage = validatePercentage(`adjustments[${index}].leverage`, adj.leverage)
          if (adj.mastery !== undefined) node.mastery = validatePercentage(`adjustments[${index}].mastery`, adj.mastery)
        }
        domain.reviews.push({ id: makeId('rev'), summary, adjustments, ts: new Date().toISOString() })
        return { domainTitle: domain.title, applied: adjustments.length }
      })
      return text(`Logged retrospective for "${result.domainTitle}"; adjusted ${result.applied} skill(s). Ready for the next cycle.`)
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
 * Render lifecycle changes performed while activating a course.
 * @param {object[]} previous - transition records from the store.
 * @returns {string} sentence fragment, including trailing whitespace.
 */
function formatTransitions(previous) {
  if (!previous || previous.length === 0) return ''
  const changes = previous.map(item => `${item.action} "${item.title}"`).join(', ')
  return `Previous course: ${changes}. `
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
 * Accept only absolute HTTP(S) resource URLs.
 * @param {unknown} value - candidate URL.
 * @returns {string} normalized URL.
 */
function validateUrl(value) {
  const text = assertText('url', value, 2048)
  let url
  try {
    url = new URL(text)
  } catch {
    throw new Error('invalid url: must be an absolute HTTP(S) URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('invalid url: only HTTP(S) URLs are allowed')
  }
  return url.toString()
}
