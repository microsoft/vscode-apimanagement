/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";
import { clientOptions } from "../clientOptions";

export class ResourceGraphService {
    public resourceGraphUrl: string;
    constructor(public credentials: AzExtServiceClientCredentials,
                public endPointUrl: string,
                public subscriptionId: string) {
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;

        this.resourceGraphUrl = `${this.endPointUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`;
    }

    // tslint:disable-next-line:no-any no-reserved-keywords
    public async listSystemAssignedIdentities(): Promise<{ name: string, id: string, type: string, principalId: string }[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: this.resourceGraphUrl,
            body: {
                subscriptions: [ this.subscriptionId ],
                options: { resultFormat: "objectArray" },
                query: "Resources | where notempty(identity) | project name, id, type, principalId = identity.principalId"
            },
            timeout: 5000
        });
         // tslint:disable-next-line:no-any no-unsafe-any no-reserved-keywords
        return <{ name: string, id: string, type: string, principalId: string }[]>(result.parsedBody?.data);
    }

     // tslint:disable-next-line:no-any
    public async listUserAssignedIdentities(): Promise<{ name: string, id: string, principalId: string }[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: this.resourceGraphUrl,
            body: {
                subscriptions: [ this.subscriptionId ],
                options: { resultFormat: "objectArray" },
                query: "resources | where type == 'microsoft.managedidentity/userassignedidentities' | project name, id, principalId = properties.principalId"
            },
            timeout: 5000
        });
         // tslint:disable-next-line:no-any no-unsafe-any
        return <{ name: string, id: string, principalId: string }[]>(result.parsedBody?.data);
    }

}
