/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSiteManagementClient } from "@azure/arm-appservice";
import * as vscode from 'vscode';
import { createAzureClient } from '@microsoft/vscode-azext-azureutils';
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";

export namespace azureClientUtil {
    export function getClient(context: IActionContext, node: AzExtTreeItem): WebSiteManagementClient {
        return createAzureClient([context, node], WebSiteManagementClient);
    }

    // tslint:disable: no-unsafe-any
    export async function selectSubscription(): Promise<string> {
        const azureAccountExtension = vscode.extensions.getExtension('ms-vscode.azure-account');
        // tslint:disable-next-line: no-non-null-assertion
        const azureAccount = azureAccountExtension!.exports;
        await azureAccount.waitForFilters();
        if (azureAccount.status !== 'LoggedIn') {
            throw new Error(localize("", "Please Log in at first!"));
        }
        const subscriptions : {id: string, name: string}[] = azureAccount.filters.map(filter => {return {id: filter.subscription.subscriptionId, name: filter.subscription.displayName}; });
        const subscriptionId = await ext.ui.showQuickPick(subscriptions.map((s) => {
            const option = s.id.concat(' (', s.name, ')');
            return { label: option, subscriptionId: s.id};
        }),                                               { canPickMany: false, placeHolder: localize("", "Please choose the Azure subscription")});
        return subscriptionId.subscriptionId;
    }
}
