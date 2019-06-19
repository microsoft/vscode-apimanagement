/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { ProductApisTreeItem } from "../explorer/ProductApisTreeItem";
import { ProductsTreeItem } from "../explorer/ProductsTreeItem";
import { ProductTreeItem } from "../explorer/ProductTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";

// tslint:disable: no-any
export async function addApiToProduct(node?: ProductApisTreeItem): Promise<void> {
    let productNode: ProductTreeItem;
    if (!node) {
        productNode = <ProductTreeItem>await ext.tree.showTreeItemPicker(ProductTreeItem.contextValue);
        node = productNode.productApisTreeItem;
    } else {
        productNode = <ProductTreeItem>node.parent;
    }

    const serviceTreeItem = <ServiceTreeItem>(<ProductsTreeItem><unknown>productNode.parent).parent;

    const apiTreeItem = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, serviceTreeItem);

    const apiName = nonNullProp(apiTreeItem.apiContract, "name");
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("addApiToProduct", `Adding API '${apiName}' to product ${node.root.productName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild({ apiName: apiName}); }
    ).then(async () => {
        // tslint:disable:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("addedApiToProduct", `Added API '${apiName}' to product ${node!.root.productName}.`));
    });
}
