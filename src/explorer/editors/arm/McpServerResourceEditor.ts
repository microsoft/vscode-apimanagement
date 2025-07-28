/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMcpServerApiContract } from "../../../azure/apim/contracts";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { ApimService } from "../../../azure/apim/ApimService";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";

interface IMcpServerEditorData {
    displayName: string;
    description?: string;
    path: string;
}

export class McpServerResourceEditor extends BaseArmResourceEditor<IApiTreeRoot> {
    public entityType: string = "MCP Server";
    
    private fullArmDefinitionCache: Map<string, IMcpServerApiContract> = new Map();
    
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>): Promise<IMcpServerEditorData> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName
        );

        
        const fullArmDefinition = await apimService.getMcpServer(context.root.apiName);
        const cacheKey = this.getCacheKey(context);
        this.fullArmDefinitionCache.set(cacheKey, fullArmDefinition);

        // Return only the editable properties
        return {
            displayName: fullArmDefinition.properties.displayName,
            description: fullArmDefinition.properties.description,
            path: fullArmDefinition.properties.path
        };
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>, editedData: IMcpServerEditorData): Promise<IMcpServerEditorData> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName
        );

        
        const cacheKey = this.getCacheKey(context);
        const fullPayload = this.fullArmDefinitionCache.get(cacheKey);
        
        if (!fullPayload) {
            throw new Error("Full payload not found in cache. Please reopen the editor and try again.");
        }

        // Merge the edited properties back into the full payload
        const updatedPayload: IMcpServerApiContract = {
            ...fullPayload,
            properties: {
                ...fullPayload.properties,
                displayName: editedData.displayName,
                description: editedData.description,
                path: editedData.path
            }
        };

        const result = await apimService.createOrUpdateMcpServer(context.root.apiName, updatedPayload);
        
        this.fullArmDefinitionCache.set(cacheKey, result);

        // Return only the editable properties
        return {
            displayName: result.properties.displayName,
            description: result.properties.description,
            path: result.properties.path
        };
    }

    private getCacheKey(context: ITreeItemWithRoot<IApiTreeRoot>): string {
        return `${context.root.subscriptionId}/${context.root.resourceGroupName}/${context.root.serviceName}/${context.root.apiName}`;
    }
}
