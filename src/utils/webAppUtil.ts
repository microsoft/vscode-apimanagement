/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, BackendContract, BackendCredentialsContract } from "azure-arm-apimanagement/lib/models";
import WebSiteManagementClient from "azure-arm-website";
import { Site, WebAppCollection } from "azure-arm-website/lib/models";
import xml = require("xml");
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { ext } from "../extensionVariables";
import { azureClientUtil } from "./azureClientUtil";
import { nonNullOrEmptyValue } from "./nonNull";

export namespace webAppUtil {
    export async function getPickedWebApp(node: ApiTreeItem | ApisTreeItem, webAppType: string): Promise<Site> {
        const client = azureClientUtil.getClient(node.root.credentials, node.root.subscriptionId, node.root.environment);
        const allfunctionApps = await listWebApps(client, webAppType);
        return await pickWebApp(allfunctionApps);
    }

    export async function listWebApps(client: WebSiteManagementClient, webAppType: string): Promise<Site[]> {
        const allWebApps: WebAppCollection = await client.webApps.list();
        if ((webAppType === "webApp")) {
            return allWebApps.filter((ele) => !!ele.kind && !ele.kind.includes("functionapp"));
        }
        return allWebApps.filter((ele) => !!ele.kind && ele.kind.includes("functionapp"));
    }

    export async function pickWebApp(apiApps: Site[]): Promise<Site> {
        // Pick function app
        const apiApp = await ext.ui.showQuickPick(apiApps.map((s) => { return { label: nonNullOrEmptyValue(s.name), site: s }; }), { canPickMany: false });
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
            resourceId: `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${appResourceGroup}/providers/Microsoft.Web/sites/${webAppName}`,
            url: appPath,
            id: backendId,
            name: backendId,
            protocol: "http",
            credentials: BackendCredentials
        };
        await node.root.client.backend.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, backendId, nbackend);
    }

    // Create new api from web app
    export async function constructApiFromWebApp(apiId: string, webApp: Site, apiName: string): Promise<ApiContract> {
        return {
            description: `Import from "${webApp.name}" Function App`,
            id: apiId,
            name: apiName,
            displayName: apiName,
            path: "",
            protocols: ["https"]
        };
    }
}
