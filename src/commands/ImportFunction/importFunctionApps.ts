/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendContract, BackendCredentialsContract, OperationContract, PropertyContract } from "azure-arm-apimanagement/lib/models";
import { WebSiteManagementClient } from "azure-arm-website";
import { Site, WebAppCollection } from "azure-arm-website/lib/models";
import { ServiceClientCredentials, WebResource } from "ms-rest";
import * as request from 'request-promise';
import { ProgressLocation, window } from "vscode";
import { appendExtensionUserAgent, createAzureClient } from "vscode-azureextensionui";
import xml = require("xml");
import * as Constants from "../../constants";
import { ApisTreeItem } from "../../explorer/ApisTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { IAzureClientInfo } from "../../models/AzureClientInfo";
import { IFunctionKeys } from "../../models/Function";
import { apiUtils } from "../../utils/apiUtils";
import { nRequest, requestUtilWithCredentials, sendRequest } from "../../utils/requestUtil";
import { signRequest } from "../../utils/signRequest";
import { Utils } from "../../utils/Utils";
import { IFunctionContract } from "./IFunctionContract";

export async function importFunctionApps(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    // Get website mgmt clinet
    const clientInfo: IAzureClientInfo = {
        credentials: node.root.credentials,
        subscriptionId: node.root.subscriptionId,
        environment: node.root.environment
    };
    const client = getClient(clientInfo);

    // Get all webapps
    const allWebApps: WebAppCollection = await client.webApps.list();
    const functionAppNames = allWebApps.filter((ele) => !!ele.kind && ele.kind.includes('functionapp'));

    // Pick function app
    const functionApp = await ext.ui.showQuickPick(functionAppNames.map((s) => { return { label: String(s.name), site: s }; }), { canPickMany: false });
    const baseUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${functionApp.site.resourceGroup}/providers/Microsoft.Web/sites/${functionApp.label}`;
    const allFunctions = await listAllFunctions(baseUrl, node.root.credentials);
    const importableFuncs = await filterFunctions(allFunctions);

    // Pick functions to import
    const pickedFuncs = await ext.ui.showQuickPick(importableFuncs.map((s) => { return { label: String(s.name), func: s }; }), { canPickMany: true });
    const apiName = await getNewApiName(functionApp.label);
    const apiId = apiUtils.genApiId(apiName);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("importingFuntionApp", `Importing FunctionApp '${String(functionApp.site.name)}' to API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        async () => {
            if (node) {
                //window.showInformationMessage(localize("importingFuntionApp", apiId));
                const nApi = await createApiFromFunctionApp(apiId, functionApp.site, apiName);
                await node.createChild({ apiName: String(functionApp.site.name), apiContract: nApi });
                await addOperationsToApi(node, apiId, baseUrl, pickedFuncs.map(s => { return s.func; }), String(functionApp.site.name), apiName);
            }
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("importingFuntionApp", `Imported FunctionApp '${String(functionApp.site.name)}' to API Management succesfully.`));
     });
}

async function addOperationsToApi(node: ApisTreeItem, apiId: string, baseUrl: string, funcs: IFunctionContract[], funcAppName: string, apiName: string): Promise<void> {
    const allOperations: OperationContract[] = [];
    let functionAppBase: string = "";
    for (const func of funcs) {
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
        for (const operation of allOperations) {
            try {
                await node.root.client.apiOperation.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, String(operation.name), operation);
            } catch (error) {
                throw error;
            }
        }
        const hostKey = await addFuncHostKey(baseUrl, node.root.credentials, node.root.serviceName);
        const propertyId = apiUtils.displayNameToIdentifier(`${funcAppName}-key`);
        await createPropertyItem(node, propertyId, hostKey);

        const backendCredentials: BackendCredentialsContract = {
            header: { "x-functions-key": [`{{${propertyId}}}`] }
        };

        const backendId = apiUtils.displayNameToIdentifier(funcAppName);
        await setAppBackendEntity(backendId, funcAppName, functionAppBase, backendCredentials, node);
        for (const operation of allOperations) {
            await node.root.client.apiOperationPolicy.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, apiName, String(operation.name), {
                format: "rawxml",
                value: createApiOperationXmlPolicy(backendId)
            });
        }
    }
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
async function setAppBackendEntity(backendId: string, appName: string, appPath: string, BackendCredentials: BackendCredentialsContract, node: ApisTreeItem): Promise<void> {
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
async function createPropertyItem(node: ApisTreeItem, propertyId: string, hostKey: string): Promise<void> {
    const propertyContract: PropertyContract = {
        displayName: propertyId,
        value: hostKey,
        tags: ["key", "function", "auto"],
        secret: true
    };
    await node.root.client.property.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, propertyId, propertyContract);
}

