/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiOperationTreeItem } from '../../explorer/ApiOperationTreeItem';
import { ext } from "../../extensionVariables";
import { createOperationTestFile, OperationRunMode } from '../testOperation';

// tslint:disable-next-line: export-name
export async function debugApiPolicy(node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
    }

    // tslint:disable-next-line: no-non-null-assertion
    const gatewayAddress = getDebugGatewayAddressUrl(node!.root.serviceName);
    const managementUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}`;

    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true,
        gatewayAddress: gatewayAddress,
        managementAddress: managementUrl,
        subscriptionId: node.root.subscriptionId
    };
    // tslint:disable-next-line: no-non-null-assertion
    await createOperationTestFile(node!, OperationRunMode.debug);
    await vscode.debug.startDebugging(undefined, debugConfig);
}

export function getDebugGatewayAddressUrl(serviceName: string): string {
    return `wss://${serviceName}.azure-api.net/debug-0123456789abcdef`;
}

export interface IAuthenticationToken {
    value: string;
}

export interface IUser {
    id: string;
    primaryKey: string;
    secondaryKey: string;
    enabled: boolean;
}
