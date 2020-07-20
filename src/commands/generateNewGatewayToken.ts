/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { env, window } from "vscode";
import { ApimService } from "../azure/apim/ApimService";
import { GatewayKeyType } from "../constants";
import * as Constants from "../constants";
import { GatewayTreeItem } from "../explorer/GatewayTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function generateNewGatewayToken(node?: GatewayTreeItem): Promise<void> {
  if (!node) {
    node = <GatewayTreeItem>await ext.tree.showTreeItemPicker(GatewayTreeItem.contextValue);
  }

  ext.outputChannel.show();
  ext.outputChannel.appendLine(localize("genGatewayToken", "Please specify the expiry date for the Gateway token..."));
  const numOfDaysResponse = (await ext.ui.showInputBox({
    prompt: localize('gatewayPrompt', 'Enter days to expire.'),
    value: Constants.maxTokenValidTimeSpan.toString(),
    validateInput: async (value: string): Promise<string | undefined> => {
      value = value ? value.trim() : '';
      if (!validateDays(value)) {
        return localize("InvalidDays", "Input is not valid. Value must be less than 30 days.");
      }
      return undefined;
    }
  })).trim();
  const options = [GatewayKeyType.primary, GatewayKeyType.secondary];
  const keyType = await ext.ui.showQuickPick(options.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: 'Pick key to generate token?', canPickMany: false });
  const numOfDays = Number.parseInt(numOfDaysResponse);
  // tslint:disable: no-non-null-assertion
  const apimService = new ApimService(node!.root.credentials, node!.root.environment.resourceManagerEndpointUrl, node!.root.subscriptionId, node!.root.resourceGroupName, node!.root.serviceName);
  const gatewayToken = await apimService.generateNewGatewayToken(node!.root.gatewayName, numOfDays, keyType.label);
  env.clipboard.writeText(gatewayToken);
  window.showInformationMessage(localize("genGatewayToken", "New Gateway token generated and copied to clipboard successfully."));
}

function validateDays(days: string): boolean {
  const numOfDays = Number.parseInt(days);
  return numOfDays.toString().length === days.length && numOfDays < 30 && numOfDays > 0 && !isNaN(numOfDays);
}
