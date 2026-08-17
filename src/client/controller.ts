import type { LearnCompanionSnapshot } from './LearnCompanion.tsx'
import type { ConnectionHandle, ObservableSnapshot } from './runtime-types.ts'

const EMPTY_SNAPSHOT: LearnCompanionSnapshot = Object.freeze({
  domainId: null,
  domainTitle: null,
  xp: 0,
  level: 1,
  levelProgress: 0,
  streak: 0,
  dueCount: 0,
  revision: '',
})

/** Browser-side long-poll controller exposed to React as one stable observable. */
export class LearnCompanionController implements ObservableSnapshot<LearnCompanionSnapshot> {
  private snapshot: LearnCompanionSnapshot = EMPTY_SNAPSHOT
  private readonly listeners = new Set<() => void>()

  constructor(private readonly connection: ConnectionHandle) {}

  getSnapshot = (): LearnCompanionSnapshot => this.snapshot

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Start the cancellable long-poll loop. */
  start(): () => void {
    const abort = new AbortController()
    void this.run(abort.signal)
    return () => { abort.abort() }
  }

  private async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        const result = await this.connection.rpc.call(
          '/dsh-learn',
          'companion',
          { revision: this.snapshot.revision },
          signal,
        )
        if (!result.ok) throw new Error(result.error.message)
        this.publish(parseSnapshot(result.value))
      } catch (error) {
        if (signal.aborted) return
        console.warn('[dsh-learn] companion sync failed; retrying', error)
        await abortableDelay(3_000, signal)
      }
    }
  }

  private publish(next: LearnCompanionSnapshot): void {
    if (next.revision === this.snapshot.revision) return
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }
}

function parseSnapshot(value: unknown): LearnCompanionSnapshot {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Host returned an invalid dsh-learn snapshot')
  }
  const input = value as Record<string, unknown>
  if ((input.domainId !== null && typeof input.domainId !== 'string')
    || (input.domainTitle !== null && typeof input.domainTitle !== 'string')
    || !isNatural(input.xp)
    || !isNatural(input.level) || input.level < 1
    || !isNatural(input.levelProgress) || input.levelProgress > 100
    || !isNatural(input.streak)
    || !isNatural(input.dueCount)
    || typeof input.revision !== 'string') {
    throw new Error('Host returned a malformed dsh-learn snapshot')
  }
  return {
    domainId: input.domainId,
    domainTitle: input.domainTitle,
    xp: input.xp,
    level: input.level,
    levelProgress: input.levelProgress,
    streak: input.streak,
    dueCount: input.dueCount,
    revision: input.revision,
  }
}

function isNatural(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

async function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return
  await new Promise<void>((resolve) => {
    const timer = window.setTimeout(finish, ms)
    const abort = () => { finish() }
    function finish() {
      window.clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      resolve()
    }
    signal.addEventListener('abort', abort, { once: true })
  })
}
