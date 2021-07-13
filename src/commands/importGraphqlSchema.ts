/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import requestPromise from 'request-promise';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { SharedAccessToken } from '../constants';
import { GraphqlApiTreeItem } from "../explorer/GraphqlApiTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from '../localize';

// tslint:disable-next-line: export-name
export async function importGraphqlSchemaByFile(actionContext: IActionContext, node?: GraphqlApiTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <GraphqlApiTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, actionContext);
        node = serviceNode;
    }

    const uris = await askSchemaDocument();
    const uri = uris[0];
    // tslint:disable-next-line: no-unsafe-any
    const fileContent = await fse.readFile(uri.fsPath);
    const documentString = fileContent.toString();
    const body = {
        properties: {
            contentType: "application/vnd.ms-azure-apim.graphql.schema",
            document: {
                value: documentString
            }
        }
    };
    const requestOptions : requestPromise.RequestPromiseOptions = {
        method: "PUT",
        headers: {
            Authorization: SharedAccessToken
        },
        body: JSON.stringify(body)
    };
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("addSchema", `Add Graphql Schema to Graphql API ${node.root.apiName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => {
        await <Thenable<string>>requestPromise(
            `https://${node?.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${node?.root.subscriptionId}/resourceGroups/${node?.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node?.root.serviceName}/apis/${node?.root.apiName}/schemas/default?api-version=2021-04-01-preview`, requestOptions).promise();
     }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(actionContext);
        window.showInformationMessage(localize("addSchema", `Add Schema to graphql API '${node?.root.apiName}' succesfully.`));
    });
}

async function askSchemaDocument(): Promise<Uri[]> {
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Import",
        filters: {
            JSON: ["js"]
        }
    };
    const rootPath = workspace.rootPath;
    if (rootPath) {
        openDialogOptions.defaultUri = Uri.file(rootPath);
    }
    return await ext.ui.showOpenDialog(openDialogOptions);
}
