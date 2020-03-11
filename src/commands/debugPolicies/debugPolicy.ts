/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiOperationTreeItem } from '../../explorer/ApiOperationTreeItem';
import { ext } from "../../extensionVariables";
import { requestUtil } from '../../utils/requestUtil';
import { createOperationTestFile, OperationRunMode } from '../testOperation';

// tslint:disable-next-line: export-name
export async function debugApiPolicy(node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
    }

    // tslint:disable-next-line: no-non-null-assertion
    const gatewayAddress = getDebugGatewayAddressUrl(node!.root.serviceName);
    // //const managementUrl = 'https://management.apim.net/subscriptions/a200340d-6b82-494d-9dbf-687ba6e33f9e/resourceGroups/Api-Default-West-US/providers/microsoft.apimanagement/service/devportal-lrp';
    //const managementUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}`;
    const managementUrl = `https://${node.root.serviceName}.management.azure-api.net/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}`;

    const authUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}/users/integration/token?api-version=2018-06-01-preview`;
    const now = new Date();
    const timeSpan = now.setDate(now.getDate() + 29);
    const expiryDate = (new Date(timeSpan)).toISOString();
    const managementAuth : IAuthenticationToken = await requestUtil(authUrl, node.root.credentials, "POST", {
        keyType: "primary",
        expiry: expiryDate
    });

    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true,
        gatewayAddress: gatewayAddress,
        managementAddress: managementUrl,
        // gatewayAddress: 'wss://proxy.apim.net/debug-0123456789abcdef',
        // managementAddress: 'https://management.apim.net/subscriptions/a200340d-6b82-494d-9dbf-687ba6e33f9e/resourceGroups/Api-Default-West-US/providers/microsoft.apimanagement/service/devportal-lrp',
        managementAuth: `SharedAccessSignature ${managementAuth.value}`
    };

    await vscode.debug.startDebugging(undefined, debugConfig);
    // tslint:disable-next-line: no-non-null-assertion
    await createOperationTestFile(node!, OperationRunMode.debug);
}

export function getDebugGatewayAddressUrl(serviceName: string): string {
    // return 'wss://proxy.apim.net/debug-0123456789abcdef';
    return `wss://${serviceName}.azure-api.net/debug-0123456789abcdef`;
}

export interface IAuthenticationToken {
    value: string;
}
