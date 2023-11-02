import * as ls from 'vscode-languageserver/node'
import * as lstd from 'vscode-languageserver-textdocument'
import {URI} from 'vscode-uri'
import * as path from 'path'
import * as fs from 'fs'

import * as gn from './gn'
import * as data from './data'

const connection = ls.createConnection(ls.ProposedFeatures.all)
const documents = new ls.TextDocuments(lstd.TextDocument)
const files = new Map<string, Set<string>>()

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: ls.TextDocumentSyncKind.Incremental,
      completionProvider: {
        triggerCharacters: ['"', '/', ':'],
        resolveProvider: false,
      },
      hoverProvider: true,
      definitionProvider: true,
      documentFormattingProvider: true,
      documentSymbolProvider: true,
    },
  }
})

documents.onDidChangeContent(async (event) => {
  const uri = event.document.uri
  const file = URI.parse(uri).fsPath
  const uris = files.get(file) ?? new Set()
  uris.add(uri)
  files.set(file, uris)
  const content = event.document.getText()
  gn.update(file, content)
  await connection.sendDiagnostics({
    uri: uri,
    diagnostics: getDiagnostics(file),
  })
})

documents.onDidClose(async (event) => {
  const uri = event.document.uri
  const file = URI.parse(uri).fsPath
  const uris = files.get(file)
  if (uris) {
    uris.delete(uri)
    if (!uris.size) files.delete(file)
  }
  if (!files.has(file)) {
    gn.close(file)
    await connection.sendDiagnostics({
      uri: uri,
      diagnostics: [],
    })
  }
})

connection.onDocumentSymbol((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  return getDocumentSymbol(file)
})

connection.onCompletion((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  const line = params.position.line + 1
  const column = params.position.character + 1
  return getCompletions(file, line, column)
})

connection.onHover((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  const line = params.position.line + 1
  const column = params.position.character + 1
  return getHover(file, line, column)
})

connection.onDefinition((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  const line = params.position.line + 1
  const column = params.position.character + 1
  return getDefinition(file, line, column)
})

connection.onDocumentFormatting((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  const document = documents.get(uri)
  if (document) {
    const lines = document.lineCount
    return getFormatted(file, lines)
  }
})

documents.listen(connection)
connection.listen()

function getPosition(location: gn.Location): ls.Position {
  return {
    line: location.line - 1,
    character: location.column - 1,
  }
}

function getRange(range: gn.Range): ls.Range {
  return {
    start: getPosition(range.begin),
    end: range.end ? getPosition(range.end) : {line: range.begin.line, character: 0},
  }
}

function getDiagnostics(file: string): ls.Diagnostic[] {
  const result = [] as ls.Diagnostic[]
  const error = gn.validate(file)
  if (error) {
    result.push({
      range: getRange(error.ranges[0] ?? {begin: error.location, end: null}),
      severity: ls.DiagnosticSeverity.Error,
      source: 'gnls',
      message: [error.message, error.help].join('\n').trim(),
    })
  }
  return result
}

function getFunctionCompletion(name: string): ls.CompletionItem {
  const detail = data.functionDetail(name)
  const help = gn.help('function', name)
  const result = {
    label: name,
    kind: detail.isTarget ? ls.CompletionItemKind.Class : ls.CompletionItemKind.Function,
  } as ls.CompletionItem
  if (help) {
    result.detail = help.basic
    result.documentation = {
      kind: 'markdown',
      value: help.link,
    }
  }
  return result
}

function getVariableCompletion(name: string): ls.CompletionItem {
  const detail = data.variableDetail(name)
  const help = gn.help('variable', name)
  const result = {
    label: name,
    kind: detail.isBuiltin ? ls.CompletionItemKind.Variable : ls.CompletionItemKind.Field,
  } as ls.CompletionItem
  if (help) {
    result.detail = help.basic
    result.documentation = {
      kind: 'markdown',
      value: help.link,
    }
  }
  return result
}

function getDirectoryCompletion(name: string): ls.CompletionItem {
  return {label: name, kind: ls.CompletionItemKind.Folder}
}

function getFileCompletion(name: string): ls.CompletionItem {
  return {label: name, kind: ls.CompletionItemKind.File}
}

function getLabelCompletion(name: string): ls.CompletionItem {
  return {label: name, kind: ls.CompletionItemKind.Constant}
}

