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
