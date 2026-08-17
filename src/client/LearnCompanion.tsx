import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { ObservableSnapshot, SnapshotSelectorHook } from './runtime-types.ts'
import {
  installPlantDebug,
  type PlantDebugOverride,
} from './plant-debug.ts'

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
  readonly useCompanion: SnapshotSelectorHook<LearnCompanionSnapshot>
}

const STAGE_NAMES = ['种子', '嫩芽', '叶丛', '花苞', '开花'] as const
const POSITION_KEY = 'dsh-learn.companion-position.v1'
const DETAIL_WIDTH = 224
const EXPANDED_HEIGHT = 136
const VIEWPORT_MARGIN = 12
const ADVENTURE_DURATION = 14_000
const MEOW_DURATION = 3_600
const EVOLUTION_DURATION = 3_600
/** Client-only plant growth backdoor for visual QA. Disabled in shipped builds. */
const PLANT_DEBUG_ENABLED = false

type CatAction = 'adventure' | 'meow'

interface Position {
  x: number
  y: number
}

interface DragState {
  pointerId: number
  originX: number
  originY: number
  start: Position
}

/**
 * Render a draggable pixel cat and knowledge plant in the shell overlay.
 * @param props - framework-bound companion selector.
 * @returns compact floating learning status.
 */
