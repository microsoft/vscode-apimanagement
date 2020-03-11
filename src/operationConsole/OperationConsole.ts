/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiRevisionContract } from "azure-arm-apimanagement/lib/models";
import { ApimService } from "../azure/apim/ApimService";
import { IMasterSubscription } from "../azure/apim/contracts";
import { IOperationTreeRoot } from "../explorer/IOperationTreeRoot";
import { nonNullOrEmptyValue, nonNullProp } from "../utils/nonNull";
import { ConsoleOperation } from "./ConsoleOperation";

export class OperationConsole {
    public async buildRequestInfo(root: IOperationTreeRoot): Promise<string> {
        const results = await Promise.all([
            root.client.apiManagementService.get(root.resourceGroupName, root.serviceName),
            root.client.api.get(root.resourceGroupName, root.serviceName, root.apiName),
            root.client.apiOperation.get(root.resourceGroupName, root.serviceName, root.apiName, root.opName),
            root.client.apiRevision.listByService(root.resourceGroupName, root.serviceName, root.apiName)]);

        const service = results[0];
        const api = results[1];
        const operation = results[2];

        const hostName = nonNullProp(service, "gatewayUrl").split("/")[2];
        const consoleOperation = new ConsoleOperation(hostName, operation);
        let revision: ApiRevisionContract | undefined;

        if (api.apiRevision) {
            const revisions = results[3];
            revision = revisions.find((r) => r.apiRevision === api.apiRevision);
        }

        const url = `${this.getRequestUrl(consoleOperation, api, revision)}`;
        const method = consoleOperation.method;

        let requestSummary = `${method} ${url} HTTP/1.1\n`;

        consoleOperation.request.headers.forEach(header => {
            if (header.name && header.value) {
                requestSummary += `${header.name}: ${header.value}\n`;
            }
        });

        requestSummary += `\n\n${consoleOperation.request.body}`;

        return requestSummary;
    }

    public async buildDebugRequestInfo(root: IOperationTreeRoot): Promise<string> {
        const results = await Promise.all([
            root.client.apiManagementService.get(root.resourceGroupName, root.serviceName),
            root.client.api.get(root.resourceGroupName, root.serviceName, root.apiName),
            root.client.apiOperation.get(root.resourceGroupName, root.serviceName, root.apiName, root.opName),
            root.client.apiRevision.listByService(root.resourceGroupName, root.serviceName, root.apiName)]);

        const service = results[0];
        const api = results[1];
        const operation = results[2];

        const hostName = nonNullProp(service, "gatewayUrl").split("/")[2];
        const consoleOperation = new ConsoleOperation(hostName, operation);
        let revision: ApiRevisionContract | undefined;

        if (api.apiRevision) {
            const revisions = results[3];
            revision = revisions.find((r) => r.apiRevision === api.apiRevision);
        }

        const url = `${this.getRequestUrl(consoleOperation, api, revision)}`;
        const method = consoleOperation.method;

        let requestSummary = `${method} ${url} HTTP/1.1\n`;

        const headers = this.getDebugHeaders();
        const apimService = new ApimService(root.credentials, root.environment.resourceManagerEndpointUrl, root.subscriptionId, root.resourceGroupName, root.serviceName);
        const masterSubscriptionObj = await apimService.getSubscriptionMasterkey();
        const masterSubscription = <IMasterSubscription>JSON.parse(masterSubscriptionObj);
        headers.forEach(header => {
            requestSummary += `${header}: ${masterSubscription.properties.primaryKey}\n`;
        });
        requestSummary += "Ocp-Apim-Trace: true\n";
        if (consoleOperation.request.body) {
            requestSummary += `\n\n${consoleOperation.request.body}`;
        }

        return requestSummary;
    }

    // public async buildDebugRequestInfo(root: IOperationTreeRoot): Promise<string> {
    //     const operation = await root.client.apiOperation.get(root.resourceGroupName, root.serviceName, root.apiName, root.opName);
    //     const url = getAPIHostUrl(root.serviceName);
    //     const method = operation.method;
    //     let body: string | undefined;
    //     if (operation.request && operation.request.representations && operation.request.representations.length > 0) {
    //         if (operation.request.representations[0].sample) {
    //             body = operation.request.representations[0].sample;
    //         }
    //     }
    //     let requestSummary = `${method} ${url} HTTP/1.1\n`;

    //     const headers = this.getDebugHeaders();
    //     const apimService = new ApimService(root.credentials, root.environment.resourceManagerEndpointUrl, root.subscriptionId, root.resourceGroupName, root.serviceName);
    //     const masterSubscriptionObj = await apimService.getSubscriptionMasterkey();
    //     const masterSubscription = <IMasterSubscription>JSON.parse(masterSubscriptionObj);
    //     headers.forEach(header => {
    //         requestSummary += `${header}: ${masterSubscription.properties.primaryKey}\n`;
    //     });

    //     if (body) {
    //         requestSummary += `\n\n${body}`;
    //     }

    //     return requestSummary;
    // }

    private getDebugHeaders(): string[] {
        return ["Ocp-Apim-Subscription-Key", "Ocp-Apim-Debug"];
    }

    private getRequestUrl(consoleOperation: ConsoleOperation, api: ApiContract, revision: ApiRevisionContract | undefined): string {
        const protocol = nonNullProp(api, "protocols").indexOf("https") !== -1 ? "https" : "http";
        let urlTemplate = this.requestUrl(consoleOperation, api, revision);
        if (urlTemplate && urlTemplate.length > 0 && urlTemplate[urlTemplate.length - 1] === "*") {
            urlTemplate = urlTemplate.replace("*", "");
        }
        return `${protocol}://${consoleOperation.hostName}${this.ensureLeadingSlash(urlTemplate)}`;
    }

    private requestUrl(consoleOperation: ConsoleOperation, api: ApiContract, apiRevision: ApiRevisionContract | undefined): string {
        let versionPath = "";
        let revision = "";

        if (api.apiVersionSet && api.apiVersion && api.apiVersionSet.versioningScheme === "Segment") {
            versionPath = `/${api.apiVersion}`;
        }

        let requestUrl = consoleOperation.uriTemplate;
        const parameters = consoleOperation.templateParameters.concat(consoleOperation.request.queryParameters);

        parameters.forEach(parameter => {
            if (parameter.value) {
                const parameterPlaceholder = parameter.name !== "*" ? `{${parameter.name}}` : "*";

                if (requestUrl.indexOf(parameterPlaceholder) > -1) {
                    requestUrl = requestUrl.replace(parameterPlaceholder, encodeURI(parameter.value));
                } else {
                    requestUrl = this.addParam(requestUrl, encodeURI(parameter.name), encodeURI(parameter.value));
                }
            }
        });

        if (api.apiVersionSet && api.apiVersionSet.versioningScheme === "Query") {
            requestUrl = this.addParam(requestUrl, nonNullOrEmptyValue(api.apiVersionSet.versionQueryName), nonNullOrEmptyValue(api.apiVersion));
        }

        if (api.apiRevision && apiRevision && !apiRevision.isCurrent) {
            revision = `;rev=${apiRevision.apiRevision}`;
        }

        return `${api.path}${versionPath}${revision}${requestUrl}`;
    }

    private addParam(uri: string, name: string, value: string): string {
        const separator = uri.indexOf("?") >= 0 ? "&" : "?";
        const paramString = !value || value === "" ? name : `${name}=${value}`;
        return uri + separator + paramString;
    }

    private ensureLeadingSlash(url: string): string {
        if (!url.startsWith("/")) {
            url = `/${url}`;
        }
        return url;
    }
}
