/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Environment } from "@azure/ms-rest-azure-env";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";

export interface IAzureClientInfo {
    credentials: TokenCredentialsBase;
    subscriptionId: string;
    environment: Environment;
}
