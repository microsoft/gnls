import * as path from 'path'
import {ExtensionContext} from 'vscode'
import {LanguageClient, TransportKind} from 'vscode-languageclient/node'

export function activate(context: ExtensionContext): void {
  const module = context.asAbsolutePath(path.join('build', 'server.js'))
  const transport = TransportKind.ipc
  const languageClient = new LanguageClient(
    'GN Language Server',
    {
      run: {module, transport},
      debug: {
        module,
        transport,
        runtime: 'node',
        options: {execArgv: ['--nolazy', '--inspect=6009']},
      },
    },
    {
      documentSelector: [{language: 'gn'}],
    }
  )
  context.subscriptions.push(languageClient.start())
}
