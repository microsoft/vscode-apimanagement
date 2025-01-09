/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, HttpOperationResponse, ParameterValue, ServiceClient, WebResource } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import requestPromise from 'request-promise';
import { appendExtensionUserAgent } from '@microsoft/vscode-azext-utils';
import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";
import { clientOptions } from "../azure/clientOptions";

export type nRequest = WebResource & requestPromise.RequestPromiseOptions;

// tslint:disable-next-line: no-any
export async function request(credentials: AzExtServiceClientCredentials, url: string, method: HttpMethods, queryParameters?: { [key: string]: any | ParameterValue }, body?: any): Promise<HttpOperationResponse> {
    const client: ServiceClient = new ServiceClient(credentials, clientOptions);
    return await client.sendRequest({
        method: method,
        url: url,
        queryParameters: queryParameters,
        body: body
    });
}

export async function sendRequest<T>(httpReq: nRequest): Promise<T> {
    return await <Thenable<T>>requestPromise(httpReq).promise();
}

// tslint:disable: no-unsafe-any
export async function getBearerToken(url: string, method: HttpMethods, credentials: TokenCredentialsBase): Promise<string> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers.set("User-Agent", appendExtensionUserAgent());
    requestOptions.url = url;
    requestOptions.method = method;
    try {
        await credentials.signRequest(requestOptions);
    } catch (err) {
        throw err;
    }
    const headers = requestOptions.headers;
    // tslint:disable-next-line: no-string-literal
    const authToken : string = headers['authorization'];
    if (authToken === undefined) {
        throw new Error("Authorization header is missing");
    } else {
        return authToken;
    }
}
