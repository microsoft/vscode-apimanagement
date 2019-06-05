/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationContract } from "azure-arm-apimanagement/lib/models";
import { nonNullProp } from "../utils/nonNull";
import { ConsoleParameter } from "./ConsoleParameter";
import { ConsoleRequest } from "./ConsoleRequest";

export class ConsoleOperation {
    public name: string;
    public method: string;
    public hostName: string;
    public uriTemplate: string;
    public templateParameters: ConsoleParameter[];
    public request: ConsoleRequest;

    constructor(hostName: string, operationContract: OperationContract) {
        this.hostName = hostName;
        this.name = operationContract.displayName;
        this.method = operationContract.method.toUpperCase();
        this.uriTemplate = operationContract.urlTemplate;
        this.request = new ConsoleRequest(nonNullProp(operationContract, "request"));
        this.templateParameters = operationContract.templateParameters ?  operationContract.templateParameters.map(parameterContract => new ConsoleParameter(parameterContract)) : [];
        if (this.uriTemplate && this.uriTemplate.length > 0 && this.uriTemplate[this.uriTemplate.length - 1] === "*") {
            this.templateParameters.push(new ConsoleParameter({ name: "*", values: [], type: "", required: false }));
        }
    }
}
