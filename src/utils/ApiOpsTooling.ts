/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ServiceClient } from '@azure/ms-rest-js';
import * as vscode from 'vscode';
import { createGenericClient } from 'vscode-azureextensionui';
import * as projectConstants from '../constants';
import { localize } from '../localize';
import { ExtensionHelper } from './ExtensionHelper';
import { IFileDownloader, IFileDownloadSettings } from './IFileDownloader';

export class ApiOpsTooling {
    constructor(private readonly context: vscode.ExtensionContext, private readonly extensionHelper: ExtensionHelper) {}

    // These binaries are used for API Ops, we download them to the global storage path in the
    // background as they are around 70Mb each.
    public async downloadApiOpsFromGithubRelease(): Promise<void> {
        await this.downloadGitHubReleaseIfMissing(projectConstants.extractorBinaryName);
        await this.downloadGitHubReleaseIfMissing(projectConstants.publisherBinaryName);
    }

    // Gets the download link for the latest release of the API Ops tooling.
    public async getDownloadLink(fileName: string): Promise<string> {
        const client: ServiceClient = await createGenericClient();
        const result = await client.sendRequest({
            method: "GET",
            url: projectConstants.apiOpsToolingLocation
        });

        const githubRelease = <IGithubRelease>result.parsedBody;
        for (const asset of githubRelease.assets) {
            if (asset.name === fileName) {
                return asset.url;
            }
        }

        vscode.window.showErrorMessage(localize("APIOps", "'{0}' not found in latest release.", fileName));
        return "";
    }

    public async downloadGitHubReleaseIfMissing(fileName: string): Promise<vscode.Uri | undefined> {

        const fileDownloader: IFileDownloader = await this.extensionHelper.getFileDownloaderApi();

        const existingUri = await fileDownloader.tryGetItem(fileName, this.context);
        if (!existingUri) {
            const url: string = await this.getDownloadLink(fileName);
            // Maybe GitHub is is down, don't stop the extension from working.
            if (url === "") {
                return undefined;
            }

            try {
                const settings: IFileDownloadSettings = {
                    makeExecutable: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    headers: {
                        Accept: "application/octet-stream"
                    }
                };
                const newlyDownloadedUri: vscode.Uri = await fileDownloader.downloadFile(
                    vscode.Uri.parse(url),
                    fileName,
                    this.context,
                    undefined, /* cancellationToken */
                    undefined, /* progressCallback */
                    settings);

                if (newlyDownloadedUri.path) {
                    vscode.window.showInformationMessage(localize("APIOps", "'{0}' downloaded", fileName));
                    return newlyDownloadedUri;
                }
            } catch (error) {
                vscode.window.showErrorMessage(localize("APIOps", `Error downloading {0}: ${String(error)}}`, url));
                return undefined;
            }
        }

        return existingUri;
    }
}

interface IGithubRelease {
    url:              string;
    assets_url:       string;
    upload_url:       string;
    html_url:         string;
    id:               number;
    author:           object;
    node_id:          string;
    tag_name:         string;
    target_commitish: string;
    name:             string;
    draft:            boolean;
    prerelease:       boolean;
    created_at:       Date;
    published_at:     Date;
    assets:           IAsset[];
    tarball_url:      string;
    zipball_url:      string;
    body:             string;
    mentions_count:   number;
}

interface IAsset {
    url:                  string;
    id:                   number;
    node_id:              string;
    name:                 string;
    label:                string;
    uploader:             object;
    content_type:         string;
    state:                string;
    size:                 number;
    download_count:       number;
    created_at:           Date;
    updated_at:           Date;
    browser_download_url: string;
}
