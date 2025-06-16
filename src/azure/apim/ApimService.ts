/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { clientOptions } from "../clientOptions";
import * as Constants from "../../constants";
import {
    IApimServiceContract,
    IAuthorizationAccessPolicyContract,
    IAuthorizationAccessPolicyPropertiesContract,
    IAuthorizationContract,
    IAuthorizationLoginLinkRequest,
    IAuthorizationLoginLinkResponse,
    IAuthorizationPropertiesContract,
    IAuthorizationProviderContract,
    IAuthorizationProviderPropertiesContract,
    IGatewayApiContract,
    IGatewayContract,
    IMasterSubscriptionsSecrets,
    IMcpServerApiContract,
    ITokenStoreIdentityProviderContract
} from "./contracts";
import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";

export class ApimService {
    public baseUrl: string;
    public credentials: AzExtServiceClientCredentials;
    public endPointUrl: string;
    public subscriptionId: string;
    public resourceGroup: string;
    public serviceName: string;
    private readonly authorizationProviderApiVersion: string = "2021-12-01-preview";

    constructor(credentials: AzExtServiceClientCredentials, endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string) {
        this.baseUrl = this.genSiteUrl(endPointUrl, subscriptionId, resourceGroup, serviceName);
        this.credentials = credentials;
        this.endPointUrl = endPointUrl;
        this.subscriptionId = subscriptionId;
        this.resourceGroup = resourceGroup;
        this.serviceName = serviceName;
    }

