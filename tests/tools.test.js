import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { LearnStore } from '../src/store.js'
import { buildTools } from '../src/tools.js'

async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-learn-tools-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const store = new LearnStore(dir)
  const tools = new Map(
    buildTools(store, { newSkillsPerDay: 3, dailyReviewLimit: 20 })
      .map(tool => [tool.name, tool]),
  )
  const execute = (name, args) => tools.get(name).execute(args)
  await execute('learn_curriculum', {
    domain: 'Testing',
    shortTitle: '测试课程',
    nodes: [
      { id: 'basics', title: '基础', titleEn: 'Basics', leverage: 100 },
      { id: 'advanced', title: '进阶', titleEn: 'Advanced', leverage: 80, deps: ['basics'] },
    ],
  })
  return { store, execute }
}

function literatureRecommendations() {
  const today = new Date().toISOString().slice(0, 10)
  const reading = (index, type = 'paper') => ({
    title: `Canonical ${index}`,
    author: `Author ${index}`,
    type,
    url: `https://example.com/canonical-${index}`,
    reason: 'High-signal primary source.',
  })
  const recent = index => ({
    title: `Recent ${index}`,
    author: `Recent Author ${index}`,
    type: 'technical-blog',
    url: `https://example.com/recent-${index}`,
    reason: 'Important recent development.',
    publishedAt: today,
    heatEvidence: 'Strong public discussion and adoption.',
  })
  const expert = index => ({
    name: `Expert ${index}`,
    authority: 'Recognized field leader.',
    artifactTitle: `Interview ${index}`,
    artifactType: 'interview',
    artifactUrl: `https://example.com/expert-${index}`,
    keyViewpoint: 'A central field insight.',
  })
  return {
    authoritative: [reading(1), reading(2, 'article'), reading(3, 'technical-blog')],
    trending: [recent(1), recent(2)],
    experts: [expert(1), expert(2), expert(3)],
  }
}

function openSourceBlueprint() {
  return {
    projects: [
      {
        name: 'Alpha',
        url: 'https://github.com/example/alpha',
        license: 'MIT',
        whyWorthLearning: 'Small, readable core.',
        implementation: 'Event-driven core with adapter ports.',
        strengths: ['Clear boundaries'],
        weaknesses: ['Few production safeguards'],
        borrowParts: [{ part: 'Adapter ports', useFor: 'Integration isolation', adaptation: 'Implement only required ports' }],
      },
      {
        name: 'Beta',
        url: 'https://github.com/example/beta',
        license: 'Apache-2.0',
        whyWorthLearning: 'Mature distributed runtime.',
        implementation: 'Durable scheduler and worker protocol.',
        strengths: ['Operational maturity'],
        weaknesses: ['Complex deployment'],
        borrowParts: [{ part: 'Worker protocol', useFor: 'Reliable execution', adaptation: 'Begin with one worker type' }],
      },
    ],
    blueprint: {
      recommendedFoundation: 'Alpha',
      rationale: 'The smaller core is a better zero-to-one base.',
      steps: [
        { stage: 'Core', borrowFrom: 'Alpha', part: 'Event core', action: 'Implement the domain loop.' },
        { stage: 'Ports', borrowFrom: 'Alpha', part: 'Adapter ports', action: 'Define integration boundaries.' },
        { stage: 'Runtime', borrowFrom: 'Beta', part: 'Worker protocol', action: 'Add durability after validation.' },
      ],
    },
  }
}

test('curriculum tool rejects invalid graphs before replacing state', async (t) => {
  const { store, execute } = await fixture(t)

  await assert.rejects(
    execute('learn_curriculum', {
      domain: 'Testing',
      shortTitle: '测试课程',
      nodes: [
        { id: 'one', title: '一', titleEn: 'One', leverage: 50, deps: ['two'] },
        { id: 'two', title: '二', titleEn: 'Two', leverage: 50, deps: ['one'] },
      ],
    }),
    /dependency cycle/,
  )

  const saved = await store.require('Testing')
  assert.deepEqual(Object.keys(saved.nodes), ['basics', 'advanced'])
})

