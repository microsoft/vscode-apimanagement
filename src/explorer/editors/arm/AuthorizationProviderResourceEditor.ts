/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureTreeItem } from "vscode-azureextensionui";
import { ApimService } from "../../../azure/apim/ApimService";
import { IAuthorizationProviderContract } from "../../../azure/apim/contracts";
import { nonNullValue } from "../../../utils/nonNull";
import { IAuthorizationProviderTreeRoot } from "../../IAuthorizationProviderTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class AuthorizationProviderResourceEditor extends BaseArmResourceEditor<IAuthorizationProviderTreeRoot>  {
    public entityType: string = "AuthorizationProvider";
    constructor() {
        super();
    }

    public async getDataInternal(context: AzureTreeItem<IAuthorizationProviderTreeRoot>): Promise<IAuthorizationProviderContract>  {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.getAuthorizationProvider(context.root.authorizationProviderName);
        return nonNullValue(response);
    }

    public async updateDataInternal(context: AzureTreeItem<IAuthorizationProviderTreeRoot>, payload: IAuthorizationProviderContract): Promise<IAuthorizationProviderContract> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.createAuthorizationProvider(context.root.authorizationProviderName, payload.properties);
        return nonNullValue(response);
    }
}
