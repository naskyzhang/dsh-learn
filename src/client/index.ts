/** Browser half: mount the draggable learning companion into DSH's shell overlay. */

import {
  LearnCompanion,
  type LearnCompanionInjected,
  type LearnCompanionNode,
} from './LearnCompanion.tsx'
import { LearnCompanionController } from './controller.ts'
import type { ClientContext } from './runtime-types.ts'
import { companionStyles } from './styles.ts'

export const inject = ['slots', 'connection', 'sessions', 'conversation']

/**
 * Register the companion only while the shell's additive overlay slot exists.
 * @param ctx - DSH browser context carrying slots and Connection.
 */
export function apply(ctx: ClientContext): void {
  const controller = new LearnCompanionController(ctx.connection)
  ctx.effect(() => controller.start(), 'dsh-learn: companion state bridge')
  ctx.effect(insertStyles, 'dsh-learn: companion styles')
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'dsh-learn-companion',
    inject: (): LearnCompanionInjected => ({
      hooks: { companion: controller },
      startReview: node => startReview(ctx, node),
    }),
  }, LearnCompanion))
}

async function startReview(ctx: ClientContext, node: LearnCompanionNode): Promise<void> {
  const sessionId = ctx.sessions.list.getSnapshot().current
  if (sessionId === undefined) throw new Error('请先打开一个会话，再开始复习。')
  const conversation = ctx.sessions.scope(sessionId)?.get('conversation')
  if (conversation === undefined) throw new Error('当前会话暂时无法接收复习请求。')
  const resources = node.resources.slice(0, 3)
    .map(resource => `- ${resource.title}: ${resource.url}`)
    .join('\n')
  const prompt = [
    `本请求由学习卡片点击触发。请直接开始复习技能章节「${node.title} / ${node.titleEn}」（nodeId: ${node.id}）。`,
    '请先给我一道针对该章节的主动回忆或应用题，不要先讲解答案。',
    '收到我的回答后，请立即给出纠正反馈，并使用 learn_log_attempt（source: "card"）记录本次掌握情况。',
    resources ? `该章节推荐资料：\n${resources}` : '',
  ].filter(Boolean).join('\n')
  await conversation.send(prompt)
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
