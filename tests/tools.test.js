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
    nodes: [
      { id: 'basics', title: 'Basics', leverage: 100 },
      { id: 'advanced', title: 'Advanced', leverage: 80, deps: ['basics'] },
    ],
  })
  return { store, execute }
}

test('curriculum tool rejects invalid graphs before replacing state', async (t) => {
  const { store, execute } = await fixture(t)

  await assert.rejects(
    execute('learn_curriculum', {
      domain: 'Testing',
      nodes: [
        { id: 'one', title: 'One', leverage: 50, deps: ['two'] },
        { id: 'two', title: 'Two', leverage: 50, deps: ['one'] },
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

test('parallel attempt tools preserve every attempt and XP award', async (t) => {
  const { store, execute } = await fixture(t)

  await Promise.all(Array.from({ length: 20 }, () => (
    execute('learn_log_attempt', { nodeId: 'basics', grade: 4 })
  )))

  const saved = await store.require('Testing')
  assert.equal(saved.attempts.length, 20)
  assert.equal(saved.profile.xp, 340)
})
