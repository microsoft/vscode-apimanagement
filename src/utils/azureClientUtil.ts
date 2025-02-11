/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSiteManagementClient } from "@azure/arm-appservice";
import { createAzureClient } from '@microsoft/vscode-azext-azureutils';
import { AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { AzureAccount } from "../azure/azureLogin/azureAccount";
import { AzureSubscriptionHelper } from "../azure/azureLogin/subscriptions";

export namespace azureClientUtil {
    export function getClient(context: IActionContext, node: AzExtTreeItem): WebSiteManagementClient {
        return createAzureClient([context, node], WebSiteManagementClient);
    }

    // tslint:disable: no-unsafe-any
    export async function selectSubscription(context: IActionContext): Promise<string> {
        context;
        await AzureAccount.selectSubscriptions();
        let res = await AzureSubscriptionHelper.getFilteredSubscriptions();
        return res[0].subscriptionId;
    }
}
