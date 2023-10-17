import * as path from 'path';
import * as vscode from 'vscode';
import fetch from 'node-fetch';
import * as projectConstants from '../constants';
import { localize } from '../localize';
import ExtensionHelper from './extensionUtil';
import FileDownloader, { FileDownloadSettings } from './IFileDownloader';

export default class ApiOpsTooling {
    constructor(private readonly context: vscode.ExtensionContext, private readonly extensionHelper: ExtensionHelper) {}

    // These binaries are used for API Ops, we download them to the global storage path in the
    // background as they are around 70Mb each.
    public async downloadExternalBinaries(): Promise<void>{

        await this.downloadExternalBinary(projectConstants.extractorBinaryName);
        await this.downloadExternalBinary(projectConstants.publisherBinaryName);
    }

    // Get the URI of the binary, if it doesn't exist, download it.
    public async downloadExternalBinary(fileName: string): Promise<void> {
        await this.downloadGitHubBinaryIfNotExists(
            await this.getDownloadLink(fileName),
            fileName);
    }

    public async getDownloadStoragePath(): Promise<string> {
        return path.join(this.context.globalStorageUri.fsPath, `file-downloader-downloads`);
    }

    // Gets the download link for the latest release of the API Ops tooling.
    public async getDownloadLink(fileName: string): Promise<string> {
        const response = await fetch(projectConstants.apiOpsToolingLocation);
        const data = await response.json();

        for (const asset of data.assets) {
            if (asset.name === fileName) {
                return asset.url;
            }
        }

        vscode.window.showInformationMessage(localize("APIOps", "'{0}' not found in latest release.", fileName));
        return "";
    }

    public async downloadGitHubBinaryIfNotExists(url: string, fileName: string): Promise<void> {

        // Maybe GitHub is is down, don't stop the extension from working.
        if (url === "") {
            return;
        }

        const fileDownloader: FileDownloader = await this.extensionHelper.getFileDownloaderApi();

        const exists = await fileDownloader.tryGetItem(fileName, this.context);
        if (!exists) {
            try {
                const settings: FileDownloadSettings = {
                    makeExecutable: true,
                    // eslint-disable-next-line @typescript-eslint/naming-convention
                    headers: {"Accept": `application/octet-stream`, "Content-Type": `application/octet-stream`}
                };
                const uri: vscode.Uri = await fileDownloader.downloadFile(
                    vscode.Uri.parse(url),
                    fileName,
                    this.context,
                    /* cancellationToken */ undefined,
                    /* progressCallback */ undefined,
                    settings);

                if (uri.path) {
                    vscode.window.showInformationMessage(localize("APIOps", "'{0}' downloaded", fileName));
                }
            } catch (error) {
                vscode.window.showErrorMessage(localize("APIOps", `Error downloading {0}: ${String(error)}}`, url));
            }
        }
    }
}