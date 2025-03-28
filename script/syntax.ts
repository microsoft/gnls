import * as path from 'path'
import * as fs from 'fs'

import * as data from '../src/data'

const keywords = ['if', 'else']
const operators = ['=', '\\+', '-', '\\+=', '-=', '==', '!=', '<=', '>=', '<', '>', '&&', '\\|\\|', '!', '\\.']
const values = ['true', 'false']

const grammar = {
  name: 'GN',
  scopeName: 'source.gn',
  fileTypes: ['gn', 'gni'],
  patterns: [
    {
      name: 'keyword.control.gn',
      match: `\\b(${keywords.join('|')})\\b`,
    },
    {
      name: 'keyword.operator.gn',
      match: `(${operators.join('|')})`,
    },
    {
      name: 'constant.language.gn',
      match: `\\b(${values.join('|')})\\b`,
    },
    {
      name: 'constant.numeric.gn',
      match: '\\b(\\d+)\\b',
    },
    {
      name: 'string.quoted.double.gn',
      begin: '"',
      end: '"',
      patterns: [
        {
          name: 'constant.character.escape.gn',
          match: '\\\\.',
        },
      ],
    },
    {
      name: 'comment.gn',
      begin: '#',
      end: '$',
    },
    {
      name: 'entity.name.tag.gn',
      match: `\\b(${data.targetFunctions().join('|')})\\b`,
    },
    {
      name: 'entity.name.function.gn',
      match: `\\b(${data.builtinFunctions().join('|')})\\b`,
    },
    {
      name: 'variable.parameter.gn',
      match: `\\b(${data.builtinVariables().join('|')})\\b`,
    },
    {
      name: 'entity.other.attribute-name.gn',
      match: `\\b(${data.targetVariables().join('|')})\\b`,
    },
  ],
}

const language = {
  comments: {
    lineComment: '#',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    {open: '{', close: '}'},
    {open: '[', close: ']'},
    {open: '(', close: ')'},
    {open: '"', close: '"'},
  ],
  surroundingPairs: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
    ['"', '"'],
  ],
}

const output = process.argv[2] ?? '.'
fs.mkdirSync(output, {recursive: true})
fs.writeFileSync(path.join(output, 'grammar.json'), JSON.stringify(grammar))
fs.writeFileSync(path.join(output, 'language.json'), JSON.stringify(language))
