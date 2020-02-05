/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServiceClientCredentials } from "ms-rest";
import { AzureEnvironment } from 'ms-rest-azure';

export interface IAzureClientInfo {
    credentials: ServiceClientCredentials;
    subscriptionId: string;
    environment: AzureEnvironment;
}
