/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServiceClient } from "@azure/ms-rest-js";
import { ProgressLocation, window } from "vscode";
import { createGenericClient } from "vscode-azureextensionui";
import { showSavePromptConfigKey } from "../../../constants";
import { localize } from "../../../localize";
import { GraphqlApiTreeItem } from "../../GraphqlApiTreeItem";
import { Editor } from "../Editor";

// tslint:disable: no-unsafe-any
export class GraphqlApiSchemaEditor extends Editor<GraphqlApiTreeItem> {
    constructor() {
        super(showSavePromptConfigKey);
    }

    public async getData(context: GraphqlApiTreeItem): Promise<string> {
        const client: ServiceClient = await createGenericClient(context.root.credentials);
        const schemasString = await client.sendRequest({
            method: "GET",
            // tslint:disable-next-line: no-non-null-assertion
            url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}/schemas/default?api-version=2021-04-01-preview`
        });
        return schemasString.parsedBody.properties.document.value;
    }

    public async updateData(context: GraphqlApiTreeItem, data: string): Promise<string> {
        return window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("updateAPISchema", `Applying changes to Graphql API schema '${context.root.apiName}' in API Management instance ${context.root.serviceName}...`),
                cancellable: false
            },
            async () => {
                const body = {
                    properties: {
                        contentType: "application/vnd.ms-azure-apim.graphql.schema",
                        document: {
                            value: data
                        }
                    }
                };

                const client: ServiceClient = await createGenericClient(context.root.credentials);
                await client.sendRequest({
                    method: "PUT",
                    body: body,
                    // tslint:disable-next-line: no-non-null-assertion
                    url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}/schemas/default?api-version=2021-04-01-preview`
                });
            }
        ).then(async () => {
            window.showInformationMessage(localize("updateAPISchema", `Changes to API '${context.apiContract.name}' were succefully uploaded to cloud.`));
            //await context.refresh();
            return this.getData(context);
        });
    }

    public async getFilename(context: GraphqlApiTreeItem): Promise<string> {
        return `${context.root.serviceName}-${context.root.apiName}-schema.js`;
    }
    public async getDiffFilename(context: GraphqlApiTreeItem): Promise<string> {
        return `${context.root.serviceName}-${context.root.apiName}-schema-temp.js`;
    }
    public async getSaveConfirmationText(context: GraphqlApiTreeItem): Promise<string> {
        return localize("", `Saving will update the Grapql API Schema '${context.apiContract.name}'.`);
    }
    public async getSize(_context: GraphqlApiTreeItem): Promise<number> {
        throw new Error("Method not implemented.");
    }
}
