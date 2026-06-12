import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const modulesRoot = path.resolve(repoRoot, '..', 'ECHO-Modules')
const script = path.join(modulesRoot, 'scripts', 'generate-arcana-division-editions.mjs')
const result = spawnSync(process.execPath, [script, '--edition', 'arcana-division-neoforge-edition'], {
  cwd: modulesRoot,
  stdio: 'inherit',
  shell: false,
})
process.exitCode = result.status ?? 1
