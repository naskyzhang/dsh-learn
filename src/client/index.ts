/** Browser half: mount the passive learning companion into DSH's sidebar. */

import { LearnCompanion, type LearnCompanionInjected } from './LearnCompanion.tsx'
import { LearnCompanionController } from './controller.ts'
import type { ClientContext } from './runtime-types.ts'
import { companionStyles } from './styles.ts'

export const inject = ['slots', 'connection']

/**
 * Register the companion only while the sidebar's additive footer slot exists.
 * @param ctx - DSH browser context carrying slots and Connection.
 */
export function apply(ctx: ClientContext): void {
  const controller = new LearnCompanionController(ctx.connection)
  ctx.effect(() => controller.start(), 'dsh-learn: companion state bridge')
  ctx.effect(insertStyles, 'dsh-learn: companion styles')
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'dsh-learn-companion',
    inject: (): LearnCompanionInjected => ({
      hooks: { companion: controller },
    }),
  }, LearnCompanion))
}

function insertStyles(): () => void {
  const selector = 'style[data-plugin-css="dsh-learn/companion"]'
  const existing = document.querySelector(selector)
  if (existing !== null) return () => {}
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-learn'
  style.dataset.pluginCss = 'dsh-learn/companion'
  style.textContent = companionStyles
  document.head.appendChild(style)
  return () => { style.remove() }
}
