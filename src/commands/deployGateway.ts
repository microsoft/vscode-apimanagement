/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { DialogResponses } from '../../extension.bundle';
import { IGatewayToken } from '../azure/apim/contracts';
import { GatewayTreeItem } from "../explorer/GatewayTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { cpUtils } from "../utils/cpUtils";
import { openUrl } from '../utils/openUrl';
import { requestTest } from '../utils/requestUtil';

// tslint:disable-next-line: export-name
export async function deployGatewayWithDocker(node?: GatewayTreeItem): Promise<void> {
    if (!node) {
        node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("deployGateway", "Deploying gateway with docker..."));

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("DeployGateway", "Deploying gateway with docker."),
            cancellable: true
        },
        async () => {
            // tslint:disable: no-non-null-assertion
            ext.outputChannel.appendLine(localize("deployGateway", "Checking components installed..."));
            await checkComponentInstalled(componentType.Docker);
            const confEndpoint = `config.service.endpoint="https://${node!.root.serviceName}.management.azure-api.net/subscriptions/${node!.root.subscriptionId}/resourceGroups/${node!.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node!.root.serviceName}?api-version=2018-06-01-preview"`;
            ext.outputChannel.appendLine(localize("deployGateway", "Getting gateway token..."));
            const token = await getGatewayToken(node!);
            const gatewayToken = `config.service.auth="GatewayKey ${token}"`;
            ext.outputChannel.appendLine(localize("deployGateway", "Running docker..."));
            await cpUtils.executeCommand(
                ext.outputChannel,
                undefined,
                `docker run -d -p 8080:8080 -p 8081:8081 --name RPGateway --env ${confEndpoint} --env ${gatewayToken} mcr.microsoft.com/azure-api-management/gateway:beta`
            );
            ext.outputChannel.appendLine(localize("deployGateway", "Deploying gateway with docker succeeded..."));
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh();
        window.showInformationMessage(localize("deployGateway", "Deployed gateway through docker successfully."));
    });
}

export async function deployGatewayWithKbs(node?: GatewayTreeItem): Promise<void> {
    if (!node) {
        node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
    }

    ext.outputChannel.show();
    ext.outputChannel.appendLine(localize("deployGateway", "Deploying gateway with kubernetes..."));

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("DeployGateway", "Deploying gateway with docker."),
            cancellable: true
        },
        async () => {
            ext.outputChannel.appendLine(localize("deployGateway", "Checking components installed..."));
            await checkComponentInstalled(componentType.Kubernetes);
            ext.outputChannel.appendLine(localize("deployGateway", "Getting gateway token..."));
            const gatewayToken = await getGatewayToken(node!);
            ext.outputChannel.appendLine(localize("deployGateway", "Generating deployment yaml file..."));
            ext.outputChannel.appendLine(localize("deployGateway", gatewayToken));
            const confEndpoint = `"https://${node!.root.serviceName}.management.azure-api.net/subscriptions/${node!.root.subscriptionId}/resourceGroups/${node!.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node!.root.serviceName}?api-version=2018-06-01-preview"`;
            const depYaml = genDeploymentYaml(node!.root.gatewayName, gatewayToken, confEndpoint);
            ext.outputChannel.appendLine(localize("deployGateway", "Saving deployment yaml file..."));
            const uris = await askFolder();
            const configFilePath = path.join(uris[0].fsPath, `${node!.root.gatewayName}.yaml`);
            try { await fse.writeFile(configFilePath, depYaml); } catch (error) { ext.outputChannel.appendLine(localize("deployGateway", String(error))); }
            ext.outputChannel.appendLine(localize("deployGateway", "Starting running kubernetes..."));
            await cpUtils.executeCommand(
                ext.outputChannel,
                undefined,
                `kubectl apply -f ${configFilePath}`
            );
            ext.outputChannel.appendLine(localize("deployGateway", "Deploying gateway with kubernetes succeeded..."));
        }).then(async () => {
            await node!.refresh();
            window.showInformationMessage(localize("deployGateway", "Deployed gateway through docker successfully."));
        });
}

async function getGatewayToken(node: GatewayTreeItem): Promise<string> {
    ext.outputChannel.appendLine(localize("deployGateway", "Generating expiry date..."));
    const now = new Date();
    const after30days = now.setDate(now.getDate() + 30);
    const expiryDate = (new Date(after30days)).toISOString();
    const gatewayUrl = `https://management.azure.com/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/gateways/${node.root.gatewayName}/token?api-version=2018-06-01-preview`;
    const res: IGatewayToken = await requestTest(gatewayUrl, node.root.credentials, "POST", {
        keyType: "primary",
        expiry: expiryDate
    });
    return res.value;
}

function genDeploymentYaml(gatewayName: string, gatewayToken: string, gatewayEndpoint: string): string {
    const gatewayNameLowercase = gatewayName.toLocaleLowerCase();
    // tslint:disable-next-line: no-unnecessary-local-variable
    const gatewayContent =
`apiVersion: v1
kind: Secret
metadata:
  name: ${gatewayNameLowercase}-token
type: Opaque
stringData:
  value: "GatewayKey ${gatewayToken}"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: ${gatewayNameLowercase}-environment
data:
  config.service.endpoint: ${gatewayEndpoint}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${gatewayNameLowercase}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${gatewayNameLowercase}
  template:
    metadata:
      labels:
        app: ${gatewayNameLowercase}
    spec:
      containers:
      - name: ${gatewayNameLowercase}
        image: mcr.microsoft.com/azure-api-management/gateway:beta
        ports:
        - name: http
          containerPort: 8080
        - name: https
          containerPort: 8081
        env:
        - name: config.service.auth
          valueFrom:
            secretKeyRef:
              name: ${gatewayNameLowercase}-token
              key: value
        envFrom:
        - configMapRef:
            name: ${gatewayNameLowercase}-environment
---
apiVersion: v1
kind: Service
metadata:
  name: ${gatewayNameLowercase}
spec:
  type: NodePort
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8081
  selector:
    app: ${gatewayNameLowercase}`;
    return gatewayContent;
}

async function isComponentInstalled(command: string): Promise<boolean> {
    try {
        await cpUtils.executeCommand(undefined, undefined, command);
        return true;
    } catch (error) {
        return false;
    }
}

async function checkComponentInstalled(component: string): Promise<void> {
    let isInstalled = false;
    isInstalled = component === componentType.Docker ? await isComponentInstalled("docker --version") : await isComponentInstalled("kubectl version --client");
    const uri = component === componentType.Docker ? 'https://docs.docker.com/install/' : "https://kubernetes.io/docs/tasks/tools/install-kubectl/";
    if (!isInstalled) {
        const message: string = localize('compInstalled', `You must have the ${component} installed to perform this operation.`);

        window.showErrorMessage(message, DialogResponses.learnMore).then(async (result) => {
            if (result === DialogResponses.learnMore) {
                await openUrl(uri);
            }
        });

        throw new Error(message);
    }
}

async function askFolder(): Promise<Uri[]> {
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "save"
    };

    const rootPath = workspace.rootPath;
    if (rootPath) {
        openDialogOptions.defaultUri = Uri.file(rootPath);
    }
    return await ext.ui.showOpenDialog(openDialogOptions);
}

const enum componentType {
    Docker = "docker",
    Kubernetes = "kubernetes"
}
