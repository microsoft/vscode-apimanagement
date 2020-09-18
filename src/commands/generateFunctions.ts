import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { OpenApiEditor } from "../explorer/editors/openApi/OpenApiEditor";
import { ext } from "../extensionVariables";

import * as fse from 'fs-extra';
import * as path from 'path';
import { localize } from "../localize";
import { cpUtils } from "../utils/cpUtils";

// tslint:disable: no-non-null-assertion
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

    const autoRestInstalled = await isAutoRestInstalled();
    if (!autoRestInstalled) {
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("installAutorest", `Installing AutoRest (http://aka.ms/autorest)...`),
                cancellable: false
            },
            async () => {
                await cpUtils.executeCommand(ext.outputChannel, undefined, 'npm install -g autorest');
            }).then(async () => {
                window.showInformationMessage(localize("installAutorest", `Autorest installed successfully.`));
            });
    }

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("generateFunctions", `Generating functions for API '${node.apiContract.name}'...`),
            cancellable: false
        },
        async () => {
            const args: string[] = [];
            args.push(`--input-file:${openAPIFilePath} --version:3.0.6314`);

            if (language.label === 'TypeScript') {
                args.push('--azure-functions-typescript');
                args.push('--no-namespace-folders:True');
            } else if (language.label === 'CSharp') {
                args.push('--namespace:Microsoft.Azure.Stencil');
                args.push('--azure-functions-csharp');
            } else if (language.label === 'Java') {
                args.push('--namespace:com.microsoft.azure.stencil');
                args.push('--azure-functions-java');
            } else if (language.label === 'Python') {
                args.push('--azure-functions-python');
                args.push('--no-namespace-folders:True');
                args.push('--no-async');
            } else {
                throw new Error(localize("notSupported", "Not a supported language. We currently support C#, Java, Python, and Typescript"));
            }

            ext.outputChannel.show();
            await cpUtils.executeCommand(ext.outputChannel, undefined, 'autorest', ...args);
        }
    ).then(async () => {
        window.showInformationMessage(localize("openAPIDownloaded", `Generated Azure Functions app for API '${node!.apiContract.name} successfully.`));
    });
}

async function isAutoRestInstalled(): Promise<boolean> {
    try {
        await cpUtils.executeCommand(undefined, undefined, 'autorest', '--help');
        return true;
    } catch (error) {
        return false;
    }
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
