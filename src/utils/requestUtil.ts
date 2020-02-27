/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, WebResource } from "ms-rest";
import { ServiceClientCredentials } from "ms-rest";
import * as request from 'request-promise';
import { appendExtensionUserAgent } from "vscode-azureextensionui";
import { signRequest } from "./signRequest";

export type nRequest = WebResource & request.RequestPromiseOptions;

// tslint:disable-next-line: no-any
export async function requestUtil<T>(url: string, credentials?: ServiceClientCredentials, method?: HttpMethods, body?: any): Promise<T> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    requestOptions.url = url;
    if (method) {
        requestOptions.method = method;
    }
    if (credentials) {
        await signRequest(requestOptions, credentials);
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
