import * as child_process from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'

function canonicalize(file: string): string {
  return path.join(...file.split(path.posix.sep))
}

function npx(name: string): string {
  return `${name}${os.platform() == 'win32' ? '.cmd' : ''}`
}

function lib(name: string): string {
  return `${name}.${os.platform() == 'win32' ? 'lib' : 'a'}`
}

function list(dir: string, regex: RegExp): string[] {
  const entries = fs.readdirSync(dir)
  return entries.filter((entry) => entry.match(regex)).map((entry) => path.join(dir, entry))
}

function pipe(cmd: string, ...args: string[]): string {
  const result = child_process.spawnSync(cmd, args, {stdio: 'pipe'})
  return result.stdout.toString()
}

function chdir(dir: string) {
  process.chdir(path.join(__dirname, '..', ...dir.split(path.posix.sep)))
}

function exec(cmd: string, ...args: string[]) {
  const result = child_process.spawnSync(cmd, args, {stdio: 'inherit'})
  if (result.status !== 0) {
    console.error('Failed to execute:', cmd, ...args, `(${result.error?.message})`)
    process.exit(-1)
  }
}

function copy(src: string, dst: string) {
  fs.copyFileSync(canonicalize(src), canonicalize(dst))
}

function remove(file: string) {
  fs.rmSync(canonicalize(file), {recursive: true, force: true})
}

function ensure(deps: string) {
  const data = JSON.parse(fs.readFileSync(canonicalize(deps), {encoding: 'utf8'})) as {
    name: string
    repo: string
    commit: string
    patches: string[]
  }[]
  data.forEach((entry) => {
    const dir = canonicalize(entry.name)
    const git = (...args: string[]) => exec('git', '-C', dir, ...args)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir)
      git('init')
      git('remote', 'add', 'origin', entry.repo)
    }
    git('fetch', '--prune')
    git('checkout', '--force', entry.commit)
    git('reset', '--hard')
    entry.patches.forEach((patch) => {
      git('apply', path.resolve(canonicalize(patch)))
    })
  })
}

function compdb(file: string) {
  file = canonicalize(file)
  const data = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: string}[]
  const fixes = [] as [RegExp, string][]
  switch (os.platform()) {
    case 'darwin':
      fixes.push([/^cc/, pipe('xcrun', '--find', 'cc').trim()])
      fixes.push([/^c\+\+/, pipe('xcrun', '--find', 'c++').trim()])
      break
  }
  data.forEach((entry) => {
    fixes.forEach((fix) => {
      entry.command = entry.command.replace(...fix)
    })
  })
  fs.writeFileSync(file, JSON.stringify(data))
}

function build(target: string) {
  switch (target) {
    case 'dep':
      chdir('addon')
      ensure('deps.json')
      chdir('addon/gn/build')
      exec('python', 'gen.py')
      chdir('addon/gn/out')
      exec('ninja', lib('base'), lib('gn_lib'))
      break
    case 'syntax':
      chdir('script')
      exec(npx('ts-node'), 'syntax.ts', '../build')
      break
    case 'main':
      chdir('.')
      exec(npx('rollup'), '--config', '--environment', 'NODE_ENV:production')
      break
    case 'main2':
      chdir('.')
      exec(npx('rollup'), '--config', '--environment', 'NODE_ENV:development')
      break
    case 'addon':
      chdir('addon')
      exec(npx('node-gyp'), 'rebuild')
      copy('build/Release/addon.node', `../build/${os.platform()}.node`)
      break
    case 'addon2':
      if (os.platform() != 'win32') {
        chdir('addon')
        exec(npx('node-gyp'), 'build', '--debug')
        copy('build/Debug/addon.node', `../build/${os.platform()}.node`)
      } else {
        console.warn('Debug build not working on Windows yet. Fallback to release build.')
        build('addon')
      }
      break
    case 'compdb':
      chdir('addon')
      exec(npx('node-gyp'), 'configure', '--', '--format=compile_commands_json')
      copy('Debug/compile_commands.json', 'compile_commands.json')
      compdb('compile_commands.json')
      remove('Debug')
      remove('Release')
      break
    case 'test':
      chdir('.')
      exec(npx('jest'))
      exec(npx('eslint'), '.')
      exec(npx('prettier'), '--check', '.')
      exec('clang-tidy', ...list('addon', /\.cc$/))
      exec('clang-format', '--dry-run', '-Werror', ...list('addon', /\.cc$/))
      break
    case 'format':
      exec(npx('prettier'), '--write', '.')
      exec('clang-format', '-i', ...list('addon', /\.cc$/))
      break
    case 'package':
      chdir('.')
      exec(npx('vsce'), 'package', '--out', 'gnls.vsix')
      break
    case 'prepare':
      build('dep')
      build('syntax')
      build('compdb')
      break
    case 'build':
      build('main')
      build('addon')
      break
    case 'debug':
      build('main2')
      build('addon2')
      break
    default:
      break
  }
}

build(process.argv[2])
