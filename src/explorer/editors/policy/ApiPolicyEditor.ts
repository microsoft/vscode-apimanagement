/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { ServiceClient } from "@azure/ms-rest-js";
import { AzureTreeItem, createGenericClient } from "vscode-azureextensionui";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ApiPolicyEditor extends BasePolicyEditor<IApiTreeRoot> {
    public async getPolicy(context: AzureTreeItem<IApiTreeRoot>): Promise<string> {
        if (context.root.apiType !== undefined && context.root.apiType === 'graphql') {

            const client: ServiceClient = await createGenericClient(context.root.credentials);
            const policyString = await client.sendRequest({
                method: "GET",
                // tslint:disable-next-line: no-non-null-assertion
                url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}/policies/policy?api-version=2021-04-01-preview`
            });
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const policyTemp = policyString.parsedBody;
            return policyTemp.properties.value;
        }
        const policy =  await context.root.client.apiPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, { format: policyFormat });
        return policy._response.bodyAsText;
    }

    public async updatePolicy(context: AzureTreeItem<IApiTreeRoot>, policy: ApiManagementModels.PolicyContract): Promise<string> {
        if (context.root.apiType !== undefined && context.root.apiType === 'graphql') {
            const body = {
                properties: {
                    value: policy.value,
                    format: policy.format
                }
            };
            const client: ServiceClient = await createGenericClient(context.root.credentials);
            const policyString = await client.sendRequest({
                method: "PUT",
                body: body,
                // tslint:disable-next-line: no-non-null-assertion
                url: `https://management.azure.com/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}/policies/policy?api-version=2021-04-01-preview`
            });
            // tslint:disable: no-unsafe-any
            // tslint:disable-next-line: no-unnecessary-local-variable
            const policyTemp = policyString.parsedBody;
            return policyTemp.properties.value;
        }
        const policyResult = await context.root.client.apiPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, policy);
        return policyResult._response.bodyAsText;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