test('attempt tool rejects invalid grade and mismatched drills without writes', async (t) => {
  const { store, execute } = await fixture(t)
  const drill = await execute('learn_generate_drill', {
    nodeId: 'basics',
    type: 'recall',
    prompt: 'Recall it',
    answer: 'Answer',
  })
  const drillId = drill.text.match(/drill_[a-z0-9_]+/)[0]

  await assert.rejects(
    execute('learn_log_attempt', { nodeId: 'basics', grade: 6 }),
    /integer from 0 to 5/,
  )
  await assert.rejects(
    execute('learn_log_attempt', { nodeId: 'advanced', grade: 4, drillId }),
    /belongs to node 'basics'/,
  )

  const saved = await store.require('Testing')
  assert.equal(saved.attempts.length, 0)
  assert.equal(saved.profile.xp, 0)
})

test('resource and review tools reject unknown references and invalid ranges', async (t) => {
  const { store, execute } = await fixture(t)

  await assert.rejects(
    execute('learn_add_resource', {
      author: 'Expert',
      title: 'Reference',
      url: 'https://example.com/reference',
      type: 'doc',
      nodeIds: ['missing'],
    }),
    /unknown skill node 'missing'/,
  )
  await assert.rejects(
    execute('learn_add_resource', {
      author: 'Expert',
      title: 'Reference',
      url: 'https://example.com/reference',
      type: 'doc',
      nodeIds: [],
    }),
    /at least one skill node is required/,
  )
  await assert.rejects(
    execute('learn_review', {
      summary: 'Review',
      adjustments: [{ nodeId: 'basics', mastery: 101 }],
    }),
    /integer from 0 to 100/,
  )

  const saved = await store.require('Testing')
  assert.equal(saved.resources.length, 0)
  assert.equal(saved.reviews.length, 0)
})

test('curriculum and resource tools hang name+url materials on skill nodes', async (t) => {
  const { store, execute } = await fixture(t)

  await execute('learn_curriculum', {
    domain: 'Testing',
    shortTitle: '测试课程',
    previousCourseAction: 'end',
    nodes: [
      {
        id: 'basics',
        title: '基础',
        titleEn: 'Basics',
        leverage: 100,
        resources: [{ title: 'Intro Guide', url: 'https://example.com/intro' }],
      },
      { id: 'advanced', title: '进阶', titleEn: 'Advanced', leverage: 80, deps: ['basics'] },
    ],
  })

  await execute('learn_add_resource', {
    author: 'Expert',
    title: 'Deep Dive',
    url: 'https://example.com/deep',
    type: 'doc',
    nodeIds: ['basics', 'advanced'],
  })

  const saved = await store.require('Testing')
  assert.deepEqual(saved.nodes.basics.resources, [
    { title: 'Intro Guide', url: 'https://example.com/intro' },
    { title: 'Deep Dive', url: 'https://example.com/deep' },
  ])
  assert.deepEqual(saved.nodes.advanced.resources, [
    { title: 'Deep Dive', url: 'https://example.com/deep' },
  ])
  assert.equal(saved.resources.length, 2)

  const lesson = await execute('learn_lesson', { action: 'next' })
  assert.match(lesson.text, /Intro Guide — https:\/\/example\.com\/intro/)
  assert.match(lesson.text, /Deep Dive — https:\/\/example\.com\/deep/)
})

