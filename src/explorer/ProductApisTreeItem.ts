/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";
import { ProductApiTreeItem } from "./ProductApiTreeItem";

export class ProductApisTreeItem extends AzureParentTreeItem<IProductTreeRoot> {
    // @ts-ignore
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementProductApis';
    public label: string = "Apis";
    public contextValue: string = ProductApisTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.ProductApi', 'Product API');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const productApisCollection: ApiManagementModels.ApiCollection = this._nextLink === undefined ?
            await this.root.client.productApi.listByProduct(this.root.resourceGroupName, this.root.serviceName, this.root.productName, {top: topItemCount}) :
            await this.root.client.productApi.listByProductNext(this._nextLink);

        this._nextLink = productApisCollection.nextLink;

        return this.createTreeItemsWithErrorHandling(
            productApisCollection,
            "invalidApiManagementProductApi",
            // @ts-ignore
            async (api: ApiManagementModels.ApiContract) => new ProductApiTreeItem(this, api),
            (api: ApiManagementModels.ApiContract) => {
                return api.name;
            });
    }

    // @ts-ignore
    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { apiName: string }): Promise<ProductApiTreeItem> {
        if (userOptions && userOptions.apiName) {
            const apiName = userOptions.apiName;
            showCreatingTreeItem(apiName);

            try {
                const product = await this.root.client.productApi.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, this.root.productName, apiName);
                // @ts-ignore
                return new ProductApiTreeItem(this, product);
            } catch (error) {
                throw new Error(processError(error, localize("addApiToProductFailed", `Failed to add '${apiName}' to product '${this.root.productName}'.`)));
            }
        } else {
            throw Error("Expected API name.");
        }
    }
}
