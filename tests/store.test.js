import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  LearnStore,
  advanceReviewToCapstone,
  applyGrade,
  completeLesson,
  completeLiterature,
  ensureWorkflow,
  isCourseComplete,
  newDomain,
  newNode,
  selectPractice,
  setLiteratureRecommendations,
  setOpenSourceBlueprint,
  validateCourseShortTitle,
  validateCurriculum,
  validateGrade,
  validateNodeReferences,
  validatePercentage,
} from '../src/store.js'

async function temporaryStore(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-learn-test-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  return new LearnStore(dir)
}

test('same-domain updates are serialized without lost writes', async (t) => {
  const store = await temporaryStore(t)
  await store.save(newDomain('Concurrency'))

  await Promise.all(Array.from({ length: 32 }, (_, index) => (
    store.update('Concurrency', async (domain) => {
      const xp = domain.profile.xp
      await new Promise(resolve => setTimeout(resolve, index % 3))
      domain.profile.xp = xp + 1
    })
  )))

  const saved = await store.require('Concurrency')
  assert.equal(saved.profile.xp, 32)
  assert.deepEqual(await fs.readdir(store.dir), ['concurrency.json'])
})

test('separate store instances coordinate through a filesystem lock', async (t) => {
  const first = await temporaryStore(t)
  const second = new LearnStore(first.dir)
  await first.save(newDomain('Shared'))

  await Promise.all(Array.from({ length: 24 }, (_, index) => (
    (index % 2 ? first : second).update('Shared', async (domain) => {
      const xp = domain.profile.xp
      await new Promise(resolve => setTimeout(resolve, index % 2))
      domain.profile.xp = xp + 1
    })
  )))

  assert.equal((await first.require('Shared')).profile.xp, 24)
  assert.deepEqual(await fs.readdir(first.dir), ['shared.json'])
})

test('a failed transaction is not persisted and does not poison its queue', async (t) => {
  const store = await temporaryStore(t)
  await store.save(newDomain('Recovery'))

  await assert.rejects(
    store.update('Recovery', (domain) => {
      domain.profile.xp = 999
      throw new Error('stop')
    }),
    /stop/,
  )
  await store.update('Recovery', (domain) => {
    domain.profile.xp += 1
  })

  assert.equal((await store.require('Recovery')).profile.xp, 1)
})

test('companion snapshot restores the latest domain and derives level progress', async (t) => {
  const store = await temporaryStore(t)
  const domain = newDomain('Companion')
  domain.nodes.basics = newNode({
    id: 'basics',
    title: 'Basics',
    leverage: 100,
    resources: [{ title: 'Guide', url: 'https://example.com/guide' }],
  })
  domain.profile.xp = 150
  domain.profile.level = 2
  domain.profile.streak = 3
  await store.save(domain)

  const restarted = new LearnStore(store.dir)
  assert.deepEqual(await restarted.companionSnapshot(), {
    domainId: 'companion',
    domainTitle: 'Companion',
    xp: 150,
    level: 2,
    levelProgress: 25,
    streak: 3,
    dueCount: 0,
    nodes: [{
      id: 'basics',
      title: 'Basics',
      titleEn: 'Basics',
      parent: null,
      mastery: 0,
      leverage: 100,
      resources: [{ title: 'Guide', url: 'https://example.com/guide' }],
    }],
    revision: domain.updatedAt,
  })
})

test('companion long poll resolves after a successful store write', async (t) => {
  const store = await temporaryStore(t)
  await store.save(newDomain('Live'))
  const revision = (await store.companionSnapshot()).revision
  const waiting = store.waitForCompanionSnapshot(revision, new AbortController().signal, 1_000)

  await store.update('Live', (domain) => {
    domain.profile.xp = 10
  })

  const changed = await waiting
  assert.equal(changed.xp, 10)
  assert.notEqual(changed.revision, revision)
})

