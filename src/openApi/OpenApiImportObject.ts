/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IOpenApiImportObject {
    version: string;
    info: {
        title: string;
        description: string;
    };
    host?: string;
    basePath?: string;
    schemes?: string[];
    // tslint:disable-next-line:no-any
    sourceDocument: any;
    importFormat: "swagger-json" | "openapi" | "openapi+json";
}
