/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { emptyPolicyXml } from "../../../constants";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";
import { ApimService } from "../../../azure/apim/ApimService";

export class ApiPolicyEditor extends BasePolicyEditor<IApiTreeRoot> {
    public async getPolicy(context: ITreeItemWithRoot<IApiTreeRoot>): Promise<string> {
        const apimService = new ApimService(context.root.credentials, context.root.environment.resourceManagerEndpointUrl, context.root.subscriptionId, context.root.resourceGroupName, context.root.serviceName);
        const policyValue = await apimService.getApiPolicy(context.root.apiName);
        return policyValue ?? this.getDefaultPolicy();
    }

    public async updatePolicy(context: ITreeItemWithRoot<IApiTreeRoot>, policy: PolicyContract): Promise<string> {
        const policyResult = await context.root.client.apiPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, "policy", policy);
        return policyResult.value!;
    }

    public getDefaultPolicy(): string {
        return emptyPolicyXml;
    }
}
