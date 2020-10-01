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

    // tslint:disable-next-line: no-unsafe-any
    const languages : string[] = Object.keys(languageTypes).map(key => languageTypes[key]);
    const language = await ext.ui.showQuickPick(
        languages.map((s) => {return { label: s, description: '', detail: '' }; }), { placeHolder: "Select language", canPickMany: false});

    if (!await checkEnvironmentInstalled(language.label)) {
        throw new Error(`You haven't installed '${language.label}' on your machine, please install '${language.label}' to continue.`);
    }

    let namespace = "";
    if (language.label === languageTypes.CSharp || language.label === languageTypes.Java) {
        namespace = await askNamespace(language.label);
    }

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
            args.push(`--input-file:${openAPIFilePath} --version:3.0.6314`);
            args.push(`--output-folder:${uris[0].fsPath}`);

            if (language.label === 'TypeScript') {
                args.push('--azure-functions-typescript');
                args.push('--no-namespace-folders:True');
            } else if (language.label === 'CSharp') {
                args.push(`--namespace:${namespace}`);
                args.push('--azure-functions-csharp');
            } else if (language.label === 'Java') {
                args.push(`--namespace:${namespace}`);
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

async function askNamespace(language: string): Promise<string> {
    const namespacePrompt: string = localize('namespacePrompt', 'Enter namespace folder.');
    const defaultName = language === languageTypes.CSharp ? "Microsoft.Azure.Stencil" : "com.microsoft.azure.stencil";
    return (await ext.ui.showInputBox({
        prompt: namespacePrompt,
        value: defaultName,
        validateInput: async (value: string | undefined): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return undefined;
        }
    })).trim();
}

async function checkEnvironmentInstalled(language: string): Promise<boolean> {
    let command = "";
    switch (language) {
        case languageTypes.CSharp: {
            command = "dotnet -h";
            break;
        }
        case languageTypes.Java: {
            command = "java -version";
            break;
        }
        case languageTypes.Python: {
            command = "python --version";
            break;
        }
        case languageTypes.TypeScript: {
            command = "tsc --version";
            break;
        }
        default: {
            throw new Error("Invalid Language Type.");
        }
    }

    try {
        await cpUtils.executeCommand(undefined, undefined, command);
        return true;
    } catch (error) {
        return false;
    }
}

enum languageTypes {
    Python = 'Python',
    CSharp = 'CSharp',
    TypeScript = 'TypeScript',
    Java = 'Java'
}
