/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { AzureParentTreeItem, AzureTreeItem, ISubscriptionRoot } from "vscode-azureextensionui";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { ProductApisTreeItem } from "./ProductApisTreeItem";
import { ProductPolicyTreeItem } from "./ProductPolicyTreeItem";
import { ProductsTreeItem } from "./ProductsTreeItem";

export class ProductTreeItem extends AzureParentTreeItem<IProductTreeRoot> {
    public static contextValue: string = 'azureApiManagementProductTreeItem';
    public contextValue: string = ProductTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showArmProduct';
    public readonly policyTreeItem: ProductPolicyTreeItem;
    public readonly productApisTreeItem: ProductApisTreeItem;

    private _label: string;
    private _root: IProductTreeRoot;

    constructor(
        parent: ProductsTreeItem,
        public readonly productContract: ApiManagementModels.ProductContract) {
        super(parent);
        this._label = nonNullProp(this.productContract, 'displayName');
        this._root = this.createRoot(parent.root);

        this.productApisTreeItem = new ProductApisTreeItem(this);
        this.policyTreeItem = new ProductPolicyTreeItem(this);
    }

    public get label() : string {
        return this._label;
    }

    public get root(): IProductTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('product');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IProductTreeRoot>[]> {
        return [this.productApisTreeItem, this.policyTreeItem];
    }

    private createRoot(subRoot: ISubscriptionRoot): IProductTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            productName: nonNullProp(this.productContract, 'name')
        });
    }
}
