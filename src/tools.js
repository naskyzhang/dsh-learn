/**
 * Model-facing tools for the dsh-learn course journey: curriculum creation,
 * ordered first-pass lessons, literature reading, correct-answer review,
 * open-source synthesis, feedback, and retrospective adjustment. All state
 * changes go through {@link LearnStore}.
 *
 * @module dsh-learn/tools
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  applyGrade,
  advanceReviewToCapstone,
  assertText,
  attachResourceToNodes,
  awardProgress,
  dueCount,
  ensureWorkflow,
  formatNodeResources,
  makeId,
  newDomain,
  newNode,
  nextLesson,
  completeLesson,
  completeLiterature,
  selectPractice,
  setLiteratureRecommendations,
  setOpenSourceBlueprint,
  validateCurriculum,
  validateCourseShortTitle,
  validateGrade,
  validateHttpUrl,
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
    lessonTool(store),
    literatureTool(store),
    nextPracticeTool(store, pacing),
    generateDrillTool(store),
    logAttemptTool(store),
    openSourceTool(store),
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
      + 'follows learning order. Optionally attach recommended learning materials '
      + '(`resources: [{ title, url }]`) on each skill node. Only one course can be active. '
      + 'If another unfinished course is active, ask the user whether to pause or end it before retrying.',
    parameters: {
      domain: { type: 'string', required: true, description: 'The domain title, e.g. "Rust ownership".' },
      shortTitle: {
        type: 'string',
        required: true,
        description:
          'Semantic Chinese summary shown on the card, at most 8 characters. '
          + 'Rewrite the course meaning; do not mechanically truncate.',
      },
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
            title: {
              type: 'string',
              required: true,
              description:
                'Concise Chinese skill name, at most 8 characters. If a draft is longer, '
                + 'summarize it semantically once; never truncate mechanically or add a colon subtitle.',
            },
            titleEn: {
              type: 'string',
              required: true,
              description: 'Concise English name for the same skill, e.g. "Borrow Checker".',
            },
            parent: { type: 'string', description: 'Parent node id, if this is a sub-skill.' },
            leverage: { type: 'integer', required: true, description: '0-100 Pareto weight.' },
            deps: { type: 'array', items: { type: 'string' }, description: 'Prerequisite node ids.' },
            resources: {
              type: 'array',
              description: 'Recommended learning materials for this skill (name + link).',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  title: { type: 'string', required: true, description: 'Material name, e.g. "The Rust Book — Ownership".' },
                  url: { type: 'string', required: true, description: 'Absolute HTTP(S) link.' },
                },
              },
            },
          },
        },
      },
    },
    output: outputText(),
    async execute(args) {
      const shortTitle = validateCourseShortTitle(args.shortTitle)
      const specs = validateCurriculum(args.domain, args.nodes)
      const domain = newDomain(args.domain, shortTitle)
      const now = new Date().toISOString()
      let resourceCount = 0
      for (const spec of specs) {
        domain.nodes[spec.id] = newNode(spec)
        for (const resource of spec.resources) {
          domain.resources.push({
            id: makeId('res'),
            author: 'recommended',
            title: resource.title,
            url: resource.url,
            type: 'other',
            summary: '',
            nodeIds: [spec.id],
            addedAt: now,
          })
          resourceCount += 1
        }
      }
      const transition = await store.startCourse(domain, args.previousCourseAction)
      const top = specs.slice().sort((a, b) => b.leverage - a.leverage).slice(0, 3)
        .map(n => `${n.title} (${n.leverage})`).join(', ')
      return text(
        `Saved curriculum for "${domain.title}" with ${specs.length} skills `
        + `and ${resourceCount} recommended materials. `
        + `${formatTransitions(transition.previous)}`
        + `Highest-leverage nodes: ${top}. Tip: render the tree with the drawio-skill, `
        + `then call learn_lesson with action "next" to start the ordered first pass.`,
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
      + 'technical doc, or paper) and attach it to the skill nodes it teaches. '
      + '`nodeIds` is required so every material hangs on at least one skill as '
      + 'title + url recommendations. Prefer primary sources from the strongest people.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      author: { type: 'string', required: true, description: 'Who made it — the expert or org.' },
      title: { type: 'string', required: true, description: 'Resource title / recommended name.' },
      url: { type: 'string', required: true, description: 'Link to the resource.' },
      type: { type: 'string', required: true, enum: ['repo', 'paper', 'doc', 'video', 'course', 'other'], description: 'Resource kind.' },
      summary: { type: 'string', description: 'One-paragraph why-it-matters summary.' },
      nodeIds: {
        type: 'array',
        required: true,
        items: { type: 'string' },
        description: 'Skill node ids this resource teaches (at least one).',
      },
    },
    output: outputText(),
    async execute(args) {
      const author = assertText('author', args.author, 200)
      const title = assertText('title', args.title, 300)
      const url = validateHttpUrl('url', args.url)
      const summary = args.summary === undefined ? '' : assertText('summary', args.summary, 4000)
      const result = await store.update(args.domain, (domain) => {
        const nodeIds = validateNodeReferences(domain, args.nodeIds ?? [], 'nodeIds')
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
        attachResourceToNodes(domain, nodeIds, { title, url })
        return { total: domain.resources.length, domainTitle: domain.title, nodeIds }
      })
      return text(
        `Added ${args.type} "${title}" by ${author} to ${result.nodeIds.join(', ')} `
        + `(${result.total} resources total in "${result.domainTitle}").`,
      )
    },
    presentCall: args => ({ card: 'generic', title: `Add resource: ${args.title}`, kind: 'other', rawInput: args }),
  })
}

/** Step 3 — first pass: teach every curriculum node once, in stable order. */
function lessonTool(store) {
  return defineTool({
    name: 'learn_lesson',
    description:
      'Drive the first learning pass in strict curriculum order. Use action "next" to fetch the next '
      + 'unfinished lesson, teach it without asking whether the learner wants a review, then use '
      + 'action "complete" only after that lesson has been learned. Completing the final lesson '
      + 'automatically advances the course to the literature-reading phase.',
    parameters: {
      action: { type: 'string', required: true, enum: ['next', 'complete'], description: 'Read or complete the next lesson.' },
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      nodeId: { type: 'string', description: 'Required for complete: the exact next node id returned by action next.' },
    },
    output: outputText(),
    async execute(args) {
      if (args.action === 'next') {
        const domain = await store.require(args.domain)
        const workflow = ensureWorkflow(domain)
        if (workflow.phase === 'literature') {
          return text(
            `The ordered first pass for "${domain.title}" is complete. Start literature reading now: `
            + 'curate 3 canonical readings, 2 high-heat readings from the past year, and 3 authoritative people '
            + 'with one key interview/article/talk and viewpoint each; save them with learn_literature.',
          )
        }
        if (workflow.phase === 'review') {
          return text(`"${domain.title}" is in review phase. Continue from the beginning with learn_next_practice.`)
        }
        if (workflow.phase === 'capstone') {
          return text(`"${domain.title}" is ready for its final open-source comparison. Call learn_open_source.`)
        }
        if (workflow.phase === 'completed') {
          return text(`The full learning journey for "${domain.title}" is already complete.`)
        }
        const node = nextLesson(domain)
        if (node === null) return text(`No lessons exist in "${domain.title}" yet.`)
        const refs = formatNodeResources(node)
        const position = workflow.completedLessons.length + 1
        const total = Object.keys(domain.nodes).length
        return text(
          `Teach lesson ${position}/${total} in "${domain.title}": ${node.title} / ${node.titleEn} `
          + `(id: ${node.id}). Explain, demonstrate, and check understanding; do not offer a review.`
          + (refs ? `\nRecommended primary materials:\n${refs}` : ''),
        )
      }
      if (args.nodeId === undefined) throw new Error('nodeId is required when action is "complete"')
      const result = await store.update(args.domain, (domain) => {
        const [nodeId] = validateNodeReferences(domain, [args.nodeId], 'nodeId')
        return { domainTitle: domain.title, ...completeLesson(domain, nodeId) }
      })
      if (result.phase === 'literature') {
        return text(
          `Completed final lesson "${result.node.title}" in "${result.domainTitle}". `
          + 'The course is now in literature-reading phase; curate the required 3 canonical + 2 recent-hot readings '
          + 'and 3 authoritative people before any automatic review.',
        )
      }
      return text(
        `Completed lesson "${result.node.title}". Next lesson: ${result.next.title} / ${result.next.titleEn} `
        + `(id: ${result.next.id}). Continue directly in order; do not ask whether to review.`,
      )
    },
    presentCall: args => ({ card: 'generic', title: `Lesson: ${args.action}`, kind: 'other', rawInput: args }),
  })
}

