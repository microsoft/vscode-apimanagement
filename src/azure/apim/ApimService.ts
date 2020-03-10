/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServiceClientCredentials } from "ms-rest";
import { requestUtil } from "../../utils/requestUtil";
import { IGatewayApiContract, IGatewayContract, IGatewayToken } from "./contracts";

export class ApimService {
    public baseUrl: string;
    public credentials: ServiceClientCredentials;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public serviceName: string;
    private readonly apiVersion: string = "2018-06-01-preview";

    constructor(credentials: ServiceClientCredentials, endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, serviceName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.serviceName = serviceName;
    }

    public async listGateways(): Promise<IGatewayContract[]> {
        const queryUrl = `${this.baseUrl}/gateways?api-version=${this.apiVersion}&$top=100`;
        const gateways: string = await requestUtil(queryUrl, this.credentials);
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(gateways).value;
    }

    public async listGatewayApis(gatewayName: string): Promise<IGatewayApiContract[]> {
        const queryUrl = `${this.baseUrl}/gateways/${gatewayName}/apis?api-version=${this.apiVersion}&$top=100`;
        const gatewayApis: string = await requestUtil(queryUrl, this.credentials);
        // tslint:disable-next-line: no-unsafe-any
        return JSON.parse(gatewayApis).value;
    }

    public async createGatewayApi(gatewayName: string, apiName: string): Promise<IGatewayApiContract> {
        const queryUrl = `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${this.apiVersion}`;
        // tslint:disable-next-line: no-unsafe-any
        return await requestUtil(queryUrl, this.credentials, 'PUT');
    }

    public async deleteGatewayApi(gatewayName: string, apiName: string): Promise<void> {
        const queryUrl = `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${this.apiVersion}`;
        await requestUtil(queryUrl, this.credentials, 'DELETE');
    }

    public async generateNewGatewayToken(gatewayName: string, numOfDays: number, keyType: string): Promise<string> {
        const now = new Date();
        const timeSpan = now.setDate(now.getDate() + numOfDays);
        const expiryDate = (new Date(timeSpan)).toISOString();
        const res: IGatewayToken = await requestUtil(`https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.ApiManagement/service/${this.serviceName}/gateways/${gatewayName}/token?api-version=2018-06-01-preview`, this.credentials, "POST", {
            keyType: keyType,
            expiry: expiryDate
        });
        return res.value;
    }

    public async getSubscriptionMasterkey(): Promise<string> {
        const masterKeyUrl = `${this.baseUrl}/subscriptions/master?api-version=${this.apiVersion}`;
        return await requestUtil(masterKeyUrl, this.credentials, 'GET');
    }

    private genSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${serviceName}`;
    }
}
