/**
 * dsh-learn plugin entry.
 *
 * Registers the model-facing learn_* tools on `ctx.tools` and wires them to a
 * per-domain JSON learning store. The tools implement one closed learning loop:
 * deconstruct a domain into a Pareto skill tree, source the best resources,
 * practice by spaced repetition, and log graded feedback that reschedules and
 * re-weights the tree.
 *
 * This is a function plugin: it named-exports `name` / `inject` / `Config` /
 * `apply` and has no default export, so the Loader keeps its injection metadata.
 *
 * @module dsh-learn
 */

import z from '@deepseek-ai/schemastery'
import { LearnStore, resolveStoreDir } from './store.js'
import { buildTools } from './tools.js'

export const name = 'dsh-learn'

/** The tool registry is the one required service. */
export const inject = ['tools']

/**
 * Deployment configuration for the learning loop.
 * @typedef {object} Config
 * @property {string} storeDir - directory for per-domain JSON state; empty resolves a default under DSH_HOME.
 * @property {number} newSkillsPerDay - default number of skills a practice session introduces.
 * @property {number} dailyReviewLimit - hard cap on skills returned per practice call.
 */
export const Config = z.object({
  storeDir: z.string().default(''),
  newSkillsPerDay: z.natural().default(3),
  dailyReviewLimit: z.natural().default(20),
})

/**
 * Register the learn_* tools bound to a store rooted at the configured directory.
 * @param {import('@deepseek-ai/cordis').Context} ctx - the registrant context carrying `ctx.tools`.
 * @param {Config} config - the resolved plugin configuration.
 * @returns {void}
 */
export function apply(ctx, config) {
  const store = new LearnStore(resolveStoreDir(config.storeDir))
  const pacing = { newSkillsPerDay: config.newSkillsPerDay, dailyReviewLimit: config.dailyReviewLimit }
  for (const tool of buildTools(store, pacing)) {
    ctx.tools.register(tool)
  }
}
