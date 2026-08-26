/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Lightweight axios-backed replacement for the deprecated `@azure/ms-rest-js` `ServiceClient`.
// Preserves the `sendRequest({ method, url, body, ... }) => { status, parsedBody, bodyAsText, headers }`
// shape the extension relies on, including not throwing on non-2xx responses.

import { AccessToken, TokenCredential } from "@azure/core-auth";
import { appendExtensionUserAgent, AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";
import axios, { AxiosRequestConfig, Method } from "axios";
import { AzureAuth } from "./azureLogin/azureAuth";
import { Environment } from "./cloudEnvironment";

export type HttpMethods = "GET" | "PUT" | "POST" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE";

export interface IRequestOptions {
    url: string;
    method: HttpMethods | string;
    headers?: { [key: string]: string };
    // tslint:disable-next-line: no-any
    body?: any;
    // tslint:disable-next-line: no-any
    queryParameters?: { [key: string]: any };
    timeout?: number;
}

export interface IHttpResponse {
    status: number;
    // tslint:disable-next-line: no-any
    parsedBody: any;
    bodyAsText: string;
    // tslint:disable-next-line: no-any
    headers: { [key: string]: any };
}

export interface IClientOptions {
    userAgent?(defaultUserAgent: string): string;
}

export function createMsalScope(authority: string, scope: string = ".default"): string {
    return authority.endsWith("/") ? `${authority}${scope}` : `${authority}/${scope}`;
}

export function getDefaultMsalScopes(environment: Environment): string[] {
    return [createMsalScope(environment.managementEndpointUrl)];
}

export async function getAuthorizationHeader(credential: AzExtServiceClientCredentials | TokenCredential): Promise<string> {
    const tokenResponse: AccessToken | null = await (credential as TokenCredential).getToken(getDefaultMsalScopes(AzureAuth.getEnvironment()));
    if (!tokenResponse) {
        throw new Error("Authorization header is missing");
    }
    return `Bearer ${tokenResponse.token}`;
}

// tslint:disable-next-line: no-any
function tryParseJson(text: string): any {
    if (text === undefined || text === null || text === "") {
        return undefined;
    }
    try {
        return JSON.parse(text);
    } catch {
        return text;
    }
}

export class AzureServiceClient {
    constructor(private readonly credentials: AzExtServiceClientCredentials, private readonly options?: IClientOptions) {}

    public async sendRequest(request: IRequestOptions): Promise<IHttpResponse> {
        const authorization: string = await getAuthorizationHeader(this.credentials);
        const defaultUserAgent: string = appendExtensionUserAgent();
        const userAgent: string = this.options && this.options.userAgent ? this.options.userAgent(defaultUserAgent) : defaultUserAgent;
        const config: AxiosRequestConfig = {
            url: request.url,
            method: request.method as Method,
            params: request.queryParameters,
            data: request.body,
            timeout: request.timeout,
            headers: {
                "User-Agent": userAgent,
                ...request.headers,
                Authorization: authorization
            },
            responseType: "text",
            transformResponse: (data) => data,
            validateStatus: () => true
        };
        // tslint:disable-next-line: no-unsafe-any
        const response = await axios(config);
        const bodyAsText: string = typeof response.data === "string"
            ? response.data
            : (response.data !== undefined && response.data !== null ? JSON.stringify(response.data) : "");
        return {
            status: response.status,
            bodyAsText,
            parsedBody: tryParseJson(bodyAsText),
            headers: response.headers
        };
    }
}
