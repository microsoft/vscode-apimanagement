/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendCredentialsContract, OperationCollection, OperationContract, PropertyContract } from "azure-arm-apimanagement/lib/models";
import { Site } from "azure-arm-website/lib/models";
import { ProgressLocation, window } from "vscode";
import { IFunctionContract } from "../../azure/webApp/contracts";
import { FunctionAppService } from "../../azure/webApp/FunctionAppService";
import * as Constants from "../../constants";
import { ApisTreeItem } from "../../explorer/ApisTreeItem";
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { apiUtil } from "../../utils/apiUtil";
import { nonNullOrEmptyValue } from "../../utils/nonNull";
import { webAppUtil } from "../../utils/webAppUtil";
import { parseUrlTemplate } from "./parseUrlTemplate";

export async function importFunctionAppToApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", `Import Function App started...`));

    ext.outputChannel.appendLine(localize("importFunctionApp", "Getting Function Apps..."));
    const functionApp = await webAppUtil.getPickedWebApp(node, "functionapp");
    const funcName = nonNullOrEmptyValue(functionApp.name);
    const funcAppResourceGroup = nonNullOrEmptyValue(functionApp.resourceGroup);

    const funcAppService = new FunctionAppService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, funcAppResourceGroup, funcName);
    const pickedFuncs = await pickFunctions(funcAppService);
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importFunctionApp", `Importing Function App '${funcName}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            if (node) {
                const apiId = apiUtil.genApiId(node.root.apiName);
                await addOperationsToExistingApi(node, apiId, pickedFuncs, funcName, node.root.apiName, funcAppService);
                ext.outputChannel.appendLine(localize("importFunctionApp", `Linking API Management instance to Function App...`));
                await funcAppService.updateSiteConfigAPIM(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importFunctionApp", `Imported Function App succesfully.`));
    });
}

export async function importFunctionApp(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", "Import Function App started..."));

    ext.outputChannel.appendLine(localize("importFunctionApp", "Getting Function Apps..."));
    const functionApp = await webAppUtil.getPickedWebApp(node, "functionapp");
    const funcName = nonNullOrEmptyValue(functionApp.name);
    const funcAppResourceGroup = nonNullOrEmptyValue(functionApp.resourceGroup);

    const funcAppService = new FunctionAppService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId, funcAppResourceGroup, funcName);
    const pickedFuncs = await pickFunctions(funcAppService);
    const apiName = await apiUtil.askApiName(funcName);
    const apiId = apiUtil.genApiId(apiName);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importFunctionApp", `Importing Function App '${funcName}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            if (node) {
                ext.outputChannel.appendLine(localize("importFunctionApp", `Creating API...`));
                const nApi = await constructApiFromFunctionApp(apiId, functionApp, apiName);
                await node.createChild({ apiName, apiContract: nApi });
                ext.outputChannel.appendLine(localize("importFunctionApp", `New API with name ${apiName} created...`));
                await addOperationsToExistingApi(node, apiId, pickedFuncs, funcName, apiName, funcAppService);
                ext.outputChannel.appendLine(localize("importFunctionApp", `Linking API Management instance to Function App...`));
                await funcAppService.updateSiteConfigAPIM(node.root.resourceGroupName, node.root.serviceName, apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importFunctionApp", `Imported Function App succesfully.`));
    });
}

