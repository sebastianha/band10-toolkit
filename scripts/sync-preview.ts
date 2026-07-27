import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncPreviewProject } from '../builder/index.ts'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const project = process.argv[2] ?? path.join(repositoryRoot, 'examples', 'minimal-amoled')
const output = await syncPreviewProject(project)
console.log(`Synced preview files to ${output}`)