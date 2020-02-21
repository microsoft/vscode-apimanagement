/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { env, OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { IGatewayToken, IGatewayTokenList } from '../azure/apim/contracts';
import { GatewayTreeItem } from "../explorer/GatewayTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { requestUtil } from '../utils/requestUtil';

// tslint:disable-next-line: export-name
export async function copyDockerRunCommand(node?: GatewayTreeItem): Promise<void> {
  if (!node) {
    node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
  }

  ext.outputChannel.show();
  ext.outputChannel.appendLine(localize("deployGateway", "Generating command for running gateway in docker..."));

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: localize("DeployGateway", "Generate command for running in Docker."),
      cancellable: true
    },
    async () => {
      // tslint:disable: no-non-null-assertion
      const confEndpoint = `config.service.endpoint="https://${node!.root.serviceName}.management.azure-api.net/subscriptions/${node!.root.subscriptionId}/resourceGroups/${node!.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node!.root.serviceName}?api-version=2018-06-01-preview"`;
      ext.outputChannel.appendLine(localize("deployGateway", "Getting gateway token..."));
      const token = await getGatewayToken(node!);
      const gatewayToken = `config.service.auth="GatewayKey ${token}"`;
      const initialComd = `docker run -d -p 8080:8080 -p 8081:8081 --name RPGateway --env ${confEndpoint} --env ${gatewayToken} mcr.microsoft.com/azure-api-management/gateway:beta`;
      env.clipboard.writeText(initialComd);
      ext.outputChannel.appendLine(localize("deployGateway", "Copy command for running in Docker to clipboard succeeds..."));
    }
  ).then(async () => {
    // tslint:disable-next-line:no-non-null-assertion
    await node!.refresh();
    window.showInformationMessage(localize("deployGateway", "Copy command for running gateway in docker to clipboard successfully."));
  });
}

export async function generateKubernetesDeployment(node?: GatewayTreeItem): Promise<void> {
  if (!node) {
    node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
  }

  ext.outputChannel.show();
  ext.outputChannel.appendLine(localize("deployGateway", "Generating deployment file for running in Kubernetes..."));

  window.withProgress(
    {
      location: ProgressLocation.Notification,
      title: localize("DeployGateway", "Generating deployment file for running in Kubernetes."),
      cancellable: true
    },
    async () => {
      ext.outputChannel.appendLine(localize("deployGateway", "Getting gateway token..."));
      const gatewayToken = await getGatewayToken(node!);
      ext.outputChannel.appendLine(localize("deployGateway", "Generating deployment yaml file..."));
      const confEndpoint = `"https://${node!.root.serviceName}.management.azure-api.net/subscriptions/${node!.root.subscriptionId}/resourceGroups/${node!.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node!.root.serviceName}?api-version=2018-06-01-preview"`;
      const depYaml = genDeploymentYaml(node!.root.gatewayName, gatewayToken, confEndpoint);
      const uris = await askFolder();
      const configFilePath = path.join(uris[0].fsPath, `${node!.root.gatewayName}.yaml`);
      await fse.writeFile(configFilePath, depYaml);
      ext.outputChannel.appendLine(localize("deployGateway", "Copied command for running gateway with kubernetes to clipboard..."));
      env.clipboard.writeText(`kubectl apply -f ${configFilePath}`);
      ext.outputChannel.appendLine(localize("deployGateway", "Generating deployment file and getting command for running in Kubernetes succeeds..."));
    }).then(async () => {
      await node!.refresh();
      window.showInformationMessage(localize("deployGateway", "Generate deployment file and getting command for running in Kubernetes successfully."));
    });
}

export async function copyGatewayToken(node?: GatewayTreeItem): Promise<void> {
  if (!node) {
    node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
  }

  ext.outputChannel.show();
  const gatewayToken = await getGatewayToken(node);
  env.clipboard.writeText(gatewayToken);
  window.showInformationMessage(localize("copyGatewayToken", "Gateway token copied to clipboard successfully."));
  ext.outputChannel.appendLine(localize("copyGatewayToken", "Gateway token copied to clipboard..."));
}

export async function genNewGatewayToken(node?: GatewayTreeItem): Promise<void> {
  if (!node) {
    node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
  }

  ext.outputChannel.show();
  ext.outputChannel.appendLine(localize("genGatewayToken", "Please specify the expiry date for the Gateway token..."));
  const response = (await ext.ui.showInputBox({
    prompt: localize('gatewayPrompt', 'Enter days to expire.'),
    value: "30",
    validateInput: async (value: string): Promise<string | undefined> => {
      value = value ? value.trim() : '';
      if (!validateDays(value)) {
        return localize("InvalidDays", "Input is not valid.");
      }
      return undefined;
    }
  })).trim();
  const numOfDays = Number.parseInt(response);
  const gatewayToken = await genNewGwToken(node!, numOfDays);
  env.clipboard.writeText(gatewayToken);
  window.showInformationMessage(localize("genGatewayToken", "New Gateway token generated and copied to clipboard successfully."));
  ext.outputChannel.appendLine(localize("genGatewayToken", "New Gateway token generated and copied to clipboard..."));
}

function validateDays(days: string): boolean {
  const numOfDays = Number.parseInt(days);
  return numOfDays.toString().length === days.length && numOfDays < 1000 && numOfDays > 0 && !isNaN(numOfDays);
}

async function getGatewayToken(node: GatewayTreeItem): Promise<string> {
  const gatewayUrl = `https://management.azure.com/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/gateways/${node.root.gatewayName}/keys?api-version=2018-06-01-preview`;
  const res: string = await requestUtil(gatewayUrl, node.root.credentials, "POST");
  // tslint:disable-next-line: no-unsafe-any
  const tokens: IGatewayTokenList = JSON.parse(res);
  return tokens.primary;
}

async function genNewGwToken(node: GatewayTreeItem, numOfDays: number): Promise<string> {
  const now = new Date();
  const timeSpan = now.setDate(now.getDate() + numOfDays);
  const expiryDate = (new Date(timeSpan)).toISOString();
  const gatewayUrl = `https://management.azure.com/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/gateways/${node.root.gatewayName}/token?api-version=2018-06-01-preview`;
  const res: IGatewayToken = await requestUtil(gatewayUrl, node.root.credentials, "POST", {
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
