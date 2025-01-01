/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpMethods, HttpOperationResponse, ParameterValue, ServiceClient, WebResource } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { TokenResponse } from "adal-node";
import requestPromise from 'request-promise';
import { createGenericClient } from "vscode-azureextensionui";

export type nRequest = WebResource & requestPromise.RequestPromiseOptions;

// tslint:disable-next-line: no-any
export async function request(credentials: TokenCredentialsBase, url: string, method: HttpMethods, queryParameters?: { [key: string]: any | ParameterValue }, body?: any): Promise<HttpOperationResponse> {
    const client: ServiceClient = await createGenericClient(credentials);
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
export async function getBearerToken(credentials: TokenCredentialsBase): Promise<string> {
    let token: TokenResponse;
    try {
        token = await credentials.getToken();
    } catch (err) {
        throw err;
    }

    const authToken : string = token.accessToken;
    if (authToken === undefined) {
        throw new Error("Authorization header is missing");
    } else {
        return `Bearer ${authToken}`;
    }
}
