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
            if (language.label === 'TypeScript') {
                args.push('--use:@autorest/azure-functions-typescript@0.0.1-preview-dev');
            } else if (language.label === 'CSharp') {
                args.push('--use:@autorest/azure-functions-csharp@0.1.0-dev.187602791');
                args.push('--namespace:Stencil-API');
            } else if (language.label === 'Python'){
                args.push('--use:@autorest/azure-functions-python@0.0.1-preview-dev.20200729.3');
            } else if (language.label === 'Java'){
                args.push('--use:@autorest/azure-functions-java@0.0.2-Preview');
                args.push('--namespace:com.microsoft.azure.stencil');
                args.push('--azure-functions-java');
            } else {
                throw new Error("Language not supported");
            }

            args.push('--no-namespace-folders:True');
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
