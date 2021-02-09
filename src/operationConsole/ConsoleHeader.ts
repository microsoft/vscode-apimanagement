/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ParameterContract } from "@azure/arm-apimanagement/src/models";

export class ConsoleHeader {
    public name: string;
    public value: string;
    public required: boolean;

    constructor(contract?: ParameterContract) {
        this.name = "";
        this.value = "";
        this.required = false;

        if (contract) {
            this.name = contract.name;

            if (contract.defaultValue) {
                this.value = contract.defaultValue;
            }

            if (contract.required) {
                this.required = contract.required;
            }
        }
    }
}
