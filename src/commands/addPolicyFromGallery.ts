/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { ApiPolicyTreeItem } from '../explorer/ApiPolicyTreeItem';
import { OperationPolicyTreeItem } from '../explorer/OperationPolicyTreeItem';
import { ProductPolicyTreeItem } from '../explorer/ProductPolicyTreeItem';
import { ServicePolicyTreeItem } from '../explorer/ServicePolicyTreeItem';
import { BasePolicyEditor } from '../explorer/editors/policy/BasePolicyEditor';
import { ApiPolicyEditor } from '../explorer/editors/policy/ApiPolicyEditor';
import { OperationPolicyEditor } from '../explorer/editors/policy/OperationPolicyEditor';
import { ProductPolicyEditor } from '../explorer/editors/policy/ProductPolicyEditor';
import { ServicePolicyEditor } from '../explorer/editors/policy/ServicePolicyEditor';
import { ext } from '../extensionVariables';
import { readFileAsync } from '../utils/fileUtils';

interface PolicyTemplate {
    name: string;
    description: string;
    category: string;
    content: string;
}

interface PolicyQuickPickItem extends vscode.QuickPickItem {
    policyTemplate: PolicyTemplate;
}

export async function addPolicyFromGallery(context: IActionContext, node?: ApiPolicyTreeItem | OperationPolicyTreeItem | ProductPolicyTreeItem | ServicePolicyTreeItem): Promise<void> {
    if (!node) {
        return;
    }

    try {
        // Load policy templates from the templates folder
        const policyTemplates = await loadPolicyTemplates();
        // Create quick pick items
        const quickPickItems: PolicyQuickPickItem[] = policyTemplates.map(template => ({
            label: template.name,
            description: template.description,
            detail: `Category: ${template.category}`,
            policyTemplate: template
        }));

        const selectedItem = await context.ui.showQuickPick(quickPickItems, {
            placeHolder: 'Select a policy template to use',
            matchOnDescription: true
        });

        // Get the policy editor for this node type
        const editor = getPolicyEditor(node);
        
        // Load the template content from the file
        const templateContent = await loadTemplateContent(selectedItem.policyTemplate.content);
        
        // Open the policy editor with the template content
        await openPolicyEditorWithTemplate(context, node, editor, templateContent);

    } catch (error) {
        if (error instanceof UserCancelledError) {
            // User cancelled, just return without showing error
            return;
        }

        throw error;
    }
}

async function loadPolicyTemplates(): Promise<PolicyTemplate[]> {
    const templatesPath = ext.context.asAbsolutePath('resources/policyTemplates/templates.json');
    const templatesContent = await readFileAsync(templatesPath, 'utf8');
    const templates = JSON.parse(templatesContent);
    
    return templates as PolicyTemplate[];
}

async function loadTemplateContent(templateFileName: string): Promise<string> {
    const templatePath = ext.context.asAbsolutePath(`resources/policyTemplates/${templateFileName}`);
    const templateContent = await readFileAsync(templatePath, 'utf8');
    return templateContent;
}

function getPolicyEditor(node: ApiPolicyTreeItem | OperationPolicyTreeItem | ProductPolicyTreeItem | ServicePolicyTreeItem): BasePolicyEditor<any> {
    if (node instanceof ApiPolicyTreeItem) {
        return new ApiPolicyEditor();
    } else if (node instanceof OperationPolicyTreeItem) {
        return new OperationPolicyEditor();
    } else if (node instanceof ProductPolicyTreeItem) {
        return new ProductPolicyEditor();
    } else if (node instanceof ServicePolicyTreeItem) {
        return new ServicePolicyEditor();
    } else {
        throw new Error('Unsupported policy tree item type');
    }
}

async function openPolicyEditorWithTemplate(context: IActionContext, node: ApiPolicyTreeItem | OperationPolicyTreeItem | ProductPolicyTreeItem | ServicePolicyTreeItem, editor: BasePolicyEditor<any>, templateContent: string): Promise<void> {
    await editor.showEditor(context, node);
    
    // The active text editor should be the policy editor that just opened
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        // Replace the content with template
        await activeEditor.edit(editBuilder => {
            const document = activeEditor.document;
            const entireRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            editBuilder.replace(entireRange, templateContent);
        });

        // Check for placeholders and show information message
        await checkAndShowPlaceholderInfo(templateContent);
    }
}

async function checkAndShowPlaceholderInfo(templateContent: string): Promise<void> {
    // Check if the template contains any placeholders in the format {{placeholder}}
    const placeholderRegex = /\{\{[^}]+\}\}/g;
    const placeholders = templateContent.match(placeholderRegex);
    
    if (placeholders && placeholders.length > 0) {
        const uniquePlaceholders = [...new Set(placeholders)];
        const placeholderList = uniquePlaceholders.join(', ');
        
        const message = `Policy template added successfully! Please replace the following placeholders with actual values or add Named Values for them: ${placeholderList}`;
        
        await vscode.window.showInformationMessage(
            message,
            'OK'
        );
    }
}