test('a completed active course is archived automatically when a new course starts', async (t) => {
  const store = await temporaryStore(t)
  const first = newDomain('First')
  first.nodes.done = newNode({ id: 'done', title: 'Done', leverage: 100 })
  first.nodes.done.mastery = 80
  await store.save(first)

  const second = newDomain('Second')
  second.nodes.start = newNode({ id: 'start', title: 'Start', leverage: 100 })
  await store.startCourse(second)

  assert.equal((await store.load('first')).lifecycle.state, 'completed')
  assert.equal((await store.require('Second')).lifecycle.state, 'active')
  const states = Object.fromEntries((await store.listCourses()).map(course => [course.id, course.state]))
  assert.deepEqual(states, { second: 'active', first: 'completed' })
})

test('companion drops a stale active id after another Host pauses the course', async (t) => {
  const first = await temporaryStore(t)
  const otherHost = new LearnStore(first.dir)
  await first.save(newDomain('Old'))
  assert.equal((await first.companionSnapshot()).domainId, 'old')

  await otherHost.startCourse(newDomain('New'), 'pause')

  assert.equal((await first.companionSnapshot()).domainId, 'new')
  assert.equal((await first.load('old')).lifecycle.state, 'paused')
})

test('workflow teaches lessons in order, then gates review behind literature', () => {
  const domain = newDomain('Journey')
  domain.nodes.first = newNode({ id: 'first', title: '第一课', titleEn: 'First', leverage: 100 })
  domain.nodes.second = newNode({ id: 'second', title: '第二课', titleEn: 'Second', leverage: 80 })

  assert.equal(ensureWorkflow(domain).phase, 'learning')
  assert.throws(() => completeLesson(domain, 'second'), /next lesson is 'first'/)
  assert.equal(completeLesson(domain, 'first').next.id, 'second')
  assert.equal(completeLesson(domain, 'second').phase, 'literature')
  assert.deepEqual(selectPractice(domain, 1), [])

  const now = new Date('2026-08-19T00:00:00.000Z')
  setLiteratureRecommendations(domain, [
    {
      title: 'Canonical One',
      author: 'A',
      type: 'paper',
      url: 'https://example.com/canonical-1',
      reason: 'Foundational result.',
    },
    {
      title: 'Canonical Two',
      author: 'B',
      type: 'article',
      url: 'https://example.com/canonical-2',
      reason: 'Defines the field.',
    },
    {
      title: 'Canonical Three',
      author: 'C',
      type: 'technical-blog',
      url: 'https://example.com/canonical-3',
      reason: 'Canonical implementation account.',
    },
  ], [
    {
      title: 'Recent One',
      author: 'D',
      type: 'paper',
      url: 'https://example.com/recent-1',
      reason: 'Recent advance.',
      publishedAt: '2026-06-01',
      heatEvidence: 'High citation and discussion growth.',
    },
    {
      title: 'Recent Two',
      author: 'E',
      type: 'technical-blog',
      url: 'https://example.com/recent-2',
      reason: 'Widely adopted new technique.',
      publishedAt: '2025-10-01',
      heatEvidence: 'Strong repository and community activity.',
    },
  ], [
    {
      name: 'Expert One',
      authority: 'Founded the field.',
      artifactTitle: 'Interview One',
      artifactType: 'interview',
      artifactUrl: 'https://example.com/expert-1',
      keyViewpoint: 'Start from first principles.',
    },
    {
      name: 'Expert Two',
      authority: 'Led the canonical implementation.',
      artifactTitle: 'Talk Two',
      artifactType: 'talk',
      artifactUrl: 'https://example.com/expert-2',
      keyViewpoint: 'Systems constraints shape the method.',
    },
    {
      name: 'Expert Three',
      authority: 'Authored the standard reference.',
      artifactTitle: 'Essay Three',
      artifactType: 'essay',
      artifactUrl: 'https://example.com/expert-3',
      keyViewpoint: 'Evaluation must match real use.',
    },
  ], now)

  const first = completeLiterature(domain, new Date('2026-08-20T00:00:00.000Z'))
  assert.equal(first.id, 'first')
  assert.equal(ensureWorkflow(domain).phase, 'review')
  assert.equal(selectPractice(domain, 1)[0].id, 'first')
  domain.attempts.push({
    id: 'att-card-second',
    nodeId: 'second',
    drillId: null,
    grade: 4,
    note: '',
    source: 'card',
    ts: '2026-08-20T00:30:00.000Z',
  })
  assert.equal(selectPractice(domain, 1)[0].id, 'first')
  domain.attempts.push({
    id: 'att-first',
    nodeId: 'first',
    drillId: null,
    grade: 4,
    note: '',
    ts: '2026-08-20T01:00:00.000Z',
  })
  assert.equal(selectPractice(domain, 1)[0].id, 'second')
  domain.attempts.push({
    id: 'att-second-wrong',
    nodeId: 'second',
    drillId: null,
    grade: 2,
    note: '',
    source: 'scheduled',
    ts: '2026-08-20T02:00:00.000Z',
  })
  assert.equal(advanceReviewToCapstone(domain), false)
  assert.deepEqual(selectPractice(domain, 3).map(node => node.id), ['second'])
  domain.attempts.push({
    id: 'att-second-correct',
    nodeId: 'second',
    drillId: null,
    grade: 3,
    note: '',
    source: 'scheduled',
    ts: '2026-08-20T03:00:00.000Z',
  })
  assert.equal(advanceReviewToCapstone(domain), true)
  assert.equal(ensureWorkflow(domain).phase, 'capstone')

  const capstone = setOpenSourceBlueprint(domain, [
    {
      name: 'Alpha',
      url: 'https://github.com/example/alpha',
      license: 'MIT',
      whyWorthLearning: 'Clear modular architecture.',
      implementation: 'A small event-driven core with adapters.',
      strengths: ['Simple boundaries'],
      weaknesses: ['Limited scale'],
      borrowParts: [{ part: 'Adapter layer', useFor: 'Integration isolation', adaptation: 'Keep only needed ports' }],
    },
    {
      name: 'Beta',
      url: 'https://github.com/example/beta',
      license: 'Apache-2.0',
      whyWorthLearning: 'Production-grade orchestration.',
      implementation: 'A layered scheduler with durable workers.',
      strengths: ['Operational maturity'],
      weaknesses: ['Higher complexity'],
      borrowParts: [{ part: 'Worker protocol', useFor: 'Reliable execution', adaptation: 'Start with one worker type' }],
    },
  ], {
    recommendedFoundation: 'Alpha',
    rationale: 'Its small core is the fastest foundation.',
    steps: [
      { stage: 'Core', borrowFrom: 'Alpha', part: 'Event core', action: 'Implement the minimal domain loop.' },
      { stage: 'Ports', borrowFrom: 'Alpha', part: 'Adapter layer', action: 'Add explicit integration interfaces.' },
      { stage: 'Runtime', borrowFrom: 'Beta', part: 'Worker protocol', action: 'Add durable execution after the core works.' },
    ],
  }, new Date('2026-08-21T00:00:00.000Z'))
  assert.equal(capstone.projects.length, 2)
  assert.equal(ensureWorkflow(domain).phase, 'completed')
  assert.equal(isCourseComplete(domain), true)
})