export function LearnCompanion({ useCompanion }: LearnCompanionProps) {
  const snapshot = useCompanion(value => value)
  const previousXp = useRef<number | null>(null)
  const previousLevel = useRef<number | null>(null)
  const drag = useRef<DragState | null>(null)
  const moved = useRef(false)
  const actionTimer = useRef<number | null>(null)
  const evolutionTimer = useRef<number | null>(null)
  const positionRef = useRef<Position>(initialPosition())
  const [position, setPosition] = useState(positionRef.current)
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [catAction, setCatAction] = useState<CatAction | null>(null)
  const [reward, setReward] = useState(false)
  const [evolving, setEvolving] = useState(false)
  const [plantDebug, setPlantDebug] = useState<PlantDebugOverride | null>(null)
  const plantDebugRef = useRef<PlantDebugOverride | null>(null)
  plantDebugRef.current = plantDebug

  const displayLevel = plantDebug?.level ?? snapshot.level
  const displayProgress = plantDebug?.levelProgress ?? snapshot.levelProgress
  const stage = Math.min(5, Math.max(1, displayLevel))
  const sleeping = catAction === null

  const flashReward = useCallback(() => {
    setReward(true)
    window.setTimeout(() => { setReward(false) }, 500)
  }, [])

  const moveTo = useCallback((next: Position) => {
    const bounded = clampPosition(next)
    positionRef.current = bounded
    setPosition(bounded)
    return bounded
  }, [])

  const startCatAction = useCallback((action: CatAction) => {
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setCatAction(action)
    actionTimer.current = window.setTimeout(() => {
      actionTimer.current = null
      setCatAction(null)
    }, reducedMotion ? 800 : action === 'adventure' ? ADVENTURE_DURATION : MEOW_DURATION)
  }, [])

  const celebrateEvolution = useCallback(() => {
    if (evolutionTimer.current !== null) window.clearTimeout(evolutionTimer.current)
    setEvolving(false)
    window.requestAnimationFrame(() => {
      setEvolving(true)
      startCatAction('meow')
      evolutionTimer.current = window.setTimeout(() => {
        evolutionTimer.current = null
        setEvolving(false)
      }, EVOLUTION_DURATION)
    })
  }, [startCatAction])

  const advancePlantDebug = useCallback(() => {
    setPlantDebug((current) => {
      const from = current?.level ?? Math.min(5, Math.max(1, snapshot.level))
      return { level: from >= 5 ? 1 : from + 1, levelProgress: 55 }
    })
    celebrateEvolution()
  }, [celebrateEvolution, snapshot.level])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start: positionRef.current,
    }
    moved.current = false
    setDragging(true)
  }, [])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (current === null || current.pointerId !== event.pointerId) return
    const dx = event.clientX - current.originX
    const dy = event.clientY - current.originY
    if (!moved.current && Math.hypot(dx, dy) < 5) return
    moved.current = true
    moveTo({
      x: current.start.x + dx,
      y: current.start.y + dy,
    })
  }, [moveTo])

  const finishDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (current === null || current.pointerId !== event.pointerId) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    drag.current = null
    setDragging(false)
    if (moved.current) savePosition(positionRef.current)
    else if (PLANT_DEBUG_ENABLED && event.metaKey) {
      advancePlantDebug()
    } else {
      const nextExpanded = !expanded
      setExpanded(nextExpanded)
      startCatAction(nextExpanded ? 'adventure' : 'meow')
    }
  }, [advancePlantDebug, expanded, startCatAction])

  const cancelDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return
    drag.current = null
    moved.current = false
    setDragging(false)
  }, [])

  const onHandleKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (PLANT_DEBUG_ENABLED && event.metaKey) {
      if (event.key === '0') {
        event.preventDefault()
        setPlantDebug(null)
        return
      }
      if (event.key >= '1' && event.key <= '5') {
        event.preventDefault()
        setPlantDebug({ level: Number(event.key), levelProgress: 55 })
        celebrateEvolution()
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        flashReward()
        return
      }
      if (event.key === 'c' || event.key === 'C') {
        event.preventDefault()
        void window.__dshLearnPlant?.cycle()
        return
      }
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const nextExpanded = !expanded
      setExpanded(nextExpanded)
      startCatAction(nextExpanded ? 'adventure' : 'meow')
      return
    }
    const step = event.shiftKey ? 32 : 12
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key]
    if (delta === undefined) return
    event.preventDefault()
    const current = positionRef.current
    const next = moveTo({ x: current.x + delta.x, y: current.y + delta.y })
    savePosition(next)
  }, [celebrateEvolution, expanded, flashReward, moveTo, startCatAction])

  useEffect(() => {
    const previous = previousXp.current
    previousXp.current = snapshot.xp
    if (previous === null || snapshot.xp <= previous || plantDebugRef.current !== null) return
    flashReward()
  }, [flashReward, snapshot.xp])

  useEffect(() => {
    const previous = previousLevel.current
    previousLevel.current = snapshot.level
    if (previous === null || snapshot.level <= previous || plantDebugRef.current !== null) return
    celebrateEvolution()
  }, [celebrateEvolution, snapshot.level])

  useEffect(() => {
    const onResize = () => {
      const next = moveTo(positionRef.current)
      savePosition(next)
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize) }
  }, [moveTo])

  useEffect(() => {
    if (!PLANT_DEBUG_ENABLED) return
    return installPlantDebug({
      setOverride: setPlantDebug,
      flashReward,
      celebrateEvolution,
      getOverride: () => plantDebugRef.current,
    })
  }, [celebrateEvolution, flashReward])

  useEffect(() => () => {
    if (actionTimer.current !== null) window.clearTimeout(actionTimer.current)
    if (evolutionTimer.current !== null) window.clearTimeout(evolutionTimer.current)
  }, [])

  const growth = String(0.94 + displayProgress * 0.0006)
  const plantStyle = { '--plant-growth': growth } as CSSProperties
  const floatStyle = {
    transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
  } as CSSProperties
  const title = plantDebug !== null
    ? `植物调试 · ${STAGE_NAMES[stage - 1]}`
    : (snapshot.domainTitle ?? '学习伙伴休息中')
  const meta = plantDebug !== null
    ? `DEBUG LV.${stage} · ${displayProgress}% · ⌘+0 退出`
    : snapshot.domainId === null
      ? '创建课程后植物会发芽'
      : `${STAGE_NAMES[stage - 1]} · ${displayProgress}% · ${snapshot.dueCount} 项待复习`

  return (
    <div className="dsh-learn-float" style={floatStyle}>
      <div
        className="dsh-learn-companion"
        data-dragging={String(dragging)}
        data-expanded={String(expanded)}
        data-reward={String(reward)}
        data-evolving={String(evolving)}
        data-plant-debug={String(plantDebug !== null)}
      >
        <div
          className="dsh-learn-scene"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${expanded ? '收起' : '展开'}学习伙伴详情并唤醒小猫；拖动可移动；${title}，${meta}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onKeyDown={onHandleKeyDown}
        >
          <div
            className="dsh-learn-cat"
            data-sleeping={String(sleeping)}
            data-action={catAction ?? 'sleeping'}
            aria-hidden="true"
          >
            <svg
              className="dsh-learn-cat-sprite dsh-learn-cat-walking"
              viewBox="0 0 72 48"
              shapeRendering="crispEdges"
            >
              <path className="dsh-learn-cat-fill" d="M18 20H46V22H53V38H48V42H19V39H15V25H18Z" />
              <path className="dsh-learn-cat-fill dsh-learn-cat-head-fill" d="M5 16V9H9V12H19V9H23V15H27V30H24V33H8V30H5Z" />
              <path className="dsh-learn-cat-fill" d="M52 20H58V10H63V5H68V14H63V25H58V32H52Z" />
              <path className="dsh-learn-cat-inner-ear-fill" d="M8 10H11V14H8ZM19 10H22V14H19Z" />
              <path className="dsh-learn-cat-light-fill" d="M6 24H17V31H8V29H4V26H6Z" />
              <rect className="dsh-learn-cat-eye-fill" x="10" y="18" width="3" height="4" />
              <rect className="dsh-learn-cat-eye-shine-fill" x="10" y="18" width="1" height="1" />
              <rect className="dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-walking" x="9" y="20" width="6" height="2" />
              <rect className="dsh-learn-cat-pink-fill" x="4" y="24" width="3" height="3" />
              <rect className="dsh-learn-cat-cheek-fill" x="13" y="25" width="3" height="3" />
              <rect className="dsh-learn-cat-smile-fill" x="7" y="29" width="4" height="2" />
              <path className="dsh-learn-cat-meow-mouth-fill" d="M8 23H15V25H17V30H15V32H8V30H6V25H8Z" />
              <path className="dsh-learn-cat-meow-tongue-fill" d="M9 27H14V29H15V31H8V29H9Z" />
              <rect className="dsh-learn-cat-meow-blush-fill" x="16" y="25" width="4" height="3" />
              <rect className="dsh-learn-cat-collar-fill" x="24" y="27" width="5" height="8" />
              <rect className="dsh-learn-cat-stripe-fill" x="25" y="19" width="4" height="8" />
              <rect className="dsh-learn-cat-stripe-fill" x="34" y="19" width="4" height="6" />
              <path className="dsh-learn-cat-leg dsh-learn-cat-leg-front" d="M20 36H28V45H19V41H20Z" />
              <path className="dsh-learn-cat-leg dsh-learn-cat-leg-back" d="M42 36H50V45H41V41H42Z" />
              <rect className="dsh-learn-cat-paw-tip-fill" x="20" y="41" width="7" height="3" />
              <rect className="dsh-learn-cat-paw-tip-fill" x="42" y="41" width="7" height="3" />
              <rect className="dsh-learn-cat-whisker-fill" x="0" y="28" width="8" height="2" />
              <rect className="dsh-learn-cat-whisker-fill" x="1" y="32" width="9" height="2" />
            </svg>
            <svg
              className="dsh-learn-cat-sprite dsh-learn-cat-sleeping"
              viewBox="0 0 72 48"
              shapeRendering="crispEdges"
            >
              <path className="dsh-learn-cat-fill" d="M18 22H48V25H55V40H51V44H18V41H13V29H18Z" />
              <path className="dsh-learn-cat-fill dsh-learn-cat-prone-head-fill" d="M5 24V15H10V19H21V15H26V24H30V41H26V44H8V41H4V28H5Z" />
              <path className="dsh-learn-cat-tail-fill" d="M51 25H60V29H65V38H61V42H48V37H58V32H51Z" />
              <path className="dsh-learn-cat-light-fill" d="M6 34H25V41H9V39H5Z" />
              <rect className="dsh-learn-cat-sleep-eye-fill" x="9" y="29" width="6" height="2" />
              <rect className="dsh-learn-cat-sleep-eye-fill" x="20" y="29" width="6" height="2" />
              <rect className="dsh-learn-cat-prone-eye-fill" x="10" y="27" width="4" height="5" />
              <rect className="dsh-learn-cat-prone-eye-fill" x="21" y="27" width="4" height="5" />
              <rect className="dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-prone" x="9" y="29" width="6" height="2" />
              <rect className="dsh-learn-cat-meow-squint-fill dsh-learn-cat-meow-squint-prone" x="20" y="29" width="6" height="2" />
              <rect className="dsh-learn-cat-pink-fill" x="15" y="33" width="4" height="3" />
              <path className="dsh-learn-cat-meow-mouth-fill" d="M12 33H23V35H25V40H23V42H12V40H10V35H12Z" />
              <path className="dsh-learn-cat-meow-tongue-fill" d="M14 37H21V39H22V41H13V39H14Z" />
              <rect className="dsh-learn-cat-meow-blush-fill" x="5" y="34" width="4" height="3" />
              <rect className="dsh-learn-cat-meow-blush-fill" x="26" y="34" width="4" height="3" />
              <rect className="dsh-learn-cat-stripe-fill" x="34" y="22" width="4" height="7" />
              <rect className="dsh-learn-cat-stripe-fill" x="43" y="23" width="4" height="6" />
              <path className="dsh-learn-cat-light-fill" d="M23 38H42V44H22V41H23Z" />
            </svg>
            <span className="dsh-learn-zzz" aria-hidden="true">
              <span>Z</span><span>Z</span><span>Z</span>
            </span>
            <span className="dsh-learn-meow-text" aria-hidden="true">Miao~</span>
          </div>
          <div
            className="dsh-learn-plant"
            data-stage={String(stage)}
            style={plantStyle}
            aria-hidden="true"
          >
            <span className="dsh-learn-evolution-aura" />
            <svg className="dsh-learn-plant-sprite" viewBox="0 0 64 68" shapeRendering="crispEdges">
              <g className="dsh-learn-plant-seed">
                <path d="M27 40H37V43H40V47H24V43H27Z" />
                <rect className="dsh-learn-seed-shine" x="29" y="40" width="3" height="3" />
              </g>
              <path className="dsh-learn-plant-stem" d="M29 17H35V46H29Z" />
              <g className="dsh-learn-plant-leaf dsh-learn-plant-leaf-left">
                <path d="M29 39H23V37H15V33H11V25H19V27H25V31H29Z" />
                <path className="dsh-learn-leaf-shine" d="M15 27H20V30H24V33H20V31H15Z" />
              </g>
              <g className="dsh-learn-plant-leaf dsh-learn-plant-leaf-right">
                <path d="M35 34H41V30H45V27H55V35H52V39H44V41H35Z" />
                <path className="dsh-learn-leaf-shine" d="M45 30H52V33H48V36H43V33H45Z" />
              </g>
              <g className="dsh-learn-plant-leaf dsh-learn-plant-leaf-upper">
                <path d="M29 29H24V26H19V18H22V14H30V18H33V25H29Z" />
                <path className="dsh-learn-leaf-shine" d="M23 18H27V21H29V24H25V22H23Z" />
              </g>
              <g className="dsh-learn-plant-bud">
                <path className="dsh-learn-bud-wrap" d="M24 15V8H27V5H37V8H40V15H37V19H27V15Z" />
                <path className="dsh-learn-bud-heart" d="M28 9H32V11H34V9H38V14H35V17H31V14H28Z" />
              </g>
              <g className="dsh-learn-plant-bloom">
                <path className="dsh-learn-petal dsh-learn-petal-top" d="M30 1H34V3H35V5H36V9H35V11H34V14H30V11H29V9H28V5H29V3H30V1Z" />
                <path className="dsh-learn-petal dsh-learn-petal-bottom" d="M30 18H34V21H35V23H36V27H35V29H34V31H30V29H29V27H28V23H29V21H30V18Z" />
                <path className="dsh-learn-petal dsh-learn-petal-left" d="M27 12H24V11H22V10H18V11H16V12H14V20H16V21H18V22H22V21H24V20H27V12Z" />
                <path className="dsh-learn-petal dsh-learn-petal-right" d="M37 12H40V11H42V10H46V11H48V12H50V20H48V21H46V22H42V21H40V20H37V12Z" />
                <rect className="dsh-learn-petal-shine" x="30" y="3" width="2" height="3" />
                <rect className="dsh-learn-petal-shine" x="17" y="13" width="3" height="2" />
                <path className="dsh-learn-plant-bloom-center" d="M29 11H35V13H37V19H35V21H29V19H27V13H29V11Z" />
                <rect className="dsh-learn-bloom-shine" x="30" y="13" width="3" height="3" />
              </g>
              <g className="dsh-learn-pot">
                <rect className="dsh-learn-pot-soil" x="11" y="43" width="42" height="7" />
                <path className="dsh-learn-pot-body" d="M14 49H50V58H47V65H17V58H14Z" />
                <path className="dsh-learn-pot-rim" d="M8 42H56V51H53V54H11V51H8Z" />
                <rect className="dsh-learn-pot-highlight" x="13" y="45" width="9" height="3" />
                <rect className="dsh-learn-pot-face" x="23" y="56" width="4" height="4" />
                <rect className="dsh-learn-pot-face" x="37" y="56" width="4" height="4" />
                <path className="dsh-learn-pot-smile" d="M28 60H31V62H34V60H37V63H34V65H31V63H28Z" />
                <rect className="dsh-learn-pot-blush" x="18" y="60" width="4" height="3" />
                <rect className="dsh-learn-pot-blush" x="42" y="60" width="4" height="3" />
              </g>
              <g className="dsh-learn-evolution-sparkles">
                <path className="dsh-learn-sparkle dsh-learn-sparkle-a" d="M8 8H12V12H16V16H12V20H8V16H4V12H8Z" />
                <path className="dsh-learn-sparkle dsh-learn-sparkle-b" d="M52 3H55V7H59V10H55V14H52V10H48V7H52Z" />
                <path className="dsh-learn-sparkle dsh-learn-sparkle-c" d="M51 27H54V30H57V33H54V36H51V33H48V30H51Z" />
              </g>
            </svg>
          </div>
        </div>
        {expanded && (
          <div className="dsh-learn-details" role="status" aria-live="polite">
            <div className="dsh-learn-title">{title}</div>
            <div className="dsh-learn-meta">{meta}</div>
            <div className="dsh-learn-stats">
              <span>LV.{displayLevel}</span>
              <span>{plantDebug !== null ? `${displayProgress}%` : `${snapshot.xp} XP`}</span>
              <span>🔥 {snapshot.streak}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function initialPosition(): Position {
  const fallback = defaultPosition()
  try {
    const raw = window.localStorage.getItem(POSITION_KEY)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw) as Partial<Position>
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return fallback
    return clampPosition({ x: parsed.x as number, y: parsed.y as number })
  } catch {
    return fallback
  }
}

function defaultPosition(): Position {
  return clampPosition({
    x: window.innerWidth - DETAIL_WIDTH - 28,
    y: Math.round(window.innerHeight * 0.58),
  })
}

function clampPosition(position: Position): Position {
  const width = Math.min(DETAIL_WIDTH, Math.max(0, window.innerWidth - VIEWPORT_MARGIN * 2))
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN)
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - EXPANDED_HEIGHT - VIEWPORT_MARGIN)
  return {
    x: Math.min(maxX, Math.max(VIEWPORT_MARGIN, Math.round(position.x))),
    y: Math.min(maxY, Math.max(VIEWPORT_MARGIN, Math.round(position.y))),
  }
}

function savePosition(position: Position): void {
  try {
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(position))
  } catch {
    // Position persistence is optional; the learning state never lives here.
  }
}
