/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { DialogResponses } from 'vscode-azureextensionui';
import XRegExp = require('xregexp');
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { OpenApiEditor } from "../explorer/editors/openApi/OpenApiEditor";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { cpUtils } from "../utils/cpUtils";
import { openUrl } from '../utils/openUrl';

const formattingCharacter: string = '\\p{Cf}';
const connectingCharacter: string = '\\p{Pc}';
const decimalDigitCharacter: string = '\\p{Nd}';
const combiningCharacter: string = '\\p{Mn}|\\p{Mc}';
const letterCharacter: string = '\\p{Lu}|\\p{Ll}|\\p{Lt}|\\p{Lm}|\\p{Lo}|\\p{Nl}';
const identifierPartCharacter: string = `${letterCharacter}|${decimalDigitCharacter}|${connectingCharacter}|${combiningCharacter}|${formattingCharacter}`;
const identifierStartCharacter: string = `(${letterCharacter}|_)`;
const identifierOrKeyword: string = `${identifierStartCharacter}(${identifierPartCharacter})*`;
// tslint:disable-next-line: no-unsafe-any
const identifierRegex: RegExp = XRegExp(`^${identifierOrKeyword}$`);
// Keywords: https://github.com/dotnet/csharplang/blob/master/spec/lexical-structure.md#keywords
const keywords: string[] = ['abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char', 'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate', 'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false', 'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit', 'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace', 'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed', 'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked', 'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'];

