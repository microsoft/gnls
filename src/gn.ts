import * as os from 'os'
import * as ls from 'vscode-languageserver/node'

export type TokenType = 'identifier' | 'literal' | ''
export type HelpType = 'all' | 'function' | 'variable'

// TODO(banl): either reuse types from vscode-languageserver package as
// much as possible, or don't depend on vscode-languageserver at all.
export interface Location {
  file: string
  line: number
  column: number
}

export interface Range {
  begin: Location
  end: Location
}

export interface Error {
  location: Location
  ranges: Range[]
  message: string
  help: string
}

export interface Context {
  root: string
  token?: {type: TokenType; value: string; range: Range}
  function?: {name: string; arguments: string[]}
  variable?: string
}

export interface Scope {
  declares: {function: string; arguments: string[]; range: Range}[]
  symbols: GNDocumentSymbol[]
}

export interface Help {
  basic: string
  full: string
  link: string
}

export interface GNDocumentSymbol {
  kind: ls.SymbolKind
  name: string
  range: Range
  selectionRange: Range
  children?: GNDocumentSymbol[]
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const addon = require(`../build/${os.platform()}-${os.arch()}.node`) as Record<string, unknown>
export const update = addon.update as (file: string, content: string) => null
export const close = addon.close as (file: string) => null
export const validate = addon.validate as (file: string) => Error | null
export const analyze = addon.analyze as (file: string, line: number, column: number) => Context | null
export const parse = addon.parse as (file: string, content?: string) => Scope | null
export const format = addon.format as (file: string, content?: string) => string | null
export const help = addon.help as (type: HelpType, name: string) => Help | null
