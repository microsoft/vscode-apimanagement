/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as query from 'querystring';
import * as vscode from 'vscode';
import { AzExtTreeDataProvider, AzExtParentTreeItem, AzExtTreeItem, callWithTelemetryAndErrorHandling, createAzExtOutputChannel, IActionContext, registerCommand, registerEvent, registerUIExtensionVariables } from '@microsoft/vscode-azext-utils';
import { addApiFilter } from './commands/addApiFilter';
import { addApiToGateway } from './commands/addApiToGateway';
import { addApiToProduct } from './commands/addApiToProduct';
import { authorizeAuthorization } from './commands/authorizations/authorizeAuthorization';
import { copyAuthorizationPolicy } from './commands/authorizations/copyAuthorizationPolicy';
import { copyAuthorizationProviderRedirectUrl } from './commands/authorizations/copyAuthorizationProviderRedirectUrl';
import { createAuthorization } from './commands/authorizations/createAuthorization';
import { createAuthorizationAccessPolicy } from './commands/authorizations/createAuthorizationAccessPolicy';
import { createAuthorizationProvider } from './commands/authorizations/createAuthorizationProvider';
import { copySubscriptionKey } from './commands/copySubscriptionKey';
import { copySubscriptionKeyValue } from './commands/copySubscriptionKeyValue';
import { createService } from './commands/createService';
import { debugPolicy } from './commands/debugPolicies/debugPolicy';
import { deleteNode } from './commands/deleteNode';
import { copyDockerRunCommand, generateKubernetesDeployment } from './commands/deployGateway';
import { generateNewGatewayToken } from './commands/generateNewGatewayToken';
import { importFunctionApp } from './commands/importFunctionApp/importFunctionApp';
import { importFunctionAppToApi } from './commands/importFunctionApp/importFunctionApp';
import { importOpenApi } from './commands/importOpenApi';
import { importWebApp, importWebAppToApi } from './commands/importWebApp/importWebApp';
import { createNamedValue, updateNamedValue } from './commands/manageNamedValue';
import { createSubscription } from './commands/manageSubscriptions';
import { openDiffEditor } from './commands/openDiffEditor';
import { openInPortal } from './commands/openInPortal';
import { openWorkingFolder } from './commands/openWorkingFolder';
import { revisions } from './commands/revisions';
import { setCustomHostName } from './commands/setCustomHostName';
import { testOperation } from './commands/testOperation';
import { doubleClickDebounceDelay, environmentVariables } from './constants';
import { activate } from './debugger/extension';
import { ApiOperationTreeItem } from './explorer/ApiOperationTreeItem';
import { ApiPolicyTreeItem } from './explorer/ApiPolicyTreeItem';
import { ApisTreeItem } from './explorer/ApisTreeItem';
import { ApiTreeItem } from './explorer/ApiTreeItem';
import { AuthorizationAccessPoliciesTreeItem } from './explorer/AuthorizationAccessPoliciesTreeItem';
import { AuthorizationAccessPolicyTreeItem } from './explorer/AuthorizationAccessPolicyTreeItem';
import { AuthorizationProvidersTreeItem } from './explorer/AuthorizationProvidersTreeItem';
import { AuthorizationProviderTreeItem } from './explorer/AuthorizationProviderTreeItem';
import { AuthorizationsTreeItem } from './explorer/AuthorizationsTreeItem';
import { AuthorizationTreeItem } from './explorer/AuthorizationTreeItem';
import { AzureAccountTreeItem } from './explorer/AzureAccountTreeItem';
import { ApiResourceEditor } from './explorer/editors/arm/ApiResourceEditor';
import { AuthorizationAccessPolicyResourceEditor } from './explorer/editors/arm/AuthorizationAccessPolicyResourceEditor';
import { AuthorizationProviderResourceEditor } from './explorer/editors/arm/AuthorizationProviderResourceEditor';
import { AuthorizationResourceEditor } from './explorer/editors/arm/AuthorizationResourceEditor';
import { OperationResourceEditor } from './explorer/editors/arm/OperationResourceEditor';
import { ProductResourceEditor } from './explorer/editors/arm/ProductResourceEditor';
import { OpenApiEditor } from './explorer/editors/openApi/OpenApiEditor';
import { ApiPolicyEditor } from './explorer/editors/policy/ApiPolicyEditor';
import { OperationPolicyEditor } from './explorer/editors/policy/OperationPolicyEditor';
import { ProductPolicyEditor } from './explorer/editors/policy/ProductPolicyEditor';
import { ServicePolicyEditor } from './explorer/editors/policy/ServicePolicyEditor';
import { GatewayApisTreeItem } from './explorer/GatewayApisTreeItem';
import { GatewayApiTreeItem } from './explorer/GatewayApiTreeItem';
import { GatewayTreeItem } from './explorer/GatewayTreeItem';
import { NamedValuesTreeItem } from './explorer/NamedValuesTreeItem';
import { NamedValueTreeItem } from './explorer/NamedValueTreeItem';
import { OperationPolicyTreeItem } from './explorer/OperationPolicyTreeItem';
import { ProductApisTreeItem } from './explorer/ProductApisTreeItem';
import { ProductApiTreeItem } from './explorer/ProductApiTreeItem';
import { ProductPolicyTreeItem } from './explorer/ProductPolicyTreeItem';
import { ProductTreeItem } from './explorer/ProductTreeItem';
import { ServicePolicyTreeItem } from './explorer/ServicePolicyTreeItem';
import { ServiceTreeItem } from './explorer/ServiceTreeItem';
import { SubscriptionTreeItem } from './explorer/SubscriptionTreeItem';
import { ext } from './extensionVariables';
import { localize } from './localize';
import { registerAzureUtilsExtensionVariables } from '@microsoft/vscode-azext-azureutils';
import { AzureSessionProviderHelper } from "./azure/azureLogin/azureSessionProvider";
import { AzureAccount } from "./azure/azureLogin/azureAccount";
import { openUrlFromTreeNode } from './commands/openUrl';
import { explainPolicy } from './commands/explainPolicy';
import { draftPolicy } from './commands/draftPolicy';
import { AvailablePoliciesTool } from './tools/availablePoliciesTool';
import { showReleaseNotes } from './utils/extensionUtil';
import { copyMcpServerUrl } from './commands/copyMcpServerUrl';
import { LearnMoreMcpTreeItem } from './explorer/McpServersTreeItem';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
// tslint:disable-next-line:typedef
export async function activateInternal(context: vscode.ExtensionContext) {

    ext.context = context;
    //ext.reporter = createTelemetryReporter(context);
    ext.outputChannel = createAzExtOutputChannel("Azure API Management", ext.prefix);
    context.subscriptions.push(ext.outputChannel);
    vscode.commands.executeCommand('setContext', 'isEditorEnabled', false);

    // Show release notes if version has changed
    await showReleaseNotes(context);

    // Add XML schema association for policy files unless explicitly disabled by environment variable
    await associateXmlSchema(context);

    registerUIExtensionVariables(ext);
    registerAzureUtilsExtensionVariables(ext);

    await callWithTelemetryAndErrorHandling('azureApiManagement.Activate', async (activateContext: IActionContext) => {
        activateContext.telemetry.properties.isActivationEvent = 'true';
        AzureSessionProviderHelper.activateAzureSessionProvider(context);
        const sessionProvider = AzureSessionProviderHelper.getSessionProvider();
        const azureAccountTreeItem = new AzureAccountTreeItem(sessionProvider);
        context.subscriptions.push(azureAccountTreeItem);
        ext.azureAccountTreeItem = azureAccountTreeItem;
        
        ext.tree = new AzExtTreeDataProvider(azureAccountTreeItem, 'azureApiManagement.LoadMore');
        context.subscriptions.push(vscode.window.registerTreeDataProvider('azureApiManagementExplorer', ext.tree));

        registerCommands(ext.tree);
        registerEditors(context);

        const handler = new UriEventHandler();
        context.subscriptions.push(
            vscode.window.registerUriHandler(handler)
        );
        context.subscriptions.push(
            vscode.lm.registerTool('get-available-apim-policies', new AvailablePoliciesTool())
        );

        activate(context); // activeta debug context
    });
}

