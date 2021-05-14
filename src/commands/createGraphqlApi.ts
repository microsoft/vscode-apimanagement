/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//import { ServiceClient } from "@azure/ms-rest-js";
import { createGenericClient, IActionContext } from "../../extension.bundle";
import { ApisTreeItem, IApiTreeItemContext } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

// tslint:disable-next-line: export-name
export async function createGraphqlApi(context: IActionContext & Partial<IApiTreeItemContext>, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    
    await askLink();
    await createGenericClient(node.root.credentials);


}

async function askLink() : Promise<string> {
    const promptStr: string = localize('apiLinkPrompt', 'Specify a Graphql OpenAPI link.');
    return (await ext.ui.showInputBox({
        prompt: promptStr,
        placeHolder: 'https://',
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            const regexp = /http(s?):\/\/[\d\w][\d\w]*(\.[\d\w][\d\w-]*)*(:\d+)?(\/[\d\w-\.\?,'/\\\+&amp;=:%\$#_]*)?/;
            const isUrlValid = regexp.test(value);
            if (!isUrlValid) {
                return localize("invalidOpenApiLink", "Provide a valid link. example - https://petstore.swagger.io/v2/swagger.json");
            } else {
                return undefined;
            }
        }
    })).trim();
}
