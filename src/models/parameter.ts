/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class Parameter {
    public name: string;
    public description?: string;
    // tslint:disable-next-line: no-reserved-keywords
    public type: string;
    public defaultValue?: string;
    public values?: string[];
    public required: boolean;

    constructor(parameter: IParameterContract) {
        this.name = parameter.name;
        this.description = parameter.description;
        this.type = parameter.type;
        this.defaultValue = parameter.defaultValue;
        this.required = parameter.required;
        this.values = parameter.values;

        if (!this.values) {
            this.values = [];
        }
    }

    public toParameter(): IParameterContract {
        return {
            name: this.name,
            description: this.description,
            type: this.type,
            defaultValue: this.defaultValue,
            values: this.values,
            required: this.required
        };
    }
}
export interface IParameterContract {
    name: string;
    description?: string;
    // tslint:disable-next-line: no-reserved-keywords
    type: string;
    defaultValue?: string;
    values?: string[];
    required: boolean;
}
