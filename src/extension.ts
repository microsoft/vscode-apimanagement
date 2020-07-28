/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AzureParentTreeItem, AzureTreeDataProvider, AzureTreeItem, AzureUserInput, createTelemetryReporter, IActionContext, registerCommand, registerEvent, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { addApiToGateway } from './commands/addApiToGateway';
import { addApiToProduct } from './commands/addApiToProduct';
import { copySubscriptionKey } from './commands/copySubscriptionKey';
import { createService } from './commands/createService';
import { deleteNode } from './commands/deleteNode';
import { copyDockerRunCommand, generateKubernetesDeployment } from './commands/deployGateway';
import { extractAPI, extractService } from './commands/extract';
import { generateNewGatewayToken } from './commands/generateNewGatewayToken';
import { importFunctionApp } from './commands/importFunctionApp/importFunctionApp';
import { importFunctionAppToApi } from './commands/importFunctionApp/importFunctionApp';
import { importOpenApi } from './commands/importOpenApi';
import { importWebApp, importWebAppToApi } from './commands/importWebApp/importWebApp';
import { createNamedValue, updateNamedValue } from './commands/manageNamedValue';
import { openInPortal } from './commands/openInPortal';
import { openWorkingFolder } from './commands/openWorkingFolder';
import { setupWorkingFolder } from './commands/setupWorkingFolder';
import { testOperation } from './commands/testOperation';
import { doubleClickDebounceDelay } from './constants';
import { ApiManagementProvider } from './explorer/ApiManagementProvider';
import { ApiOperationTreeItem } from './explorer/ApiOperationTreeItem';
import { ApiPolicyTreeItem } from './explorer/ApiPolicyTreeItem';
import { ApisTreeItem } from './explorer/ApisTreeItem';
import { ApiTreeItem } from './explorer/ApiTreeItem';
import { ApiResourceEditor } from './explorer/editors/arm/ApiResourceEditor';
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
import { ext } from './extensionVariables';
import { generateFunctions } from './commands/generateFunctions';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
// tslint:disable-next-line:typedef
export function activateInternal(context: vscode.ExtensionContext) {

    ext.context = context;
    ext.reporter = createTelemetryReporter(context);
    ext.outputChannel = vscode.window.createOutputChannel('Azure API Management');
    context.subscriptions.push(ext.outputChannel);
    ext.ui = new AzureUserInput(context.globalState);

    registerUIExtensionVariables(ext);

    const tree = new AzureTreeDataProvider(ApiManagementProvider, 'azureApiManagement.LoadMore');
    ext.tree = tree;
    context.subscriptions.push(tree);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('azureApiManagementExplorer', tree));

    registerCommand('azureApiManagement.Refresh', async (node?: AzureTreeItem) => await tree.refresh(node));
    registerCommand('azureApiManagement.selectSubscriptions', () => vscode.commands.executeCommand("azure-account.selectSubscriptions"));
    registerCommand('azureApiManagement.LoadMore', async (node: AzureTreeItem) => await tree.loadMore(node));
    registerCommand('azureApiManagement.openInPortal', async (node?: AzureTreeItem) => { await openInPortal(node); });
    registerCommand('azureApiManagement.createService', createService);
    registerCommand('azureApiManagement.copySubscriptionKey', copySubscriptionKey);
    registerCommand('azureApiManagement.deleteService', async (node?: AzureParentTreeItem) => await deleteNode(ServiceTreeItem.contextValue, node));
    registerCommand('azureApiManagement.deleteApi', async (node?: AzureTreeItem) => await deleteNode(ApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.deleteOperation', async (node?: AzureTreeItem) => await deleteNode(ApiOperationTreeItem.contextValue, node));
    registerCommand('azureApiManagement.testOperation', testOperation);
    registerCommand('azureApiManagement.importOpenApiByFile', async (node?: ApisTreeItem) => { await importOpenApi(node, false); });
    registerCommand('azureApiManagement.importOpenApiByLink', async (node?: ApisTreeItem) => { await importOpenApi(node, true); });
    registerCommand('azureApiManagement.createNamedValue', async (node?: NamedValuesTreeItem) => { await createNamedValue(node); });
    registerCommand('azureApiManagement.deleteNamedValue', async (node?: AzureTreeItem) => await deleteNode(NamedValueTreeItem.contextValue, node));
    registerCommand('azureApiManagement.updateNamedValue', updateNamedValue);
    registerCommand('azureApiManagement.removeApiFromProduct', async (node?: AzureTreeItem) => await deleteNode(ProductApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.addApiToProduct', async (node?: ProductApisTreeItem) => { await addApiToProduct(node); });
    registerCommand('azureApiManagement.removeApiFromGateway', async (node?: AzureTreeItem) => await deleteNode(GatewayApiTreeItem.contextValue, node));
    registerCommand('azureApiManagement.addApiToGateway', async (node?: GatewayApisTreeItem) => { await addApiToGateway(node); });
    registerCommand('azureApiManagement.extractService', async (node: ServiceTreeItem) => await extractService(node));
    registerCommand('azureApiManagement.extractApi', async (node: ApiTreeItem) => await extractAPI(node));
    registerCommand('azureApiManagement.importFunctionApp', async (node: ApisTreeItem) => await importFunctionApp(node));
    registerCommand('azureApiManagement.importFunctionAppToApi', async (node: ApiTreeItem) => await importFunctionAppToApi(node));
    registerCommand('azureApiManagement.importWebApp', async (node: ApisTreeItem) => await importWebApp(node));
    registerCommand('azureApiManagement.importWebAppToApi', async (node: ApiTreeItem) => await importWebAppToApi(node));
    registerCommand('azureApiManagement.copyDockerRunCommand', async (node: GatewayTreeItem) => await copyDockerRunCommand(node));
    registerCommand('azureApiManagement.generateKubernetesDeployment', async (node: GatewayTreeItem) => await generateKubernetesDeployment(node));
    registerCommand('azureApiManagement.generateNewGatewayToken', async (node: GatewayTreeItem) => await generateNewGatewayToken(node));

    registerCommand('azureApiManagement.openExtensionWorkspaceFolder', openWorkingFolder);
    registerCommand('azureApiManagement.initializeExtensionWorkspaceFolder', setupWorkingFolder);

    registerCommand('azureApiManagement.generateFunctions', async (node: ApiTreeItem) => await generateFunctions(node));

    registerEditors(context);
}

function registerEditors(context: vscode.ExtensionContext) : void {
    const apiResourceEditor: ApiResourceEditor = new ApiResourceEditor();
    context.subscriptions.push(apiResourceEditor);
    registerEvent('azureApiManagement.ApiResourceEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiResourceEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmApi', async (node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
        }
        await apiResourceEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const operationResourceEditor: OperationResourceEditor = new OperationResourceEditor();
    context.subscriptions.push(operationResourceEditor);
    registerEvent('azureApiManagement.OperationResourceEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await operationResourceEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmApiOperation', async (node?: ApiOperationTreeItem) => {
        if (!node) {
            node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
        }
        await operationResourceEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const productResourceEditor: ProductResourceEditor = new ProductResourceEditor();
    context.subscriptions.push(productResourceEditor);
    registerEvent('azureApiManagement.ProductResourceEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await productResourceEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showArmProduct', async (node?: ProductTreeItem) => {
        if (!node) {
            node = <ProductTreeItem>await ext.tree.showTreeItemPicker(ProductTreeItem.contextValue);
        }
        await productResourceEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const apiEditor: OpenApiEditor = new OpenApiEditor();
    context.subscriptions.push(apiEditor);
    registerEvent('azureApiManagement.apiEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showApi', async (node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
        }
        await apiEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const servicePolicyEditor: ServicePolicyEditor = new ServicePolicyEditor();
    context.subscriptions.push(servicePolicyEditor);
    registerEvent('azureApiManagement.servicePolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await servicePolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showServicePolicy', async (node?: ServicePolicyTreeItem) => {
        if (!node) {
            const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
            node = serviceNode.servicePolicyTreeItem;
        }
        await servicePolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const apiPolicyEditor: ApiPolicyEditor = new ApiPolicyEditor();
    context.subscriptions.push(apiPolicyEditor);
    registerEvent('azureApiManagement.apiPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiPolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showApiPolicy', async (node?: ApiPolicyTreeItem) => {
        if (!node) {
            const apiNode = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
            node = apiNode.policyTreeItem;
        }
        await apiPolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const operationPolicyEditor: OperationPolicyEditor = new OperationPolicyEditor();
    context.subscriptions.push(operationPolicyEditor);
    registerEvent('azureApiManagement.operationPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await operationPolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showOperationPolicy', async (node?: OperationPolicyTreeItem) => {
        if (!node) {
            const operationNode = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
            node = operationNode.policyTreeItem;
        }
        await operationPolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const productPolicyEditor: ProductPolicyEditor = new ProductPolicyEditor();
    context.subscriptions.push(productPolicyEditor);
    registerEvent('azureApiManagement.productPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await productPolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('azureApiManagement.showProductPolicy', async (node?: ProductPolicyTreeItem) => {
        if (!node) {
            const productNode = <ProductTreeItem>await ext.tree.showTreeItemPicker(ProductTreeItem.contextValue);
            node = productNode.policyTreeItem;
        }
        await productPolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);
}

// this method is called when your extension is deactivated
// tslint:disable:typedef
// tslint:disable-next-line:no-empty
export function deactivateInternal() {}
