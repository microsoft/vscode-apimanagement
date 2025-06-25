/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri } from "vscode";
import { parseError } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { IOpenApiImportObject } from "./OpenApiImportObject";

export class OpenApiParser {
    // tslint:disable-next-line:no-any
    public parse(source: any): IOpenApiImportObject {
        try {
            this.validateDocument(source);
        } catch (e) {
            const message: string = localize("openApiParseError", "Could not parse the OpenAPI document.");
            ext.outputChannel.appendLine(message);
            ext.outputChannel.show();
            const err = parseError(e);
            ext.outputChannel.appendLine(`${err.message}`);
            throw new Error(message);
        }

        const importObject: IOpenApiImportObject = {
// tslint:disable-next-line: no-unsafe-any
            version: this.getOpenApiVersion(source),
            sourceDocument: source,
// tslint:disable-next-line: no-unsafe-any
            info: source.info,
            importFormat: "swagger-json"
        };

        if (importObject.version === "2.0") {
            const oai20 = <IOpenApi20><unknown>source;
            importObject.schemes = oai20.schemes;
            importObject.host = oai20.host;
            importObject.basePath = oai20.basePath;
        } else if (importObject.version.startsWith("3.")) {
            importObject.importFormat = "openapi+json";
            const oai30 = <IOpenApi30><unknown>source;
            if (oai30.servers && oai30.servers.length > 0) {
                importObject.schemes = oai30.servers.map(item => item.url.substring(0, item.url.indexOf("://"))).filter((value, index, self) => self.indexOf(value) === index);
                const url = Uri.parse(oai30.servers[0].url);
                importObject.host = url.authority;
                importObject.basePath = url.path;
            }
        }

        return importObject;
    }

    private validateDocument(source: any): void {
        if (!source || typeof source !== 'object') {
            throw new Error('Document must be a valid JSON object');
        }

        // Check for required fields based on OpenAPI version
        const version = this.getOpenApiVersion(source);
        
        if (version === "2.0") {
            if (!source.info) {
                throw new Error('Invalid Swagger 2.0 document: missing required field "info".');
            }
        } else if (version && version.startsWith("3.")) {
            if (!source.info) {
                throw new Error('Invalid OpenAPI 3.0 document: missing required field "info".');
            }
        } else {
            throw new Error('The OpenAPI spec is not valid or the version is not supported. Supported versions are 2.0 and 3.x.');
        }

        // Validate info object
        if (!source.info.title || !source.info.version) {
            throw new Error('Invalid document: info object must contain title and version');
        }
    }

    public updateBasePath(source: object, basePath: string, proxyHostName: string) : void {
        const version = this.getOpenApiVersion(source);

        if (version === "2.0") {
            const oai20 = <IOpenApi20>source;

            //oai20.host = proxyHostName;

            if (basePath) {
                oai20.basePath = basePath;
            } else {
                delete oai20.basePath;
            }
        } else if (version.startsWith("3.")) {
            const oai30 = <IOpenApi30>source;

            oai30.servers = oai30.servers.map(item => {
                if (proxyHostName.split("://").length > 0) {
                    return { url: `${proxyHostName}${basePath}` };
                }
                return { url: `${item.url.split("://")[0]}://${proxyHostName}${basePath}` };
            });
        }
    }

    public updateBackend(source: object, url: string) : void {
        const parsedUrl = Uri.parse(url);
        const version = this.getOpenApiVersion(source);

        if (version === "2.0") {
            const oai20 = <IOpenApi20>source;

            oai20.host = parsedUrl.authority;

            if (parsedUrl.path) {
                oai20.basePath = parsedUrl.path;
            } else {
                delete oai20.basePath;
            }
        } else if (version.startsWith("3.")) {
            const oai30 = <IOpenApi30>source;
            oai30.servers = [{ url: url }];
        }
    }

    private getOpenApiVersion(parsed: object) : string {
        return (<IOpenApi30>parsed).openapi || (<IOpenApi20>parsed).swagger;
    }
}

interface IOpenApi20 {
    swagger: string;
    host: string;
    basePath?: string;
    schemes: string[];
}

interface IOpenApi30 {
    openapi: string;
    servers: { url: string; }[];
}
