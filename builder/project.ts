import { readFile, realpath } from 'node:fs/promises'
import path from 'node:path'
import { layoutSchema, manifestSchema, type LoadedProject, type ValidationIssue } from '../core/index.ts'

export class ProjectLoadError extends Error {
  readonly issues: ValidationIssue[]

  constructor(message: string, issues: ValidationIssue[]) {
    super(message)
    this.name = 'ProjectLoadError'
    this.issues = issues
  }
}

async function readJson(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'))
  } catch (error) {
    throw new ProjectLoadError(`Cannot read ${path.basename(filePath)}`, [{
      severity: 'error',
      code: 'JSON_READ_FAILED',
      path: filePath,
      message: error instanceof Error ? error.message : String(error),
    }])
  }
}

export async function loadProject(directory: string): Promise<LoadedProject> {
  const absoluteDirectory = await realpath(path.resolve(directory)).catch(() => path.resolve(directory))
  const manifestPath = path.join(absoluteDirectory, 'manifest.json')
  const layoutPath = path.join(absoluteDirectory, 'layout.json')
  const [manifestInput, layoutInput] = await Promise.all([readJson(manifestPath), readJson(layoutPath)])
  const manifestResult = manifestSchema.safeParse(manifestInput)
  const layoutResult = layoutSchema.safeParse(layoutInput)
  const issues: ValidationIssue[] = []

  if (!manifestResult.success) {
    issues.push(...manifestResult.error.issues.map((issue) => ({
      severity: 'error' as const,
      code: 'MANIFEST_SCHEMA',
      path: `manifest.json#/${issue.path.join('/')}`,
      message: issue.message,
    })))
  }
  if (!layoutResult.success) {
    issues.push(...layoutResult.error.issues.map((issue) => ({
      severity: 'error' as const,
      code: 'LAYOUT_SCHEMA',
      path: `layout.json#/${issue.path.join('/')}`,
      message: issue.message,
    })))
  }
  if (!manifestResult.success || !layoutResult.success) {
    throw new ProjectLoadError('Project schema validation failed', issues)
  }

  return {
    directory: absoluteDirectory,
    manifest: manifestResult.data,
    layout: layoutResult.data,
  }
}

export function resolveProjectAsset(project: LoadedProject, reference: string): string {
  if (path.isAbsolute(reference)) throw new Error(`Asset paths must be relative: ${reference}`)
  const resolved = path.resolve(project.directory, reference)
  const root = `${path.resolve(project.directory)}${path.sep}`
  if (!resolved.startsWith(root)) throw new Error(`Asset escapes the project directory: ${reference}`)
  return resolved
}

export function resolveProjectOutput(project: LoadedProject, reference: string): string {
  if (path.isAbsolute(reference)) throw new Error(`Output paths must be relative: ${reference}`)
  const resolved = path.resolve(project.directory, reference)
  const root = `${path.resolve(project.directory)}${path.sep}`
  if (!resolved.startsWith(root)) throw new Error(`Output escapes the project directory: ${reference}`)
  return resolved
}