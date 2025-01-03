/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ApiPolicyEditor extends BasePolicyEditor<IApiTreeRoot> {
    public async getPolicy(context: ITreeItemWithRoot<IApiTreeRoot>): Promise<string> {
        const policy = await context.root.client.apiPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, "policy", { format: policyFormat });
        return policy.value!;
    }

    public async updatePolicy(context: ITreeItemWithRoot<IApiTreeRoot>, policy: PolicyContract): Promise<string> {
        const policyResult = await context.root.client.apiPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, "policy", policy);
        return policyResult.value!;
    }

    public getDefaultPolicy(): string {
        return emptyPolicyXml;
    }
}
