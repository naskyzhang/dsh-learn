import assert from 'node:assert/strict'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { registerCompanionBridge } from '../src/bridge.js'
import { LearnStore } from '../src/store.js'

test('bridge registers an optional trusted Connection channel', async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dsh-learn-bridge-'))
  t.after(() => fs.rm(dir, { recursive: true, force: true }))
  const store = new LearnStore(dir)
  let registration
  const connectionCtx = {
    connection: {
      rpc: {
        handle(channel, handler, options) {
          registration = { channel, handler, options }
        },
      },
    },
  }
  const ctx = {
    inject(services, callback) {
      assert.deepEqual(services, ['connection'])
      callback(connectionCtx)
    },
  }

  registerCompanionBridge(ctx, store)
  assert.equal(registration.channel, '/dsh-learn')
  assert.deepEqual(registration.options, { authority: 'trusted-host' })

  const result = await registration.handler(
    'companion',
    { revision: null },
    new AbortController().signal,
  )
  assert.deepEqual(result, {
    ok: true,
    value: {
      domainId: null,
      domainTitle: null,
      xp: 0,
      level: 1,
      levelProgress: 0,
      streak: 0,
      dueCount: 0,
      nodes: [],
      revision: 'none',
    },
  })
})

test('bridge rejects unknown endpoints and malformed revisions', async () => {
  const store = new LearnStore(path.join(os.tmpdir(), 'unused-dsh-learn-store'))
  let handler
  registerCompanionBridge({
    inject(_services, callback) {
      callback({
        connection: {
          rpc: {
            handle(_channel, candidate) {
              handler = candidate
            },
          },
        },
      })
    },
  }, store)

  await assert.rejects(
    handler('unknown', { revision: null }, new AbortController().signal),
    /unknown dsh-learn endpoint/,
  )
  await assert.rejects(
    handler('companion', { revision: 1 }, new AbortController().signal),
    /invalid dsh-learn companion revision/,
  )
})