function getCompletions(file: string, line: number, column: number): ls.CompletionItem[] {
  const result = [] as ls.CompletionItem[]
  const context = gn.analyze(file, line, column)
  switch (context?.token?.type) {
    case 'literal': {
      const detail = data.variableDetail(context.variable)
      if (context.token.value.startsWith('"')) {
        if (detail.isInput) {
          const string = context.token.value.substring(1, column - context.token.range.begin.column)
          const parts = string.replace(/^\/+/, '').split(':', 2)
          const colon = parts.length > 1
          const base = string.startsWith('//') ? context.root : string.startsWith('/') ? '/' : path.dirname(file)
          const relative = colon ? parts[0] : parts[0].replace(/[^/]+$/, '')
          const absolute = path.join(base, relative)
          try {
            if (colon) {
              if (detail.isLabel) {
                const filepath = path.join(absolute, 'BUILD.gn')
                const content = fs.readFileSync(filepath, {encoding: 'utf8'})
                const scope = gn.parse(filepath, content)
                scope?.declares.forEach((declare) => {
                  const func = declare.function
                  const arg0 = (declare.arguments[0] ?? '').replace(/^"|"$/g, '')
                  const arg1 = (declare.arguments[1] ?? '').replace(/^"|"$/g, '')
                  const target = func == 'target' ? arg0 : func
                  const label = func == 'target' ? arg1 : arg0
                  if (data.functionDetail(target).isTarget && label) {
                    result.push(getLabelCompletion(label))
                  }
                })
              }
            } else {
              const entries = fs.readdirSync(absolute, {withFileTypes: true})
              entries.forEach((entry) => {
                if (entry.isDirectory()) {
                  result.push(getDirectoryCompletion(entry.name))
                } else if (!detail.isLabel) {
                  result.push(getFileCompletion(entry.name))
                }
              })
            }
          } catch {
            // continue
          }
        }
      }
      break
    }
    default: {
      result.push(...data.builtinFunctions().map(getFunctionCompletion))
      result.push(...data.builtinVariables().map(getVariableCompletion))
      if (context?.function) {
        const func = context.function.name
        const arg0 = (context.function.arguments[0] ?? '').replace(/^"|"$/g, '')
        const target = func == 'target' ? arg0 : func
        if (func == 'template') {
          result.push(...data.targetFunctions().map(getFunctionCompletion))
        } else {
          result.push(...data.targetVariables(target).map(getVariableCompletion))
        }
      } else {
        result.push(...data.targetFunctions().map(getFunctionCompletion))
      }
      break
    }
  }
  return result
}

function getHover(file: string, line: number, column: number): ls.Hover | undefined {
  const context = gn.analyze(file, line, column)
  switch (context?.token?.type) {
    case 'identifier': {
      const help = gn.help('all', context.token.value)
      if (help) {
        return {
          contents: {
            kind: 'markdown',
            value: [help.full, help.link].join('\n'),
          },
          range: getRange(context.token.range),
        }
      }
      break
    }
  }
}

function getDefinition(file: string, line: number, column: number): ls.DefinitionLink[] {
  const result = [] as ls.DefinitionLink[]
  const context = gn.analyze(file, line, column)
  switch (context?.token?.type) {
    case 'literal': {
      if (context.token.value.startsWith('"')) {
        const string = context.token.value.replace(/^"|"$/g, '')
        const parts = string.replace(/^\/+/, '').split(':', 2)
        const colon = parts.length > 1
        const base = string.startsWith('//') ? context.root : string.startsWith('/') ? '/' : path.dirname(file)
        const relative = parts[0]
        const absolute = path.join(base, relative)
        const linkWithRange = (
          (origin: ls.Range, target: ls.Range) =>
          (filepath: string, range?: ls.Range): ls.DefinitionLink => {
            return {
              originSelectionRange: origin,
              targetUri: URI.file(filepath).toString(),
              targetRange: range ?? target,
              targetSelectionRange: range ?? target,
            }
          }
        )(getRange(context.token.range), {
          start: {line: 0, character: 0},
          end: {line: 2, character: 0},
        })
        try {
          const entry = fs.statSync(absolute)
          if (entry.isFile()) {
            result.push(linkWithRange(absolute))
          } else if (entry.isDirectory()) {
            const filepath = path.join(absolute, 'BUILD.gn')
            const target = colon ? parts[1] : path.basename(absolute)
            const content = fs.readFileSync(filepath, {encoding: 'utf8'})
            const scope = gn.parse(filepath, content)
            const declare = scope?.declares.find((declare) => {
              const func = declare.function
              const arg0 = (declare.arguments[0] ?? '').replace(/^"|"$/g, '')
              const arg1 = (declare.arguments[1] ?? '').replace(/^"|"$/g, '')
              const label = func == 'target' ? arg1 : arg0
              return label == target
            })
            result.push(linkWithRange(filepath, declare ? getRange(declare.range) : undefined))
          }
        } catch {
          // continue
        }
      }
      break
    }
  }
  return result
}

function getFormatted(file: string, lines: number): ls.TextEdit[] {
  const result = [] as ls.TextEdit[]
  const code = gn.format(file)
  if (code) {
    result.push({
      newText: code,
      range: {
        start: {line: 0, character: 0},
        end: {line: lines, character: 0},
      },
    })
  }
  return result
}

function getDocumentSymbol(file: string): ls.DocumentSymbol[] {
  const mapToDocumentSymbol = (symbol: gn.GNDocumentSymbol): ls.DocumentSymbol => {
    const result: ls.DocumentSymbol = {
      name: symbol.name,
      kind: symbol.kind,
      range: getRange(symbol.range),
      selectionRange: getRange(symbol.range),
    }
    if (symbol.children) {
      result.children = symbol.children.map(mapToDocumentSymbol)
    }
    return result
  }
  const symbols = gn.parse(file)?.symbols ?? []
  return symbols.map(mapToDocumentSymbol)
}