/** Step 4 — literature: save the required reading slate, then explicitly complete it. */
function literatureTool(store) {
  const readingProperties = {
    title: { type: 'string', required: true },
    author: { type: 'string', required: true },
    type: { type: 'string', required: true, enum: ['article', 'paper', 'technical-blog'] },
    url: { type: 'string', required: true },
    reason: { type: 'string', required: true, description: 'Why this source is authoritative or high-signal.' },
  }
  return defineTool({
    name: 'learn_literature',
    description:
      'Manage the literature-reading phase after every curriculum lesson is complete. Action "recommend" '
      + 'requires exactly 3 canonical readings, 2 high-heat readings published within the past year, and '
      + '3 authoritative people with their most important primary interview/article/talk and key viewpoint. '
      + 'Action "complete" is allowed only after the learner has finished the reading phase; it starts review '
      + 'from the first curriculum node.',
    parameters: {
      action: { type: 'string', required: true, enum: ['recommend', 'complete'] },
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      confirmed: {
        type: 'boolean',
        description: 'For complete only: true after the learner explicitly confirms the reading phase is finished.',
      },
      authoritative: {
        type: 'array',
        items: { type: 'object', additionalProperties: false, properties: readingProperties },
        description: 'For recommend: exactly 3 canonical articles, papers, or technical blogs.',
      },
      trending: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            ...readingProperties,
            publishedAt: { type: 'string', required: true, description: 'Publication date as YYYY-MM-DD, within the past year.' },
            heatEvidence: { type: 'string', required: true, description: 'Concrete evidence of recent attention or impact.' },
          },
        },
        description: 'For recommend: exactly 2 highest-signal recent readings.',
      },
      experts: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', required: true },
            authority: { type: 'string', required: true, description: 'Why this person is authoritative in the field.' },
            artifactTitle: { type: 'string', required: true },
            artifactType: { type: 'string', required: true, enum: ['interview', 'article', 'talk', 'essay'] },
            artifactUrl: { type: 'string', required: true },
            keyViewpoint: { type: 'string', required: true, description: 'Their central argument or viewpoint from the source.' },
          },
        },
        description: 'For recommend: exactly 3 authoritative people and one primary artifact each.',
      },
    },
    output: outputText(),
    async execute(args) {
      if (args.action === 'recommend') {
        const result = await store.update(args.domain, (domain) => {
          const literature = setLiteratureRecommendations(
            domain,
            args.authoritative,
            args.trending,
            args.experts,
          )
          return { domainTitle: domain.title, literature }
        })
        return text(
          `Saved the literature slate for "${result.domainTitle}": `
          + `${result.literature.authoritative.length} canonical readings, `
          + `${result.literature.trending.length} recent high-heat readings, and `
          + `${result.literature.experts.length} authoritative people. Guide the learner through these sources; `
          + 'do not call action "complete" until the learner finishes the reading phase.',
        )
      }
      if (args.confirmed !== true) {
        throw new Error('literature completion requires confirmed: true after the learner finishes the reading phase')
      }
      const result = await store.update(args.domain, (domain) => ({
        domainTitle: domain.title,
        first: completeLiterature(domain),
      }))
      const first = result.first
      return text(
        `Literature reading completed for "${result.domainTitle}". Review phase has started from the beginning.`
        + (first ? ` First node: ${first.title} / ${first.titleEn} (id: ${first.id}).` : ''),
      )
    },
    presentCall: args => ({ card: 'generic', title: `Literature: ${args.action}`, kind: 'other', rawInput: args }),
  })
}

