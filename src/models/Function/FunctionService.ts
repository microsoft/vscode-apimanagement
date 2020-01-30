/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import WebSiteManagementClient from "azure-arm-website";
import { ServiceClientCredentials, WebResource } from "ms-rest";
import * as request from 'request-promise';
import { appendExtensionUserAgent, createAzureClient } from "vscode-azureextensionui";
import * as Constants from "../../constants";
import { ApisTreeItem } from "../../explorer/ApisTreeItem";
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nRequest, requestUtil, sendRequest } from "../../utils/requestUtil";
import { signRequest } from "../../utils/signRequest";
import { IAzureClientInfo } from "../Azure/AzureClientInfo";
import { IFunctionKeys } from "./Function";
import { IFunctionContract } from "./IFunctionContract";

export namespace FunctionService {
    // Get all functions from a function app
    export async function listAllFunctions(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionContract[]> {
        const queryUrl = `${baseUrl}/functions?api-version=${Constants.functionAppApiVersion}`;
        const funcAppObj = await requestUtil(queryUrl, credentials);
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(funcAppObj).value;
    }

    // check if the imported function app already has the hostkey, otherwise created
    export async function addFuncHostKey(baseUrl: string, credentials: ServiceClientCredentials, serviceName: string): Promise<string> {
        const hostKeys = await getFuncHostKeys(baseUrl, credentials);
        const funcAppKeyName = `apim-${serviceName}`;
        if (hostKeys !== undefined && hostKeys.functionKeys !== undefined && hostKeys.functionKeys[funcAppKeyName]) {
            return hostKeys.functionKeys[funcAppKeyName];
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Can't find existing function app host key ${funcAppKeyName}`));
        return await createFuncHostKey(baseUrl, funcAppKeyName, credentials);
    }

    // Get function hostkey
    export async function getFuncHostKeys(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionKeys> {
        const options = new WebResource();
        options.method = "POST";
        options.url = `${baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
        options.headers = {
            ['User-Agent']: appendExtensionUserAgent()
        };
        await signRequest(options, credentials);
        // tslint:disable-next-line: await-promise
        const funcKeys = await request(options).promise();
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(funcKeys);
    }

    // Create function hostkey for our apim service
    export async function createFuncHostKey(baseUrl: string, funcKeyName: string, credentials: ServiceClientCredentials): Promise<string> {
        ext.outputChannel.appendLine(localize("importFunctionApp", `Create new function app host key ${funcKeyName}`));
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
        const response = await sendRequest(funKeyRequest);
        if (response.properties.value) {
            return String(response.properties.value);
        } else {
            throw new Error("Unexpected null value when generating function host key");
        }
    }

    // Create client for webiste mgmt client
    export function getClient(node: ApisTreeItem | ApiTreeItem): WebSiteManagementClient {
        const clientInfo: IAzureClientInfo = {
            credentials: node.root.credentials,
            subscriptionId: node.root.subscriptionId,
            environment: node.root.environment
        };
        return createAzureClient(clientInfo, WebSiteManagementClient);
    }
}
