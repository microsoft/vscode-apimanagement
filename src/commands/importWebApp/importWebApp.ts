/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { OperationCollection, OperationContract } from "azure-arm-apimanagement/lib/models";
import { Site } from "azure-arm-website/lib/models";
import { ProgressLocation, window } from "vscode";
import { IOpenApiImportObject, OpenApiParser } from "../../../extension.bundle";
import { IWebAppContract } from "../../azure/webApp/contracts";
import * as Constants from "../../constants";
import { ApisTreeItem } from "../../explorer/ApisTreeItem";
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { apiUtil } from "../../utils/apiUtil";
import { processError } from "../../utils/errorUtil";
import { nonNullOrEmptyValue, nonNullValue } from "../../utils/nonNull";
import { requestUtil } from "../../utils/requestUtil";
import { webAppUtil } from "../../utils/webAppUtil";

export async function importWebAppToApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importWebApp", "Import Web App started..."));

    ext.outputChannel.appendLine(localize("importWebApp", "Getting Web App to import..."));
    const pickedWebApp: Site = await webAppUtil.getPickedWebApp(node, "webApp");
    const resourceGroup = nonNullOrEmptyValue(pickedWebApp.resourceGroup);
    const webAppName = nonNullOrEmptyValue(pickedWebApp.name);
    const webConfigbaseUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.web/sites/${webAppName}/config/web?api-version=${Constants.webAppApiVersion}`;
    ext.outputChannel.appendLine(localize("importWebApp", "Getting picked Web App's config..."));
    const webAppConfigStr: string = await requestUtil(webConfigbaseUrl, node.root.credentials, "GET");

    // tslint:disable: no-unsafe-any
    const webAppConfig: IWebAppContract = JSON.parse(webAppConfigStr);
    if (webAppConfig.properties.apiDefinition && webAppConfig.properties.apiDefinition.url) {
        ext.outputChannel.appendLine(localize("importWebApp", "Importing Web App from swagger object..."));
        await importFromSwagger(webAppConfig, webAppName, node.root.apiName, node);
    } else {
        window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("importWebApp", `Importing Web App '${webAppName}' to API Management service ${node.root.serviceName} ...`),
                cancellable: false
            },
            async () => {
                const serviceUrl = "https://".concat(nonNullOrEmptyValue(nonNullValue(pickedWebApp.hostNames)[0]));
                const backendId = `WebApp_${apiUtil.displayNameToIdentifier(webAppName)}`;
                // tslint:disable: no-non-null-assertion
                ext.outputChannel.appendLine(localize("importWebApp", "Setting API backend entity..."));
                await webAppUtil.setAppBackendEntity(node!, backendId, node!.root.apiName, serviceUrl, resourceGroup, webAppName);
                const operations = await getWildcardOperationsForApi(node!.id, node!.root.apiName, node);
                ext.outputChannel.appendLine(localize("importWebApp", "Creating operations..."));
                for (const operation of operations) {
                    await node!.root.client.apiOperation.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, node!.root.apiName, nonNullOrEmptyValue(operation.name), operation);
                    ext.outputChannel.appendLine(localize("importWebApp", `Creating policies for ${nonNullOrEmptyValue(operation.displayName)}...`));
                    await node!.root.client.apiOperationPolicy.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, node!.root.apiName, nonNullOrEmptyValue(operation.name), {
                        format: "rawxml",
                        value: webAppUtil.createImportXmlPolicy(backendId)
                    });
                }
                ext.outputChannel.appendLine(localize("importWebApp", "Import Web App succeed!"));
            }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh();
            window.showInformationMessage(localize("importWebApp", `Imported Web App '${webAppName}' to API Management succesfully.`));
        });
    }
}

export async function importWebApp(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importWebApp", "Import Web App started..."));

    ext.outputChannel.appendLine(localize("importWebApp", "Getting Web App to import..."));
    const pickedWebApp: Site = await webAppUtil.getPickedWebApp(node, "webApp");
    const resourceGroup = nonNullOrEmptyValue(pickedWebApp.resourceGroup);
    const webAppName = nonNullOrEmptyValue(pickedWebApp.name);
    const webConfigbaseUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.web/sites/${webAppName}/config/web?api-version=${Constants.webAppApiVersion}`;
    ext.outputChannel.appendLine(localize("importWebApp", "Getting picked Web App's config..."));
    const webAppConfigStr: string = await requestUtil(webConfigbaseUrl, node.root.credentials, "GET");

    // tslint:disable-next-line: no-unsafe-any
    const webAppConfig: IWebAppContract = JSON.parse(webAppConfigStr);
    const apiName = await apiUtil.askApiName(webAppName);
    if (webAppConfig.properties.apiDefinition && webAppConfig.properties.apiDefinition.url) {
        ext.outputChannel.appendLine(localize("importWebApp", "Importing Web App from swagger object..."));
        await importFromSwagger(webAppConfig, webAppName, apiName, node);
    } else {
        window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("importWebApp", `Importing Web App '${webAppName}' to API Management service ${node.root.serviceName} ...`),
                cancellable: false
            },
            // tslint:disable-next-line:no-non-null-assertion
            async () => {
                ext.outputChannel.appendLine(localize("importWebApp", "Importing Web App from wildcard..."));
                const apiId = apiUtil.genApiId(apiName);
                ext.outputChannel.appendLine(localize("importWebApp", "Creating new API..."));
                const nApi = await webAppUtil.constructApiFromWebApp(apiId, pickedWebApp, apiName);
                await node!.createChild({ apiName, apiContract: nApi });
                const serviceUrl = "https://".concat(nonNullOrEmptyValue(nonNullValue(pickedWebApp.hostNames)[0]));
                const backendId = `WebApp_${apiUtil.displayNameToIdentifier(webAppName)}`;
                ext.outputChannel.appendLine(localize("importWebApp", "Checking backend entity..."));
                await webAppUtil.setAppBackendEntity(node!, backendId, apiName, serviceUrl, resourceGroup, webAppName);
                ext.outputChannel.appendLine(localize("importWebApp", "Creating policies..."));
                await node!.root.client.apiPolicy.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, {
                    format: "rawxml",
                    value: webAppUtil.createImportXmlPolicy(backendId)
                });
                ext.outputChannel.appendLine(localize("importWebApp", "Create operations for API..."));
                const operations = await getWildcardOperationsForApi(apiId, apiName);
                for (const operation of operations) {
                    await node!.root.client.apiOperation.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, nonNullOrEmptyValue(operation.name), operation);
                }
                ext.outputChannel.appendLine(localize("importWebApp", "Import Web App succeed!"));
            }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh();
            window.showInformationMessage(localize("importWebApp", `Imported Web App '${webAppName}' to API Management succesfully.`));
        });
    }
}

