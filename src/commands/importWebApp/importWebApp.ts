/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendContract, BackendCredentialsContract, OperationCollection, OperationContract } from "azure-arm-apimanagement/lib/models";
import WebSiteManagementClient from "azure-arm-website";
import { Site, WebAppCollection } from "azure-arm-website/lib/models";
import { ProgressLocation, window } from "vscode";
import xml = require("xml");
import { IOpenApiImportObject, OpenApiParser } from "../../../extension.bundle";
import { IWebAppContract } from "../../azure/webApp/contracts";
import * as Constants from "../../constants";
import { ApisTreeItem } from "../../explorer/ApisTreeItem";
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { apiUtil } from "../../utils/apiUtil";
import { azureClientUtil } from "../../utils/azureClientUtil";
import { processError } from "../../utils/errorUtil";
import { nonNullValue } from "../../utils/nonNull";
import { requestUtil } from "../../utils/requestUtil";

export async function importWebAppToApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();

    // tslint:disable: no-non-null-assertion
    const pickedWebApp: Site = await getPickedWebApp(node, webAppKind.webApp);
    const webAppResourceGroup = nonNullValue(pickedWebApp.resourceGroup);
    const webAppName = nonNullValue(pickedWebApp.name);
    const webConfigbaseUrl = getWebConfigbaseUrl(node!.root.environment.resourceManagerEndpointUrl, node!.root.subscriptionId, webAppResourceGroup, webAppName);
    const webAppConfigStr: string = await requestUtil(webConfigbaseUrl, node.root.credentials, "GET");

    // tslint:disable: no-unsafe-any
    const webAppConfig: IWebAppContract = JSON.parse(webAppConfigStr);
    if (webAppConfig.properties.apiDefinition && webAppConfig.properties.apiDefinition.url) {
        // tslint:disable-next-line: no-non-null-assertion
        await importFromSwagger(webAppConfig, webAppName, node!.root.apiName, node!);
    } else {
        ext.outputChannel.appendLine(localize("importWebApp", "API Definition not specified for Webapp..."));
    }
}

export async function importWebApp(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    ext.outputChannel.show();

    const pickedWebApp: Site = await getPickedWebApp(node, webAppKind.webApp);
    const webAppResourceGroup = nonNullValue(pickedWebApp.resourceGroup);
    const webAppName = nonNullValue(pickedWebApp.name);
    const webConfigbaseUrl = getWebConfigbaseUrl(node!.root.environment.resourceManagerEndpointUrl, node!.root.subscriptionId, webAppResourceGroup, webAppName);
    const webAppConfigStr: string = await requestUtil(webConfigbaseUrl, node.root.credentials, "GET");

    const webAppConfig: IWebAppContract = JSON.parse(webAppConfigStr);
    const apiName = await apiUtil.askApiName(webAppName);
    if (webAppConfig.properties.apiDefinition && webAppConfig.properties.apiDefinition.url) {
        ext.outputChannel.appendLine(localize("importWebApp", "Importing Web App from swagger object..."));
        await importFromSwagger(webAppConfig, webAppName, apiName, node);
    } else {
        await createApiWithWildCardOperations(node, webAppName, apiName, pickedWebApp, webAppResourceGroup);
    }
}

export async function getPickedWebApp(node: ApiTreeItem | ApisTreeItem, webAppType: webAppKind): Promise<Site> {
    const client = azureClientUtil.getClient(node.root.credentials, node.root.subscriptionId, node.root.environment);
    const allfunctionApps = await listWebApps(client, webAppType);
    return await pickWebApp(allfunctionApps);
}

export async function listWebApps(client: WebSiteManagementClient, siteKind: webAppKind): Promise<Site[]> {
    const allWebApps: WebAppCollection = await client.webApps.list();
    if ((siteKind === webAppKind.webApp)) {
        return allWebApps.filter((ele) => !!ele.kind && !ele.kind.includes(webAppKind.functionApp));
    }
    return allWebApps.filter((ele) => !!ele.kind && ele.kind.includes(webAppKind.functionApp));
}

export async function pickWebApp(apiApps: Site[]): Promise<Site> {
    // Pick function app
    const apiApp = await ext.ui.showQuickPick(apiApps.map((s) => { return { label: nonNullValue(s.name), site: s }; }), { canPickMany: false });
    return apiApp.site;
}

// Create policy for importing
export function createImportXmlPolicy(backendId: string): string {
    const operationPolicy = [{
        policies: [
            {
                inbound: [
                    { base: null },
                    {
                        "set-backend-service": [
                            {
                                _attr: {
                                    id: "apim-generated-policy",
                                    "backend-id": backendId
                                }
                            }
                        ]
                    }
                ]
            },
            { backend: [{ base: null }] },
            { outbound: [{ base: null }] },
            { "on-error": [{ base: null }] }
        ]
    }];

    return xml(operationPolicy);
}

// Create backend for the web app
export async function setAppBackendEntity(node: ApisTreeItem | ApiTreeItem, backendId: string, appName: string, appPath: string, appResourceGroup: string, webAppName: string, BackendCredentials?: BackendCredentialsContract): Promise<void> {
    const nbackend: BackendContract = {
        description: `${appName}`,
        resourceId: getWebAppResourceId(node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, appResourceGroup, webAppName),
        url: appPath,
        id: backendId,
        name: backendId,
        protocol: "http",
        credentials: BackendCredentials
    };
    try {
        await node.root.client.backend.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, backendId, nbackend);
    } catch (error) {
        throw new Error(processError(error, localize("setAppbackendEntity", "Error when creating backend entity.")));
    }
}

