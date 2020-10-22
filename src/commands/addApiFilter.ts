/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from "../extensionVariables";
import { localize } from "../localize";

// tslint:disable: no-any
export async function addApiFilter(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    const filterInput = await askFilter();
    node.filterValue = `contains(properties/displayName,'${filterInput}')`;

    // tslint:disable:no-non-null-assertion
    await node!.refresh();
}

async function askFilter() : Promise<string> {
    const promptStr: string = localize('apiFilterPrompt', 'Enter a value to be filtered for.');
    return (await ext.ui.showInputBox({
        prompt: promptStr,
        placeHolder: 'filter API by',
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            const regexp = /\w+/;
            const isUrlValid = regexp.test(value);
            if (!isUrlValid) {
                return localize("invalidFilterValue", "Provide a valid filter value");
            } else {
                return undefined;
            }
        }
    })).trim();
}
