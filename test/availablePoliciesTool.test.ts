/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as path from 'path';
import { AvailablePoliciesTool } from '../src/tools/availablePoliciesTool';
import { ext } from '../src/extensionVariables';
import * as fileUtils from '../src/utils/fileUtils';

describe('AvailablePoliciesTool', () => {
    const actualPoliciesPath: string = path.join(__dirname, '..', '..', 'resources', 'knowledgeBase', 'policies.json');

    let sandbox: sinon.SinonSandbox;
    let tool: AvailablePoliciesTool;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        ext.context = {
            asAbsolutePath: sandbox.stub().callsFake((relativePath: string) => {
                return path.join(__dirname, '..', '..', relativePath);
            })
        } as any;

        // Create a new instance of the tool for each test
        tool = new AvailablePoliciesTool();

        // Reset the cached policy list before each test
        // @ts-ignore - Accessing private static property for testing
        AvailablePoliciesTool.cachedPolicyList = undefined;
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should prepare invocation with correct message', async () => {
        const result = await tool.prepareInvocation({} as any, {} as any);
        expect(result.invocationMessage).to.equal('Getting available APIM policies');
    });

    it('should invoke and return policies from file on first call', async () => {
        const result = await tool.invoke({} as any, {} as any);

        // Check the result
        expect(result).to.be.instanceOf(vscode.LanguageModelToolResult);

        const availablePolicies: string = (result.content[0] as vscode.LanguageModelTextPart).value;
        expect(availablePolicies).to.include('Here are all available APIM policies:');

        // Check a few policies to ensure they are properly formatted in the result
        const policiesContent = await fileUtils.readFileAsync(actualPoliciesPath, 'utf8');
        const policies = JSON.parse(policiesContent);

        for (const [name, description] of Object.entries(policies).slice(0, 5)) {
            expect(availablePolicies).to.include(`${name}: ${description}`);
        }
    });

    it('should use cached policies on subsequent calls', async () => {
        // Test caching by checking that static property is set after first call
        // @ts-ignore - Accessing private static property for testing
        expect(AvailablePoliciesTool.cachedPolicyList).to.be.undefined;

        // Create a sinon spy to track calls to fileUtils.readFileAsync
        const readFileAsyncSpy = sandbox.spy(fileUtils, 'readFileAsync');

        // First call - should read file
        await tool.invoke({} as any, {} as any);

        // Verify file was read
        expect(readFileAsyncSpy.callCount).to.equal(1);

        // Verify cache is now populated
        // @ts-ignore - Accessing private static property for testing
        expect(AvailablePoliciesTool.cachedPolicyList).to.not.be.undefined;

        // Second call - should use cache, not read file again
        const result = await tool.invoke({} as any, {} as any);

        // Verify file was not read again (still should be 1)
        expect(readFileAsyncSpy.callCount).to.equal(1);

        // Check the result of second call
        const availablePolicies: string = (result.content[0] as vscode.LanguageModelTextPart).value;
        expect(availablePolicies).to.include('Here are all available APIM policies:');
    });

    it('should handle non-existent or invalid policies file', async () => {
        // Mock asAbsolutePath to return a non-existent file path
        const nonExistentPath = path.join(__dirname, '..', 'non-existent-folder', 'non-existent-file.json');
        (ext.context.asAbsolutePath as sinon.SinonStub).returns(nonExistentPath);

        // The invoke method should handle this gracefully
        try {
            await tool.invoke({} as any, {} as any);
            expect.fail('Expected error was not thrown');
        } catch (error) {
            expect(error).to.be.instanceOf(Error);
            expect((error as Error).message).to.include('no such file or directory');
        }
    });
});
