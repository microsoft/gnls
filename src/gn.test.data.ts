import * as ls from 'vscode-languageserver/node'

export type TestAnalyzeResultType = {
  location: string
  root: string
  token: {
    type: string
    value: string
    range: {
      begin: string
      end: string
    }
  }
  function: {
    name: string
    arguments: string[]
  }
  variable: string
}

//#region RootGN data
export const rootGNAnalyzeResult: TestAnalyzeResultType[] = [
  {
    // ':hello_static' in executable('hello')
    location: '10:10',
    root: 'addon/gn/examples/simple_build',
    token: {type: 'literal', value: '":hello_static"', range: {begin: '10:5', end: '10:20'}},
    function: {name: 'executable', arguments: ['"hello"']},
    variable: 'deps',
  },
  {
    // 'HELLO_SHARED_IMPLEMENTATION' in shared_library('hello_shared')
    location: '20:33',
    root: 'addon/gn/examples/simple_build',
    token: {
      type: 'literal',
      value: '"HELLO_SHARED_IMPLEMENTATION"',
      range: {begin: '20:15', end: '20:44'},
    },
    function: {name: 'shared_library', arguments: ['"hello_shared"']},
    variable: 'defines',
  },
  {
    // 'hello_static.cc' in static_library('hello_static')
    location: '25:13',
    root: 'addon/gn/examples/simple_build',
    token: {
      type: 'literal',
      value: '"hello_static.cc"',
      range: {begin: '25:5', end: '25:22'},
    },
    function: {name: 'static_library', arguments: ['"hello_static"']},
    variable: 'sources',
  },
]

export const rootGNDocumentSymbolResult: ls.DocumentSymbol[] = [
  ls.DocumentSymbol.create(
    'config("compiler_defaults")',
    undefined,
    ls.SymbolKind.Function,
    ls.Range.create(5, 0, 12, 1),
    ls.Range.create(5, 0, 5, 28),
    [
      ls.DocumentSymbol.create(
        'current_os == "linux"',
        undefined,
        ls.SymbolKind.Boolean,
        ls.Range.create(6, 3, 11, 3),
        ls.Range.create(6, 3, 6, 29),
        [
          ls.DocumentSymbol.create(
            'cflags',
            undefined,
            ls.SymbolKind.Variable,
            ls.Range.create(7, 5, 10, 5),
            ls.Range.create(7, 5, 7, 11)
          ),
        ]
      ),
    ]
  ),
  ls.DocumentSymbol.create(
    'config("executable_ldconfig")',
    undefined,
    ls.SymbolKind.Function,
    ls.Range.create(14, 0, 21, 1),
    ls.Range.create(14, 0, 14, 30),
    [
      ls.DocumentSymbol.create(
        '!is_mac',
        undefined,
        ls.SymbolKind.Boolean,
        ls.Range.create(15, 3, 20, 3),
        ls.Range.create(15, 3, 15, 15),
        [
          ls.DocumentSymbol.create(
            'ldflags',
            undefined,
            ls.SymbolKind.Variable,
            ls.Range.create(16, 5, 19, 5),
            ls.Range.create(16, 5, 16, 12)
          ),
        ]
      ),
    ]
  ),
]
//#endregion

//#region ToolchainGN data
export const toolchainGNAnalyzeResult: TestAnalyzeResultType[] = [
  {
    location: '42:32',
    root: 'addon/gn/examples/simple_build',
    token: {
      type: 'literal',
      value: '"-Wl,-soname=$soname"',
      range: {begin: '42:28', end: '42:49'},
    },
    function: {name: 'tool', arguments: ['"solink"']},
    variable: 'os_specific_option',
  },
]
//#endregion
