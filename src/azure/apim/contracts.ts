/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IApimServiceContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: object;
    identity: IApimServiceIdentityContract;
}

export interface IApimServiceIdentityContract {
    // tslint:disable-next-line:no-reserved-keywords
    type: string;
    principalId: string;
    tenantId: string;
}

export interface IGatewayContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IGatewayPropertyContract;
}

export interface IGatewayPropertyContract {
    region: string;
    heartbeat: string;
}

export interface IGatewayApiContract {
    id: string;
    name: string;
}

export interface IGatewayToken {
    value: string;
}

export interface IGatewayTokenList {
    primary: string;
    secondary: string;
}

export interface IMasterSubscription {
    id : string;
    name : string;
    properties: ISubscriptionProperty;
}

export interface ISubscriptionProperty {
    displayName: string;
    primaryKey: string;
    secondaryKey: string;
}

// Authorization Provider Contracts
export enum IGrantTypesContract {
    authorizationCode = "authorizationCode",
    clientCredentials = "clientCredentials"
}

export interface IAuthorizationProviderContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationProviderPropertiesContract;
}

export interface IAuthorizationProviderPropertiesContract {
    displayName?: string;
    identityProvider: string;
    oauth2?: IAuthorizationProviderOAuth2SettingsContract;
}

export interface IAuthorizationProviderOAuth2SettingsContract {
    redirectUrl?: string;
    grantTypes: IAuthorizationProviderOAuth2GrantTypesContract;
}

export type IAuthorizationProviderOAuth2GrantTypesContract = {
    [key in IGrantTypesContract]?: {
        [key: string]: string | boolean
    };
};

export interface IAuthorizationContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationPropertiesContract;
}

export interface IAuthorizationPropertiesContract {
    authorizationType: string;
    oauth2grantType: string;
    parameters?: {
        [key: string]: string | boolean;
    };
    status?: ITokenStoreAuthorizationState;
    error?: IAuthorizationErrorContract;
}

export enum ITokenStoreAuthorizationState {
    connected = "Connected",
    error = "Error"
}

export interface IAuthorizationErrorContract {
    code: string;
    message: string;
    // tslint:disable-next-line:no-any
    refreshResponseBodyFromIdentityProvider?: any;
}

export interface ITokenStoreIdentityProviderContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: ITokenStoreIdentityProviderPropertiesContract;
}

export interface ITokenStoreIdentityProviderPropertiesContract {
    displayName: string;
    oauth2: {
        grantTypes: ITokenStoreIdentityProviderGrantTypeContract;
    };
}

export type ITokenStoreIdentityProviderGrantTypeContract = {
    [key in IGrantTypesContract]?: ITokenStoreGrantTypeParameterContract;
};

export interface ITokenStoreGrantTypeParameterContract {
    [key: string]: ITokenStoreGrantTypeParameterDefinitionContract;
}

export interface ITokenStoreGrantTypeParameterDefinitionContract {
    // tslint:disable-next-line:no-reserved-keywords
    type: "string" | "securestring" | "bool";
    displayName: string;
    description?: string;
    // tslint:disable-next-line:no-reserved-keywords
    default?: string;
    uidefinition: {
        atAuthorizationProviderLevel: "REQUIRED" | "OPTIONAL" | "HIDDEN"
    };
}

export interface IAuthorizationLoginLinkRequest {
    postLoginRedirectUrl: string;
}

export interface IAuthorizationLoginLinkResponse {
    loginLink: string;
}

export interface IAuthorizationAccessPolicyContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IAuthorizationAccessPolicyPropertiesContract;
}

export interface IAuthorizationAccessPolicyPropertiesContract {
    objectId: string;
    tenantId: string;
}

export enum IAuthorizationTypeEnum {
    OAuth2,
    OAuth1
}