/** Step 5 — review: pick what to drill, starting with one full ordered pass. */
function nextPracticeTool(store, pacing) {
  return defineTool({
    name: 'learn_next_practice',
    description:
      'Get the next skills to review after first-pass learning and literature reading are complete. '
      + 'The completion review follows curriculum order from the beginning, one node at a time, and '
      + 'does not advance until the current node receives a correct grade (3-5). Then act as a coach: '
      + 'pose a concrete exercise and grade the answer with learn_log_attempt. After every node is '
      + 'correct, the workflow advances to the open-source capstone.',
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
      const workflow = ensureWorkflow(domain)
      if (workflow.phase === 'learning') {
        const node = nextLesson(domain)
        return text(
          `Review is not started for "${domain.title}". Continue the ordered first learning pass with learn_lesson`
          + (node ? `; next lesson is ${node.title} (id: ${node.id}).` : '.'),
        )
      }
      if (workflow.phase === 'literature') {
        return text(
          `Review is not started for "${domain.title}". Finish the literature-reading phase first with learn_literature.`,
        )
      }
      if (workflow.phase === 'capstone') {
        return text(
          `Every scheduled review node in "${domain.title}" has a correct answer. `
          + 'Start the final open-source comparison with learn_open_source.',
        )
      }
      if (workflow.phase === 'completed') {
        return text(`The full learning journey for "${domain.title}" is complete, including its open-source blueprint.`)
      }
      const picks = selectPractice(domain, count)
      if (picks.length === 0) return text(`No skills to practice in "${domain.title}" yet — add a curriculum first.`)
      const lines = picks.map(n => {
        const refs = formatNodeResources(n)
        const header = `- ${n.title} (id: ${n.id}, mastery ${n.mastery}/100, leverage ${n.leverage})`
        return refs ? `${header}\n${refs}` : header
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
      source: {
        type: 'string',
        enum: ['scheduled', 'card'],
        description: 'Use "card" only for an explicit learning-card click; defaults to "scheduled".',
      },
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
        domain.attempts.push({
          id: makeId('att'),
          nodeId,
          drillId: args.drillId ?? null,
          grade,
          note,
          source: args.source ?? 'scheduled',
          ts: new Date().toISOString(),
        })
        const enteredCapstone = advanceReviewToCapstone(domain)
        return {
          gain,
          level: domain.profile.level,
          mastery: node.mastery,
          intervalDays: node.intervalDays,
          nodeTitle: node.title,
          enteredCapstone,
        }
      })
      const levelMsg = result.gain.leveledUp ? ` Level up -> ${result.level}!` : ''
      const phaseMsg = result.enteredCapstone
        ? ' Every chapter now has a correct scheduled review answer; start learn_open_source for the final stage.'
        : ''
      return text(
        `Logged grade ${grade} for "${result.nodeTitle}". Mastery ${result.mastery}/100, `
        + `next review in ${result.intervalDays}d. +${result.gain.xpGained} XP, streak ${result.gain.streak}.`
        + `${levelMsg}${phaseMsg}`,
      )
    },
    presentCall: args => ({ card: 'generic', title: `Grade: ${args.nodeId} (${args.grade}/5)`, kind: 'other', rawInput: args }),
  })
}

