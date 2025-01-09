/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RequestContract } from "@azure/arm-apimanagement";
import { ConsoleHeader } from "./ConsoleHeader";
import { ConsoleParameter } from "./ConsoleParameter";

export class ConsoleRequest {
    public queryParameters: ConsoleParameter[];
    public headers: ConsoleHeader[];
    public description: string | undefined;
    public body: string;

    private requestHeaders: ConsoleHeader[];

    constructor(requestModel: RequestContract) {
        this.description = requestModel.description;
        const representations = requestModel.representations ? requestModel.representations : [];
        this.queryParameters = requestModel.queryParameters ? requestModel.queryParameters.map(parameterContract => new ConsoleParameter(parameterContract)) : [];
        this.requestHeaders = requestModel.headers ? requestModel.headers.map(headerContract => new ConsoleHeader(headerContract)) : [];
        this.headers = this.requestHeaders.filter(header => header.required);
        this.body = "";

        if (representations.length > 0) {
            if (representations[0].examples) {
                this.body = JSON.stringify(representations[0].examples);
            }

            const contentType = representations[0].contentType;
            if (contentType && this.headers.find(h => h.name === "Content-Type") === undefined) {
                const consoleHeader = new ConsoleHeader();
                consoleHeader.name = "Content-Type";
                consoleHeader.value = contentType;
                this.headers.push(consoleHeader);
            }
        }

        const keyHeader = new ConsoleHeader();
        keyHeader.name = "Ocp-Apim-Subscription-Key";
        keyHeader.value = "{{azure-api-management-subscription-key}}";
        this.headers.push(keyHeader);

        const traceHeader = new ConsoleHeader();
        traceHeader.name = "Ocp-Apim-Trace";
        traceHeader.value = "true";
        this.headers.push(traceHeader);
    }
}