async function addOperationsToExistingApi(node: ApiTreeItem | ApisTreeItem, apiId: string, funcs: IFunctionContract[], funcAppName: string, apiName: string, funcAppService: FunctionAppService): Promise<void> {
    ext.outputChannel.appendLine(localize("importFunctionApp", "Creating operations..."));
    let allOperations: OperationContract[] = [];
    let functionAppBase: string = "";
    for (const func of funcs) {
        ext.outputChannel.appendLine(localize("importFunctionApp", `Creating operation for Function ${func.name}...`));
        const bindings = func.properties.config.bindings.find(b => !b.direction || b.direction === Constants.HttpTriggerDirectionContract.in);
        const trigger = func.properties.name;
        const route = bindings && bindings.route ? nonNullOrEmptyValue(bindings.route) : trigger;
        if (functionAppBase === "") {
            functionAppBase = bindings && bindings.route ? getFunctionAppBase(func.properties.invoke_url_template, nonNullOrEmptyValue(bindings.route)) : getFunctionAppBase(func.properties.invoke_url_template, trigger);
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
            ext.outputChannel.appendLine(localize("importFunctionApp", `Creating new operations to API...`));
            await node.root.client.apiOperation.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, nonNullOrEmptyValue(operation.name), operation);
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Getting host key from Function App ${funcAppName}...`));
        const hostKey = await funcAppService.addFuncHostKeyForApim(node.root.serviceName);
        const propertyId = apiUtil.displayNameToIdentifier(`${funcAppName}-key`);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Create new named value for the Function host key ${propertyId}...`));
        await createPropertyItem(node, propertyId, hostKey);

        const backendCredentials: BackendCredentialsContract = {
            header: { "x-functions-key": [`{{${propertyId}}}`] }
        };

        const backendId = apiUtil.displayNameToIdentifier(funcAppName);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Create new backend entity for the function app...`));
        await webAppUtil.setAppBackendEntity(node, backendId, funcAppName, functionAppBase, funcAppService.resourceGroup, funcAppName, backendCredentials);
        for (const operation of allOperations) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Create policy for operations ${operation.name}...`));
            await node.root.client.apiOperationPolicy.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, nonNullOrEmptyValue(operation.name), {
                format: "rawxml",
                value: webAppUtil.createImportXmlPolicy(backendId)
            });
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Imported Function App successfully!`));
    }
}

function filteredExistingOperations(apiId: string, existingOperations: string[], allOperations: OperationContract[]): OperationContract[] {
    const resOperations: OperationContract[] = [];
    for (const operation of allOperations) {
        const opName = nonNullOrEmptyValue(operation.name);
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
    ext.outputChannel.appendLine(localize("importFunctionApp", `Getting all operations from API ${node.root.apiName}...`));
    const operations: OperationCollection = await node.root.client.apiOperation.listByApi(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
    const operationsNames: string[] = [];
    operations.forEach(ele => {
        operationsNames.push(nonNullOrEmptyValue(ele.name));
    });
    return operationsNames;
}

async function pickFunctions(funcAppService: FunctionAppService): Promise<IFunctionContract[]> {
    const allFunctions = await funcAppService.listAllFunctions();
    const importableFuncs = await filterFunctions(allFunctions);

    // Pick functions to import
    ext.outputChannel.appendLine(localize("importFunctionApp", "Getting Functions to import...."));
    const pickedFuncs = await ext.ui.showQuickPick(importableFuncs.map((s) => { return { label: String(s.properties.name), func: s }; }), { canPickMany: true });
    return pickedFuncs.map(s => { return s.func; });
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
    const cleanUrl = parseUrlTemplate(route);
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

async function constructApiFromFunctionApp(apiId: string, funcApp: Site, apiName: string): Promise<ApiContract> {
    return {
        description: `Import from "${funcApp.name}" Function App`,
        id: apiId,
        name: apiName,
        displayName: apiName,
        path: "",
        protocols: ["https"]
    };
}

// Find all importable functions
async function filterFunctions(functions: IFunctionContract[]): Promise<IFunctionContract[]> {
    return functions.filter(element =>
        // tslint:disable-next-line: no-unsafe-any
        (element.properties.config !== undefined && element.properties.config.bindings !== undefined &&
            !!element.properties.config.bindings.find(ele =>
                ele.type === Constants.HttpTriggerType &&
                (!ele.direction || ele.direction === Constants.HttpTriggerDirectionContract.in) &&
                (!ele.authLevel || ele.authLevel !== Constants.HttpTriggerAuthLevelAdmin))));
}