/** Final stage — compare exemplary open source and produce a zero-to-one borrowing plan. */
function openSourceTool(store) {
  return defineTool({
    name: 'learn_open_source',
    description:
      'Complete the final course stage after every curriculum node has a correct scheduled review answer. '
      + 'Research 2-3 of the field\'s most instructive open-source systems, compare how they are implemented '
      + 'and their strengths/weaknesses, then identify exactly which parts a learner should borrow when '
      + 'building the system from zero to one. Repository URLs must be verified primary links.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
      projects: {
        type: 'array',
        required: true,
        description: 'Exactly 2 or 3 exemplary open-source projects.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string', required: true },
            url: { type: 'string', required: true, description: 'Primary repository URL.' },
            license: { type: 'string', required: true },
            whyWorthLearning: { type: 'string', required: true },
            implementation: { type: 'string', required: true, description: 'Architecture and key implementation choices.' },
            strengths: { type: 'array', required: true, items: { type: 'string' } },
            weaknesses: { type: 'array', required: true, items: { type: 'string' } },
            borrowParts: {
              type: 'array',
              required: true,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  part: { type: 'string', required: true, description: 'Specific module, pattern, or subsystem to study.' },
                  useFor: { type: 'string', required: true, description: 'What problem this part solves in a new system.' },
                  adaptation: { type: 'string', required: true, description: 'How to adapt it instead of copying blindly.' },
                },
              },
            },
          },
        },
      },
      blueprint: {
        type: 'object',
        required: true,
        additionalProperties: false,
        properties: {
          recommendedFoundation: {
            type: 'string',
            required: true,
            description: 'One project name from projects that provides the best overall foundation.',
          },
          rationale: { type: 'string', required: true },
          steps: {
            type: 'array',
            required: true,
            description: 'Three to twelve ordered zero-to-one construction steps.',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                stage: { type: 'string', required: true },
                borrowFrom: { type: 'string', required: true, description: 'Exact project name from projects.' },
                part: { type: 'string', required: true },
                action: { type: 'string', required: true, description: 'Concrete implementation action for the learner.' },
              },
            },
          },
        },
      },
    },
    output: outputText(),
    async execute(args) {
      const result = await store.update(args.domain, (domain) => ({
        domainTitle: domain.title,
        capstone: setOpenSourceBlueprint(domain, args.projects, args.blueprint),
      }))
      const projects = result.capstone.projects.map(project => [
        `${project.name} — ${project.url} (${project.license})`,
        `  Why it is worth learning: ${project.whyWorthLearning}`,
        `  Implementation: ${project.implementation}`,
        `  Strengths: ${project.strengths.join('; ')}`,
        `  Weaknesses: ${project.weaknesses.join('; ')}`,
        `  Borrow: ${project.borrowParts.map(part => `${part.part} → ${part.useFor}; adapt by ${part.adaptation}`).join(' | ')}`,
      ].join('\n')).join('\n')
      const blueprint = result.capstone.blueprint
      const steps = blueprint.steps
        .map((step, index) => `${index + 1}. ${step.stage}: borrow ${step.part} from ${step.borrowFrom}; ${step.action}`)
        .join('\n')
      return text(
        `Completed the learning journey for "${result.domainTitle}".\n`
        + `Open-source comparison:\n${projects}\n`
        + `Recommended foundation: ${blueprint.recommendedFoundation}. ${blueprint.rationale}\n`
        + `Zero-to-one blueprint:\n${steps}`,
      )
    },
    presentCall: args => ({ card: 'generic', title: 'Open-source blueprint', kind: 'other', rawInput: args }),
  })
}

