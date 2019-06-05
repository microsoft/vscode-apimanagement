/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzureTreeItem, parseError } from "vscode-azureextensionui";
import { showSavePromptConfigKey } from "../../../constants";
import { localize } from "../../../localize";
import { processError } from "../../../utils/errorUtil";
import { nameUtil } from "../../../utils/nameUtil";
import { IServiceTreeRoot } from "../../IServiceTreeRoot";
import { Editor } from "../Editor";

// tslint:disable:no-any
export abstract class BaseArmResourceEditor<TRoot extends IServiceTreeRoot> extends Editor<AzureTreeItem<TRoot>> {
    constructor() {
        super(showSavePromptConfigKey);
    }

    public abstract get entityType(): string;
    public abstract getDataInternal(context: AzureTreeItem<TRoot>): Promise<any>;
    public abstract updateDataInternal(context: AzureTreeItem<TRoot>, payload: any): Promise<any>;

    public async getData(context: AzureTreeItem<TRoot>): Promise<string> {
        try {
            const response = await this.getDataInternal(context);
            return JSON.stringify(response, null, "\t");
        } catch (error) {
            throw new Error(`${parseError(error).message}`);
        }
    }

// tslint:disable: no-unsafe-any
    public async updateData(context: AzureTreeItem<TRoot>, data: string): Promise<string> {
        try {
            const payload = JSON.parse(data);
            const response = await this.updateDataInternal(context, payload);
            await context.refresh();
            window.showInformationMessage(localize("updateSucceded", `Changes to ${this.entityType} were succefully uploaded to cloud.`));
            return JSON.stringify(response, null, "\t");
        } catch (error) {
            throw new Error(processError(error, localize("updateFailed", `Changes to ${this.entityType} could not be uploaded to cloud.`)));
        }
    }

    public async getFilename(context: AzureTreeItem<TRoot>): Promise<string> {
        return `${nameUtil(context.root)}-${this.entityType.toLowerCase()}-arm.json`;
    }

    public async getSize(): Promise<number> {
        throw new Error("Method not implemented.");
    }

    public async getSaveConfirmationText(): Promise<string> {
        return localize("saveConfirmation", "Do you want to upload the azure resource changes to cloud?");
    }
}
