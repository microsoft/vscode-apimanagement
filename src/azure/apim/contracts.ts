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
    oAuthSettings: {
        identityProvider: string;
        clientId: string;
        clientSecret: string;
        scopes?: string;
        parameters?: {}
        redirectUrl?: string;
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
    status: string;
    error: {
        code: string;
        message: string;
    };
}

export interface ILoginLinkRequestContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: ILoginLinkRequestPropertyContract;
}

export interface ILoginLinkRequestPropertyContract {
    parameters: ILoginLinkInputParameter[];
}

export interface ILoginLinkInputParameter {
    parameterName: string;
    redirectUrl: string;
}

export interface ILoginLinkResponseContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: ILoginLinkResponsePropertyContract;
}

export interface ILoginLinkResponsePropertyContract {
    value: ILoginLink[];
}

export interface ILoginLink {
    link: string;
    firstPartyLoginUri: string;
    displayName: string;
    status: string;
}