/** Step 4 — retrospective: log a review and adjust the curriculum. */
function reviewTool(store) {
  return defineTool({
    name: 'learn_review',
    description:
      'Record a curriculum retrospective (not a chapter review) and optionally adjust the tree: '
      + 're-weight a skill\'s leverage or correct its mastery when evidence shows the stored value '
      + 'is wrong. Use only when the learner explicitly requests reflection/adjustment or a recurring '
      + 'problem requires a concrete curriculum correction.',
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
    description:
      'Show the current learning phase (ordered lessons, literature, review, open-source capstone, or completed), '
      + 'progress, due reviews, streak, XP, and the weakest high-leverage skills.',
    parameters: {
      domain: { type: 'string', description: 'Domain title; defaults to the active domain.' },
    },
    output: outputText(),
    async execute(args) {
      const domain = await store.require(args.domain)
      const nodes = Object.values(domain.nodes)
      const avg = nodes.length ? Math.round(nodes.reduce((s, n) => s + n.mastery, 0) / nodes.length) : 0
      const nodeResourceCount = nodes.reduce((sum, node) => sum + (node.resources?.length ?? 0), 0)
      const workflow = ensureWorkflow(domain)
      const phaseDetail = {
        learning: `${workflow.completedLessons.length}/${nodes.length} ordered lessons complete`,
        literature: `literature ${workflow.literature.recommendedAt === null ? 'recommendations pending' : 'reading in progress'}`,
        review: 'sequential correct-answer review active',
        capstone: 'open-source comparison pending',
        completed: `journey completed${workflow.capstone.completedAt ? ` at ${workflow.capstone.completedAt}` : ''}`,
      }[workflow.phase]
      const weak = nodes.slice().sort((a, b) => (b.leverage * (100 - b.mastery)) - (a.leverage * (100 - a.mastery))).slice(0, 3)
      const focus = weak.map((node) => {
        const refs = (node.resources ?? []).slice(0, 2).map(resource => `${resource.title} <${resource.url}>`).join('; ')
        return refs ? `${node.title} (${node.mastery}/100; ${refs})` : `${node.title} (${node.mastery}/100)`
      })
      const p = domain.profile
      return text(
        `"${domain.title}" — phase: ${workflow.phase} (${phaseDetail}); avg mastery ${avg}/100 across ${nodes.length} skills, `
        + `${dueCount(domain)} due now, ${nodeResourceCount} node materials `
        + `(${domain.resources.length} sourced entries). `
        + `Level ${p.level}, ${p.xp} XP, streak ${p.streak}. `
        + `Focus next: ${focus.join('; ') || 'nothing yet'}.`,
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
