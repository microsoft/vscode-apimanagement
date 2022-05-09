/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { createGenericClient } from "vscode-azureextensionui";

export class ResourceGraphService {
    public resourceGraphUrl: string;
    constructor(public credentials: TokenCredentialsBase,
                public endPointUrl: string,
                public subscriptionId: string) {
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;

        this.resourceGraphUrl = `${this.endPointUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`;
    }

    // tslint:disable-next-line:no-any
    public async listSystemAssignedIdentities(): Promise<any> {
        const client: ServiceClient = await createGenericClient(this.credentials);
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
         // tslint:disable-next-line:no-any
        return <any>(result.parsedBody);
    }

     // tslint:disable-next-line:no-any
    public async listUserAssignedIdentities(): Promise<any> {
        const client: ServiceClient = await createGenericClient(this.credentials);
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
         // tslint:disable-next-line:no-any
        return <any>(result.parsedBody);
    }

}
