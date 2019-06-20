/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { IProductTreeRoot } from "../../IProductTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class ProductResourceEditor extends BaseArmResourceEditor<IProductTreeRoot>  {
    public entityType: string = "Product";
    constructor() {
        super();
    }

    public async getDataInternal(context: AzureTreeItem<IProductTreeRoot>): Promise<ApiManagementModels.ProductContract> {
        return await context.root.client.product.get(context.root.resourceGroupName, context.root.serviceName, context.root.productName);
    }

    public async updateDataInternal(context: AzureTreeItem<IProductTreeRoot>, payload: ApiManagementModels.ProductContract): Promise<ApiManagementModels.ProductContract> {
        return await context.root.client.product.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.productName, payload);
    }
}
