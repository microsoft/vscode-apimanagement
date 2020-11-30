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
        const subscriptionIds : string[] = azureAccount.filters.map(filter => filter.subscription.subscriptionId);
        const subscriptionId = await ext.ui.showQuickPick(subscriptionIds.map((s) => { return { label: s}; }), { canPickMany: false });
        return subscriptionId.label;
    }
}
