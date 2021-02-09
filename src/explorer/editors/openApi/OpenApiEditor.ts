/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { HttpOperationResponse, RequestPrepareOptions, ServiceClient } from "@azure/ms-rest-js";
import { ProgressLocation, window } from "vscode";
import { appendExtensionUserAgent, createGenericClient } from "vscode-azureextensionui";
import { openApiAcceptHeader, openApiExport, openApiSchema, showSavePromptConfigKey, swaggerAcceptHeader, swaggerExport, swaggerSchema } from "../../../constants";
import { localize } from "../../../localize";
import { IOpenApiImportObject } from "../../../openApi/OpenApiImportObject";
import { OpenApiParser } from "../../../openApi/OpenApiParser";
import { processError } from "../../../utils/errorUtil";
import { nonNullProp } from "../../../utils/nonNull";
import { ApiTreeItem } from "../../ApiTreeItem";
import { Editor } from "../Editor";

export class OpenApiEditor extends Editor<ApiTreeItem> {
    constructor() {
        super(showSavePromptConfigKey);
    }

    public async getData(context: ApiTreeItem): Promise<string> {
        try {
            // Check the supported schemas for API. If no schemas specified then assume open api 3.0
            const schemas = await context.root.client.apiSchema.listByApi(context.root.resourceGroupName, context.root.serviceName, context.root.apiName);
            let exportFormat: string = openApiExport;
            let exportAcceptHeader: string = openApiAcceptHeader;
            if (schemas.length > 0) {
                const openApiSchemaSupported = schemas.find((s) => s.contentType === openApiSchema);
                if (openApiSchemaSupported === undefined) {
                    const swaggerSchemaSupported = schemas.find((s) => s.contentType === swaggerSchema);
                    if (swaggerSchemaSupported !== undefined) {
                        exportFormat = swaggerExport;
                        exportAcceptHeader = swaggerAcceptHeader;
                    } else {
                        throw Error(localize("unSupportedSchema", `'${context.root.apiName}' does not support OpenAPI 2.0 or OpenAPI 3.0 schema.`));
                    }
                }
            }

            const responseDocument = await this.requestOpenAPIDocument(context, exportFormat, exportAcceptHeader);
            const sourceDocument = await this.processDocument(context, responseDocument);
            return JSON.stringify(sourceDocument, null, "\t");
        } catch (error) {
            throw new Error(processError(error, localize("getOpenAPIDocumentFailed", `Failed to retriev OpenAPI document for API ${context.root.apiName}.`)));
        }
    }

    // tslint:disable: no-unsafe-any
    public async updateData(context: ApiTreeItem, data: string): Promise<string> {
        let openApiDocument: IOpenApiImportObject | undefined;
        try {
            const documentJson = JSON.parse(data);
            const openApiparser = new OpenApiParser();
            openApiDocument = await openApiparser.parse(documentJson);

            openApiparser.updateBackend(openApiDocument.sourceDocument, nonNullProp(context.apiContract, 'serviceUrl'));

            const swaggerJson = JSON.stringify(openApiDocument.sourceDocument);
            const payload: ApiManagementModels.ApiCreateOrUpdateParameter = {
                format: openApiDocument.importFormat,
                value: swaggerJson,
                path: context.apiContract.path
            };

            return window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: localize("updatingAPI", `Applying changes to API '${context.root.apiName}' in API Management instance ${context.root.serviceName}...`),
                    cancellable: false
                },
                async () => context.root.client.api.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, payload)
            ).then(async () => {
                window.showInformationMessage(localize("updateOpenApiSucceded", `Changes to API '${context.apiContract.name}' were succefully uploaded to cloud.`));
                //await context.refresh();
                return this.getData(context);
            });

        } catch (error) {
            throw new Error(processError(error, localize("updateOpenApiFailed", `Changes to the OpenAPI document could not be uploaded to cloud.`)));
        }
    }

    public async getDiffFilename(context: ApiTreeItem): Promise<string> {
        return `${context.root.serviceName}-${context.root.apiName}-openapi.json`;
    }

    public async getFilename(context: ApiTreeItem): Promise<string> {
        return `${context.root.serviceName}-${context.root.apiName}-openapi-tempFile.json`;
    }

    public async getSize(): Promise<number> {
        throw new Error("Method not implemented.");
    }

    public async getSaveConfirmationText(context: ApiTreeItem): Promise<string> {
        return `Saving will update the API '${context.apiContract.name}'.`;
    }

    // tslint:disable-next-line:no-any
    private async requestOpenAPIDocument(context: ApiTreeItem, exportFormat: string, exportAcceptHeader: string) : Promise<string> {
        const client: ServiceClient = await createGenericClient(context.root.credentials);
        const options: RequestPrepareOptions = {
            method: "GET",
            url: this.buildAPIExportUrl(context, exportFormat)
        };
        options.headers = {
            Accept: exportAcceptHeader,
            'User-Agent': appendExtensionUserAgent()
        };
        const result: HttpOperationResponse = await client.sendRequest(options);
        return <string>result.bodyAsText;
    }

    private buildAPIExportUrl(context: ApiTreeItem, exportFormat: string) : string {
        let url = `${context.root.environment.resourceManagerEndpointUrl}/subscriptions/${context.root.subscriptionId}/resourceGroups/${context.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${context.root.serviceName}/apis/${context.root.apiName}`;
        url = `${url}?export=true&format=${exportFormat}&api-version=2019-01-01`;
        return url;
    }

    // tslint:disable-next-line:no-any
    private async processDocument(context: ApiTreeItem, swaggerDocument: string) : Promise<any> {
        const openApiparser = new OpenApiParser();
        const swagger = JSON.parse(swaggerDocument);
        // tslint:disable-next-line: no-unsafe-any
        const importDocument = await openApiparser.parse(swagger);
        const sourceDocument = importDocument.sourceDocument;
        let basePath: string = importDocument.basePath !== undefined ? importDocument.basePath : "";
        if (context.apiContract.apiVersionSet && context.apiContract.apiVersionSet.versioningScheme === "Segment") {
            const versionSegment = `/${context.apiContract.apiVersion}`;
            if (basePath.endsWith(versionSegment)) {
                // tslint:disable-next-line: no-unsafe-any
                basePath = sourceDocument.basePath.replace(versionSegment, "");
            }
        }
        const service = await context.root.client.apiManagementService.get(context.root.resourceGroupName, context.root.serviceName);
        // tslint:disable-next-line: no-unsafe-any
        openApiparser.updateBasePath(sourceDocument, basePath, nonNullProp(service, "gatewayUrl"));
        return sourceDocument;
    }
}