export async function associateXmlSchema(context: vscode.ExtensionContext): Promise<void> {
    const shouldAssociateSchema = process.env[environmentVariables.autoAssociateSchema]?.toLowerCase() !== 'false';
    if (shouldAssociateSchema) {
        const xmlExtension = vscode.extensions.getExtension('redhat.vscode-xml');
        if (xmlExtension) {
            if (!xmlExtension.isActive) {
                await xmlExtension.activate();
            }
            // Get the XML API
            const xmlAPI = xmlExtension.exports;
            if (xmlAPI && xmlAPI.addXMLFileAssociations) {
                xmlAPI.addXMLFileAssociations([{
                    pattern: "**/*.policy.xml",
                    systemId: context.asAbsolutePath("resources/policySchemas/policies.xsd")
                }]);
            }
        }
    }
}

function registerCommands(tree: AzExtTreeDataProvider): void {
    registerCommand('azureApiManagement.signInToAzure', async () => { await AzureAccount.signInToAzure(); });
    registerCommand('azureApiManagement.openUrl', async(context: IActionContext, node?: AzExtTreeItem) => { await openUrlFromTreeNode(context, node); });
    registerCommand('azureApiManagement.Refresh', async (context: IActionContext) => await ext.azureAccountTreeItem.refresh(context)); // need to double check
    registerCommand('azureApiManagement.selectSubscriptions', async() => { await AzureAccount.selectSubscriptions();});
    registerCommand('azureApiManagement.selectTenant', async() => { await AzureAccount.selectTenant();});
    registerCommand('azureApiManagement.LoadMore', async (context: IActionContext, node: AzExtTreeItem) => await tree.loadMore(node, context)); // need to double check
    registerCommand('azureApiManagement.openInPortal', openInPortal);
    registerCommand('azureApiManagement.createService', createService);
    registerCommand('azureApiManagement.showWalkthrough', async () => { await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'ms-azuretools.vscode-apimanagement#apim-import-and-test-apis'); });
    registerCommand('azureApiManagement.copySubscriptionKey', copySubscriptionKey);
    registerCommand('azureApiManagement.copySubscriptionKeyValue', copySubscriptionKeyValue);
    registerCommand('azureApiManagement.deleteService', async (context: IActionContext, node?: AzExtParentTreeItem) => await deleteNode(context, ServiceTreeItem.contextValue, node));
    registerCommand('azureApiManagement.deleteApi', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, ApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.deleteOperation', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, ApiOperationTreeItem.contextValue, node));
    registerCommand('azureApiManagement.testOperation', testOperation);
    registerCommand('azureApiManagement.importOpenApiByFile', async (context: IActionContext, node?: ApisTreeItem) => { await importOpenApi(context, node, false); });
    registerCommand('azureApiManagement.importOpenApiByLink', async (context: IActionContext, node?: ApisTreeItem) => { await importOpenApi(context, node, true); });
    registerCommand('azureApiManagement.createNamedValue', async (context: IActionContext, node?: NamedValuesTreeItem) => { await createNamedValue(context, node); });
    registerCommand('azureApiManagement.deleteNamedValue', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, NamedValueTreeItem.contextValue, node));
    registerCommand('azureApiManagement.updateNamedValue', updateNamedValue);
    registerCommand('azureApiManagement.removeApiFromProduct', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, ProductApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.addApiToProduct', async (context: IActionContext, node?: ProductApisTreeItem) => { await addApiToProduct(context, node); });
    registerCommand('azureApiManagement.removeApiFromGateway', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, GatewayApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.addApiToGateway', async (context: IActionContext, node?: GatewayApisTreeItem) => { await addApiToGateway(context, node); });
    registerCommand('azureApiManagement.importFunctionApp', async (context: IActionContext, node: ApisTreeItem) => await importFunctionApp(context, node));
    registerCommand('azureApiManagement.importFunctionAppToApi', async (context: IActionContext, node: ApiTreeItem) => await importFunctionAppToApi(context, node));
    registerCommand('azureApiManagement.importWebApp', async (context: IActionContext, node: ApisTreeItem) => await importWebApp(context, node));
    registerCommand('azureApiManagement.importWebAppToApi', async (context: IActionContext, node: ApiTreeItem) => await importWebAppToApi(context, node));
    registerCommand('azureApiManagement.addApiFilter', addApiFilter);
    registerCommand('azureApiManagement.setApiFilter', addApiFilter);
    registerCommand('azureApiManagement.copyDockerRunCommand', async (context: IActionContext, node: GatewayTreeItem) => await copyDockerRunCommand(context, node));
    registerCommand('azureApiManagement.generateKubernetesDeployment', generateKubernetesDeployment);
    registerCommand('azureApiManagement.generateNewGatewayToken', generateNewGatewayToken);
    registerCommand('azureApiManagement.debugPolicy', debugPolicy);

    registerCommand('azureApiManagement.openExtensionWorkspaceFolder', openWorkingFolder);
    registerCommand('azureApiManagement.openDiffEditor', async (context: IActionContext, uri: vscode.Uri) => await openDiffEditor(context, uri));

    registerCommand('azureApiManagement.revisions', revisions);
    registerCommand('azureApiManagement.setCustomHostName', setCustomHostName);
    registerCommand('azureApiManagement.createSubscription', createSubscription);
    registerCommand('azureApiManagement.deleteSubscription', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, SubscriptionTreeItem.contextValue, node));

    registerCommand('azureApiManagement.createAuthorizationProvider', async (context: IActionContext, node?: AuthorizationProvidersTreeItem) => { await createAuthorizationProvider(context, node); });
    registerCommand('azureApiManagement.createAuthorization', async (context: IActionContext, node?: AuthorizationsTreeItem) => { await createAuthorization(context, node); });
    registerCommand('azureApiManagement.createAuthorizationAccessPolicy', async (context: IActionContext, node?: AuthorizationAccessPoliciesTreeItem) => { await createAuthorizationAccessPolicy(context, node); });
    registerCommand('azureApiManagement.deleteAuthorizationProvider', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, AuthorizationProviderTreeItem.contextValue, node));
    registerCommand('azureApiManagement.copyAuthorizationProviderRedirectUrl', async (context: IActionContext, node?: AuthorizationProviderTreeItem) => await copyAuthorizationProviderRedirectUrl(context, node));
    registerCommand('azureApiManagement.authorizeAuthorization', async (context: IActionContext, node?: AuthorizationTreeItem) => { await authorizeAuthorization(context, node); });
    registerCommand('azureApiManagement.copyAuthorizationPolicy', async (context: IActionContext, node?: AuthorizationTreeItem) => { await copyAuthorizationPolicy(context, node); });
    registerCommand('azureApiManagement.deleteAuthorization', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, AuthorizationTreeItem.contextValue, node));
    registerCommand('azureApiManagement.deleteAuthorizationAccessPolicy', async (context: IActionContext, node?: AzExtTreeItem) => await deleteNode(context, AuthorizationAccessPolicyTreeItem.contextValue, node));

    registerCommand('azureApiManagement.explainPolicy', async (context: IActionContext) => await explainPolicy(context));
    registerCommand('azureApiManagement.draftPolicy', async (context: IActionContext) => await draftPolicy(context));
    registerCommand('azureApiManagement.copyMcpServerUrl', copyMcpServerUrl);
    registerCommand('azureApiManagement.openMcpLearnMore', async (_context: IActionContext, node: LearnMoreMcpTreeItem) => {
        if (node) {
            await node.openPage();
        }
    });
}

