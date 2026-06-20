import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function sha256(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex')
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'))
}

const template = await readJson(path.join(repoRoot, 'release-manifest.template.json'))
const releaseDir = path.join(repoRoot, 'release-assets', template.releaseTag)
const expected = {
  packId: template.id ?? template.pack,
  version: template.version,
  channel: template.channel,
  target: template.target,
  moduleRequirements: (template.moduleRequirements ?? []).length,
}

const manifestPath = path.join(releaseDir, template.manifestAsset)
const releasePath = path.join(releaseDir, 'echo-release.json')
const releaseAuditPath = path.join(releaseDir, 'release-audit.json')
const checksumsPath = path.join(releaseDir, 'checksums.txt')
const manifest = await readJson(manifestPath)
const release = await readJson(releasePath)
const releaseAudit = await readJson(releaseAuditPath)

const errors = []
if (manifest.pack !== expected.packId) errors.push('pack id mismatch')
if (manifest.version !== expected.version) errors.push('manifest version mismatch')
if (manifest.channel !== expected.channel) errors.push('manifest channel mismatch')
if (manifest.target !== expected.target) errors.push('manifest target mismatch')
if ((manifest.moduleRequirements ?? []).length !== expected.moduleRequirements) errors.push(`moduleRequirements must contain ${expected.moduleRequirements} entries`)
if (!manifest.files?.some((file) => file.moduleId === 'echoarcanadivisionprotocol')) errors.push('pack root protocol artifact is missing from files')
if (manifest.loader?.installer?.sha256 === 'f'.repeat(64)) errors.push('NeoForge installer SHA-256 is still a placeholder')
if ((release.pack ?? release.id) !== expected.packId) errors.push('release id mismatch')
if (releaseAudit.releaseTag !== template.releaseTag) errors.push('release tag mismatch')
if (manifest.artifactName) {
  const artifactPath = path.join(releaseDir, manifest.artifactName)
  const artifactSha256 = await sha256(artifactPath)
  const artifactStat = await fs.stat(artifactPath)
  if (manifest.artifactSha256 !== artifactSha256) errors.push('manifest artifactSha256 does not match the pack archive')
  if (manifest.artifactSize !== artifactStat.size) errors.push('manifest artifactSize does not match the pack archive')
}

const checksumRows = (await fs.readFile(checksumsPath, 'utf8')).trim().split(/\r?\n/).filter(Boolean)
for (const row of checksumRows) {
  const [hash, file] = row.split(/\s+/)
  const actual = await sha256(path.join(releaseDir, file))
  if (hash !== actual) errors.push(`checksum mismatch for ${file}`)
}

if (errors.length) {
  console.error('Arcana Division NeoForge Edition validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log('Arcana Division NeoForge Edition validation passed.')
