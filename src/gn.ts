import * as os from 'os'
import * as ls from 'vscode-languageserver/node'

export type TokenType = 'identifier' | 'literal' | ''
export type HelpType = 'all' | 'function' | 'variable'

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
  token: {type: TokenType; value: string; range: Range}
  function: {name: string; arguments: string[]}
  variable: string
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

const addon = require(`../build/${os.platform()}-${os.arch()}.node`) // eslint-disable-line @typescript-eslint/no-var-requires
export const update = addon.update as (file: string, content: string) => void
export const close = addon.close as (file: string) => void
export const validate = addon.validate as (file: string) => Error
export const analyze = addon.analyze as (file: string, line: number, column: number) => Context
export const parse = addon.parse as (file: string, content?: string) => Scope
export const format = addon.format as (file: string, content?: string) => string
export const help = addon.help as (type: HelpType, name: string) => Help
export const execute = addon.execute as (folder: string, outDir: string) => boolean
