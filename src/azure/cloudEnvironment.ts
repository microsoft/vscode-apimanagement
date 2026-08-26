/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Minimal, dependency-free replacement for the deprecated `@azure/ms-rest-azure-env` `Environment`.
// Only the members consumed by this extension are surfaced; endpoint constants are copied verbatim
// from `@azure/ms-rest-azure-env` so token scopes and endpoints remain byte-for-byte identical.

export interface EnvironmentParameters {
    name: string;
    portalUrl: string;
    managementEndpointUrl: string;
    resourceManagerEndpointUrl: string;
    activeDirectoryEndpointUrl: string;
    activeDirectoryResourceId: string;
    activeDirectoryGraphResourceId?: string;
    sqlManagementEndpointUrl?: string;
    sqlServerHostnameSuffix?: string;
    galleryEndpointUrl?: string;
    batchResourceId?: string;
    storageEndpointSuffix?: string;
    keyVaultDnsSuffix?: string;
    validateAuthority?: boolean;
    // tslint:disable-next-line: no-any
    [key: string]: any;
}

export class Environment {
    public name: string;
    public portalUrl: string;
    public managementEndpointUrl: string;
    public resourceManagerEndpointUrl: string;
    public activeDirectoryEndpointUrl: string;
    public activeDirectoryResourceId: string;
    public activeDirectoryGraphResourceId?: string;
    public validateAuthority: boolean;

    public static readonly AzureCloud: Environment;
    public static readonly ChinaCloud: Environment;
    public static readonly USGovernment: Environment;

    constructor(parameters: EnvironmentParameters) {
        const requiredParams = ["name", "portalUrl", "managementEndpointUrl", "resourceManagerEndpointUrl", "activeDirectoryEndpointUrl", "activeDirectoryResourceId"];
        requiredParams.forEach((param) => {
            if (!(param in parameters)) {
                throw new Error(`Please provide "${param}" for the environment.`);
            }
        });
        Object.assign(this, parameters);
        this.name = parameters.name;
        this.portalUrl = parameters.portalUrl;
        this.managementEndpointUrl = parameters.managementEndpointUrl;
        this.resourceManagerEndpointUrl = parameters.resourceManagerEndpointUrl;
        this.activeDirectoryEndpointUrl = parameters.activeDirectoryEndpointUrl;
        this.activeDirectoryResourceId = parameters.activeDirectoryResourceId;
        this.activeDirectoryGraphResourceId = parameters.activeDirectoryGraphResourceId;
        this.validateAuthority = parameters.validateAuthority !== undefined ? parameters.validateAuthority : true;
    }

    public static get(name: string): Environment | undefined {
        return [Environment.AzureCloud, Environment.ChinaCloud, Environment.USGovernment].find((env) => env.name === name);
    }
}

// tslint:disable-next-line: no-object-mutation
(Environment as { AzureCloud: Environment }).AzureCloud = new Environment({
    name: "AzureCloud",
    portalUrl: "https://portal.azure.com",
    managementEndpointUrl: "https://management.core.windows.net",
    resourceManagerEndpointUrl: "https://management.azure.com/",
    sqlManagementEndpointUrl: "https://management.core.windows.net:8443/",
    sqlServerHostnameSuffix: ".database.windows.net",
    galleryEndpointUrl: "https://gallery.azure.com/",
    activeDirectoryEndpointUrl: "https://login.microsoftonline.com/",
    activeDirectoryResourceId: "https://management.core.windows.net/",
    activeDirectoryGraphResourceId: "https://graph.windows.net/",
    storageEndpointSuffix: "core.windows.net",
    keyVaultDnsSuffix: ".vault.azure.net"
});

// tslint:disable-next-line: no-object-mutation
(Environment as { ChinaCloud: Environment }).ChinaCloud = new Environment({
    name: "AzureChinaCloud",
    portalUrl: "https://portal.azure.cn",
    managementEndpointUrl: "https://management.core.chinacloudapi.cn",
    resourceManagerEndpointUrl: "https://management.chinacloudapi.cn",
    sqlManagementEndpointUrl: "https://management.core.chinacloudapi.cn:8443/",
    sqlServerHostnameSuffix: ".database.chinacloudapi.cn",
    galleryEndpointUrl: "https://gallery.chinacloudapi.cn/",
    activeDirectoryEndpointUrl: "https://login.chinacloudapi.cn/",
    activeDirectoryResourceId: "https://management.core.chinacloudapi.cn/",
    activeDirectoryGraphResourceId: "https://graph.chinacloudapi.cn/",
    batchResourceId: "https://batch.chinacloudapi.cn/",
    storageEndpointSuffix: "core.chinacloudapi.cn",
    keyVaultDnsSuffix: ".vault.azure.cn"
});

// tslint:disable-next-line: no-object-mutation
(Environment as { USGovernment: Environment }).USGovernment = new Environment({
    name: "AzureUSGovernment",
    portalUrl: "https://portal.azure.us",
    managementEndpointUrl: "https://management.core.usgovcloudapi.net",
    resourceManagerEndpointUrl: "https://management.usgovcloudapi.net",
    sqlManagementEndpointUrl: "https://management.core.usgovcloudapi.net:8443/",
    sqlServerHostnameSuffix: ".database.usgovcloudapi.net",
    galleryEndpointUrl: "https://gallery.usgovcloudapi.net/",
    activeDirectoryEndpointUrl: "https://login.microsoftonline.us/",
    activeDirectoryResourceId: "https://management.core.usgovcloudapi.net/",
    activeDirectoryGraphResourceId: "https://graph.windows.net/",
    batchResourceId: "https://batch.core.usgovcloudapi.net/",
    storageEndpointSuffix: "core.usgovcloudapi.net",
    keyVaultDnsSuffix: ".vault.usgovcloudapi.net"
});
