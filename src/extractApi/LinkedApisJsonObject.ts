/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class LinkedApisJsonObject {
    private sourceApimName: string;
    private resourceGroup: string;
    private fileFolder: string;

    constructor(sourceApimName: string, resourceGroup: string, fileFolder: string) {
        this.sourceApimName = sourceApimName;
        this.resourceGroup = resourceGroup;
        this.fileFolder = fileFolder;
    }

    public stringify(): string {
        const jsonObj = {
            sourceApimName: this.sourceApimName,
            destinationApimName: "",
            resourceGroup: this.resourceGroup,
            fileFolder: this.fileFolder,
            linkedTemplatesBaseUrl: "",
            linkedTemplatesUrlQueryString: "",
            policyXMLBaseUrl: ""
        };
        return JSON.stringify(jsonObj);
    }
}
