import * as child_process from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

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
  dir = canonicalize(dir)
  const entries = fs.readdirSync(dir)
  return entries.filter((entry) => entry.match(regex)).map((entry) => path.join(dir, entry))
}

function pipe(cmd: string, ...args: string[]): string {
  cmd = canonicalize(cmd)
  const result = child_process.spawnSync(cmd, args, {stdio: 'pipe'})
  return result.stdout.toString()
}

function chdir(dir: string) {
  dir = canonicalize(dir)
  process.chdir(path.join(__dirname, '..', dir))
}

function exec(cmd: string, ...args: string[]) {
  cmd = canonicalize(cmd)
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

function bundle(debug: boolean) {
  const environment = debug ? 'development' : 'production'
  chdir('.')
  exec(
    npx('rollup'),
    '--config',
    '--configPlugin=typescript={module:"esnext"}',
    `--environment=NODE_ENV:${environment}`
  )
}

function addon(debug: boolean, arch: string) {
  const cflags = <string[]>[]
  switch (os.platform()) {
    case 'linux':
      // TODO: not implemented
      break
    case 'darwin':
      switch (arch) {
        case 'x64':
          cflags.push('-arch', 'x86_64')
          break
        case 'arm64':
          cflags.push('-arch', 'arm64')
          break
      }
      break
    case 'win32':
      // TODO: not implemented
      break
  }
  process.env.CFLAGS = cflags.join(' ')
  chdir('addon/gn')
  // TODO(#8): gn static libs are always built with release config for now
  exec('python', 'build/gen.py', '--out-path', canonicalize(`out/${arch}`))
  exec('ninja', '-C', canonicalize(`out/${arch}`), lib('base'), lib('gn_lib'))
  delete process.env.CFLAGS
  chdir('addon')
  exec(npx('node-gyp'), 'rebuild', debug ? '--debug' : '--release', '--arch', arch)
  copy(`build/${debug ? 'Debug' : 'Release'}/addon.node`, `../build/${os.platform()}-${arch}.node`)
}

function compdb() {
  const file = 'compile_commands.json'
  chdir('addon')
  exec(npx('node-gyp'), 'configure', '--', '--format=compile_commands_json')
  copy(`Debug/${file}`, file)
  remove('Debug')
  remove('Release')
  const data = JSON.parse(fs.readFileSync(file, {encoding: 'utf8'})) as {[key: string]: string}[]
  const fixes = [] as [RegExp, string][]
  switch (os.platform()) {
    case 'darwin':
      fixes.push([/^cc/, pipe('xcrun', '--find', 'cc').trim()])
      fixes.push([/^c\+\+/, pipe('xcrun', '--find', 'c++').trim()])
      fixes.push([/"-arch .*?"/, ''])
      break
  }
  data.forEach((entry) => {
    fixes.forEach((fix) => {
      entry.command = entry.command.replace(...fix)
    })
  })
  fs.writeFileSync(file, JSON.stringify(data))
}

function run(target: string) {
  switch (target) {
    case 'prepare':
      chdir('addon')
      ensure('deps.json')
      chdir('script')
      exec(npx('ts-node'), 'syntax.ts', '../build')
      compdb()
      break
    case 'build':
      bundle(false)
      if (os.platform() == 'darwin') {
        addon(false, 'x64')
        addon(false, 'arm64')
      } else {
        console.warn('Addon cross compiling is only implemented on macOS 11 for now.')
        addon(false, os.arch())
      }
      break
    case 'debug':
      bundle(true)
      if (os.platform() != 'win32') {
        addon(true, os.arch())
      } else {
        console.warn('Addon debug build is not working on Windows yet. Fallback to release build.')
        addon(false, os.arch())
      }
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
    default:
      break
  }
}

run(process.argv[2])
