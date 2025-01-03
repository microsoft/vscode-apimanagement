/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";
import { IOperationTreeRoot } from "../../IOperationTreeRoot";

// tslint:disable-next-line:no-any
export class OperationResourceEditor extends BaseArmResourceEditor<IOperationTreeRoot>  {
    public entityType: string = "Operation";
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IOperationTreeRoot>): Promise<OperationContract> {
        return await context.root.client.apiOperation.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName);
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IOperationTreeRoot>, payload: OperationContract): Promise<OperationContract> {
        return await context.root.client.apiOperation.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, payload);
    }
}
