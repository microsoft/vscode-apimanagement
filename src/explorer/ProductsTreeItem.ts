/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { ProductTreeItem } from "./ProductTreeItem";

export class ProductsTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementProducts';
    public label: string = "Products";
    public contextValue: string = ProductsTreeItem.contextValue;
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const productCollection: ApiManagementModels.ProductCollection = this._nextLink === undefined ?
        await this.root.client.product.listByService(this.root.resourceGroupName, this.root.serviceName,  {top: topItemCount}) :
        await this.root.client.product.listByServiceNext(this._nextLink);

        this._nextLink = productCollection.nextLink;

        return this.createTreeItemsWithErrorHandling(
            productCollection,
            "invalidApiManagementProduct",
            async (product: ApiManagementModels.ProductContract) => new ProductTreeItem(this, product),
            (product: ApiManagementModels.ProductContract) => {
                return product.name;
            });
    }
 }
