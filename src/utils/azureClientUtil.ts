/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSiteManagementClient } from "azure-arm-website";
import { ServiceClientCredentials } from "ms-rest";
import { AzureEnvironment } from 'ms-rest-azure';
import * as vscode from 'vscode';
import { createAzureClient } from "vscode-azureextensionui";
import { IAzureClientInfo } from "../azure/azureClientInfo";
import { ext } from "../extensionVariables";

export namespace azureClientUtil {
    export function getClient(credentials: ServiceClientCredentials, subscriptionId: string, environment: AzureEnvironment): WebSiteManagementClient {
        const clientInfo: IAzureClientInfo = {
            credentials: credentials,
            subscriptionId: subscriptionId,
            environment: environment
        };
        return createAzureClient(clientInfo, WebSiteManagementClient);
    }

    // tslint:disable: no-unsafe-any
    export async function selectSubscription(): Promise<string> {
        const azureAccountExtension = vscode.extensions.getExtension('ms-vscode.azure-account');
        // tslint:disable-next-line: no-non-null-assertion
        const azureAccount = azureAccountExtension!.exports;
        await azureAccount.waitForFilters();
        if (azureAccount.status !== 'LoggedIn') {
            throw new Error("Please Log in at first!");
        }
        const subscriptions : {id: string, name: string}[] = azureAccount.filters.map(filter => {return {id: filter.subscription.subscriptionId, name: filter.subscription.displayName}; });
        const subscriptionId = await ext.ui.showQuickPick(subscriptions.map((s) => {
            const option = s.id.concat(' (', s.name, ')');
            return { label: option, subscriptionId: s.id};
        }),                                               { canPickMany: false });
        return subscriptionId.subscriptionId;
    }
}
