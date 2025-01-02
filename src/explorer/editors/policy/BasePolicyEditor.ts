/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { window } from "vscode";
import { IActionContext, IParsedError, parseError } from "@microsoft/vscode-azext-utils";
import { policyFormat, showSavePromptConfigKey } from "../../../constants";
import { ext } from "../../../extensionVariables";
import { localize } from "../../../localize";
import { errorUtil, processError } from "../../../utils/errorUtil";
import { nameUtil } from "../../../utils/nameUtil";
import { promptOpenWorkingFolder } from "../../../utils/vscodeUtils";
import { IServiceTreeRoot } from "../../IServiceTreeRoot";
import { Editor } from "../Editor";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";

export abstract class BasePolicyEditor<TRoot extends IServiceTreeRoot> extends Editor<ITreeItemWithRoot<TRoot>> {
    constructor() {
        super(showSavePromptConfigKey);
    }

    public abstract getDefaultPolicy() : string;
    public abstract getPolicy(context: ITreeItemWithRoot<TRoot>): Promise<string>;
    public abstract updatePolicy(context: ITreeItemWithRoot<TRoot>, policy: PolicyContract): Promise<string>;

    public async getData(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        try {
            return await this.getPolicy(context);
        } catch (error) {
            // tslint:disable: no-unsafe-any
            const err: IParsedError = parseError(error);
            if (err.errorType.toLocaleLowerCase() === 'notfound' || err.errorType.toLowerCase() === 'resourcenotfound') {
                return this.getDefaultPolicy();
            } else {
                ext.outputChannel.appendLine(error);
                let errorMessage = err.message;
                if (err.errorType.toLowerCase() === 'validationerror') {
                    errorMessage = errorUtil(error.response.body);
                }
                ext.outputChannel.appendLine(errorMessage);
                ext.outputChannel.show();
                throw new Error(errorMessage);
            }
        }
    }

    public async getDiffFilename(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        return `${nameUtil(context.root)}.policy.cshtml`;
    }

    public async getFilename(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        return `${nameUtil(context.root)}-tempFile.policy.cshtml`;
    }

    public async updateData(context: ITreeItemWithRoot<TRoot>, data: string): Promise<string> {
        try {
            await this.updatePolicy(context, <PolicyContract>{ format: policyFormat, value: data});
            window.showInformationMessage(localize("updatePolicySucceded", `Changes to policy were uploaded to cloud.`));
            return await this.getPolicy(context);
        } catch (error) {
            throw new Error(processError(error, localize("updatePolicyFailed", `Changes to policy were not uploaded to cloud.`)));
        }
    }

    public async getSize(): Promise<number> {
        throw new Error(localize("", "Method not implemented."));
    }
    public async getSaveConfirmationText(): Promise<string> {
        return localize("saveConfirmation", "Do you want to upload changes to cloud?");
    }

    public async showEditor(context: IActionContext, treeItem: ITreeItemWithRoot<TRoot>, sizeLimit?: number /* in Megabytes */): Promise<void> {
        await super.showEditor(context, treeItem, sizeLimit);
        await promptOpenWorkingFolder(context);
    }
}
