[![Build Status](https://dev.azure.com/ms-azuretools/AzCode/_apis/build/status/Nightly/vscode-apimanagement-nightly?branchName=master)](https://dev.azure.com/ms-azuretools/AzCode/_build/latest?definitionId=21&branchName=master)

# Azure API Management Extension for Visual Studio Code (Preview)

Expose, publish, and manage microservices architectures as APIs. Quickly create consistent and modern API gateways for existing back-end services hosted anywhere.

## Installation
1. Download and install the [Azure API Management extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-apimanagement) for Visual Studio Code
2. Wait for the extension to finish installing then reload Visual Studio Code when prompted
3. Once complete, you'll see an Azure icon in the Activity Bar
    > If your activity bar is hidden, you won't be able to access the extension. Show the Activity Bar by clicking View > Appearance > Show Activity Bar
4. Sign in to your Azure Account by clicking Sign in to Azure…
    >  If you don't already have an Azure Account, click "Create a Free Azure Account".

## Features
* Create API Management instance
  * Using Defaults (sku-consumption, region-westus) or Advanced option through VSCode Settings
* Create API and Operations by Importing OpenAPI 2.0(swagger) or OpenAPI 3.0 specification
  * Import through local file or link
  * Only Json format supported
* Open API Managment instance in Azure portal
* Edit API properties
* Edit Operation properties
    > Intellisense/Completions for the API/Operation properties
* Edit API/Operations via OpenAPI specification
* Edit Global-Scope/API-Scope/Operation-Scope policies
    > Snippets support and syntax highlighting (leveraging Razor VSCode tooling)
* Test Operation
    > Copy subscription key for testing
* Delete API Management instance, API or Operation
* Command pallete support

## Contributing

There are a couple of ways you can contribute to this repo:

* **Ideas, feature requests and bugs**: We are open to all ideas and we want to get rid of bugs! Use the Issues section to either report a new issue, provide your ideas or contribute to existing threads.
* **Documentation**: Found a typo or strangely worded sentences? Submit a PR!
* **Code**: Contribute bug fixes, features or design changes:
  * Clone the repository locally and open in VS Code.
  * Install [TSLint for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin).
  * Open the terminal (press `` CTRL+` ``) and run `npm install`.
  * To build, press `F1` and type in `Tasks: Run Build Task`.
  * Debug: press `F5` to start debugging the extension.

### Legal

Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MIT](LICENSE.md)
