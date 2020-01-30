/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

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
