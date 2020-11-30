/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiCollection } from "azure-arm-apimanagement/lib/models";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from "../extensionVariables";

// tslint:disable: no-any
export async function addApiFilter(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    // const filterInput = await askFilter();
    // node.filterValue = (filterInput === "")
    //     ? node.filterValue = undefined
    //     : node.filterValue = `contains(properties/displayName,'${filterInput}')`;

    let nextLink: string | undefined;
    const apiCollection: ApiCollection = nextLink === undefined ?
    await node.root.client.api.listByService(node.root.resourceGroupName, node.root.serviceName, { expandApiVersionSet: true, top: 100}) :
    await node.root.client.api.listByServiceNext(nextLink);

    while (nextLink !== undefined) {
        const curApiCollection: ApiCollection = await node.root.client.api.listByServiceNext(nextLink);
        nextLink = curApiCollection.nextLink;
        apiCollection.concat(curApiCollection);
    }

    const apis = apiCollection.map((s) => {return s; });

    // tslint:disable-next-line: no-non-null-assertion
    const picks = await ext.ui.showQuickPick(apis.map((s) => {return {label: s.displayName!, api: s}; }), { canPickMany: true, placeHolder: 'Select APIs'});

    node.selectedApis = picks.map((s) => s.api);
    // tslint:disable:no-non-null-assertion
    await node!.refresh();
}

// async function askFilter(): Promise<string> {
//     const promptStr: string = localize('apiFilterPrompt', 'Enter a value to be filtered for. Leave empty to reset filter.');
//     return (await ext.ui.showInputBox({
//         prompt: promptStr,
//         placeHolder: 'filter API by',
//         validateInput: async (value: string): Promise<string | undefined> => {
//             value = value ? value.trim() : '';
//             const regexp = /(\w+|)/;
//             const isUrlValid = regexp.test(value);
//             if (!isUrlValid) {
//                 return localize("invalidFilterValue", "Provide a valid filter value");
//             } else {
//                 return undefined;
//             }
//         }
//     })).trim();
// }
