# Contributing

This project welcomes contributions and suggestions. Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Prerequisite

- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/)
- [Ninja](https://ninja-build.org/)
- C++ build tools required by [node-gyp](https://github.com/nodejs/node-gyp)
- (Optional) clang-tidy and clang-format

## Build and Run

After cloning the repo, run these commands to install or update dependencies:

```
npm install
```

Run these commands to build a package for release:

```
npm run build
npm run package
```

To develop or debug, open the code folder in VS Code, install the recommended extensions for code intellisense and debugging support.

Some tasks and debug configurations are provided for your convenience:

- `Build` task: build the JavaScript and C++ code.

  This is usually sufficient for development as other things rarely change and can be built with `npm run prepare`, which is already done when doing `npm install`. By default, this can also be invoked with keyboard shortcut <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd> or <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>B</kbd>.

- `RunTest` config: run the tests.

  `Build` task is automatically invoked before running.

- `RunExtension` config: run the extension in another VS Code instance for debugging.

  `Build` task is automatically invoked before running. This only attaches to the client code, so if you want to debug the server or native addon code, use the other two configs.

- `AttachServer` config: attach to the language server.

  This only works when `RunExtension` is in running state. You will be able to debug the JavaScript part of the language server.

- `AttachNode` config: attach to the language server node process.

  This only works when `RunExtension` is in running state. Filter the process list with keyword "gnls", choose the node process, then you will be able to debug the C++ native addon.
