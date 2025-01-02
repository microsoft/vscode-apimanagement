/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Environment } from "@azure/ms-rest-azure-env";
import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";

export interface IAzureClientInfo {
    credentials: AzExtServiceClientCredentials;
    subscriptionId: string;
    environment: Environment;
}
