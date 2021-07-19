/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from '../azure/apim/ApimService';
import { ILoginLinkRequestContract } from '../azure/apim/contracts';
import { ConnectionTreeItem } from "../explorer/ConnectionTreeItem";
import { ext } from "../extensionVariables";

export async function authorizeConnection(context: IActionContext, node?: ConnectionTreeItem): Promise<void> {
    if (!node) {
        const connectionNode = <ConnectionTreeItem>await ext.tree.showTreeItemPicker(ConnectionTreeItem.contextValue, context);
        node = connectionNode;
    }

    const extensionId = "ms-azuretools.vscode-apimanagement";
    const redirectUrl = `vscode://${extensionId}`;

    const apimService = new ApimService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, node.root.resourceGroupName, node.root.serviceName);
    
    const requestBody: ILoginLinkRequestContract = {
        parameters: [
            {
                parameterName: "token",
                redirectUrl: redirectUrl
            }
        ]
    };

    const loginLinks = await apimService.listLoginLinks(node.root.tokenProviderName, node.connectionContract.name, requestBody);
    vscode.env.openExternal(vscode.Uri.parse(loginLinks.Value[0].Link));
}