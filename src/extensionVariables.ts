/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionContext, Disposable } from "vscode";
import { AzExtTreeDataProvider, IAzExtOutputChannel, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
    export let context: ExtensionContext;
    export let tree: AzExtTreeDataProvider;
    export let outputChannel: IAzExtOutputChannel;
    export let azureAccountTreeItem: AzExtParentTreeItem & Disposable;
    export const prefix: string = 'azureAPIM';
    //export let reporter: ITelemetryContext;
}
