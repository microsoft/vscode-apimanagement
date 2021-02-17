/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IProductTreeRoot } from "../../IProductTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ProductPolicyEditor extends BasePolicyEditor<IProductTreeRoot> {
    public async getPolicy(context: AzureTreeItem<IProductTreeRoot>): Promise<string> {
        const policy =  await context.root.client.productPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.productName, { format: policyFormat });
        return policy._response.bodyAsText;
    }

    public async updatePolicy(context: AzureTreeItem<IProductTreeRoot>, policy: ApiManagementModels.PolicyContract): Promise<string> {
       const policyResult = await context.root.client.productPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.productName, policy);
       return policyResult._response.bodyAsText;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
