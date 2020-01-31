/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import WebSiteManagementClient from "azure-arm-website";
import { ServiceClientCredentials, WebResource } from "ms-rest";
import { AzureEnvironment } from 'ms-rest-azure';
import { appendExtensionUserAgent, createAzureClient } from "vscode-azureextensionui";
import * as Constants from "../../constants";
import { nRequest, requestUtil, sendRequest } from "../../utils/requestUtil";
import { signRequest } from "../../utils/signRequest";
import { IAzureClientInfo } from "../AzureClientInfo";
import { IFunctionHostKeyResponse, IFunctionKeys } from "./IFunctionContract";
import { IFunctionContract } from "./IFunctionContract";

export class FunctionAppService {
    public baseUrl: string;

    // Get all functions from a function app
    public async listAllFunctions(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionContract[]> {
        const queryUrl = `${baseUrl}/functions?api-version=${Constants.functionAppApiVersion}`;
        const funcAppObj : string = await requestUtil(queryUrl, credentials);
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(funcAppObj).value;
    }

    // check if the imported function app already has the hostkey, otherwise created
    public async addFuncHostKey(baseUrl: string, credentials: ServiceClientCredentials, serviceName: string): Promise<string> {
        const hostKeys = await this.getFuncHostKeys(baseUrl, credentials);
        const funcAppKeyName = `apim-${serviceName}`;
        if (hostKeys !== undefined && hostKeys.functionKeys !== undefined && hostKeys.functionKeys[funcAppKeyName]) {
            return hostKeys.functionKeys[funcAppKeyName];
        }
        return await this.createFuncHostKey(baseUrl, funcAppKeyName, credentials);
    }

    // Get function hostkey
    public async getFuncHostKeys(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionKeys> {
        // const options = new WebResource();
        // options.method = "POST";
        // options.url = `${baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
        // options.headers = {
        //     ['User-Agent']: appendExtensionUserAgent()
        // };
        // await signRequest(options, credentials);
        // // tslint:disable-next-line: await-promise
        // const funcKeys = await request(options).promise();
        // // tslint:disable-next-line: no-unsafe-any
        const url = `${baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
        return await requestUtil(url, credentials, "POST");
    }

    // Create function hostkey for our apim service
    public async createFuncHostKey(baseUrl: string, funcKeyName: string, credentials: ServiceClientCredentials): Promise<string> {
        // create new webresource
        const options = new WebResource();
        options.method = "PUT";
        options.url = `${baseUrl}/host/default/functionkeys/${funcKeyName}?api-version=2018-11-01`;
        options.headers = {
            ['User-Agent']: appendExtensionUserAgent()
        };
        await signRequest(options, credentials);
        // send request to get new function hostkey
        const funKeyRequest = <nRequest>options;
        funKeyRequest.body = {
            properties: {}
        };
        funKeyRequest.json = true;
        const response: IFunctionHostKeyResponse = await sendRequest(funKeyRequest);
        if (response.properties.value) {
            return String(response.properties.value);
        } else {
            throw new Error("Unexpected null value when generating function host key");
        }
    }

    // Create client for webiste mgmt client
    public getClient(credentials: ServiceClientCredentials, subscriptionId: string, environment: AzureEnvironment): WebSiteManagementClient {
        const clientInfo: IAzureClientInfo = {
            credentials: credentials,
            subscriptionId: subscriptionId,
            environment: environment
        };
        return createAzureClient(clientInfo, WebSiteManagementClient);
    }

    // Get site url
    public getSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, functionName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Web/sites/${functionName}`;
    }
}