    public async listGateways(): Promise<IGatewayContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/gateways?api-version=${Constants.apimApiVersion}&$top=100`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayContract[]>(result.parsedBody.value);
    }

    public async listGatewayApis(gatewayName: string): Promise<IGatewayApiContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis?api-version=${Constants.apimApiVersion}&$top=100`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayApiContract[]>(result.parsedBody.value);
    }

    public async createGatewayApi(gatewayName: string, apiName: string): Promise<IGatewayApiContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${Constants.apimApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IGatewayApiContract>(result.parsedBody);
    }

    public async deleteGatewayApi(gatewayName: string, apiName: string): Promise<void> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/gateways/${gatewayName}/apis/${apiName}?api-version=${Constants.apimApiVersion}`
        });
    }

    public async generateNewGatewayToken(gatewayName: string, numOfDays: number, keyType: string): Promise<string> {
        const now = new Date();
        const timeSpan = now.setDate(now.getDate() + numOfDays);
        const expiryDate = (new Date(timeSpan)).toISOString();
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `https://management.azure.com/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.ApiManagement/service/${this.serviceName}/gateways/${gatewayName}/token?api-version=${Constants.apimApiVersion}`,
            body: {
                keyType: keyType,
                expiry: expiryDate
            }
        });
        // tslint:disable-next-line: no-unsafe-any
        return result.parsedBody.value;
    }

    public async getSubscriptionMasterkey(): Promise<IMasterSubscriptionsSecrets> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `${this.baseUrl}/subscriptions/master/listSecrets?api-version=${Constants.apimApiVersion}`
        });

        // tslint:disable-next-line: no-unsafe-any
        return result.parsedBody;
    }

    // Authorization Providers
    public async listTokenStoreIdentityProviders(): Promise<ITokenStoreIdentityProviderContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationIdentityProviders?api-version=${this.authorizationProviderApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <ITokenStoreIdentityProviderContract[]>(result.parsedBody.value);
    }

    public async getTokenStoreIdentityProvider(providerName: string): Promise<ITokenStoreIdentityProviderContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationIdentityProviders/${providerName}?api-version=${this.authorizationProviderApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <ITokenStoreIdentityProviderContract>(result.parsedBody);
    }

    public async listAuthorizationProviders(): Promise<IAuthorizationProviderContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders?api-version=${this.authorizationProviderApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationProviderContract[]>(result.parsedBody.value);
    }

    public async listAuthorizations(authorizationProviderId: string): Promise<IAuthorizationContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderId}/authorizations?api-version=${this.authorizationProviderApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationContract[]>(result.parsedBody.value);
    }

    public async listAuthorizationAccessPolicies(authorizationProviderId: string, authorizationName: string): Promise<IAuthorizationAccessPolicyContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderId}/authorizations/${authorizationName}/accesspolicies?api-version=${this.authorizationProviderApiVersion}`
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationAccessPolicyContract[]>(result.parsedBody.value);
    }

    public async getAuthorizationAccessPolicy(authorizationProviderId: string, authorizationName: string, accessPolicyName: string): Promise<IAuthorizationAccessPolicyContract | undefined> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderId}/authorizations/${authorizationName}/accesspolicies/${accessPolicyName}?api-version=${this.authorizationProviderApiVersion}`
        });

        if (result.status === 404) {
            return undefined;
        }

        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationAccessPolicyContract>(result.parsedBody);
    }

    public async createAuthorizationAccessPolicy(authorizationProviderId: string, authorizationName: string, accessPolicyName: string, accessPolicyPaylod: IAuthorizationAccessPolicyPropertiesContract): Promise<IAuthorizationAccessPolicyContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderId}/authorizations/${authorizationName}/accesspolicies/${accessPolicyName}?api-version=${this.authorizationProviderApiVersion}`,
            body: { properties: accessPolicyPaylod }
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationAccessPolicyContract>(result.parsedBody);
    }

    public async deleteAuthorizationAccessPolicy(authorizationProviderId: string, authorizationName: string, accessPolicyName: string): Promise<void> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderId}/authorizations/${authorizationName}/accesspolicies/${accessPolicyName}?api-version=${this.authorizationProviderApiVersion}`
        });
    }

    public async createAuthorizationProvider(authorizationProviderName: string, authorizationProviderPayload: IAuthorizationProviderPropertiesContract): Promise<IAuthorizationProviderContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}?api-version=${this.authorizationProviderApiVersion}`,
            body: { properties: authorizationProviderPayload }
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationProviderContract>(result.parsedBody);
    }

    public async createAuthorization(authorizationProviderName: string, authorizationName: string, authorizationPayload: IAuthorizationPropertiesContract): Promise<IAuthorizationContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationName}?api-version=${this.authorizationProviderApiVersion}`,
            body: { properties: authorizationPayload }
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationContract>(result.parsedBody);
    }

    public async deleteAuthorization(authorizationProviderName: string, authorizationName: string): Promise<void> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationName}?api-version=${this.authorizationProviderApiVersion}`
        });
    }

    public async getAuthorization(authorizationProviderName: string, authorizationName: string): Promise<IAuthorizationContract | undefined> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationName}?api-version=${this.authorizationProviderApiVersion}`
        });

        if (result.status === 404) {
            return undefined;
        }

        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationContract>(result.parsedBody);
    }

    public async deleteAuthorizationProvider(authorizationProviderName: string): Promise<void> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        await client.sendRequest({
            method: "DELETE",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}?api-version=${this.authorizationProviderApiVersion}`
        });
    }

    public async getAuthorizationProvider(authorizationProviderName: string): Promise<IAuthorizationProviderContract | undefined> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}?api-version=${this.authorizationProviderApiVersion}`
        });

        if (result.status === 404) {
            return undefined;
        }

        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationProviderContract>(result.parsedBody);
    }

    public async listAuthorizationLoginLinks(authorizationProviderName: string, authorizationName: string, loginLinkRequestPayload: IAuthorizationLoginLinkRequest): Promise<IAuthorizationLoginLinkResponse> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "POST",
            url: `${this.baseUrl}/authorizationProviders/${authorizationProviderName}/authorizations/${authorizationName}/getLoginLinks?api-version=${this.authorizationProviderApiVersion}`,
            body: loginLinkRequestPayload
        });
        // tslint:disable-next-line: no-unsafe-any
        return <IAuthorizationLoginLinkResponse>(result.parsedBody);
    }

    public async getService(): Promise<IApimServiceContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}?api-version=${Constants.apimApiVersion}`
        });
        // tslint:disable-next-line:no-any
        return <IApimServiceContract>(result.parsedBody);
    }

    public async turnOnManagedIdentity(): Promise<IApimServiceContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PATCH",
            url: `${this.baseUrl}?api-version=${Constants.apimApiVersion}`,
            body: { identity: { type: "systemassigned" } }
        });
        // tslint:disable-next-line:no-any
        return <IApimServiceContract>(result.parsedBody);
    }

    public async listMcpServers(): Promise<IMcpServerApiContract[]> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "GET",
            url: `${this.baseUrl}/apis?api-version=2024-06-01-preview&$filter=properties/type eq 'mcp'`
        });
        if (result.status !== 200) {
            return []; // Users haven't enabled MCP feature
        }
        // tslint:disable-next-line: no-unsafe-any
        return <IMcpServerApiContract[]>(result.parsedBody.value);
    }
    
    public async createMcpServer(mcpApiName: string, mcpServerPayload: any): Promise<IMcpServerApiContract> {
        const client: ServiceClient = new ServiceClient(this.credentials, clientOptions);
        const result: HttpOperationResponse = await client.sendRequest({
            method: "PUT",
            url: `${this.baseUrl}/apis/${mcpApiName}?api-version=2024-06-01-preview`,
            body: mcpServerPayload
        });
        
        if (result.status >= 400) {
            const errorMessage = result.parsedBody?.error?.message || `Failed to create MCP server. Status: ${result.status}`;
            throw new Error(errorMessage);
        }
        
        // tslint:disable-next-line: no-unsafe-any
        return <IMcpServerApiContract>(result.parsedBody);
    }

    private genSiteUrl(endPointUrl: string, subscriptionId: string, resourceGroup: string, serviceName: string): string {
        return `${endPointUrl}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.ApiManagement/service/${serviceName}`;
    }
}
