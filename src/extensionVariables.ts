/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionContext } from "vscode";
import { AzExtTreeDataProvider, IAzExtOutputChannel, IAzureUserInput } from "vscode-azureextensionui";
import { AzureAccountTreeItem } from "./explorer/AzureAccountTreeItem";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
    export let context: ExtensionContext;
    export let tree: AzExtTreeDataProvider;
    export let outputChannel: IAzExtOutputChannel;
    export let ui: IAzureUserInput;
    export let azureAccountTreeItem: AzureAccountTreeItem;
    export const prefix: string = 'azureAPIM';
    //export let reporter: ITelemetryContext;
}
