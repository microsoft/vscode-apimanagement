/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { AzureParentTreeItem, AzureTreeDataProvider, AzureTreeItem, AzureUserInput, createTelemetryReporter, IActionContext, registerCommand, registerEvent, registerUIExtensionVariables } from 'vscode-azureextensionui';
import { copySubscriptionKey } from './commands/copySubscriptionKey';
import { createService } from './commands/createService';
import { deleteNode } from './commands/deleteNode';
import { importOpenApi } from './commands/importOpenApi';
import { openInPortal } from './commands/openInPortal';
import { testOperation } from './commands/testOperation';
import { doubleClickDebounceDelay } from './constants';
import { ApiManagementProvider } from './explorer/ApiManagementProvider';
import { ApiOperationTreeItem } from './explorer/ApiOperationTreeItem';
import { ApiPolicyTreeItem } from './explorer/ApiPolicyTreeItem';
import { ApisTreeItem } from './explorer/ApisTreeItem';
import { ApiTreeItem } from './explorer/ApiTreeItem';
import { ApiResourceEditor } from './explorer/editors/arm/ApiResourceEditor';
import { OperationResourceEditor } from './explorer/editors/arm/OperationResourceEditor';
import { OpenApiEditor } from './explorer/editors/openApi/OpenApiEditor';
import { ApiPolicyEditor } from './explorer/editors/policy/ApiPolicyEditor';
import { OperationPolicyEditor } from './explorer/editors/policy/OperationPolicyEditor';
import { ServicePolicyEditor } from './explorer/editors/policy/ServicePolicyEditor';
import { OperationPolicyTreeItem } from './explorer/OperationPolicyTreeItem';
import { ServicePolicyTreeItem } from './explorer/ServicePolicyTreeItem';
import { ServiceTreeItem } from './explorer/ServiceTreeItem';
import { ext } from './extensionVariables';

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

    const tree = new AzureTreeDataProvider(ApiManagementProvider, 'extension.LoadMore');
    ext.tree = tree;
    context.subscriptions.push(tree);
    context.subscriptions.push(vscode.window.registerTreeDataProvider('azureApiManagement', tree));

    context.subscriptions.push(vscode.commands.registerCommand('extension.Refresh', async (node?: AzureTreeItem) => await tree.refresh(node)));
    context.subscriptions.push(vscode.commands.registerCommand('extension.selectSubscriptions', () => vscode.commands.executeCommand("azure-account.selectSubscriptions")));
    context.subscriptions.push(vscode.commands.registerCommand('extension.LoadMore', async (node: AzureTreeItem) => await tree.loadMore(node)));
    // context.subscriptions.push(vscode.commands.registerCommand('extension.LoadMore', async (node: IAzureNode) => await tree.loadMore(node)));

    registerCommand('extension.openInPortal', async (node?: AzureTreeItem) => {
        await openInPortal(node);
    });

    registerCommand('extension.createService', createService);
    registerCommand('extension.copySubscriptionKey', copySubscriptionKey);
    registerCommand('extension.deleteService', async (node?: AzureParentTreeItem) => await deleteNode(ServiceTreeItem.contextValue, node));
    registerCommand('extension.deleteApi', async (node?: AzureTreeItem) => await deleteNode(ApiTreeItem.contextValue, node));
    registerCommand('extension.deleteOperation', async (node?: AzureTreeItem) => await deleteNode(ApiOperationTreeItem.contextValue, node));

    registerCommand('extension.testOperation', testOperation);

    registerCommand('extension.importOpenApiByFile', async (node?: ApisTreeItem) => {
        await importOpenApi(node, false);
    });

    registerCommand('extension.importOpenApiByLink', async (node?: ApisTreeItem) => {
        await importOpenApi(node, true);
    });

    registerEditors(context);
}

function registerEditors(context: vscode.ExtensionContext) : void {
    const apiResourceEditor: ApiResourceEditor = new ApiResourceEditor();
    context.subscriptions.push(apiResourceEditor);
    registerEvent('extension.ApiResourceEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiResourceEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showArmApi', async (node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
        }
        await apiResourceEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const operationResourceEditor: OperationResourceEditor = new OperationResourceEditor();
    context.subscriptions.push(operationResourceEditor);
    registerEvent('extension.OperationResourceEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await operationResourceEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showArmApiOperation', async (node?: ApiOperationTreeItem) => {
        if (!node) {
            node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
        }
        await operationResourceEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const apiEditor: OpenApiEditor = new OpenApiEditor();
    context.subscriptions.push(apiEditor);
    registerEvent('extension.apiEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showApi', async (node?: ApiTreeItem) => {
        if (!node) {
            node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
        }
        await apiEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const servicePolicyEditor: ServicePolicyEditor = new ServicePolicyEditor();
    context.subscriptions.push(servicePolicyEditor);
    registerEvent('extension.servicePolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await servicePolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showServicePolicy', async (node?: ServicePolicyTreeItem) => {
        if (!node) {
            const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
            node = serviceNode.servicePolicyTreeItem;
        }
        await servicePolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const apiPolicyEditor: ApiPolicyEditor = new ApiPolicyEditor();
    context.subscriptions.push(apiPolicyEditor);
    registerEvent('extension.apiPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await apiPolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showApiPolicy', async (node?: ApiPolicyTreeItem) => {
        if (!node) {
            const apiNode = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
            node = apiNode.policyTreeItem;
        }
        await apiPolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);

    const operationPolicyEditor: OperationPolicyEditor = new OperationPolicyEditor();
    context.subscriptions.push(operationPolicyEditor);
    registerEvent('extension.operationPolicyEditor.onDidSaveTextDocument', vscode.workspace.onDidSaveTextDocument, async function (this: IActionContext, doc: vscode.TextDocument): Promise<void> { await operationPolicyEditor.onDidSaveTextDocument(this, context.globalState, doc); });

    registerCommand('extension.showOperationPolicy', async (node?: OperationPolicyTreeItem) => {
        if (!node) {
            const operationNode = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
            node = operationNode.policyTreeItem;
        }
        await operationPolicyEditor.showEditor(node);
    },              doubleClickDebounceDelay);
}

// this method is called when your extension is deactivated
// tslint:disable:typedef
// tslint:disable-next-line:no-empty
export function deactivateInternal() {}