// check if the imported function app already has the hostkey, otherwise created
async function addFuncHostKey(baseUrl: string, credentials: ServiceClientCredentials, serviceName: string): Promise<string> {
    const hostKeys = await getFuncHostKeys(baseUrl, credentials);
    const funcAppKeyName = `apim-${serviceName}`;
    if (hostKeys !== undefined && hostKeys.functionKeys !== undefined && hostKeys.functionKeys[funcAppKeyName]) {
        return hostKeys.functionKeys[funcAppKeyName];
    }
    return await createFuncHostKey(baseUrl, funcAppKeyName, credentials);
}

// Create function hostkey for our apim service
async function createFuncHostKey(baseUrl: string, funcKeyName: string, credentials: ServiceClientCredentials): Promise<string> {
    // create new webresource
    const options = new WebResource();
    options.method = "PUT";
    options.url = `${baseUrl}/host/default/functionkeys/${funcKeyName}?api-version=2018-11-01`;
    options.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    await signRequest(options, credentials);
    // send request to get new function hostkey
    const funKeyRequest = <nRequest>options;
    funKeyRequest.body = {
        properties: {}
    };
    funKeyRequest.json = true;
    const response = await sendRequest(funKeyRequest);
    if (response.properties.value) {
        return String(response.properties.value);
    } else {
        throw new Error("Unexpected null value when generating function host key");
    }
}

// Get function hostkey
async function getFuncHostKeys(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionKeys> {
    const options = new WebResource();
    options.method = "POST";
    options.url = `${baseUrl}/host/default/listkeys?api-version=${Constants.functionAppApiVersion}`;
    options.headers = {
        ['User-Agent']: appendExtensionUserAgent()
    };
    await signRequest(options, credentials);
    // tslint:disable-next-line: await-promise
    const funcKeys = await request(options).promise();
    // tslint:disable-next-line: no-unsafe-any
    return JSON.parse(funcKeys);
}

// create new operation for each function and method
function getNewOperation(apiId: string, method: string, name: string, route: string, displayName: string): OperationContract {
    const operationId = apiUtils.displayNameToIdentifier(name);
    const operation: OperationContract = { id: `${apiId}/operations/${operationId}`, name: operationId, displayName: displayName, method: method, urlTemplate: "*", description: "", templateParameters: [] };
    const cleanUrl = Utils.parseUrlTemplate(route);
    operation.urlTemplate = cleanUrl.urlTemplate;
    operation.templateParameters = cleanUrl.parameters;
    return operation;
}

function getFunctionAppBase(invokeUrlTemplate: string, route: string): string {
    const uri = invokeUrlTemplate.substr(0, invokeUrlTemplate.length - route.length);
    return uri.endsWith("/") ? uri.substr(0, uri.length - 1) : uri;
}

async function createApiFromFunctionApp(apiId: string, funcApp: Site, apiName: string): Promise<ApiContract> {
    if (funcApp.name) {
        return {
            description: `Import from "${funcApp.name}" Function App`,
            id: apiId,
            name: apiName,
            displayName: apiName,
            path: "",
            protocols: ["http"]
        };
    } else {
        throw new Error("Unexpected null value for this function app : name");
    }
}

// Create client for webiste mgmt client
function getClient(clientInfo: IAzureClientInfo): WebSiteManagementClient {
    return createAzureClient(clientInfo, WebSiteManagementClient);
}

// Get all functions from a function app
async function listAllFunctions(baseUrl: string, credentials: ServiceClientCredentials): Promise<IFunctionContract[]> {
    const queryUrl = `${baseUrl}/functions?api-version=${Constants.functionAppApiVersion}`;
    const funcAppObj = await requestUtilWithCredentials(queryUrl, credentials);
    // tslint:disable-next-line: no-unsafe-any
    return JSON.parse(funcAppObj).value;
}

// Get new api id
async function getNewApiName(func: string): Promise<string> {
    const inputName = await askApiName(func);
    if (inputName === undefined && inputName === "") {
        return func;
    } else {
        return inputName;
    }
}

// User input api Name
async function askApiName(funcName: string): Promise<string> {
    const apiNamePrompt: string = localize('apiNamePrompt', `Enter API Name. Otherwise default as ${funcName}`);
    return (await ext.ui.showInputBox({
        prompt: apiNamePrompt,
        value: funcName,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return apiUtils.validateApiName(value);
        }
    })).trim();
}

// Find all importable functions
async function filterFunctions(functions: IFunctionContract[]): Promise<IFunctionContract[]> {
    // tslint:disable-next-line: no-unsafe-any
    return functions.filter(element => (element.properties.config !== undefined && element.properties.config.bindings !== undefined && !!element.properties.config.bindings.find(ele => ele.type === Constants.HttpTriggerType &&
        (!ele.direction || ele.direction === Constants.HttpTriggerDirectionContract.in) &&
        (!ele.authLevel || ele.authLevel !== Constants.HttpTriggerAuthLevelAdmin))));
}
