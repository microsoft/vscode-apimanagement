/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { IOperationTreeRoot } from "../../IOperationTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class OperationResourceEditor extends BaseArmResourceEditor<IOperationTreeRoot>  {
    public entityType: string = "Operation";
    constructor() {
        super();
    }

    public async getDataInternal(context: AzureTreeItem<IOperationTreeRoot>): Promise<ApiManagementModels.OperationContract> {
        return await context.root.client.apiOperation.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName);
    }

    public async updateDataInternal(context: AzureTreeItem<IOperationTreeRoot>, payload: ApiManagementModels.OperationContract): Promise<ApiManagementModels.OperationContract> {
        return await context.root.client.apiOperation.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, payload);
    }
}
