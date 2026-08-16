import type { UserConfig } from 'tsdown'

const id = 'dsh-learn'
const externals = [
  'react',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
] as const

/**
 * Standalone equivalent of DSH's client bundle envelope. The emitted CommonJS
 * factory is registered in Harness's browser module table rather than executed
 * as a normal script module.
 */
export default {
  name: `${id}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  dts: false,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [...externals],
    alwaysBundle: (moduleId: string) => externals.includes(moduleId as typeof externals[number])
      ? undefined
      : true,
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
} satisfies UserConfig
