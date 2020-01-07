/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class SingleApiJsonObject {
    private sourceApimName: string;
    private resourceGroup: string;
    private fileFolder: string;
    private apiName: string;

    constructor(sourceApimName: string, resourceGroup: string, fileFolder: string, apiName: string) {
        this.sourceApimName = sourceApimName;
        this.resourceGroup = resourceGroup;
        this.fileFolder = fileFolder;
        this.apiName = apiName;
    }

    public stringify(): string {
        const jsonObj = {
            sourceApimName: this.sourceApimName,
            destinationApimName: "",
            resourceGroup: this.resourceGroup,
            fileFolder: this.fileFolder,
            apiName: this.apiName,
            linkedTemplatesBaseUrl: "",
            linkedTemplatesUrlQueryString: "",
            policyXMLBaseUrl: ""
        };
        return JSON.stringify(jsonObj);
    }
}
