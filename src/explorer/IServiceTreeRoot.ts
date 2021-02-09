/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ApiManagementClient } from "@azure/arm-apimanagement";
import { ISubscriptionContext } from "vscode-azureextensionui";

export interface IServiceTreeRoot extends ISubscriptionContext {
    client: ApiManagementClient;
    resourceGroupName: string;
    serviceName: string;
}
