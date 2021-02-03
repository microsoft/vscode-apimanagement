/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, WebResource } from "@azure/ms-rest-js/lib/msRest";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as request from 'request-promise';
import { appendExtensionUserAgent } from "vscode-azureextensionui";

export type nRequest = WebResource & request.RequestPromiseOptions;

// tslint:disable-next-line: no-any
export async function requestUtil<T>(url: string, credentials?: TokenCredentialsBase, method?: HttpMethods, body?: any): Promise<T> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers.set("User-Agent", appendExtensionUserAgent());
    requestOptions.url = url;
    if (method) {
        requestOptions.method = method;
    }
    if (credentials) {
        await credentials.signRequest(requestOptions);
    }
    if (method !== "PUT" && !body) {
        // tslint:disable-next-line: await-promise
        const response = await request(requestOptions).promise();
        return <T>(response);
    } else {
        const newRequest = <nRequest>requestOptions;
        newRequest.body = body;
        newRequest.json = true;
        return await sendRequest(newRequest);
    }
}

export async function sendRequest<T>(httpReq: nRequest): Promise<T> {
    return await <Thenable<T>>request(httpReq).promise();
}

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
    const authToken = headers.get('authorization');
    if (authToken === undefined) {
        throw new Error("Authorization header is missing");
    } else {
        return authToken;
    }
}
