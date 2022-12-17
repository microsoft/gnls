import * as path from 'path'
import {ExtensionContext} from 'vscode'
import {LanguageClient, TransportKind} from 'vscode-languageclient/node'

let client: LanguageClient | undefined

export async function activate(context: ExtensionContext) {
  const module = context.asAbsolutePath(path.join('build', 'server.js'))
  const transport = TransportKind.ipc
  client = new LanguageClient(
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
  await client.start()
}

export async function deactivate() {
  if (client) {
    await client.stop()
    client = undefined
  }
}
