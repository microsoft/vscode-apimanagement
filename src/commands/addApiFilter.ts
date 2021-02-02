/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiCollection } from "@azure/arm-apimanagement/src/models";
import { IActionContext } from "vscode-azureextensionui";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from "../extensionVariables";

// tslint:disable: no-any
// tslint:disable: no-non-null-assertion
export async function addApiFilter(context: IActionContext, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    let nextLink: string | undefined;
    const apiCollection: ApiCollection = nextLink === undefined ?
    await node.root.client.api.listByService(node.root.resourceGroupName, node.root.serviceName, {expandApiVersionSet: false, top: 100}) :
    await node.root.client.api.listByServiceNext(nextLink);

    while (nextLink !== undefined) {
        const curApiCollection: ApiCollection = await node.root.client.api.listByServiceNext(nextLink);
        nextLink = curApiCollection.nextLink;
        apiCollection.concat(curApiCollection);
    }

    // filter revisions
    const apis = apiCollection.map((s) => {return s; }).filter((s) => (s.isCurrent !== undefined && s.isCurrent === true ));

    const picks = await ext.ui.showQuickPick(apis.map((s) => {
        let apiName = s.displayName!;
        if (s.apiVersionSetId !== undefined) {
            if (s.apiVersion !== undefined) {
                apiName = apiName.concat(" (VersionSet) - ", s.apiVersion);
            } else {
                apiName = apiName.concat(" (VersionSet) - Original");
            }
        }
        let picked = false;
        for (const api of node!.selectedApis) {
            if (api.name! === s.name!) {
                picked = true;
            }
        }
        return {label: apiName, api: s, picked: picked};
    }),                                      { canPickMany: true, placeHolder: 'Select APIs'});

    node.selectedApis = picks.map((s) => s.api);
    // tslint:disable:no-non-null-assertion
    await node!.refresh();
}