// tslint:disable-next-line: max-func-body-length
function registerEditors(context: vscode.ExtensionContext) : void {
    const apiResourceEditor: ApiResourceEditor = new ApiResourceEditor();
    context.subscriptions.push(apiResourceEditor);
    registerEvent('azureApiManagement.ApiResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument,
                  async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                       await apiResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc);
                    });
    registerCommand('azureApiManagement.showArmApi', async (actionContext: IActionContext, node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, actionContext);
        }
        await apiResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const operationResourceEditor: OperationResourceEditor = new OperationResourceEditor();
    context.subscriptions.push(operationResourceEditor);
    registerEvent('azureApiManagement.OperationResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                       await operationResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmApiOperation', async (actionContext: IActionContext, node?: ApiOperationTreeItem) => {
        if (!node) {
            node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue, actionContext);
        }
        await operationResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const productResourceEditor: ProductResourceEditor = new ProductResourceEditor();
    context.subscriptions.push(productResourceEditor);
    registerEvent('azureApiManagement.ProductResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                      await productResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmProduct', async (actionContext: IActionContext, node?: ProductTreeItem) => {
        if (!node) {
            node = <ProductTreeItem>await ext.tree.showTreeItemPicker(ProductTreeItem.contextValue, actionContext);
        }
        await productResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const apiEditor: OpenApiEditor = new OpenApiEditor();
    context.subscriptions.push(apiEditor);
    registerEvent('azureApiManagement.apiEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument,
                  async (actionContext: IActionContext, doc: vscode.TextDocument) => { await apiEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });
    registerCommand('azureApiManagement.showApi', async (actionContext: IActionContext, node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, actionContext);
        }
        await apiEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const servicePolicyEditor: ServicePolicyEditor = new ServicePolicyEditor();
    context.subscriptions.push(servicePolicyEditor);
    registerEvent('azureApiManagement.servicePolicyEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument,
                  async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                      await servicePolicyEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showServicePolicy', async (actionContext: IActionContext, node?: ServicePolicyTreeItem) => {
        if (!node) {
            const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, actionContext);
            node = serviceNode.servicePolicyTreeItem;
        }
        await servicePolicyEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const apiPolicyEditor: ApiPolicyEditor = new ApiPolicyEditor();
    context.subscriptions.push(apiPolicyEditor);
    registerEvent('azureApiManagement.apiPolicyEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument,
                  async (actionContext: IActionContext, doc: vscode.TextDocument) => { await apiPolicyEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });
    registerCommand('azureApiManagement.showApiPolicy', async (actionContext: IActionContext, node?: ApiPolicyTreeItem) => {
        if (!node) {
            const apiNode = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, actionContext);
            node = apiNode.policyTreeItem;
        }
        await apiPolicyEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const operationPolicyEditor: OperationPolicyEditor = new OperationPolicyEditor();
    context.subscriptions.push(operationPolicyEditor);
    registerEvent('azureApiManagement.operationPolicyEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument,
                  async (actionContext: IActionContext, doc: vscode.TextDocument) => { await operationPolicyEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });
    registerCommand('azureApiManagement.showOperationPolicy', async (actionContext: IActionContext, node?: OperationPolicyTreeItem) => {
        if (!node) {
            const operationNode = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue, actionContext);
            node = operationNode.policyTreeItem;
        }
        await operationPolicyEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const productPolicyEditor: ProductPolicyEditor = new ProductPolicyEditor();
    context.subscriptions.push(productPolicyEditor);
    registerEvent('azureApiManagement.productPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => { await productPolicyEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });
    registerCommand('azureApiManagement.showProductPolicy', async (actionContext: IActionContext, node?: ProductPolicyTreeItem) => {
        if (!node) {
            const productNode = <ProductTreeItem>await ext.tree.showTreeItemPicker(ProductTreeItem.contextValue, actionContext);
            node = productNode.policyTreeItem;
        }
        await productPolicyEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const authorizationProviderResourceEditor: AuthorizationProviderResourceEditor = new AuthorizationProviderResourceEditor();
    context.subscriptions.push(authorizationProviderResourceEditor);
    registerEvent('azureApiManagement.AuthorizationProviderResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                       await authorizationProviderResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmAuthorizationProvider', async (actionContext: IActionContext, node?: AuthorizationProviderTreeItem) => {
        if (!node) {
            node = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, actionContext);
        }
        await authorizationProviderResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const authorizationResourceEditor: AuthorizationResourceEditor = new AuthorizationResourceEditor();
    context.subscriptions.push(authorizationResourceEditor);
    registerEvent('azureApiManagement.AuthorizationResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                       await authorizationResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmAuthorization', async (actionContext: IActionContext, node?: AuthorizationTreeItem) => {
        if (!node) {
            node = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, actionContext);
        }
        await authorizationResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);

    const authorizationAccessPolicyResourceEditor: AuthorizationAccessPolicyResourceEditor = new AuthorizationAccessPolicyResourceEditor();
    context.subscriptions.push(authorizationAccessPolicyResourceEditor);
    registerEvent('azureApiManagement.AuthorizationAccessPolicyResourceEditor.onDidSaveTextDocument',
                  vscode.workspace.onDidSaveTextDocument, async (actionContext: IActionContext, doc: vscode.TextDocument) => {
                       await authorizationAccessPolicyResourceEditor.onDidSaveTextDocument(actionContext, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmAuthorizationAccessPolicy', async (actionContext: IActionContext, node?: AuthorizationAccessPolicyTreeItem) => {
        if (!node) {
            node = <AuthorizationAccessPolicyTreeItem>await ext.tree.showTreeItemPicker(AuthorizationAccessPolicyTreeItem.contextValue, actionContext);
        }
        await authorizationAccessPolicyResourceEditor.showEditor(actionContext, node);
        vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
    },              doubleClickDebounceDelay);
}

// this method is called when your extension is deactivated
// tslint:disable:typedef
// tslint:disable-next-line:no-empty
export function deactivateInternal() {}

class UriEventHandler extends vscode.EventEmitter<vscode.Uri> implements vscode.UriHandler {
    public handleUri(uri: vscode.Uri) {
        if (uri.path.startsWith('/vscodeauthcomplete')) {
            if (uri.query !== null && uri.query.includes('error')) {
                const queryParams = <Record<string, string>>query.parse(uri.query);
                // tslint:disable-next-line:no-string-literal
                const errorValue = queryParams['error'];
                const errorDecoded = new Buffer(errorValue, 'base64');
                ext.outputChannel.appendLine(localize('authFailed', `Authorization failed. ${errorDecoded.toString('utf8')}.`));
                vscode.window.showInformationMessage(localize('authFailed', `Authorization failed. ${errorDecoded.toString('utf8')}.`));
            } else {
                ext.outputChannel.appendLine(localize('authComplete', `Authorization success. ${uri.path}`));
                const authProvider = uri.path.split('/')[2];
                const authorization = uri.path.split('/')[3];
                vscode.window.showInformationMessage(localize('authSuccess', `Authorized '${authorization}' under Authorization Provider '${authProvider}'.`));
                vscode.window.showInformationMessage(localize('closeBrowserWindow', `You can now close the browser window that was launched during the authorization process.`));
            }
        }
    }
}