// Create new api from web app
export async function constructApiFromWebApp(apiId: string, webApp: Site, apiName: string): Promise<ApiContract> {
    return {
        description: `Import from "${webApp.name}" Web App`,
        id: apiId,
        name: apiName,
        displayName: apiName,
        path: "",
        protocols: ["https"]
    };
}

async function createApiWithWildCardOperations(node: ApisTreeItem, webAppName: string, apiName: string, pickedWebApp: Site, webAppResourceGroup: string): Promise<void> {
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importWebApp", `Importing Web App '${webAppName}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            ext.outputChannel.appendLine(localize("importWebApp", "Importing Web App with wildcard operations..."));
            const apiId = apiUtil.genApiId(apiName);
            ext.outputChannel.appendLine(localize("importWebApp", "Creating new API..."));
            const nApi = await constructApiFromWebApp(apiId, pickedWebApp, apiName);
            // tslint:disable: no-non-null-assertion
            await node!.createChild({ apiName, apiContract: nApi });
            const serviceUrl = "https://".concat(nonNullValue(nonNullValue(pickedWebApp.hostNames)[0]));
            const backendId = `WebApp_${apiUtil.displayNameToIdentifier(webAppName)}`;
            await setAppBackendEntity(node!, backendId, apiName, serviceUrl, webAppResourceGroup, webAppName);
            await node!.root.client.apiPolicy.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, {
                format: "rawxml",
                value: createImportXmlPolicy(backendId)
            });
            const operations = await getWildcardOperationsForApi(apiId, apiName);
            for (const operation of operations) {
                await node!.root.client.apiOperation.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, nonNullValue(operation.name), operation);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importWebApp", `Imported Web App '${webAppName}' to API Management succesfully.`));
    });
}

// generate resouce id for webapp bankend enity
function getWebAppResourceId(endpointUrl: string, subscriptionId: string, webAppResourceGroup: string, webAppName: string): string {
    return `${endpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${webAppResourceGroup}/providers/Microsoft.Web/sites/${webAppName}`;
}

// get web config url
function getWebConfigbaseUrl(endpointUrl: string, subscriptionId: string, webAppResourceGroup: string, webAppName: string): string {
    return `${endpointUrl}/subscriptions/${subscriptionId}/resourceGroups/${webAppResourceGroup}/providers/Microsoft.web/sites/${webAppName}/config/web?api-version=${Constants.webAppApiVersion20190801}`;
}

async function importFromSwagger(webAppConfig: IWebAppContract, webAppName: string, apiName: string, node: ApiTreeItem | ApisTreeItem): Promise<void> {
    // tslint:disable-next-line: no-non-null-assertion
    const docStr: string = await requestUtil(webAppConfig.properties.apiDefinition!.url!);
    if (docStr !== undefined && docStr.trim() !== "") {
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
                try {
                    if (node instanceof ApiTreeItem) {
                        ext.outputChannel.appendLine(localize("importWebApp", "Updating API..."));
                        await apiUtil.createOrUpdateApiWithSwaggerObject(node, apiName, document);
                    } else {
                        ext.outputChannel.appendLine(localize("importWebApp", "Creating new API..."));
                        await node.createChild({ apiName: apiName, document: document });
                        ext.outputChannel.appendLine(localize("importWebApp", "Updating API service url..."));
                        const curApi = await node!.root.client.api.get(node!.root.resourceGroupName, node!.root.serviceName, apiName);
                        curApi.serviceUrl = "";
                        await node!.root.client.api.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, apiName, curApi);
                    }
                } catch (error) {
                    ext.outputChannel.appendLine(localize("importWebApp", `Import failed with error ${String(error)}}`));
                }
            }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh();
            window.showInformationMessage(localize("importWebApp", `Imported Web App '${webAppName}' to API Management succesfully.`));
        });
    }
}

async function getWildcardOperationsForApi(apiId: string, apiName: string, node?: ApiTreeItem): Promise<OperationContract[]> {
    const operations: OperationContract[] = [];
    const HttpMethods = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS", "PATCH", "TRACE"];
    if (node) {
        const allOperations = await node.root.client.apiOperation.listByApi(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
        const existingOperationNamePair = getAllOperationNames(allOperations);
        const existingOperationNames = Object.keys(existingOperationNamePair);
        const existingOperationDisplayNames = Object.values(existingOperationNames);
        HttpMethods.forEach(method => {
            let operationId = getBsonObjectId();
            let operationDisName = `${apiName}_${method}`;
            if (existingOperationNames.includes(operationId) || existingOperationDisplayNames.includes(operationDisName)) {
                ext.outputChannel.appendLine(localize("importWebApp", "Resolving conflict operations..."));
                const subfix = generateUniqueOperationNameSubfix(operationId, operationDisName, existingOperationNames, existingOperationDisplayNames);
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

function generateUniqueOperationNameSubfix(operationName: string, operationDisplayName: string, existingOperationNames: string[], existingOperationDisplayNames: string[]): number {
    let cnt = 0;
    let currentName = operationName;
    while (existingOperationNames.includes(currentName) || existingOperationDisplayNames.includes(operationDisplayName)) {
        cnt++;
        currentName = operationName.concat("-", cnt.toString());
    }
    return cnt;
}

function getAllOperationNames(operations: OperationCollection): {} {
    const operationNamesPair: { [dispayName: string]: string } = {};
    operations.forEach(ele => {
        operationNamesPair[nonNullValue(ele.displayName)] = nonNullValue(ele.name);
    });
    return operationNamesPair;
}

export enum webAppKind {
    webApp = "webApp",
    functionApp = "functionapp"
}
