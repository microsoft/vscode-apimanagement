/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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


export interface ITokenProviderContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: ITokenProviderPropertyContract;
}

export interface ITokenProviderPropertyContract {
    OAuthSettings: {
        IdentityProvider: string;
        ClientId: string;
        ClientSecret: string;
        Scopes?: string;
        Parameters?: {}
        RedirectUrl?: string;
    };
}

export interface IConnectionContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IConnectionPropertyContract;
}

export interface IConnectionPropertyContract {
    Status: string;
    Error: {
        Code: string;
        Message: string;
    };
}

export interface ILoginLinkRequestContract {
    parameters: ILoginLinkInputParameter[];
}

export interface ILoginLinkInputParameter {
    parameterName: string;
    redirectUrl: string;
}

export interface ILoginLinkResponseContract {
    Value: ILoginLink[];
}

export interface ILoginLink {
    Link: string;
    FirstPartyLoginUri: string;
    DisplayName: string;
    Status: string;
}