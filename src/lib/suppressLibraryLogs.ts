/**
 * Suppresses known noisy console messages from third-party libraries.
 *
 * - THREE.Clock deprecation warning: emitted by @react-three/fiber (uses THREE.Clock
 *   internally), deprecated in three.js r183. Will be resolved when r3f upgrades.
 * - GPOS/GSUB unsupported table debug messages: emitted by troika-three-text's typr
 *   font parser (console.debug) when encountering unsupported font table lookup types.
 */

type ConsoleFn = (...args: unknown[]) => void

function suppressPatterns(original: ConsoleFn, patterns: string[]): ConsoleFn {
  return (...args: unknown[]) => {
    const msg = args[0]
    if (typeof msg === 'string' && patterns.some((p) => msg.includes(p))) return
    original(...args)
  }
}

console.warn = suppressPatterns(console.warn.bind(console), [
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
])

console.debug = suppressPatterns(console.debug.bind(console), [
  'unsupported GPOS table',
  'unsupported GSUB table',
])
