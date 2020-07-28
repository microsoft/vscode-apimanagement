import { OpenDialogOptions, Uri, workspace, window, ProgressLocation } from "vscode";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { OpenApiEditor } from "../explorer/editors/openApi/OpenApiEditor";
import { ext } from "../extensionVariables";

import * as fse from 'fs-extra';
import * as path from 'path';
import { cpUtils } from "../utils/cpUtils";
import { localize } from "../localize";

export async function generateFunctions(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();

    const openApiEditor: OpenApiEditor = new OpenApiEditor();
    const openAPIDocString = await openApiEditor.getData(node);

    const languages = ['Python', 'CSharp', 'TypeScript', 'Java'];
    const language = await ext.ui.showQuickPick(
        languages.map((s) => {return { label: s, description: '', detail: '' }; }), { placeHolder: "Select language", canPickMany: false});

    const uris = await askFolder();

    const openAPIFilePath = path.join(uris[0].fsPath, `${node!.apiContract.name}.json`);

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("openAPI", `Downloading OpenAPI Document for API '${node.apiContract.name}'...`),
            cancellable: false
        },
        async () => {
            await fse.writeFile(openAPIFilePath, openAPIDocString);
        }
    ).then(async () => {
        window.showInformationMessage(localize("openAPIDownloaded", `Downloaded OpenAPI Document for API '${node!.apiContract.name} successfully.`));
    });

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("generateFunctions", `Generating functions for API '${node.apiContract.name}'...`),
            cancellable: false
        },
        async () => {
            const args: string[] = [];
            args.push(`--input-file:${openAPIFilePath}`);
            args.push('--use:@autorest/azure-functions@0.0.1-preview-dev.20200727.5');
            args.push(`--output-folder:${uris[0].fsPath}`);
            args.push('--no-async');
            args.push(`--language:${language.label.toLowerCase()}`);

            ext.outputChannel.show();
            await cpUtils.executeCommand(ext.outputChannel, undefined, 'autorest', ...args);
        }
    ).then(async () => {
        window.showInformationMessage(localize("openAPIDownloaded", `Generated functions for API '${node!.apiContract.name} successfully.`));
    });
}

async function askFolder(): Promise<Uri[]> {
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Functions Location",
        filters: {
            JSON: ["json"]
        }
    };
    const rootPath = workspace.rootPath;
    if (rootPath) {
        openDialogOptions.defaultUri = Uri.file(rootPath);
    }
    return await ext.ui.showOpenDialog(openDialogOptions);
}
