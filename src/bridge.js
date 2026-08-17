/**
 * Host-to-browser bridge for the compact sidebar learning companion.
 *
 * The bridge rides DSH Connection's generic trusted RPC transport instead of
 * exposing an unauthenticated ad-hoc HTTP route. It is optional: TUI profiles
 * without the browser Connection still get every learn_* tool.
 */

const CHANNEL = '/dsh-learn'
const ENDPOINT = 'companion'

/**
 * Register the optional browser RPC channel when the Web Connection service is
 * present in the composition.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {import('./store.js').LearnStore} store - durable learning store.
 * @returns {void}
 */
export function registerCompanionBridge(ctx, store) {
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.rpc.handle(
      CHANNEL,
      async (endpoint, payload, signal) => {
        if (endpoint !== ENDPOINT) throw new Error(`unknown dsh-learn endpoint '${endpoint}'`)
        const revision = companionRevision(payload)
        const snapshot = await store.waitForCompanionSnapshot(revision, signal)
        return { ok: true, value: snapshot }
      },
      { authority: 'trusted-host' },
    )
  })
}

/**
 * Validate the sole long-poll request payload.
 * @param {unknown} payload - decoded RPC payload.
 * @returns {string | null} browser's current revision.
 */
function companionRevision(payload) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid dsh-learn companion payload')
  }
  const revision = payload.revision
  if (revision !== null && typeof revision !== 'string') {
    throw new Error('invalid dsh-learn companion revision')
  }
  return revision
}
