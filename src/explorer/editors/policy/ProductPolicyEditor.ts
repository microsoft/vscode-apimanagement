/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IProductTreeRoot } from "../../IProductTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ProductPolicyEditor extends BasePolicyEditor<IProductTreeRoot> {
    public async getPolicy(context: ITreeItemWithRoot<IProductTreeRoot>): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/product-policy/get?view=rest-apimanagement-2024-05-01&tabs=HTTP
        const policy =  await context.root.client.productPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.productName, 'policy', { format: policyFormat });
        return policy.value!;
    }

    public async updatePolicy(context: ITreeItemWithRoot<IProductTreeRoot>, policy: PolicyContract): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/product-policy/create-or-update?view=rest-apimanagement-2024-05-01&tabs=HTTP
       const policyResult = await context.root.client.productPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.productName, 'policy', policy);
       return policyResult.value!;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
