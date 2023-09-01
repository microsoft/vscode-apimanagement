/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiRevisionContract } from "@azure/arm-apimanagement/src/models";
import { ApimService } from "../azure/apim/ApimService";
import { gatewayHostName } from "../constants";
import { IOperationTreeRoot } from "../explorer/IOperationTreeRoot";
import { ext } from "../extensionVariables";
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

        const url = `${this.getRequestUrl(consoleOperation, api, revision, root.serviceName)}`;
        const method = consoleOperation.method;

        let requestSummary = `${method} ${url} HTTP/1.1\n`;

        consoleOperation.request.headers.forEach(header => {
            if (header.name && header.value) {
                requestSummary += `${header.name}: ${header.value}\n`;
            }
        });

        requestSummary += `\n\n${consoleOperation.request.body}`;

        // add comment
        requestSummary += `\n//A subscription key is required to call this API.`;
        requestSummary += `\n//You can get the all-access subscription key by right clicking on your service and choose "Copy Subscription Key".`;
        requestSummary += `\n//You can also set an environment variable,`;
        requestSummary += `\n//see https://code.visualstudio.com/docs/editor/variables-reference#_environment-variables`;

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

        const url = `${this.getRequestUrl(consoleOperation, api, revision, root.serviceName)}`;
        const method = consoleOperation.method;

        let requestSummary = `${method} ${url} HTTP/1.1\n`;

        const subscriptionHeader = api.subscriptionKeyParameterNames?.header;
        const headers = this.getDebugHeaders(subscriptionHeader);
        const apimService = new ApimService(root.credentials, root.environment.resourceManagerEndpointUrl, root.subscriptionId, root.resourceGroupName, root.serviceName);
        const masterSubscription = await apimService.getSubscriptionMasterkey();
        headers.forEach(header => {
            requestSummary += `${header}: ${masterSubscription.primaryKey}\n`;
        });
        requestSummary += "Ocp-Apim-Trace: true\n";
        if (consoleOperation.request.body) {
            requestSummary += `\n\n${consoleOperation.request.body}`;
        }

        return requestSummary;
    }

    private getDebugHeaders(subscriptionHeader?: string): string[] {
        if (subscriptionHeader) {
            return [subscriptionHeader, "Ocp-Apim-Debug"];

        }
        return ["Ocp-Apim-Subscription-Key", "Ocp-Apim-Debug"];
    }

    private getRequestUrl(consoleOperation: ConsoleOperation, api: ApiContract, revision: ApiRevisionContract | undefined, serviceName: string): string {
        const protocol = nonNullProp(api, "protocols").indexOf("https") !== -1 ? "https" : "http";
        let urlTemplate = this.requestUrl(consoleOperation, api, revision);
        if (urlTemplate && urlTemplate.length > 0 && urlTemplate[urlTemplate.length - 1] === "*") {
            urlTemplate = urlTemplate.replace("*", "");
        }
        // tslint:disable-next-line: no-unsafe-any
        const hostName : string | undefined  = ext.context.globalState.get(serviceName + gatewayHostName);
        if (hostName === undefined) {
            return `${protocol}://${consoleOperation.hostName}${this.ensureLeadingSlash(urlTemplate)}`;
        } else {
            return `${protocol}://${hostName}${this.ensureLeadingSlash(urlTemplate)}`;
        }
    }

    private requestUrl(consoleOperation: ConsoleOperation, api: ApiContract, apiRevision: ApiRevisionContract | undefined): string {
        let versionPath = "";
        let revision = "";

        /*
        if (api.apiVersionSet && api.apiVersion && api.apiVersionSet.versioningScheme === "Segment") {
            versionPath = `/${api.apiVersion}`;
        }*/

        if (api.apiVersion && api.apiVersionSetId) {
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
