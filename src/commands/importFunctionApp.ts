/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendContract, BackendCredentialsContract, OperationCollection, OperationContract, PropertyContract } from "azure-arm-apimanagement/lib/models";
import { WebSiteManagementClient } from "azure-arm-website";
import { Site, WebAppCollection } from "azure-arm-website/lib/models";
import { ProgressLocation, window } from "vscode";
import xml = require("xml");
import * as Constants from "../constants";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { FunctionService } from "../models/Function/FunctionService";
import { IFunctionContract } from "../models/Function/IFunctionContract";
import { apiUtil } from "../utils/apiUtil";
import { Utils } from "../utils/Utils";

export async function importFunctionAppToApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", `Import function app to api ${node.root.apiName} started...`));
    const client = FunctionService.getClient(node);
    const allfunctionApps = await listFunctionApps(client);
    const functionApp = await pickFunctionApp(allfunctionApps);
    const baseUrlToAppSite = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${functionApp.site.resourceGroup}/providers/Microsoft.Web/sites/${functionApp.label}`;
    const pickedFuncs = await pickFunctions(node, baseUrlToAppSite);
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importFunctionApp", `Importing FunctionApp '${String(functionApp.site.name)}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            if (node) {
                await addOperationsToExistingApi(node, apiUtil.genApiId(node.root.apiName), baseUrlToAppSite, pickedFuncs, String(functionApp.site.name), node.root.apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importFunctionApp", `Imported FunctionApp '${String(functionApp.site.name)}' to API Management succesfully.`));
    });
}

export async function importFunctionApp(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", "Import function app started!"));
    const client = FunctionService.getClient(node);

    // Pick function app
    const allfunctionApps = await listFunctionApps(client);
    const functionApp = await pickFunctionApp(allfunctionApps);
    const baseUrlToAppSite = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${functionApp.site.resourceGroup}/providers/Microsoft.Web/sites/${functionApp.label}`;
    const pickedFuncs = await pickFunctions(node, baseUrlToAppSite);
    const apiName = await getNewApiName(functionApp.label);
    const apiId = apiUtil.genApiId(apiName);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importFunctionApp", `Importing FunctionApp '${String(functionApp.site.name)}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            if (node) {
                //window.showInformationMessage(localize("importingFuntionApp", apiId));
                const nApi = await createApiFromFunctionApp(apiId, functionApp.site, apiName);
                await node.createChild({ apiName: String(functionApp.site.name), apiContract: nApi });
                await addOperationsToExistingApi(node, apiId, baseUrlToAppSite, pickedFuncs, String(functionApp.site.name), apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importFunctionApp", `Imported FunctionApp '${String(functionApp.site.name)}' to API Management succesfully.`));
    });
}

async function addOperationsToExistingApi(node: ApiTreeItem | ApisTreeItem, apiId: string, baseUrl: string, funcs: IFunctionContract[], funcAppName: string, apiName: string): Promise<void> {
    ext.outputChannel.appendLine(localize("importFunctionApp", "Creating operations for each selected function..."));
    let allOperations: OperationContract[] = [];
    let functionAppBase: string = "";
    for (const func of funcs) {
        ext.outputChannel.appendLine(localize("importFunctionApp", `Creating operation for function ${func.name}...`));
        const bindings = func.properties.config.bindings.find(b => !b.direction || b.direction === Constants.HttpTriggerDirectionContract.in);
        const trigger = func.properties.name;
        const route = bindings && bindings.route ? String(bindings.route) : trigger;
        if (functionAppBase === "") {
            functionAppBase = bindings && bindings.route ? getFunctionAppBase(func.properties.invoke_url_template, String(bindings.route)) : getFunctionAppBase(func.properties.invoke_url_template, trigger);
        }
        if (bindings && bindings.methods && bindings.methods.length > 0) {
            bindings.methods.forEach(element => {
                allOperations.push(getNewOperation(apiId, element, `${element}-${trigger}`, route, trigger));
            });
        } else {
            allOperations.push(getNewOperation(apiId, "POST", trigger, route, trigger));
        }
    }
    if (allOperations.length === 0) {
        return undefined;
    } else {
        if (node instanceof ApiTreeItem) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Checking conflict operations...`));
            node = <ApiTreeItem>node;
            const existingOperations = await getAllOperations(node);
            allOperations = filteredExistingOperations(apiId, existingOperations, allOperations);
        }
        for (const operation of allOperations) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Creating new operations to Api...`));
            await node.root.client.apiOperation.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, String(operation.name), operation);
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Get host key from function app ${funcAppName}...`));
        const hostKey = await FunctionService.addFuncHostKey(baseUrl, node.root.credentials, node.root.serviceName);
        const propertyId = apiUtil.displayNameToIdentifier(`${funcAppName}-key`);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Create new property to store the function host key ${propertyId}...`));
        await createPropertyItem(node, propertyId, hostKey);

        const backendCredentials: BackendCredentialsContract = {
            header: { "x-functions-key": [`{{${propertyId}}}`] }
        };

        const backendId = apiUtil.displayNameToIdentifier(funcAppName);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Create new backend ${backendId} for the function app...`));
        await setAppBackendEntity(backendId, funcAppName, functionAppBase, backendCredentials, node);
        for (const operation of allOperations) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Create policy for operations ${operation.name}...`));
            await node.root.client.apiOperationPolicy.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, String(operation.name), {
                format: "rawxml",
                value: createApiOperationXmlPolicy(backendId)
            });
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Importing function app ${funcAppName} finished successfully!`));
    }
}

function filteredExistingOperations(apiId: string, existingOperations: string[], allOperations: OperationContract[]): OperationContract[] {
    const resOperations: OperationContract[] = [];
    for (const operation of allOperations) {
        const opName = String(operation.name);
        if (existingOperations.includes(opName)) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Resolving conflict operations... ${opName}`));
            const appdNum = genUniqueOperationName(opName, existingOperations);
            const nOperation: OperationContract = {
                id: `${apiId}/operations/${opName}-${appdNum}`,
                name: `${opName}-${appdNum}`,
                displayName: `${operation.displayName}-${appdNum}`,
                method: operation.method,
                urlTemplate: `${operation.urlTemplate}-${appdNum}`,
                description: "",
                templateParameters: operation.templateParameters
            };
            resOperations.push(nOperation);
        } else {
            resOperations.push(operation);
        }
    }
    return resOperations;
}

