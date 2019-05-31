/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import ApiManagementClient from "azure-arm-apimanagement";
import { ISubscriptionRoot } from "vscode-azureextensionui";

export interface IServiceTreeRoot extends ISubscriptionRoot {
    client: ApiManagementClient;
    resourceGroupName: string;
    serviceName: string;
}
