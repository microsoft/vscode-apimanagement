/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IOpenApiImportObject {
    version: string;
    info: {
        title: string;
        description?: string;
        version: string;
        termsOfService?: string;
    };
    host?: string;
    basePath?: string;
    schemes?: string[];
    paths?: ISwaggerPath;
    securityDefinitions?: ISecurityDefinitions;
    // tslint:disable-next-line:no-any
    sourceDocument: any;
    importFormat: "swagger-json" | "openapi" | "openapi+json";
}

export interface ISecurityDefinitions {
    apikeyQuery: ISecurityType;
    apikeyHeader: ISecurityType;
}

export interface ISecurityType {
    // tslint:disable: no-reserved-keywords
    type: string;
    name: string;
    in: string;
}

export interface ISwaggerPath {
    [key: string]: IPathItem;
}

export interface IPathItem {
    [key: string]: ISwaggerOperation;
}

export interface ISwaggerOperation {
    operationId: string;
    description: string;
    parameters: ISwaggerParameter[];
    responses: Object;
    security: ISecurityType[];
    summary: string;
    consumes?: string[];
    produces?: string[];
}

export interface ISwaggerParameter {
    name: string;
    in: string;
    required: boolean;
    description: string;
    type?: string;
    schema?: Object;
    default?: string;
    enum: string[];
}
