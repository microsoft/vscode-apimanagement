/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendCredentialsContract, NamedValueCreateContract, OperationCollection, OperationContract } from "@azure/arm-apimanagement/src/models";
import { Site } from "@azure/arm-appservice/src/models";
import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { getSetBackendPolicy } from "../../azure/apim/policyHelper";
import { IFunctionContract } from "../../azure/webApp/contracts";
import { FunctionAppService } from "../../azure/webApp/FunctionAppService";
import * as Constants from "../../constants";
import { ApisTreeItem, IApiTreeItemContext } from "../../explorer/ApisTreeItem";
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { apiUtil } from "../../utils/apiUtil";
import { azureClientUtil } from "../../utils/azureClientUtil";
import { nonNullOrEmptyValue } from "../../utils/nonNull";
import { createImportXmlPolicy, getPickedWebApp, setAppBackendEntity, webAppKind } from "../importWebApp/importWebApp";
import { parseUrlTemplate } from "./parseUrlTemplate";

export async function importFunctionAppToApi(context: IActionContext, node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, context);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", `Import Function App started...`));

    ext.outputChannel.appendLine(localize("importFunctionApp", "Getting Function Apps..."));
    const functionSubscriptionId = await azureClientUtil.selectSubscription();
    const functionApp = await getPickedWebApp(node, webAppKind.functionApp, functionSubscriptionId);
    const funcName = nonNullOrEmptyValue(functionApp.name);
    const funcAppResourceGroup = nonNullOrEmptyValue(functionApp.resourceGroup);

    const funcAppService = new FunctionAppService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, functionSubscriptionId, funcAppResourceGroup, funcName);
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
                await funcAppService.getWebAppConfig(node.root.resourceGroupName, node.root.serviceName, node.root.apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("importFunctionApp", `Imported Function App succesfully.`));
    });
}

export async function importFunctionApp(context: IActionContext & Partial<IApiTreeItemContext>, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("importFunctionApp", "Getting Function Apps..."));
    const functionSubscriptionId = await azureClientUtil.selectSubscription();
    const functionApp = await getPickedWebApp(node, webAppKind.functionApp, functionSubscriptionId);
    const funcName = nonNullOrEmptyValue(functionApp.name);
    const funcAppResourceGroup = nonNullOrEmptyValue(functionApp.resourceGroup);

    const funcAppService = new FunctionAppService(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, functionSubscriptionId, funcAppResourceGroup, funcName);
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

                context.apiName = apiName;
                context.apiContract = nApi;
                await node.createChild(context);
                ext.outputChannel.appendLine(localize("importFunctionApp", `New API with name ${apiName} created...`));
                await addOperationsToExistingApi(node, apiId, pickedFuncs, funcName, apiName, funcAppService);
                ext.outputChannel.appendLine(localize("importFunctionApp", `Linking API Management instance to Function App...`));
                await funcAppService.getWebAppConfig(node.root.resourceGroupName, node.root.serviceName, apiName);
                ext.outputChannel.appendLine(localize("importFunctionApp", `Imported Function App successfully!`));
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("importFunctionApp", `Imported Function App successfully.`));
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
        ext.outputChannel.appendLine(localize("importFunctionApp", `Creating new operations...`));
        for (const operation of allOperations) {
            await node.root.client.apiOperation.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, nonNullOrEmptyValue(operation.name), operation);
        }
        ext.outputChannel.appendLine(localize("importFunctionApp", `Getting host key from Function App ${funcAppName}...`));
        const hostKey = await funcAppService.addFuncHostKeyForApim(node.root.serviceName);
        const namedValueId = apiUtil.displayNameToIdentifier(`${funcAppName}-key`);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Creating new named value for the Function host key ${namedValueId}...`));
        await createPropertyItem(node, namedValueId, hostKey);

        const backendCredentials: BackendCredentialsContract = {
            header: { "x-functions-key": [`{{${namedValueId}}}`] }
        };

        const backendId = apiUtil.displayNameToIdentifier(funcAppName);
        ext.outputChannel.appendLine(localize("importFunctionApp", `Creating new backend entity for the function app...`));
        await setAppBackendEntity(node, backendId, funcAppName, functionAppBase, funcAppService.resourceGroup, funcAppName, backendCredentials);
        for (const operation of allOperations) {
            ext.outputChannel.appendLine(localize("importFunctionApp", `Creating policy for operations ${operation.name}...`));
            await node.root.client.apiOperationPolicy.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, nonNullOrEmptyValue(operation.name), {
                format: "rawxml",
                value: createImportXmlPolicy([getSetBackendPolicy(backendId)])
            });
        }
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
async function createPropertyItem(node: ApisTreeItem | ApiTreeItem, namedValueId: string, hostKey: string): Promise<void> {
    const namedValueContract: NamedValueCreateContract = {
        displayName: namedValueId,
        value: hostKey,
        tags: ["key", "function", "auto"],
        secret: true
    };
    await node.root.client.namedValue.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, namedValueId, namedValueContract);
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
        description: localize("ImportFunction", `Import from "${funcApp.name}" Function App`),
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
