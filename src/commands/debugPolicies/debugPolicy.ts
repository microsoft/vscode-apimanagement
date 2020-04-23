/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiOperationTreeItem } from '../../explorer/ApiOperationTreeItem';
import { ext } from "../../extensionVariables";
import { createOperationTestFile, OperationRunMode } from '../testOperation';

// tslint:disable: no-unsafe-any
// tslint:disable-next-line: export-name
export async function debugApiPolicy(node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
    }

    // tslint:disable-next-line: no-non-null-assertion
    const gatewayAddress = getDebugGatewayAddressDogfoodUrl(node!.root.serviceName);
    const managementUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}`;
    //const mode = "development";

    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true,
        gatewayAddress: gatewayAddress,
        managementAddress: managementUrl,
        subscriptionId: node.root.subscriptionId
    };

    // const debugConfig2: vscode.DebugConfiguration = {
    //     type: "apim-policy",
    //     request: "launch",
    //     name: "Attach to APIM",
    //     stopOnEntry: true,
    //     gatewayAddress: 'wss://proxy.apim.net/debug-0123456789abcdef',
    //     managementAddress: 'https://management.apim.net/subscriptions/x/resourceGroups/x/providers/microsoft.apimanagement/service/x',
    //     managementAuth: 'SharedAccessSignature integration&202004300042&Hh3jin6eJ22yc+MSAkaUl6+TgHwq8rRhnKt2UqQMugkiDsK5N3wJWWhjQscHiws0FID9ogk7sa0i7W/h2ydczA=='
    // };

    if (!vscode.debug.activeDebugSession) {
        await vscode.debug.startDebugging(undefined, debugConfig);
        // if (mode === "development") {
        //     await vscode.debug.startDebugging(undefined, debugConfig2);
        // } else {
        //     await vscode.debug.startDebugging(undefined, debugConfig);
        // }
    }
    // tslint:disable-next-line: no-non-null-assertion
    await createOperationTestFile(node!, OperationRunMode.debug);
}

export function getDebugGatewayAddressUrl(serviceName: string): string {
    return `wss://${serviceName}.azure-api.net/debug-0123456789abcdef`;
}

export function getDebugGatewayAddressDogfoodUrl(serviceName: string): string {
    return `wss://${serviceName}.preview.int-azure-api.net/debug-0123456789abcdef`;
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
