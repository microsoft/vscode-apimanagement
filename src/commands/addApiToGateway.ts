/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { GatewayApisTreeItem } from "../explorer/GatewayApisTreeItem";
import { GatewaysTreeItem } from "../explorer/GatewaysTreeItem";
import { GatewayTreeItem } from "../explorer/GatewayTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";

// tslint:disable: no-any
export async function addApiToGateway(node?: GatewayApisTreeItem): Promise<void> {
    let gatewayNode: GatewayTreeItem;
    if (!node) {
        gatewayNode = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
        node = gatewayNode.gatewayApisTreeItem;
    } else {
        gatewayNode = <GatewayTreeItem>node.parent;
    }

    const serviceTreeItem = <ServiceTreeItem>(<GatewaysTreeItem><unknown>gatewayNode.parent).parent;

    const apiTreeItem = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, serviceTreeItem);

    const apiName = nonNullProp(apiTreeItem.apiContract, "name");
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("addApiToGateway", `Adding API '${apiName}' to gateway ${node.root.gatewayName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild({ apiName: apiName}); }
    ).then(async () => {
        // tslint:disable:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("addedApiToGateway", `Added API '${apiName}' to gateway ${node!.root.gatewayName}.`));
    });
}