function genUniqueOperationName(opName: string, existingOperations: string[]): number {
    let cnt = 0;
    let curName = opName;
    while (existingOperations.includes(curName)) {
        cnt++;
        curName = opName.concat("-", cnt.toString());
    }
    return cnt;
}

async function getAllOperations(node: ApiTreeItem): Promise<string[]> {
    ext.outputChannel.appendLine(localize("importFunctionApp", `Get all operations from Api ${node.root.apiName}...`));
    const operations: OperationCollection = await node.root.client.apiOperation.listByApi(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
    const operationsNames: string[] = [];
    operations.forEach(ele => {
        operationsNames.push(String(ele.name));
    });
    return operationsNames;
}

async function pickFunctions(node: ApiTreeItem | ApisTreeItem, baseUrl: string): Promise<
    IFunctionContract[]> {
    const allFunctions = await FunctionService.listAllFunctions(baseUrl, node.root.credentials);
    const importableFuncs = await filterFunctions(allFunctions);

    // Pick functions to import
    ext.outputChannel.appendLine(localize("importFunctionApp", "Get functions to import...."));
    const pickedFuncs = await ext.ui.showQuickPick(importableFuncs.map((s) => { return { label: String(s.properties.name), func: s }; }), { canPickMany: true });
    return pickedFuncs.map(s => { return s.func; });
}

async function listFunctionApps(client: WebSiteManagementClient): Promise<Site[]> {
    // Get all webapps
    ext.outputChannel.appendLine(localize("importFunctionApp", "Get function apps..."));
    const allWebApps: WebAppCollection = await client.webApps.list();
    return allWebApps.filter((ele) => !!ele.kind && ele.kind.includes('functionapp'));
}

async function pickFunctionApp(functionApps: Site[]): Promise<{
    label: string;
    site: Site;
}> {
    // Pick function app
    return await ext.ui.showQuickPick(functionApps.map((s) => { return { label: String(s.name), site: s }; }), { canPickMany: false });
}

// Create policy for imported operation
function createApiOperationXmlPolicy(backendId: string): string {
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

// Create backend for the function app on api service
async function setAppBackendEntity(backendId: string, appName: string, appPath: string, BackendCredentials: BackendCredentialsContract, node: ApisTreeItem | ApiTreeItem): Promise<void> {
    const nbackend: BackendContract = {
        description: `${appName}`,
        resourceId: `${node.root.environment.resourceManagerEndpointUrl}/subscription/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.Web/sites/${appName}`,
        url: appPath,
        id: backendId,
        name: backendId,
        protocol: "http",
        credentials: BackendCredentials
    };
    await node.root.client.backend.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, backendId, nbackend);
}

// Create secret named value for function app hostkey
async function createPropertyItem(node: ApisTreeItem | ApiTreeItem, propertyId: string, hostKey: string): Promise<void> {
    const propertyContract: PropertyContract = {
        displayName: propertyId,
        value: hostKey,
        tags: ["key", "function", "auto"],
        secret: true
    };
    await node.root.client.property.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, propertyId, propertyContract);
}

// create new operation for each function and method
function getNewOperation(apiId: string, method: string, name: string, route: string, displayName: string): OperationContract {
    const operationId = apiUtil.displayNameToIdentifier(name);
    const cleanUrl = Utils.parseUrlTemplate(route);
    return {
        id: `${apiId}/operations/${operationId}`,
        name: operationId,
        displayName: displayName,
        method: method,
        urlTemplate: cleanUrl.urlTemplate,
        description: "",
        templateParameters: cleanUrl.parameters
    };
}

function getFunctionAppBase(invokeUrlTemplate: string, route: string): string {
    const uri = invokeUrlTemplate.substr(0, invokeUrlTemplate.length - route.length);
    return uri.endsWith("/") ? uri.substr(0, uri.length - 1) : uri;
}

async function createApiFromFunctionApp(apiId: string, funcApp: Site, apiName: string): Promise<ApiContract> {
    ext.outputChannel.appendLine(localize("importFunctionApp", `Create Api for the function app ${funcApp.name}...`));
    return {
        description: `Import from "${funcApp.name}" Function App`,
        id: apiId,
        name: apiName,
        displayName: apiName,
        path: "",
        protocols: ["https"]
    };
}

// Get new api id
async function getNewApiName(func: string): Promise<string> {
    const inputName = await apiUtil.askApiNameWithDefaultValue(func);
    if (inputName === undefined && inputName === "") {
        return func;
    } else {
        return inputName;
    }
}

// Find all importable functions
async function filterFunctions(functions: IFunctionContract[]): Promise<IFunctionContract[]> {
    // tslint:disable-next-line: no-unsafe-any
    return functions.filter(element =>
        (element.properties.config !== undefined && element.properties.config.bindings !== undefined &&
            !!element.properties.config.bindings.find(ele =>
                ele.type === Constants.HttpTriggerType &&
                (!ele.direction || ele.direction === Constants.HttpTriggerDirectionContract.in) &&
                (!ele.authLevel || ele.authLevel !== Constants.HttpTriggerAuthLevelAdmin))));
}
