/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServiceClientCredentials } from "ms-rest";
import * as Constants from "../../constants";
import { nonNullOrEmptyValue } from "../../utils/nonNull";
import { requestUtil } from "../../utils/requestUtil";
import { IFunctionHostKeyContract, IFunctionKeys, IWebAppContract } from "./contracts";
import { IFunctionContract } from "./contracts";

export class FunctionAppService {
    public baseUrl: string;
    public credentials: ServiceClientCredentials;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public functionName: string;

    constructor(credentials: ServiceClientCredentials, endPointUrl: string, subscriptionId: string, resourceGroup: string, functionName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, functionName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.functionName = functionName;
    }

    // Get all functions from a function app
    public async listAllFunctions(): Promise<IFunctionContract[]> {
        const queryUrl = `${this.baseUrl}/functions?api-version=${Constants.functionAppApiVersion}`;
        const funcAppObj: string = await requestUtil(queryUrl, this.credentials);
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(funcAppObj).value;
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
        const webConfigUrl = `${this.baseUrl}/config/web?api-version=${Constants.functionAppApiVersion}`;
        await requestUtil(webConfigUrl, this.credentials, "PUT", webAppConfig);
    }

    // Get function app config
    private async getFuncAppConfig(): Promise<IWebAppContract> {
        const webConfigUrl = `${this.baseUrl}/config/web?api-version=${Constants.functionAppApiVersion}`;
        const res: string =  await requestUtil(webConfigUrl, this.credentials, "GET");
        const result = JSON.parse(res);
        return <IWebAppContract>result;
    }

    // Get function hostkey
    private async getFuncHostKeys(): Promise<IFunctionKeys> {
        const url = `${this.baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
        return await requestUtil(url, this.credentials, "POST");
    }

    // Get site url
    private genSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, functionName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${functionName}`;
    }

    // Create function hostkey for our apim service
    private async createFuncHostKey(funcKeyName: string): Promise<string> {
        const funcKeyUrl = `${this.baseUrl}/host/default/functionkeys/${funcKeyName}?api-version=${Constants.functionAppCreateKeyApiVersion}`;
        const response: IFunctionHostKeyContract = await requestUtil(funcKeyUrl, this.credentials, "PUT", {properties: {}});
        return nonNullOrEmptyValue(response.properties.value);
    }
}
