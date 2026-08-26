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
        // Pass node.subscription, not node: a dual CJS/ESM azext-utils build makes createAzureClient's `instanceof AzExtTreeItem` check fail, which would drop `environment`.
        // tslint:disable-next-line: no-any
        return createAzureClient([context, node.subscription], WebSiteManagementClient as any) as any;
    }

    // tslint:disable: no-unsafe-any
    export async function selectSubscription(_context: IActionContext): Promise<string> {
        await AzureAccount.selectSubscriptions();
        const res = await AzureSubscriptionHelper.getFilteredSubscriptions();
        return res[0].subscriptionId;
    }
}
