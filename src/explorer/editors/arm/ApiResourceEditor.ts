/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { ServiceClient } from "@azure/ms-rest-js";
import { AzureTreeItem, createGenericClient } from "vscode-azureextensionui";
import { IApiContract } from "../../../azure/apim/TempApiContract";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class ApiResourceEditor extends BaseArmResourceEditor<IApiTreeRoot>  {
    public entityType: string = "API";
    constructor() {
        super();
    }

    public async getDataInternal(context: AzureTreeItem<IApiTreeRoot>): Promise<ApiManagementModels.ApiContract | IApiContract> {
        if (context.root.apiType !== undefined && context.root.apiType === 'graphql') {
            const client: ServiceClient = await createGenericClient(context.root.credentials);
            const apiString = await client.sendRequest({
                method: "GET",
                // tslint:disable-next-line: no-non-null-assertion
                url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}?api-version=2021-04-01-preview`
            });
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const apiTemp : IApiContract = apiString.parsedBody;
            return apiTemp;
        }
        return await context.root.client.api.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName);
    }

    public async updateDataInternal(context: AzureTreeItem<IApiTreeRoot>, payload: ApiManagementModels.ApiCreateOrUpdateParameter): Promise<ApiManagementModels.ApiContract | IApiContract> {
        if (context.root.apiType !== undefined && context.root.apiType === 'graphql') {
            const client: ServiceClient = await createGenericClient(context.root.credentials);
            const apiString = await client.sendRequest({
                method: "PUT",
                body: payload,
                // tslint:disable-next-line: no-non-null-assertion
                url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}?api-version=2021-04-01-preview`
            });
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const apiTemp : IApiContract = apiString.parsedBody;
            return apiTemp;
        }
        return await context.root.client.api.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, payload);
    }
}
