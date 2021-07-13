import * as ls from 'vscode-languageserver/node'
import * as lstd from 'vscode-languageserver-textdocument'
import {URI} from 'vscode-uri'
import * as path from 'path'
import * as fs from 'fs'

import * as gn from './gn'
import * as data from './data'

const connection = ls.createConnection(ls.ProposedFeatures.all)
const documents = new ls.TextDocuments(lstd.TextDocument)

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
    },
  }
})

documents.onDidChangeContent((event) => {
  const uri = event.document.uri
  const {scheme, fsPath: file} = URI.parse(uri)
  if (scheme == 'file') {
    const content = event.document.getText()
    gn.update(file, content)
    connection.sendDiagnostics({
      uri: uri,
      diagnostics: getDiagnostics(file),
    })
  }
})

documents.onDidClose((event) => {
  const uri = event.document.uri
  const {scheme, fsPath: file} = URI.parse(uri)
  if (scheme == 'file') {
    gn.close(file)
    connection.sendDiagnostics({
      uri: uri,
      diagnostics: [],
    })
  }
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
  return [getDefinition(file, line, column)]
})

connection.onDocumentFormatting((params) => {
  const uri = params.textDocument.uri
  const file = URI.parse(uri).fsPath
  const lines = documents.get(uri).lineCount
  return [getFormatted(file, lines)]
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
  const error = gn.validate(file)
  if (error) {
    return [
      {
        range: getRange(error.ranges[0] || {begin: error.location, end: null}),
        severity: ls.DiagnosticSeverity.Error,
        source: 'gnls',
        message: [error.message, error.help].join('\n').trim(),
      },
    ]
  } else {
    return []
  }
}

function getFunctionCompletion(name: string): ls.CompletionItem {
  const detail = data.functionDetail(name)
  const help = gn.help('function', name)
  return {
    label: name,
    kind: detail.isTarget ? ls.CompletionItemKind.Class : ls.CompletionItemKind.Function,
    detail: help.basic,
    documentation: {
      kind: 'markdown',
      value: help.link,
    },
  }
}

function getVariableCompletion(name: string): ls.CompletionItem {
  const detail = data.variableDetail(name)
  const help = gn.help('variable', name)
  return {
    label: name,
    kind: detail.isBuiltin ? ls.CompletionItemKind.Variable : ls.CompletionItemKind.Field,
    detail: help.basic,
    documentation: {
      kind: 'markdown',
      value: help.link,
    },
  }
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
  const result = []
  const context = gn.analyze(file, line, column)
  switch (context.token?.type) {
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
                scope.declares.forEach((declare) => {
                  const func = declare.function
                  const arg0 = (declare.arguments[0] || '').replace(/^"|"$/g, '')
                  const arg1 = (declare.arguments[1] || '').replace(/^"|"$/g, '')
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
      if (context.function) {
        const func = context.function.name
        const arg0 = (context.function.arguments[0] || '').replace(/^"|"$/g, '')
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

function getHover(file: string, line: number, column: number): ls.Hover {
  const context = gn.analyze(file, line, column)
  switch (context.token?.type) {
    case 'identifier': {
      const help = gn.help('all', context.token.value)
      if (help.basic) {
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
    default: {
      break
    }
  }
  return null
}

function getDefinition(file: string, line: number, column: number): ls.DefinitionLink {
  const context = gn.analyze(file, line, column)
  switch (context.token?.type) {
    case 'literal': {
      if (context.token.value.startsWith('"')) {
        const string = context.token.value.replace(/^"|"$/g, '')
        const parts = string.replace(/^\/+/, '').split(':', 2)
        const colon = parts.length > 1
        const base = string.startsWith('//') ? context.root : string.startsWith('/') ? '/' : path.dirname(file)
        const relative = parts[0]
        const absolute = path.join(base, relative)
        const linkWithRange = (filepath: string, range?: ls.Range): ls.DefinitionLink => {
          if (!range) {
            range = {
              start: {line: 0, character: 0},
              end: {line: 2, character: 0},
            }
          }
          return {
            originSelectionRange: getRange(context.token.range),
            targetUri: URI.file(filepath).toString(),
            targetRange: range,
            targetSelectionRange: range,
          }
        }
        try {
          const entry = fs.statSync(absolute)
          if (entry.isFile()) {
            return linkWithRange(absolute)
          } else if (entry.isDirectory()) {
            const filepath = path.join(absolute, 'BUILD.gn')
            const target = colon ? parts[1] : path.basename(absolute)
            const content = fs.readFileSync(filepath, {encoding: 'utf8'})
            const scope = gn.parse(filepath, content)
            const declare = scope.declares.find((declare) => {
              const func = declare.function
              const arg0 = (declare.arguments[0] || '').replace(/^"|"$/g, '')
              const arg1 = (declare.arguments[1] || '').replace(/^"|"$/g, '')
              const label = func == 'target' ? arg1 : arg0
              return label == target
            })
            return linkWithRange(filepath, declare ? getRange(declare.range) : null)
          }
        } catch {
          // continue
        }
      }
      break
    }
    default: {
      break
    }
  }
  return null
}

function getFormatted(file: string, lines: number): ls.TextEdit {
  const code = gn.format(file)
  if (code) {
    return {
      newText: code,
      range: {
        start: {line: 0, character: 0},
        end: {line: lines, character: 0},
      },
    }
  }
  return null
}
