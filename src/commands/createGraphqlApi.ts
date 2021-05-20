/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//import { ServiceClient } from "@azure/ms-rest-js";
import requestPromise from "request-promise";
import { ProgressLocation, window } from "vscode";
import { IActionContext } from "../../extension.bundle";
import { SharedAccessToken } from "../constants";
import { ApisTreeItem, IApiTreeItemContext } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { apiUtil } from "../utils/apiUtil";

// tslint:disable-next-line: export-name
export async function createGraphqlApi(context: IActionContext & Partial<IApiTreeItemContext>, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    const link = await askLink();
    const apiName = await apiUtil.askApiName();
    const path = await apiUtil.askPath();
    const body = {
        name : apiName,
        properties: {
            displayName: apiName,
            subscriptionRequired: true,
            serviceUrl: link,
            path: path,
            type: "graphql",
            protocols: [
                "https"
            ]
        }
    };

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("", `Creating new Graphql API'...`),
            cancellable: false
        },
        async () => {
            const requestOptions : requestPromise.RequestPromiseOptions = {
                method: "PUT",
                headers: {
                    Authorization: SharedAccessToken
                },
                body: JSON.stringify(body)
            };
            // tslint:disable-next-line: no-non-null-assertion
            await <Thenable<string>>requestPromise(`https://${node!.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${node!.root.subscriptionId}/resourceGroups/${node!.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node!.root.serviceName}/apis/${apiName}?api-version=2021-04-01-preview`, requestOptions).promise();
        }
    ).then(async () => {
        window.showInformationMessage(localize("", `New Graphql API has been created!`));
        node?.refresh(context);
    });

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
