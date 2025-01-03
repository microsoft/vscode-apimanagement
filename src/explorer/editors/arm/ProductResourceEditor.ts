/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProductContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { IProductTreeRoot } from "../../IProductTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

export class ProductResourceEditor extends BaseArmResourceEditor<IProductTreeRoot>  {
    public entityType: string = "Product";
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IProductTreeRoot>): Promise<ProductContract> {
        return await context.root.client.product.get(context.root.resourceGroupName, context.root.serviceName, context.root.productName);
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IProductTreeRoot>, payload: ProductContract): Promise<ProductContract> {
        return await context.root.client.product.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.productName, payload);
    }
}
