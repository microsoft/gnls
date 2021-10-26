import * as gn from './gn'
import * as fs from 'fs/promises'
import * as testData from './gn.test.data'
import * as ls from 'vscode-languageserver/node'

const root = './addon/gn/examples/simple_build'

function testAnalyzeResultItem(res: gn.Context, data: testData.TestAnalyzeResultType) {
  expect(res.root).toEqual(root.replace('./', ''))

  expect(res.token.type).toEqual(data.token.type)
  expect(res.token.value).toEqual(data.token.value)

  const compareLocation = (location: gn.Location, it: string) => {
    expect(`${location.line}:${location.column}`).toEqual(it)
  }
  compareLocation(res.token.range.begin, data.token.range.begin)
  compareLocation(res.token.range.end, data.token.range.end)

  expect(res.function).toEqual(data.function)
  expect(res.variable).toEqual(data.variable)
}

function testGNAnalyze(rootPath: string, data: testData.TestAnalyzeResultType[]) {
  data.forEach((data) => {
    const args = (s: string) => [rootPath, ...s.split(':').map((it) => parseInt(it, 10))]
    const res: gn.Context = gn.analyze.apply(null, args(data.location))
    testAnalyzeResultItem(res, data)
  })
}

function matchDocumentSymbol(symbol: ls.DocumentSymbol, data: testData.TestDocumentSymbol) {
  expect(symbol.name).toEqual(data.name)
  expect(symbol.kind).toEqual(data.kind)
  expect(symbol.children?.length || 0).toEqual(data.children?.length || 0)
  if (data.children) {
    data.children.forEach((it, i) => {
      matchDocumentSymbol(symbol.children[i], it)
    })
  }
}

it('simple_build/BUILD.gn', async () => {
  const rootPath = `${root}/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  const sharedLibrary = gn.help('all', 'shared_library')
  expect(sharedLibrary.link).toEqual('https://gn.googlesource.com/gn/+/main/docs/reference.md#func_shared_library')
  expect(sharedLibrary.basic).toEqual('shared_library: Declare a shared library target.')
  expect(sharedLibrary.full).toContain('shared_library: Declare a shared library target.')

  testGNAnalyze(rootPath, testData.rootGNAnalyzeResult)

  gn.close(rootPath)
})

it('simple_build/build/toolchain/BUILD.gn', async () => {
  const rootPath = `${root}/build/toolchain/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  testGNAnalyze(rootPath, testData.toolchainGNAnalyzeResult)

  gn.close(rootPath)
})

it('simple_build/build/BUILD.gn', async () => {
  const rootPath = `${root}/build/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  const scope = gn.parse(rootPath, rootContent)
  expect(scope.symbols.length).toEqual(testData.rootGNBuildDocumentSymbolResult.length)
  testData.rootGNBuildDocumentSymbolResult.forEach((it, i) => {
    matchDocumentSymbol(scope.symbols[i], it)
  })
})
