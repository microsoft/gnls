import * as gn from './gn'
import * as fs from 'fs/promises'
import * as testData from './gn.test.data'

const root = './addon/gn/examples/simple_build'

function testAnalyzeResultItem(res: gn.Context | null, data: testData.TestAnalyzeResultType) {
  expect(res?.root).toEqual(root.replace('./', ''))

  expect(res?.token?.type).toEqual(data.token.type)
  expect(res?.token?.value).toEqual(data.token.value)

  const locationString = (location?: gn.Location) =>
    `${location?.line.toString() ?? ''}:${location?.column.toString() ?? ''}`
  expect(locationString(res?.token?.range.begin)).toEqual(data.token.range.begin)
  expect(locationString(res?.token?.range.end)).toEqual(data.token.range.end)

  expect(res?.function).toEqual(data.function)
  expect(res?.variable).toEqual(data.variable)
}

function testGNAnalyze(rootPath: string, data: testData.TestAnalyzeResultType[]) {
  data.forEach((data) => {
    const args = (s: string) => [rootPath, ...s.split(':').map((it) => parseInt(it, 10))] as [string, number, number]
    const res = gn.analyze.apply(null, args(data.location))
    testAnalyzeResultItem(res, data)
  })
}

function matchDocumentSymbol(symbol: gn.GNDocumentSymbol | undefined, data: testData.TestDocumentSymbol) {
  const assertRange = (range?: gn.Range) => {
    expect(range?.begin.line).toBeGreaterThan(0)
    expect(range?.begin.column).toBeGreaterThan(0)
    expect(range?.end.line).toBeGreaterThan(0)
    expect(range?.end.column).toBeGreaterThan(0)
  }
  expect(symbol?.name).toEqual(data.name)
  expect(symbol?.kind).toEqual(data.kind)
  expect(symbol?.children?.length ?? 0).toEqual(data.children?.length ?? 0)
  assertRange(symbol?.range)
  assertRange(symbol?.selectionRange)
  if (data.children) {
    data.children.forEach((it, i) => {
      matchDocumentSymbol(symbol?.children?.[i], it)
    })
  }
}

it('simple_build/BUILD.gn', async () => {
  const rootPath = `${root}/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  const sharedLibrary = gn.help('all', 'shared_library')
  expect(sharedLibrary?.link).toEqual('https://gn.googlesource.com/gn/+/main/docs/reference.md#func_shared_library')
  expect(sharedLibrary?.basic).toEqual('shared_library: Declare a shared library target.')
  expect(sharedLibrary?.full).toContain('shared_library: Declare a shared library target.')

  testGNAnalyze(rootPath, testData.rootGNAnalyzeResult)

  gn.close(rootPath)
})

it('simple_build/build/toolchain/BUILD.gn', async () => {
  const rootPath = `${root}/build/toolchain/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  testGNAnalyze(rootPath, testData.toolchainGNAnalyzeResult)
  let currentSymbols = gn.parse(rootPath, rootContent)?.symbols
  let testSymbol = testData.toolchainGNPartialDocumentSymbolResult as gn.GNDocumentSymbol | undefined
  while (testSymbol) {
    const symbol = currentSymbols?.find((it) => it.name === testSymbol?.name)
    expect(symbol).toBeTruthy()
    expect(symbol?.kind).toEqual(testSymbol.kind)
    currentSymbols = symbol?.children
    testSymbol = testSymbol.children?.[0]
  }

  gn.close(rootPath)
})

it('simple_build/build/BUILD.gn', async () => {
  const rootPath = `${root}/build/BUILD.gn`
  const rootContent = await fs.readFile(rootPath, 'utf-8')
  gn.update(rootPath, rootContent)

  const scope = gn.parse(rootPath, rootContent)
  expect(scope?.symbols.length).toEqual(testData.rootGNBuildDocumentSymbolResult.length)
  testData.rootGNBuildDocumentSymbolResult.forEach((it, i) => {
    matchDocumentSymbol(scope?.symbols[i], it)
  })
  gn.close(rootPath)
})
