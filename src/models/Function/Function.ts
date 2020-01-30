/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IFunctionKeys {
    masterKey: string;
    functionKeys: {
        [name: string]: string
    };
    systemKeys: {
        [name: string]: string
    };
}

export interface IFunctionKeyProperty {
    name?: string;
    value?: string;
}

export interface IFunctionHostKeyResponse {
    id?: string;
    name?: string;
    // tslint:disable-next-line: no-reserved-keywords
    type?: string;
    location?: string;
    properties: IFunctionKeyProperty;
}
