/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiCreateOrUpdateParameter } from "@azure/arm-apimanagement";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";

// tslint:disable-next-line:no-any
export class ApiResourceEditor extends BaseArmResourceEditor<IApiTreeRoot>  {
    public entityType: string = "API";
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>): Promise<ApiContract> {
        return await context.root.client.api.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName);
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>, payload: ApiCreateOrUpdateParameter): Promise<ApiContract> {
        return await context.root.client.api.beginCreateOrUpdateAndWait(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, payload);
    }
}
