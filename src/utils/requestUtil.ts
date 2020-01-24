/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WebResource } from "ms-rest";
import { ServiceClientCredentials } from "ms-rest";
import * as request from 'request-promise';
import { appendExtensionUserAgent } from "vscode-azureextensionui";
import { IFunctionHostKeyResponse } from "../models/Function";
import { signRequest } from "./signRequest";

export type nRequest = WebResource & request.RequestPromiseOptions;

export async function requestUtil(url: string): Promise<string> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    requestOptions.url = url;
    // tslint:disable-next-line: await-promise
    const response = await request(requestOptions).promise();
    return <string>(response);
}

export async function requestUtilWithCredentials(url: string, credentials: ServiceClientCredentials): Promise<string> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    requestOptions.url = url;
    await signRequest(requestOptions, credentials);
    // tslint:disable-next-line: await-promise
    const response = await request(requestOptions).promise();
    return <string>(response);
}

export async function sendRequest(httpReq: nRequest): Promise<IFunctionHostKeyResponse> {
    return await <Thenable<IFunctionHostKeyResponse>>request(httpReq).promise();
}
