/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionState } from "@azure/arm-apimanagement/src/models";

export interface IFunctionContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    location?: string;
    properties: IFunctionPropertyContract;
}

export interface IFunctionPropertyContract {
    name: string;
    function_app_id: string;
    script_root_path_href: string;
    script_href: string;
    config_href: string;
    test_data_href: string;
    secrets_file_href: string;
    href: string;
    config: {
        bindings: IFunctionConfigItem[],
        disabled: boolean
    };
    // tslint:disable-next-line: no-any
    files: any[];
    test_data: {
        availableMethods: string[],
        queryStringParams: {
            name: string,
            value: string
        }[],
        headers: {
            name: string,
            value: string
        },
        method: string,
        body: string
    };
    invoke_url_template: string;
    language: string;
    isDisabled: string;
}

export interface IFunctionConfigItem {
    authLevel?: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    direction: string;
    methods?: string[];
    route?: string;
}

export interface ISubscriptionContract {
    scope: string;
    displayName: string;
    name: string;
    allowTracing: boolean;
    ownerId: string;
    state: SubscriptionState;
}

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

export interface IFunctionHostKeyContract {
    id?: string;
    name?: string;
    // tslint:disable-next-line: no-reserved-keywords
    type?: string;
    location?: string;
    properties: IFunctionKeyProperty;
}

export interface IWebAppContract {
    id: string;
    name: string;
    // tslint:disable-next-line: no-reserved-keywords
    type?: string;
    location?: string;
    properties: IWebAppProperties;
}

export interface IWebAppProperties {
    apiManagementConfig: IApimConfig;
    apiDefinition?: IApiDefinition;
}

export interface IApimConfig {
    id: string;
}

export interface IApiDefinition {
    url?: string;
}
