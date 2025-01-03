/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract } from "@azure/arm-apimanagement/src/models";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from "../extensionVariables";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";

// tslint:disable: no-any
// tslint:disable: no-non-null-assertion
export async function addApiFilter(context: IActionContext, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    let apiCollection: ApiContract[];
    apiCollection = await uiUtils.listAllIterator(node.root.client.api.listByService(node.root.resourceGroupName, node.root.serviceName));

    // filter revisions
    const apis = apiCollection.map((s) => {return s; }).filter((s) => (s.isCurrent !== undefined && s.isCurrent === true ));

    const picks = await context.ui.showQuickPick(apis.map((s) => {
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
    await node!.refresh(context);
}
