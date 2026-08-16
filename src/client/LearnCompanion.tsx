import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ObservableSnapshot, SnapshotSelectorHook } from './runtime-types.ts'

/** Compact state transferred from the Host learning store. */
export interface LearnCompanionSnapshot {
  readonly domainId: string | null
  readonly domainTitle: string | null
  readonly xp: number
  readonly level: number
  readonly levelProgress: number
  readonly streak: number
  readonly dueCount: number
  readonly revision: string
}

/** Private reactive state contributed by the browser plugin registration. */
export interface LearnCompanionInjected {
  hooks: {
    companion: ObservableSnapshot<LearnCompanionSnapshot>
  }
}

export interface LearnCompanionProps {
  readonly wide: boolean
  readonly useCompanion: SnapshotSelectorHook<LearnCompanionSnapshot>
}

const STAGE_NAMES = ['种子', '嫩芽', '叶丛', '花苞', '开花'] as const

/**
 * Render a passive pixel cat and knowledge plant in the sidebar footer.
 * @param props - sidebar width plus the framework-bound companion selector.
 * @returns compact, non-interactive learning status.
 */
export function LearnCompanion({ wide, useCompanion }: LearnCompanionProps) {
  const snapshot = useCompanion(value => value)
  const previousXp = useRef<number | null>(null)
  const [reward, setReward] = useState(false)
  const stage = Math.min(5, Math.max(1, snapshot.level))
  const sleeping = snapshot.domainId === null

  useEffect(() => {
    const previous = previousXp.current
    previousXp.current = snapshot.xp
    if (previous === null || snapshot.xp <= previous) return
    setReward(true)
    const timer = window.setTimeout(() => { setReward(false) }, 500)
    return () => { window.clearTimeout(timer) }
  }, [snapshot.xp])

  const growth = `${Math.round(snapshot.levelProgress * 0.08)}px`
  const plantStyle = { '--plant-growth': growth } as CSSProperties
  const title = sleeping ? '学习伙伴休息中' : snapshot.domainTitle ?? '学习伙伴'
  const meta = sleeping
    ? '创建课程后植物会发芽'
    : `${STAGE_NAMES[stage - 1]} · ${snapshot.levelProgress}% · ${snapshot.dueCount} 项待复习`

  return (
    <div
      className="dsh-learn-companion"
      data-wide={String(wide)}
      data-reward={String(reward)}
      role="status"
      aria-live="polite"
      aria-label={`${title}，${meta}`}
    >
      <div className="dsh-learn-scene" aria-hidden="true">
        <div className="dsh-learn-cat" data-sleeping={String(sleeping)}>
          <span className="dsh-learn-cat-body" />
          <span className="dsh-learn-cat-head">
            <span className="dsh-learn-cat-ear" />
            <span className="dsh-learn-cat-ear" />
            <span className="dsh-learn-cat-eye" />
            <span className="dsh-learn-cat-eye" />
          </span>
          <span className="dsh-learn-cat-tail" />
        </div>
        <div className="dsh-learn-plant" data-stage={String(stage)} style={plantStyle}>
          <span className="dsh-learn-stem" />
          <span className="dsh-learn-leaf dsh-learn-leaf-left" />
          <span className="dsh-learn-leaf dsh-learn-leaf-right" />
          <span className="dsh-learn-bud" />
          <span className="dsh-learn-bloom" />
          <span className="dsh-learn-pot" />
        </div>
      </div>
      <div className="dsh-learn-copy">
        <div className="dsh-learn-title">{title}</div>
        <div className="dsh-learn-meta">{meta}</div>
      </div>
    </div>
  )
}