async function importFromSwagger(webAppConfig: IWebAppContract, webAppName: string, apiName: string, node: ApiTreeItem | ApisTreeItem): Promise<void> {
    if (webAppConfig.properties.apiDefinition && webAppConfig.properties.apiDefinition.url) {
        const docStr: string = await requestUtil(webAppConfig.properties.apiDefinition.url);
        if (docStr !== undefined && docStr.trim() !== "") {
            ext.outputChannel.appendLine(localize("importWebApp", "Getting swagger object..."));
            const documentJson = JSON.parse(docStr);
            const document = await parseDocument(documentJson);
            window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: localize("importWebApp", `Importing Web App '${webAppName}' to API Management service ${node.root.serviceName} ...`),
                    cancellable: false
                },
                // tslint:disable-next-line:no-non-null-assertion
                async () => {
                    if (node instanceof ApiTreeItem) {
                        ext.outputChannel.appendLine(localize("importWebApp", "Updating API..."));
                        const openApiImportPayload: ApiManagementModels.ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, format: '', value: '' };
                        openApiImportPayload.protocols = document.schemes === undefined ? ["https"] : document.schemes;
                        openApiImportPayload.format = document.importFormat;
                        openApiImportPayload.value = JSON.stringify(document.sourceDocument);

                        const options = { ifMatch: "*" };
                        await node.root.client.api.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, openApiImportPayload, options);
                    } else {
                        ext.outputChannel.appendLine(localize("importWebApp", "Creating new API..."));
                        await node.createChild({ apiName: apiName, document: document });
                        ext.outputChannel.appendLine(localize("importWebApp", "Updating API service url..."));
                        const curApi = await node!.root.client.api.get(node!.root.resourceGroupName, node!.root.serviceName, apiName);
                        curApi.serviceUrl = "";
                        await node!.root.client.api.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, curApi);
                    }
                    ext.outputChannel.appendLine(localize("importWebApp", "Import web App succeeded!"));
                }
            ).then(async () => {
                // tslint:disable-next-line:no-non-null-assertion
                await node!.refresh();
                window.showInformationMessage(localize("importWebApp", `Imported Web App '${webAppName}' to API Management succesfully.`));
            });
        }
    }
}

