import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'

/**
 * The date of the newest commit that touched `file`, read from git at build
 * time, or undefined when git has no history for it (an untracked file, a
 * checkout without history, no git at all).
 *
 * Starlight's own `lastUpdated` only looks inside the project's
 * `src/content/docs`, so it finds nothing for documents that live elsewhere
 * in the repository. This reads the file where it is. A shallow CI checkout
 * reports the date of its single commit, so the checkout needs the full
 * history for the date to mean anything.
 *
 * @param {string} root the Astro project root, as an absolute path
 * @param {string} file the entry's path, relative to `root`
 * @returns {Date | undefined}
 */
export function lastEdited(root, file) {
  const path = resolve(root, file)
  const result = spawnSync('git', ['log', '--max-count=1', '--format=%ct', '--', path], {
    cwd: dirname(path),
    encoding: 'utf-8'
  })
  const seconds = Number.parseInt(result.stdout?.trim() ?? '', 10)
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined
}