test('literature slate enforces exact recommendation quotas', () => {
  const domain = newDomain('Reading')
  domain.nodes.only = newNode({ id: 'only', title: '单元', titleEn: 'Unit', leverage: 100 })
  completeLesson(domain, 'only')
  assert.throws(
    () => setLiteratureRecommendations(domain, [], [], [], new Date('2026-08-19T00:00:00.000Z')),
    /exactly 3/,
  )
})

test('curriculum validation normalizes valid input', () => {
  const nodes = validateCurriculum('Rust ownership', [
    { id: 'ownership', title: ' 所有权 ', titleEn: 'Ownership', leverage: 100 },
    { id: 'borrowing', title: '借用', titleEn: 'Borrowing', parent: 'ownership', leverage: 90, deps: ['ownership'] },
  ])

  assert.deepEqual(nodes, [
    { id: 'ownership', title: '所有权', titleEn: 'Ownership', parent: null, leverage: 100, deps: [], resources: [] },
    { id: 'borrowing', title: '借用', titleEn: 'Borrowing', parent: 'ownership', leverage: 90, deps: ['ownership'], resources: [] },
  ])
})

test('curriculum validation requires Chinese titles to stay within eight characters', () => {
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'long', title: '验证器与评分器设计', titleEn: 'Verifier Design', leverage: 80 },
    ]),
    /at most 8 characters; summarize the skill/,
  )
})

