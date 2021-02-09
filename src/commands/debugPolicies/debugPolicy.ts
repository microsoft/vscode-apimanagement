/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ApiOperationTreeItem } from '../../explorer/ApiOperationTreeItem';
import { IOperationTreeRoot } from '../../explorer/IOperationTreeRoot';
import { ext } from "../../extensionVariables";
import { nameUtil } from '../../utils/nameUtil';

export async function debugPolicy(context: IActionContext, node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        // tslint:disable-next-line: no-unsafe-any
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue, context);
    }

    const operationData = await node.getOperationDebugInfo();
    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true,
        // tslint:disable-next-line: no-non-null-assertion
        gatewayAddress: await getDebugGatewayAddressUrl(node!),
        managementAddress: getManagementUrl(node.root),
        subscriptionId: node.root.subscriptionId,
        operationData: operationData,
        fileName: `${nameUtil(node.root)}.http`
    };

    // const debugConfig3: vscode.DebugConfiguration = {
    //     type: "apim-policy",
    //     request: "launch",
    //     name: "Attach to APIM",
    //     stopOnEntry: true,
    //     gatewayAddress: 'wss://proxy.apim.net/debug-0123456789abcdef',
    //     managementAddress: 'https://management.apim.net/subscriptions/x/resourceGroups/x/providers/microsoft.apimanagement/service/x',
    //     managementAuth: '',
    //     operationData: getLocalDebugOperationData2(),
    //     fileName: `${nameUtil(node.root)}.http`
    // };

    if (!vscode.debug.activeDebugSession) {
        await vscode.debug.startDebugging(undefined, debugConfig);
        // await vscode.debug.startDebugging(undefined, debugConfig3);
        vscode.debug.onDidTerminateDebugSession(_ => {
            const editors = vscode.window.visibleTextEditors;
            editors.forEach(editor => {
                editor.hide();
            });
        },                                      vscode.debug.activeDebugSession);
    }
}

function getManagementUrl(root: IOperationTreeRoot): string {
    return `${root.environment.resourceManagerEndpointUrl}/subscriptions/${root.subscriptionId}/resourceGroups/${root.resourceGroupName}/providers/microsoft.apimanagement/service/${root.serviceName}`;
}

async function getDebugGatewayAddressUrl(node: ApiOperationTreeItem): Promise<string> {

    const service = await node.root.client.apiManagementService.get(node.root.resourceGroupName, node.root.serviceName);
    // tslint:disable-next-line: no-non-null-assertion
    const hostNameConfigs = service.hostnameConfigurations!;
    for (const hostNameConfig of hostNameConfigs) {
        if (hostNameConfig.type === "Proxy") {
            return `wss://${hostNameConfig.hostName}/debug-0123456789abcdef`;
        }
    }
    throw new Error("Please make sure proxy host url is usable.");
}

// function getLocalDebugOperationData2(): string {
//     return `
// GET https://proxy.apim.net/echo/resource
// Ocp-Apim-Subscription-Key:
// Ocp-Apim-Debug:`;
// }
