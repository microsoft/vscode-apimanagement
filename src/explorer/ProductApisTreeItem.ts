/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzExtParentTreeItem, ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";
import { ProductApiTreeItem } from "./ProductApiTreeItem";

export interface IProductTreeItemContext extends ICreateChildImplContext {
    apiName: string;
}

export class ProductApisTreeItem extends AzExtParentTreeItem {

    public readonly root: IProductTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IProductTreeRoot) {
        super(parent);
        this.root = root;
    }

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

        let productApisCollection: ApiContract[];
        productApisCollection = await uiUtils.listAllIterator(this.root.client.productApi.listByProduct(this.root.resourceGroupName, this.root.serviceName, this.root.productName, { top: topItemCount }));

        return this.createTreeItemsWithErrorHandling(
            productApisCollection,
            "invalidApiManagementProductApi",
            async (api: ApiContract) => new ProductApiTreeItem(this, api, this.root),
            (api: ApiContract) => {
                return api.name;
            });
    }

    public async createChildImpl(context: IProductTreeItemContext): Promise<ProductApiTreeItem> {
        if (context.apiName) {
            context.showCreatingTreeItem(context.apiName);

            try {
                const product = await this.root.client.productApi.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, this.root.productName, context.apiName);

                return new ProductApiTreeItem(this, product, this.root);
            } catch (error) {
                throw new Error(processError(error, localize("addApiToProductFailed", `Failed to add '${context.apiName}' to product '${this.root.productName}'.`)));
            }
        } else {
            throw Error(localize("", "Expected API name."));
        }
    }
}