async function getWildcardOperationsForApi(apiId: string, apiName: string, node?: ApiTreeItem): Promise<OperationContract[]> {
    const operations: OperationContract[] = [];
    const HttpMethods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE"];
    if (node) {
        const allOperations = await node.root.client.apiOperation.listByApi(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
        const existingOperationNames = getAllOperationNames(allOperations);
        const existingOperationDisplayNames = getAllOperationDisplayNames(allOperations);
        HttpMethods.forEach(method => {
            let operationId = getBsonObjectId();
            let operationDisName = `${apiName}_${method}`;
            if (existingOperationNames.includes(operationId) || existingOperationDisplayNames.includes(operationDisName)) {
                ext.outputChannel.appendLine(localize("importWebApp", "Resolving conflict operations..."));
                const subfix = genUniqueOperationNameSubfix(operationId, operationDisName, existingOperationNames, existingOperationDisplayNames);
                operationId = `${operationId}-${subfix}`;
                operationDisName = `${operationDisName}-${subfix}`;
            }
            const operation = getNewOperation(apiId, method, operationId, operationDisName);
            operations.push(operation);
        });
    } else {
        HttpMethods.forEach(method => {
            const operationId = getBsonObjectId();
            const operation = getNewOperation(apiId, method, operationId, `${apiName}_${method}`);
            operations.push(operation);
        });
    }
    return operations;
}

function getNewOperation(apiId: string, method: string, operationId: string, displayName: string): OperationContract {
    return {
        id: `${apiId}/operations/${operationId}`,
        name: operationId,
        displayName: displayName,
        method: method,
        description: "",
        urlTemplate: "*",
        templateParameters: []
    };
}

function getBsonObjectId(): string {
    // tslint:disable: no-bitwise
    const timestamp = (new Date().getTime() / 1000 | 0).toString(16);

    return timestamp + "xxxxxxxxxxxxxxxx".replace(/[x]/g, getRandomHex()).toLowerCase();
}

function getRandomHex(): string {
    // tslint:disable-next-line: insecure-random
    return (Math.random() * 16 | 0).toString(16);
}

// tslint:disable: no-any
async function parseDocument(documentJson: any): Promise<IOpenApiImportObject> {
    try {
        // tslint:disable-next-line: no-unsafe-any
        return await new OpenApiParser().parse(documentJson);
    } catch (error) {
        throw new Error(processError(error, localize("openApiJsonParseError", "Could not parse the provided OpenAPI document.")));
    }
}

function genUniqueOperationNameSubfix(opName: string, opDisName: string, existingOperationNames: string[], existingOperationDisplayNames: string[]): number {
    let cnt = 0;
    let curName = opName;
    while (existingOperationNames.includes(curName) || existingOperationDisplayNames.includes(opDisName)) {
        cnt++;
        curName = opName.concat("-", cnt.toString());
    }
    return cnt;
}

function getAllOperationNames(operations: OperationCollection): string[] {
    const operationNames: string[] = [];
    operations.forEach(ele => {
        operationNames.push(nonNullOrEmptyValue(ele.name));
    });
    return operationNames;
}

function getAllOperationDisplayNames(operations: OperationCollection): string[] {
    const operationNames: string[] = [];
    operations.forEach(ele => {
        operationNames.push(nonNullOrEmptyValue(ele.displayName));
    });
    return operationNames;
}
