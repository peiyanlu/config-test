import { ConventionalChangelog, type Options, type Preset } from 'conventional-changelog'
import createPreset, { DEFAULT_COMMIT_TYPES } from 'conventional-changelog-conventionalcommits'
import { createWriteStream, existsSync, readFileSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { EOL } from 'node:os'
import { join } from 'node:path'
import { finished } from 'node:stream/promises'


interface GenerateOptions {
  /** @example () => `packages/${pkg}` */
  getPkgDir: () => string;
  /** @example `${pkg}@` */
  tagPrefix?: string;
  /** @see {@link Options} releaseCount */
  releaseCount?: number;
}


export const createGenerator = async ({ getPkgDir, tagPrefix, releaseCount = 1 }: GenerateOptions) => {
  const pkgDir = getPkgDir()
  
  const preset: Preset = await createPreset({
    types: DEFAULT_COMMIT_TYPES.map((t: {}) => ({ ...t, hidden: false })),
  })
  
  return new ConventionalChangelog()
    .readPackage(`${ pkgDir }/package.json`)
    .config(preset)
    .options({ releaseCount })
    .commits({ path: pkgDir })
    .tags({ prefix: tagPrefix })
}


export const generateChangelog = async ({ getPkgDir, tagPrefix, releaseCount = 1 }: GenerateOptions) => {
  const pkgDir = getPkgDir()
  const infile = join(pkgDir, 'CHANGELOG.md')
  
  if (!existsSync(infile)) await writeFile(infile, '')
  const exist = readFileSync(infile, 'utf-8')
  const writeStream = createWriteStream(infile)
  
  const generator = await createGenerator({ getPkgDir, tagPrefix, releaseCount })
  for await (const chunk of generator.write()) {
    writeStream.write(chunk)
  }
  
  const override = 0 === releaseCount
  const firstWrite = 0 === exist.trim().length || override
  
  writeStream.write(firstWrite ? '' : EOL)
  
  if (!firstWrite) writeStream.write(exist)
  
  writeStream.end()
  
  await finished(writeStream)
}


await generateChangelog({
  getPkgDir: () => '.',
})

//git commit -qm "feat: second" --allow-empty
