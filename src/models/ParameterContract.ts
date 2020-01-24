/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IParameterContract {
    name: string;
    description?: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    defaultValue?: string;
    values?: string[];
    required: boolean;
}