test('course card title must be a semantic summary within eight characters', () => {
  assert.equal(validateCourseShortTitle('自进化系统'), '自进化系统')
  assert.throws(
    () => validateCourseShortTitle('自进化智能代理学习系统'),
    /semantic course summary of at most 8 characters/,
  )
  assert.throws(
    () => validateCourseShortTitle('自进化：系统'),
    /must not contain a colon/,
  )
})

test('curriculum validation accepts per-node learning materials', () => {
  const nodes = validateCurriculum('Rust ownership', [
    {
      id: 'ownership',
      title: '所有权',
      titleEn: 'Ownership',
      leverage: 100,
      resources: [
        { title: ' The Rust Book ', url: 'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html' },
      ],
    },
  ])
  assert.deepEqual(nodes[0].resources, [
    {
      title: 'The Rust Book',
      url: 'https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html',
    },
  ])
})

test('curriculum validation rejects invalid node resources', () => {
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'one', title: 'One', leverage: 50, resources: [{ title: 'A', url: 'ftp://example.com' }] },
    ]),
    /only HTTP\(S\)/,
  )
  assert.throws(
    () => validateCurriculum('X', [
      {
        id: 'one',
        title: 'One',
        leverage: 50,
        resources: [
          { title: 'A', url: 'https://example.com/a' },
          { title: 'B', url: 'https://example.com/a' },
        ],
      },
    ]),
    /duplicate url/,
  )
})

test('curriculum validation rejects duplicate and dangling node references', () => {
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'same', title: 'One', leverage: 50 },
      { id: 'same', title: 'Two', leverage: 50 },
    ]),
    /duplicate node id 'same'/,
  )
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'one', title: 'One', leverage: 50, deps: ['missing'] },
    ]),
    /unknown dependency 'missing'/,
  )
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'one', title: 'One', leverage: 50, parent: 'missing' },
    ]),
    /unknown parent 'missing'/,
  )
})

test('curriculum validation rejects dependency and parent cycles', () => {
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'one', title: 'One', leverage: 50, deps: ['two'] },
      { id: 'two', title: 'Two', leverage: 50, deps: ['one'] },
    ]),
    /dependency cycle/,
  )
  assert.throws(
    () => validateCurriculum('X', [
      { id: 'one', title: 'One', leverage: 50, parent: 'two' },
      { id: 'two', title: 'Two', leverage: 50, parent: 'one' },
    ]),
    /parent cycle/,
  )
})

test('grades and percentages reject out-of-range or fractional values', () => {
  for (const grade of [-1, 5.1, 6, Number.NaN]) {
    assert.throws(() => validateGrade(grade), /integer from 0 to 5/)
  }
  assert.equal(validateGrade(0), 0)
  assert.equal(validateGrade(5), 5)

  for (const value of [-1, 50.5, 101, Number.NaN]) {
    assert.throws(() => validatePercentage('mastery', value), /integer from 0 to 100/)
  }
  assert.equal(validatePercentage('mastery', 100), 100)
})

test('invalid grade cannot partially mutate scheduling state', () => {
  const node = {
    ease: 2.5,
    intervalDays: 0,
    reps: 0,
    lapses: 0,
    mastery: 0,
  }
  assert.throws(() => applyGrade(node, 9), /integer from 0 to 5/)
  assert.equal(node.reps, 0)
  assert.equal(node.mastery, 0)
})

test('node references reject duplicates and unknown skills', () => {
  const domain = { nodes: { one: { id: 'one' } } }
  assert.throws(
    () => validateNodeReferences(domain, ['one', 'one'], 'nodeIds'),
    /duplicate node ids/,
  )
  assert.throws(
    () => validateNodeReferences(domain, ['missing'], 'nodeIds'),
    /unknown skill node 'missing'/,
  )
  assert.throws(
    () => validateNodeReferences(domain, ['constructor'], 'nodeIds'),
    /unknown skill node 'constructor'/,
  )
})
