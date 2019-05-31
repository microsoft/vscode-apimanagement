/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WebResource } from "ms-rest";
import * as request from 'request-promise';
import { appendExtensionUserAgent } from "vscode-azureextensionui";

export async function requestUtil(url: string) : Promise<string> {
    const requestOptions: WebResource = new WebResource();
    requestOptions.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    requestOptions.url = url;
// tslint:disable-next-line: await-promise
    const response = await request(requestOptions).promise();
    return  <string>(response);
}
