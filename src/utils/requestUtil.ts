/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TokenCredential } from "@azure/core-auth";
import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AzureServiceClient, getAuthorizationHeader, HttpMethods, IHttpResponse, IRequestOptions } from "../azure/azureServiceClient";
import { clientOptions } from "../azure/clientOptions";

export type nRequest = IRequestOptions;

// tslint:disable-next-line: no-any
export async function request(credentials: AzExtServiceClientCredentials, url: string, method: HttpMethods, queryParameters?: { [key: string]: any }, body?: any): Promise<IHttpResponse> {
    const client: AzureServiceClient = new AzureServiceClient(credentials, clientOptions);
    return await client.sendRequest({
        method: method,
        url: url,
        queryParameters: queryParameters,
        body: body
    });
}

export async function sendRequest<T>(httpReq: nRequest): Promise<T> {
    // Convert WebResource to AxiosRequestConfig
    const config: AxiosRequestConfig = {
        url: httpReq.url,
        // tslint:disable-next-line: no-any
        method: httpReq.method as any,
        headers: httpReq.headers,
        data: httpReq.body,
        params: httpReq.queryParameters,
        responseType: 'text',
        transformResponse: (data) => data
    };

    const response: AxiosResponse<T> = await axios(config);
    return response.data;
}

// tslint:disable: no-unsafe-any
export async function getBearerToken(_url: string, _method: HttpMethods, credentials: TokenCredential): Promise<string> {
    return await getAuthorizationHeader(credentials);
}
