/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Product, ProductContract } from "@azure/arm-apimanagement";
import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { topItemCount } from "../constants";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { ProductTreeItem } from "./ProductTreeItem";

export class ProductsTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementProducts';
    public label: string = "Products";
    public contextValue: string = ProductsTreeItem.contextValue;
    public readonly root: IServiceTreeRoot;
    private _nextLink: string | undefined;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const productCollection: ProductContract[] = await uiUtils.listAllIterator(
            this.root.client.product.listByService(this.root.resourceGroupName, this.root.serviceName, { top: topItemCount })
        );

        return this.createTreeItemsWithErrorHandling(
            productCollection,
            "invalidApiManagementProduct",
            async (product: Product) => new ProductTreeItem(this, product),
            (product: Product) => {
                return product.name;
            });
    }
}
