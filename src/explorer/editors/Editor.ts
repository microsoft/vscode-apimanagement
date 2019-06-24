/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { DialogResponses, IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { createTemporaryFile } from '../../utils/fsUtil';
import { writeToEditor } from '../../utils/vscodeUtils';

// tslint:disable-next-line:no-unsafe-any
export abstract class Editor<ContextT> implements vscode.Disposable {
    private fileMap: { [key: string]: [vscode.TextDocument, ContextT] } = {};
    private ignoreSave: boolean = false;

    constructor(private readonly showSavePromptKey: string) {
    }

    public abstract getData(context: ContextT): Promise<string>;
    public abstract updateData(context: ContextT, data: string): Promise<string>;
    public abstract getFilename(context: ContextT): Promise<string>;
    public abstract getSaveConfirmationText(context: ContextT): Promise<string>;
    public abstract getSize(context: ContextT): Promise<number>;
    public async showEditor(context: ContextT, sizeLimit?: number /* in Megabytes */): Promise<void> {
        const fileName: string = await this.getFilename(context);
        this.appendLineToOutput(localize('opening', 'Opening "{0}"...', fileName));
        if (sizeLimit !== undefined) {
            const size: number = await this.getSize(context);
            if (size > sizeLimit) {
                const message: string = localize('tooLargeError', '"{0}" is too large to download.', fileName);
                throw new Error(message);
            }
        }

        const localFilePath: string = await createTemporaryFile(fileName);
        const document: vscode.TextDocument = await vscode.workspace.openTextDocument(localFilePath);
        if (document.isDirty) {
            const overwriteFlag = await vscode.window.showWarningMessage(`You are about to overwrite "${fileName}", which has unsaved changes. Do you want to continue?`, { modal: true }, DialogResponses.yes, DialogResponses.cancel);
            if (overwriteFlag !== DialogResponses.yes) {
                throw new UserCancelledError();
            }
        }

        this.fileMap[localFilePath] = [document, context];
        const data: string = await this.getData(context);
        const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document);
        await this.updateEditor(data, textEditor);
    }

    public async updateMatchingContext(doc: vscode.Uri): Promise<void> {
        const filePath: string | undefined = Object.keys(this.fileMap).find((fsPath: string) => path.relative(doc.fsPath, fsPath) === '');
        if (filePath) {
            const [textDocument, context]: [vscode.TextDocument, ContextT] = this.fileMap[filePath];
            await this.updateRemote(context, textDocument);
        }
    }

    public async dispose(): Promise<void> {
        Object.keys(this.fileMap).forEach(async (key: string) => await fse.remove(path.dirname(key)));
    }

    public async onDidSaveTextDocument(actionContext: IActionContext, globalState: vscode.Memento, doc: vscode.TextDocument): Promise<void> {
        actionContext.suppressTelemetry = true;
        const filePath: string | undefined = Object.keys(this.fileMap).find((fsPath: string) => path.relative(doc.uri.fsPath, fsPath) === '');
        if (!this.ignoreSave && filePath) {
            actionContext.suppressTelemetry = false;
            const context: ContextT = this.fileMap[filePath][1];
            const showSaveWarning: boolean | undefined = vscode.workspace.getConfiguration().get(this.showSavePromptKey);

            if (showSaveWarning) {
                const message: string = await this.getSaveConfirmationText(context);
                const result: vscode.MessageItem | undefined = await vscode.window.showWarningMessage(message, DialogResponses.upload, DialogResponses.alwaysUpload, DialogResponses.dontUpload);
                if (result === DialogResponses.alwaysUpload) {
                    await vscode.workspace.getConfiguration().update(this.showSavePromptKey, false, vscode.ConfigurationTarget.Global);
                    await globalState.update(this.showSavePromptKey, true);
                } else if (result === DialogResponses.dontUpload) {
                    throw new UserCancelledError();
                } else if (!result) {
                    throw new UserCancelledError();
                }
            }
            await this.updateRemote(context, doc);
        }
    }

    protected appendLineToOutput(value: string): void {
        ext.outputChannel.appendLine(value);
        ext.outputChannel.show(true);
    }

    private async updateRemote(context: ContextT, doc: vscode.TextDocument): Promise<void> {
        const filename: string = await this.getFilename(context);
        this.appendLineToOutput(localize('updating', 'Updating "{0}" ...', filename));
        const updatedData: string = await this.updateData(context, doc.getText());
        this.appendLineToOutput(localize('done', 'Updated "{0}".', filename));
        await this.updateEditor(updatedData, vscode.window.activeTextEditor);
    }

    private async updateEditor(data: string, textEditor?: vscode.TextEditor): Promise<void> {
        if (!!textEditor) {
            await writeToEditor(textEditor, data);
            this.ignoreSave = true;
            try {
                await textEditor.document.save();
            } finally {
                this.ignoreSave = false;
            }
        }
    }
}
