/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, HttpOperationResponse, ParameterValue, ServiceClient } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { clientOptions } from "../clientOptions";
import * as Constants from "../../constants";
import { nonNullOrEmptyValue } from "../../utils/nonNull";
import { IFunctionKeys, IWebAppContract } from "./contracts";
import { IFunctionContract } from "./contracts";

export class FunctionAppService {
    public baseUrl: string;
    public credentials: TokenCredentialsBase;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public functionName: string;

    constructor(credentials: TokenCredentialsBase, endPointUrl: string, subscriptionId: string, resourceGroup: string, functionName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, functionName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.functionName = functionName;
    }

    // Get all functions from a function app
    public async listAllFunctions(): Promise<IFunctionContract[]> {
        const result = await this.request(`${this.baseUrl}/functions?api-version=${Constants.functionAppApiVersion}`, "GET");
        // tslint:disable-next-line: no-unsafe-any
        return <IFunctionContract[]>(result.parsedBody.value);
    }

    // check if the imported function app already has the hostkey, otherwise created
    public async addFuncHostKeyForApim(keyName: string): Promise<string> {
        const hostKeys = await this.getFuncHostKeys();
        const funcAppKeyName = `apim-${keyName}`;
        if (hostKeys !== undefined && hostKeys.functionKeys !== undefined && hostKeys.functionKeys[funcAppKeyName]) {
            return hostKeys.functionKeys[funcAppKeyName];
        }
        return await this.createFuncHostKey(funcAppKeyName);
    }

    // Update function app config
    public async getWebAppConfig(resourceGroup: string, serviceName: string, apiName: string): Promise<void> {
        const webAppConfig: IWebAppContract = await this.getFuncAppConfig();
        const apiConfigId = `/subscriptions/${this.subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${serviceName}/apis/${apiName}`;
        if (webAppConfig.properties.apiManagementConfig === null) {
            webAppConfig.properties.apiManagementConfig = {
                id: apiConfigId
            };
        } else if (!webAppConfig.properties.apiManagementConfig.id) {
            webAppConfig.properties.apiManagementConfig.id = apiConfigId;
        }
        await this.request(`${this.baseUrl}/config/web?api-version=${Constants.functionAppApiVersion}`, "PUT", undefined, webAppConfig);
    }

    // Get function app config
    private async getFuncAppConfig(): Promise<IWebAppContract> {
        const webConfigUrl = `${this.baseUrl}/config/web?api-version=${Constants.functionAppApiVersion}`;
        const result = await this.request(webConfigUrl, "GET");
        return <IWebAppContract>result.parsedBody;
    }

    // Get function hostkey
    private async getFuncHostKeys(): Promise<IFunctionKeys> {
        const url = `${this.baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
        const result = await this.request(url, "POST");
        return <IFunctionKeys>result.parsedBody;
    }

    // Get site url
    private genSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, functionName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${functionName}`;
    }

    // Create function hostkey for our apim service
    private async createFuncHostKey(funcKeyName: string): Promise<string> {
        const funcKeyUrl = `${this.baseUrl}/host/default/functionkeys/${funcKeyName}?api-version=${Constants.functionAppCreateKeyApiVersion}`;
        const result = await this.request(funcKeyUrl, "PUT", undefined, {properties: {}});
        // tslint:disable-next-line: no-unsafe-any
        return nonNullOrEmptyValue(<string>result.parsedBody.properties.value);
    }

    // tslint:disable-next-line: no-any
    private async request(url: string, method: HttpMethods, queryParameters?: { [key: string]: any | ParameterValue }, body?: any): Promise<HttpOperationResponse> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        return await client.sendRequest({
            method: method,
            url: url,
            queryParameters: queryParameters,
            body: body
        });
    }
}
