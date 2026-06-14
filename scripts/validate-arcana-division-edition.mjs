import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(repoRoot, 'dist')
const expected = {
  packId: 'arcana-division-neoforge-edition',
  version: '1.0.0',
  channel: 'beta',
  target: 'neoforge',
  moduleRequirements: 39,
}

async function sha256(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

const manifestPath = path.join(dist, 'arcana-division-neoforge-edition-beta-1.0.0.pack.json')
const releasePath = path.join(dist, 'echo-release.json')
const checksumsPath = path.join(dist, 'checksums.txt')
const manifest = await readJson(manifestPath)
const release = await readJson(releasePath)

const errors = []
if (manifest.pack !== expected.packId) errors.push('pack id mismatch')
if (manifest.version !== expected.version) errors.push('manifest version mismatch')
if (manifest.channel !== expected.channel) errors.push('manifest channel mismatch')
if (manifest.target !== expected.target) errors.push('manifest target mismatch')
if ((manifest.moduleRequirements ?? []).length !== expected.moduleRequirements) errors.push(`moduleRequirements must contain ${expected.moduleRequirements} entries`)
if (!manifest.files?.some((file) => file.moduleId === 'echoarcanadivisionprotocol')) errors.push('pack root protocol artifact is missing from files')
if (manifest.loader?.installer?.sha256 === 'f'.repeat(64)) errors.push('NeoForge installer SHA-256 is still a placeholder')
if (release.id !== expected.packId) errors.push('release id mismatch')
if (release.releaseTag !== 'arcana-division-neoforge-1.0.0-beta') errors.push('release tag mismatch')

const checksumRows = (await fs.readFile(checksumsPath, 'utf8')).trim().split(/\r?\n/).filter(Boolean)
for (const row of checksumRows) {
  const [hash, file] = row.split(/\s+/)
  const actual = await sha256(path.join(dist, file))
  if (hash !== actual) errors.push(`checksum mismatch for ${file}`)
}

if (errors.length) {
  console.error('Arcana Division NeoForge Edition validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Arcana Division NeoForge Edition validation passed.')
