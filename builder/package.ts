import { copyFile, mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { inspectWatchFace } from '../parser/index.ts'
import type { CompilerTarget } from '../core/index.ts'
import { buildProject, type BuildResult } from './build.ts'
import { packGmfDirectory } from './native.ts'

export interface PackageOptions {
  target?: CompilerTarget
  compilerPath?: string
  javaToolPath?: string
}

export interface PackageResult extends BuildResult {
  facePath: string
  binPath: string
  bytes: number
  target: CompilerTarget
}

function run(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', shell: false })
    child.once('error', reject)
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code ?? 'unknown'}`)))
  })
}

async function packageWithMiCreate(build: BuildResult, outputPath: string, compilerPath: string): Promise<void> {
  const outputDirectory = path.dirname(outputPath)
  const fileName = path.basename(outputPath)
  const fprjDirectory = path.dirname(build.fprjPath)
  if (process.platform === 'win32') {
    await run(compilerPath, ['-b', build.fprjPath, outputDirectory, fileName, '1461256429'], fprjDirectory)
    return
  }
  const runner = process.env.BAND10_WINE ?? 'wine'
  const winePath = (value: string) => `Z:${path.resolve(value).replaceAll('/', '\\')}`
  await run(runner, [compilerPath, '-b', winePath(build.fprjPath), winePath(outputDirectory), fileName, '1461256429'], fprjDirectory)
}

async function packageWithJavaTool(build: BuildResult, outputPath: string, toolPath: string): Promise<void> {
  if (toolPath.endsWith('.jar')) {
    await run('java', ['-jar', toolPath, 'pack', path.join(build.buildDirectory, 'gmf'), outputPath, 'o66'], build.buildDirectory)
    return
  }
  if (!toolPath.endsWith('.java')) throw new Error('The Java adapter expects a .java source file or executable .jar')
  const classes = path.join(build.buildDirectory, 'java-tool')
  await mkdir(classes, { recursive: true })
  await run('javac', ['-d', classes, toolPath], build.buildDirectory)
  await run('java', ['-cp', classes, 'Mi8WfBinTool', 'pack', path.join(build.buildDirectory, 'gmf'), outputPath, 'o66'], build.buildDirectory)
}

export async function packageProject(directory: string, options: PackageOptions = {}): Promise<PackageResult> {
  const build = await buildProject(directory)
  const target = options.target ?? build.project.manifest.compiler.target
  const outputDirectory = path.join(build.project.directory, 'dist')
  await mkdir(outputDirectory, { recursive: true })
  const facePath = path.join(outputDirectory, `${build.project.manifest.output}.face`)
  const binPath = path.join(outputDirectory, `${build.project.manifest.output}.bin`)

  if (target === 'native') {
    await packGmfDirectory(path.join(build.buildDirectory, 'gmf'), facePath, build.project.manifest.compiler.imageCompression)
  } else if (target === 'mi-create') {
    const compilerPath = options.compilerPath ?? process.env.BAND10_COMPILER
    if (!compilerPath) throw new Error('Set BAND10_COMPILER or pass --compiler with the user-supplied Mi Create/EasyFace compile.exe')
    await packageWithMiCreate(build, facePath, path.resolve(compilerPath))
  } else {
    const toolPath = options.javaToolPath ?? process.env.BAND10_MI8_TOOL
    if (!toolPath) throw new Error('Set BAND10_MI8_TOOL or pass --java-tool with Mi8WfBinTool.java/.jar (not redistributed because the repository has no license)')
    await packageWithJavaTool(build, facePath, path.resolve(toolPath))
  }

  const binary = new Uint8Array(await import('node:fs/promises').then(({ readFile }) => readFile(facePath)))
  const inspection = inspectWatchFace(binary)
  if (inspection.header.id !== build.project.manifest.id) throw new Error(`Packaged ID ${inspection.header.id} does not match manifest ID ${build.project.manifest.id}`)
  await copyFile(facePath, binPath)
  const bytes = (await stat(facePath)).size
  return { ...build, facePath, binPath, bytes, target }
}