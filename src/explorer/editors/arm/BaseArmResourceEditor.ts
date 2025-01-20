/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { parseError } from "@microsoft/vscode-azext-utils";
import { showSavePromptConfigKey } from "../../../constants";
import { localize } from "../../../localize";
import { processError } from "../../../utils/errorUtil";
import { nameUtil } from "../../../utils/nameUtil";
import { IServiceTreeRoot } from "../../IServiceTreeRoot";
import { Editor } from "../Editor";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";

// tslint:disable:no-any
export abstract class BaseArmResourceEditor<TRoot extends IServiceTreeRoot> extends Editor<ITreeItemWithRoot<TRoot>> {
    constructor() {
        super(showSavePromptConfigKey);
    }

    public abstract get entityType(): string;
    public abstract getDataInternal(context: ITreeItemWithRoot<TRoot>): Promise<any>;
    public abstract updateDataInternal(context: ITreeItemWithRoot<TRoot>, payload: any): Promise<any>;

    public async getData(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        try {
            const response = await this.getDataInternal(context);
            return JSON.stringify(response, null, "\t");
        } catch (error) {
            throw new Error(`${parseError(error).message}`);
        }
    }

// tslint:disable: no-unsafe-any
    public async updateData(context: ITreeItemWithRoot<TRoot>, data: string): Promise<string> {
        try {
            const payload = JSON.parse(data);
            const response = await this.updateDataInternal(context, payload);
            //await context.refresh();
            window.showInformationMessage(localize("updateSucceded", `Changes to ${this.entityType} were successfully uploaded to cloud.`));
            return JSON.stringify(response, null, "\t");
        } catch (error) {
            throw new Error(processError(error, localize("updateFailed", `Changes to ${this.entityType} could not be uploaded to cloud.`)));
        }
    }

    public async getDiffFilename(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        return `${nameUtil(context.root)}-${this.entityType.toLowerCase()}-arm.json`;
    }

    public async getFilename(context: ITreeItemWithRoot<TRoot>): Promise<string> {
        return `${nameUtil(context.root)}-${this.entityType.toLowerCase()}-arm-tempFile.json`;
    }

    public async getSize(): Promise<number> {
        throw new Error(localize("", "Method not implemented."));
    }

    public async getSaveConfirmationText(): Promise<string> {
        return localize("saveConfirmation", "Do you want to upload the azure resource changes to cloud?");
    }
}
