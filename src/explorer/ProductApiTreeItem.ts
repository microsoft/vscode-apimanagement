/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract } from "@azure/arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";

export class ProductApiTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureApiManagementProductApi';
    public contextValue: string = ProductApiTreeItem.contextValue;
    public readonly root: IProductTreeRoot;

    private _label: string;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly productApiContract: ApiContract,
        root: IProductTreeRoot) {
        super(parent);
        this.root = root;
        this._label = nonNullProp(productApiContract, 'displayName');
    }

    public get label() : string {
        return this._label;
    }

    // @ts-ignore
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('api');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmProductAPIRemove", `Are you sure you want to remove API '${this.productApiContract.displayName}' from product '${this.root.productName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingProductAPI", `Removing API "${this.productApiContract.displayName}" from product '${this.root.productName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.productApi.delete(this.root.resourceGroupName, this.root.serviceName, this.root.productName, nonNullProp(this.productApiContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedProduct", `Successfully removed API "${this.productApiContract.displayName}" from product '${this.root.productName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }
}