// tslint:disable: no-non-null-assertion
// tslint:disable-next-line: max-func-body-length
export async function generateFunctions(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    ext.outputChannel.show();

    const openApiEditor: OpenApiEditor = new OpenApiEditor();
    const openAPIDocString = await openApiEditor.getData(node);

    if (!await validateAutorestInstalled()) {
        return;
    }

    // tslint:disable-next-line: no-unsafe-any
    const languages: string[] = Object.keys(languageTypes).map(key => languageTypes[key]);
    const language = await ext.ui.showQuickPick(
        languages.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: "Select language", canPickMany: false });

    if (!await checkEnvironmentInstalled(language.label)) {
        throw new Error(`'${language.label}' is not installed on your machine, please install '${language.label}' to continue.`);
    }

    let namespace = "";
    if (language.label === languageTypes.Java) {
        namespace = await askJavaNamespace();
    } else if (language.label === languageTypes.CSharp) {
        namespace = await askCSharpNamespace();
    }

    const uris = await askFolder();

    const openAPIFilePath = path.join(uris[0].fsPath, `${node!.apiContract.name}.json`);

    let isSucceeded = false;

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("openAPI", `Downloading OpenAPI Specification for API '${node.apiContract.name}'...`),
            cancellable: false
        },
        async () => {
            await fse.writeFile(openAPIFilePath, openAPIDocString);
        }
    ).then(async () => {
        window.showInformationMessage(localize("openAPIDownloaded", `Downloaded OpenAPI Specification for API '${node!.apiContract.name} successfully.`));
    });

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("generateFunctions", `Scaffolding Azure Functions for API '${node.apiContract.name}'...`),
            cancellable: false
        },
        async () => {
            const args: string[] = [];
            args.push(`--input-file:${cpUtils.wrapArgInQuotes(openAPIFilePath)}`);
            args.push(`--output-folder:${cpUtils.wrapArgInQuotes(uris[0].fsPath)}`);

            switch (language.label) {
                case languageTypes.TypeScript:
                    args.push('--azure-functions-typescript');
                    args.push('--no-namespace-folders:True');
                    break;
                case languageTypes.CSharp:
                    args.push(`--namespace:${namespace}`);
                    args.push('--azure-functions-csharp');
                    break;
                case languageTypes.Java:
                    args.push(`--namespace:${namespace}`);
                    args.push('--azure-functions-java');
                    break;
                case languageTypes.Python:
                    args.push('--azure-functions-python');
                    args.push('--no-namespace-folders:True');
                    args.push('--no-async');
                    break;
                default:
                    throw new Error(localize("notSupported", "Only C#, Java, Python, and Typescript are supported"));
            }

            if (language.label === languageTypes.CSharp) {
                const versionResult = await cpUtils.executeCommand(undefined, undefined, 'dotnet --version');
                if (!versionResult.startsWith('3.')) {
                    throw new Error(localize('genFunction', 'Failed to generate Functions. Please update dotnet version to 3.0.0 and above.'));
                }
            }

            try {
                ext.outputChannel.show();
                await cpUtils.executeCommand(ext.outputChannel, undefined, 'autorest', ...args);
                await promptOpenFileFolder(uris[0].fsPath);
                isSucceeded = true;
            } catch (error) {
                if (language.label === languageTypes.CSharp) {
                    const message: string = localize('genFunction', 'Failed to generate Functions using C# generator due to a known Issue. Click "Learn more" for more details on installation steps.');
                    // tslint:disable-next-line: no-shadowed-variable
                    window.showErrorMessage(message, DialogResponses.learnMore).then(async result => {
                        if (result === DialogResponses.learnMore) {
                            await openUrl('https://github.com/Azure/autorest.azure-functions/issues');
                        }
                    });
                }
            }
        }
    ).then(async () => {
        if (isSucceeded) {
            window.showInformationMessage(localize("openAPIDownloaded", `Scaffolded Azure Functions for API '${node!.apiContract.name} successfully.`));
        }
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

async function askJavaNamespace(): Promise<string> {
    const namespacePrompt: string = localize('namespacePrompt', 'Enter Java Package Name.');
    const defaultName = "com.function";
    return (await ext.ui.showInputBox({
        prompt: namespacePrompt,
        value: defaultName,
        validateInput: async (value: string | undefined): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return undefined;
        }
    })).trim();
}

async function askCSharpNamespace(): Promise<string> {
    const namespacePrompt: string = localize('namespacePrompt', 'Enter CSharp namespace folder.');
    const defaultName = "Company.Function";
    return (await ext.ui.showInputBox({
        prompt: namespacePrompt,
        value: defaultName,
        validateInput: validateCSharpNamespace
    })).trim();
}

function validateCSharpNamespace(value: string | undefined): string | undefined {
    if (!value) {
        return localize('cSharpNamespacError', 'The CSharp namespace cannot be empty.');
    }

    const identifiers: string[] = value.split('.');
    for (const identifier of identifiers) {
        if (identifier === '') {
            return localize('cSharpExtraPeriod', 'Leading or trailing "." character is not allowed.');
        } else if (!identifierRegex.test(identifier)) {
            return localize('cSharpInvalidCharacters', 'The identifier "{0}" contains invalid characters.', identifier);
        } else if (keywords.find((s: string) => s === identifier.toLowerCase()) !== undefined) {
            return localize('cSharpKeywordWarning', 'The identifier "{0}" is a reserved keyword.', identifier);
        }
    }

    return undefined;
}

async function validateAutorestInstalled(): Promise<boolean> {
    try {
        await cpUtils.executeCommand(undefined, undefined, 'autorest', '--version');
    } catch (error) {
        const message: string = localize('autorestNotFound', 'Failed to find "autorest" | Extension needs AutoRest to generate a function app from an OpenAPI specification. Click "Learn more" for more details on installation steps.');
        window.showErrorMessage(message, DialogResponses.learnMore).then(async result => {
            if (result === DialogResponses.learnMore) {
                await openUrl('https://aka.ms/autorest');
            }
        });

        return false;
    }

    return true;
}

async function promptOpenFileFolder(filePath: string): Promise<void> {
    const yes: vscode.MessageItem = { title: localize('open', 'Yes') };
    const no: vscode.MessageItem = { title: localize('notOpen', 'No') };
    const message: string = localize('openFolder', 'Do you want to open the folder for the generated files?');
    window.showInformationMessage(message, yes, no).then(async result => {
        if (result === yes) {
            vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(filePath), true);
        }
    });
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
