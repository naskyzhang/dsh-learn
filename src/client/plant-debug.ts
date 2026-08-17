/** Client-only plant growth backdoor for visual QA (does not touch LearnStore). */

export interface PlantDebugOverride {
  readonly level: number
  readonly levelProgress: number
}

export interface PlantDebugApi {
  /** Print usage in the console. */
  help(): void
  /** Override plant level (1–5) and in-stage progress (0–100). */
  set(level: number, levelProgress?: number): PlantDebugApi
  /** Clear the override and return to Host snapshot. */
  off(): PlantDebugApi
  /** Flash the grow / tail reward animation once. */
  reward(): PlantDebugApi
  /**
   * Walk every stage (and low / mid / high progress) with reward flashes.
   * @param intervalMs - pause between frames (default 900).
   */
  cycle(intervalMs?: number): Promise<PlantDebugApi>
  /** Current override, or null when disabled. */
  state(): PlantDebugOverride | null
}

declare global {
  interface Window {
    __dshLearnPlant?: PlantDebugApi
  }
}

type Listeners = {
  setOverride: (value: PlantDebugOverride | null) => void
  flashReward: () => void
  celebrateEvolution: () => void
  getOverride: () => PlantDebugOverride | null
}

/**
 * Install `window.__dshLearnPlant` while the companion is mounted.
 * @returns disposer that removes the API.
 */
export function installPlantDebug(listeners: Listeners): () => void {
  let cycleToken = 0

  const api: PlantDebugApi = {
    help() {
      // eslint-disable-next-line no-console
      console.log([
        '[dsh-learn] plant debug backdoor',
        '  __dshLearnPlant.set(1..5, progress0..100)',
        '  __dshLearnPlant.cycle(900)   // auto-walk all stages',
        '  __dshLearnPlant.reward()',
        '  __dshLearnPlant.off()',
        'Shortcuts (focus the cat/plant scene):',
        '  ⌘/Cmd+1..5  set stage',
        '  ⌘/Cmd+0     clear override',
        '  ⌘/Cmd+R     reward flash',
        '  ⌘/Cmd+C     start cycle',
        '  ⌘/Cmd+click scene  advance one stage',
      ].join('\n'))
    },
    set(level, levelProgress = 50) {
      cycleToken += 1
      const previous = listeners.getOverride()?.level
      const nextLevel = clampLevel(level)
      listeners.setOverride({
        level: nextLevel,
        levelProgress: clampProgress(levelProgress),
      })
      if (previous !== nextLevel) listeners.celebrateEvolution()
      return api
    },
    off() {
      cycleToken += 1
      listeners.setOverride(null)
      return api
    },
    reward() {
      listeners.flashReward()
      return api
    },
    async cycle(intervalMs = 900) {
      const token = ++cycleToken
      const wait = Math.max(250, Math.round(intervalMs))
      for (let level = 1; level <= 5; level += 1) {
        for (const levelProgress of [0, 55, 100]) {
          if (token !== cycleToken) return api
          listeners.setOverride({ level, levelProgress })
          if (levelProgress === 0) listeners.celebrateEvolution()
          else listeners.flashReward()
          await delay(wait)
        }
      }
      return api
    },
    state() {
      return listeners.getOverride()
    },
  }

  window.__dshLearnPlant = api
  // eslint-disable-next-line no-console
  console.info('[dsh-learn] plant debug ready — __dshLearnPlant.help()')
  return () => {
    cycleToken += 1
    if (window.__dshLearnPlant === api) delete window.__dshLearnPlant
  }
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1
  return Math.min(5, Math.max(1, Math.round(level)))
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0
  return Math.min(100, Math.max(0, Math.round(progress)))
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
