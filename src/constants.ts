/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const isWindows: boolean = /^win/.test(process.platform);

export const extensionName = 'vscode-azureapim';
export const extensionPrefix: string = 'azureApiManagement';
export const doubleClickDebounceDelay = 500; //milliseconds
export const topItemCount: number = 20;

export const swaggerSchema = "application/vnd.ms-azure-apim.swagger.definitions+json";
export const openApiSchema = "application/vnd.oai.openapi.components+json";
export const swaggerExport = "swagger";
export const openApiExport = "openapi%2Bjson";
export const openApiAcceptHeader = "application/vnd.oai.openapi+json";
export const swaggerAcceptHeader = "application/vnd.swagger.doc+json";

// constants for extractor
export const templatesFolder = "\\templates";
export const extractorMasterJsonFile = "/extractorMaster.json";

export const showSavePromptConfigKey = "azureApiManagement.showSavePrompt";

export const advancedPolicyAuthoringExperienceConfigKey = "azureApiManagement.advancedPolicyAuthoringExperience";

export const policyFormat = "rawxml";

export const emptyGlobalPolicyXml =
    `<!--
    IMPORTANT:
    - Policy elements can appear only within the <inbound>, <outbound>, <backend> section elements.
    - To apply a policy to the incoming request (before it is forwarded to the backend service), place a corresponding policy element within the <inbound> section element.
    - To apply a policy to the outgoing response (before it is sent back to the caller), place a corresponding policy element within the <outbound> section element.
    - To add a policy, place the cursor at the desired insertion point and select a policy from the sidebar.
    - To remove a policy, delete the corresponding policy statement from the policy document.
    - Position the <base> element within a section element to inherit all policies from the corresponding section element in the enclosing scope.
    - Remove the <base> element to prevent inheriting policies from the corresponding section element in the enclosing scope.
    - Policies are applied in the order of their appearance, from the top down.
    - Comments within policy elements are not supported and may disappear. Place your comments between policy elements or at a higher level scope.
-->
<policies>
    <inbound>
    </inbound>
    <backend>
        <forward-request />
    </backend>
    <outbound>
    </outbound>
    <on-error>
    </on-error>
</policies>`;

export const emptyPolicyXml =
    `<!--
    IMPORTANT:
    - Policy elements can appear only within the <inbound>, <outbound>, <backend> section elements.
    - To apply a policy to the incoming request (before it is forwarded to the backend service), place a corresponding policy element within the <inbound> section element.
    - To apply a policy to the outgoing response (before it is sent back to the caller), place a corresponding policy element within the <outbound> section element.
    - To add a policy, place the cursor at the desired insertion point and select a policy from the sidebar.
    - To remove a policy, delete the corresponding policy statement from the policy document.
    - Position the <base> element within a section element to inherit all policies from the corresponding section element in the enclosing scope.
    - Remove the <base> element to prevent inheriting policies from the corresponding section element in the enclosing scope.
    - Policies are applied in the order of their appearance, from the top down.
    - Comments within policy elements are not supported and may disappear. Place your comments between policy elements or at a higher level scope.
-->
<policies>
    <inbound>
        <base />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>`;

export const sessionFolderKey = "currentSessionWorkingFolder";