test('tools enforce ordered lessons, literature, then review from the first node', async (t) => {
  const { store, execute } = await fixture(t)

  const blocked = await execute('learn_next_practice', { count: 1 })
  assert.match(blocked.text, /Continue the ordered first learning pass/)
  await execute('learn_log_attempt', { nodeId: 'advanced', grade: 4, source: 'card' })
  await assert.rejects(
    execute('learn_lesson', { action: 'complete', nodeId: 'advanced' }),
    /next lesson is 'basics'/,
  )
  await execute('learn_lesson', { action: 'complete', nodeId: 'basics' })
  const finalLesson = await execute('learn_lesson', { action: 'complete', nodeId: 'advanced' })
  assert.match(finalLesson.text, /literature-reading phase/)

  await execute('learn_literature', { action: 'recommend', ...literatureRecommendations() })
  assert.equal((await store.require('Testing')).workflow.phase, 'literature')
  await assert.rejects(
    execute('learn_literature', { action: 'complete' }),
    /requires confirmed: true/,
  )
  const completed = await execute('learn_literature', { action: 'complete', confirmed: true })
  assert.match(completed.text, /First node: 基础 \/ Basics/)
  assert.equal((await store.require('Testing')).workflow.phase, 'review')

  const practice = await execute('learn_next_practice', { count: 1 })
  assert.match(practice.text, /基础 \(id: basics/)
  await execute('learn_log_attempt', { nodeId: 'basics', grade: 4 })
  const secondPractice = await execute('learn_next_practice', { count: 1 })
  assert.match(secondPractice.text, /进阶 \(id: advanced/)
  await execute('learn_log_attempt', { nodeId: 'advanced', grade: 2 })
  const retry = await execute('learn_next_practice', { count: 3 })
  assert.match(retry.text, /进阶 \(id: advanced/)
  const finalAttempt = await execute('learn_log_attempt', { nodeId: 'advanced', grade: 3 })
  assert.match(finalAttempt.text, /start learn_open_source/)
  assert.equal((await store.require('Testing')).workflow.phase, 'capstone')

  const recommendation = openSourceBlueprint()
  await assert.rejects(
    execute('learn_open_source', { ...recommendation, projects: recommendation.projects.slice(0, 1) }),
    /exactly 2 or 3/,
  )
  const final = await execute('learn_open_source', recommendation)
  assert.match(final.text, /Open-source comparison:/)
  assert.match(final.text, /Recommended foundation: Alpha/)
  assert.equal((await store.require('Testing')).workflow.phase, 'completed')
})

test('parallel attempt tools preserve every attempt and XP award', async (t) => {
  const { store, execute } = await fixture(t)

  await Promise.all(Array.from({ length: 20 }, () => (
    execute('learn_log_attempt', { nodeId: 'basics', grade: 4 })
  )))

  const saved = await store.require('Testing')
  assert.equal(saved.attempts.length, 20)
  assert.equal(saved.profile.xp, 340)
})

test('switching unfinished courses requires pause or end, and paused work can resume', async (t) => {
  const { store, execute } = await fixture(t)
  const nextCurriculum = {
    domain: 'Next topic',
    shortTitle: '下一主题',
    nodes: [{ id: 'start', title: '开始', titleEn: 'Start', leverage: 100 }],
  }

  await assert.rejects(
    execute('learn_curriculum', nextCurriculum),
    /ask the user whether to pause or end unfinished course "Testing"/,
  )
  assert.equal(await store.load('next-topic'), null)
  assert.equal((await store.require('Testing')).lifecycle.state, 'active')

  await execute('learn_curriculum', {
    ...nextCurriculum,
    previousCourseAction: 'pause',
  })
  assert.equal((await store.load('testing')).lifecycle.state, 'paused')
  assert.equal((await store.require('Next topic')).lifecycle.state, 'active')
  await assert.rejects(store.require('Testing'), /is paused; resume it/)

  await assert.rejects(
    execute('learn_course', { action: 'resume', domain: 'Testing' }),
    /ask the user whether to pause or end unfinished course "Next topic"/,
  )
  await execute('learn_course', {
    action: 'resume',
    domain: 'Testing',
    previousCourseAction: 'end',
  })
  assert.equal(await store.load('next-topic'), null)
  assert.equal((await store.require('Testing')).lifecycle.state, 'active')
})

test('ending a course requires confirmation and deletes its library file', async (t) => {
  const { store, execute } = await fixture(t)

  await assert.rejects(
    execute('learn_course', { action: 'end', domain: 'Testing' }),
    /ask the user first/,
  )
  assert.notEqual(await store.load('testing'), null)

  await execute('learn_course', { action: 'end', domain: 'Testing', confirmed: true })
  assert.equal(await store.load('testing'), null)
  assert.equal(store.activeDomain, null)
})
