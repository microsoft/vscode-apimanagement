/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ParameterContract } from "azure-arm-apimanagement/lib/models";

export class ConsoleParameter {
    public name: string;
    public value: string;

    constructor(contract?: ParameterContract) {
        this.name = "";
        this.value = "";

        if (contract) {
            this.name = contract.name;

            if (contract.defaultValue) {
                this.value = contract.defaultValue;
            }
        }
    }
}
