/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { WebSiteManagementClient } from "azure-arm-website";
import { ServiceClientCredentials } from "ms-rest";
import { AzureEnvironment } from 'ms-rest-azure';
import { createAzureClient } from "vscode-azureextensionui";
import { IAzureClientInfo } from "../azure/azureClientInfo";

export namespace azureClientUtil {
    export function getClient(credentials: ServiceClientCredentials, subscriptionId: string, environment: AzureEnvironment): WebSiteManagementClient {
        const clientInfo: IAzureClientInfo = {
            credentials: credentials,
            subscriptionId: subscriptionId,
            environment: environment
        };
        return createAzureClient(clientInfo, WebSiteManagementClient);
    }
}
