/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IMcpServerApiContract, IMcpToolContract } from "../../../azure/apim/contracts";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { ApimService } from "../../../azure/apim/ApimService";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";

export class McpServerToolsEditor extends BaseArmResourceEditor<IApiTreeRoot> {
    public entityType: string = "MCP Server Tools";
    
    private fullArmDefinitionCache: Map<string, IMcpServerApiContract> = new Map();
    
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>): Promise<IMcpToolContract[]> {
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

        // Return the mcpTools array
        return fullArmDefinition.properties.mcpTools || [];
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IApiTreeRoot>, editedData: IMcpToolContract[]): Promise<IMcpToolContract[]> {
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

        // Merge the edited tools back into the full payload
        const updatedPayload: IMcpServerApiContract = {
            ...fullPayload,
            properties: {
                ...fullPayload.properties,
                mcpTools: editedData
            }
        };

        const result = await apimService.createOrUpdateMcpServer(context.root.apiName, updatedPayload);
        
        // Update the cache with the new result
        this.fullArmDefinitionCache.set(cacheKey, result);

        // Return the updated tools
        return result.properties.mcpTools || [];
    }

    private getCacheKey(context: ITreeItemWithRoot<IApiTreeRoot>): string {
        return `${context.root.subscriptionId}/${context.root.resourceGroupName}/${context.root.serviceName}/${context.root.apiName}`;
    }
}
