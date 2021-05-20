/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import requestPromise from "request-promise";
import { AzureTreeItem } from "vscode-azureextensionui";
import { IApiContract } from "../../../azure/apim/TempApiContract";
import { SharedAccessToken } from "../../../constants";
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
            const requestOptions : requestPromise.RequestPromiseOptions = {
                method: "GET",
                headers: {
                    Authorization: SharedAccessToken
                }
            };
            const apiString = await <Thenable<string>>requestPromise(`https://${context.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}?api-version=2021-04-01-preview`, requestOptions).promise();
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const apiTemp : IApiContract = JSON.parse(apiString);
            return apiTemp;
        }
        return await context.root.client.api.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName);
    }

    public async updateDataInternal(context: AzureTreeItem<IApiTreeRoot>, payload: ApiManagementModels.ApiCreateOrUpdateParameter): Promise<ApiManagementModels.ApiContract | IApiContract> {
        if (context.root.apiType !== undefined && context.root.apiType === 'graphql') {
            const requestOptions : requestPromise.RequestPromiseOptions = {
                method: "PUT",
                headers: {
                    Authorization: SharedAccessToken
                },
                body: JSON.stringify(payload)
            };
            const apiString = await <Thenable<string>>requestPromise(`https://${context.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}?api-version=2021-04-01-preview`, requestOptions).promise();
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const apiTemp : IApiContract = JSON.parse(apiString);
            return apiTemp;
        }
        return await context.root.client.api.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, payload);
    }
}
