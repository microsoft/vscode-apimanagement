/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import mockEnv from 'mock-env';
import { associateXmlSchema } from '../src/extension';

describe('XML Schema Association Tests', () => {
    let xmlExtension: vscode.Extension<any>;
    let sandbox: sinon.SinonSandbox;
    let addXMLFileAssociationsStub: sinon.SinonStub;
    let mockProcess: mockEnv.MockProcessEnv;

    before(() => {
        sandbox = sinon.createSandbox();
        
        // Mock the XML extension
        addXMLFileAssociationsStub = sandbox.stub();
        xmlExtension = {
            id: 'redhat.vscode-xml',
            extensionPath: '',
            isActive: false,
            activate: sandbox.stub().resolves({}),
            exports: {
                addXMLFileAssociations: addXMLFileAssociationsStub,
            },
            packageJSON: {}
        } as any;

        // Mock VS Code's getExtension
        sandbox.stub(vscode.extensions, 'getExtension').callsFake((extensionId: string) => {
            if (extensionId === 'redhat.vscode-xml') {
                return xmlExtension;
            }
            return undefined;
        });
    });

    after(() => {
        sandbox.restore();
    });

    beforeEach(() => {
        // Reset stubs before each test
        addXMLFileAssociationsStub.reset();
        (xmlExtension.activate as sinon.SinonStub).reset();
    });

    it('should associate schema by default when environment variable is not set', async () => {
        mockProcess = mockEnv({});
        await associateXmlSchema(mockExtensionContext());
        
        assert.strictEqual((xmlExtension.activate as sinon.SinonStub).called, true);
        sinon.assert.calledOnce(addXMLFileAssociationsStub);
        sinon.assert.calledWith(addXMLFileAssociationsStub, [{
            pattern: '**/*.policy.xml',
            systemId: 'resources/policySchemas/policies.xsd'
        }]);
        mockProcess.restore();
    });

    it('should not associate schema when environment variable is set to false', async () => {
        mockProcess = mockEnv({ APIM_AUTO_ASSOCIATE_SCHEMA: 'false' });
        await associateXmlSchema(mockExtensionContext());
        
        sinon.assert.notCalled(addXMLFileAssociationsStub);
        mockProcess.restore();
    });

    it('should associate schema when environment variable is set to true', async () => {
        mockProcess = mockEnv({ APIM_AUTO_ASSOCIATE_SCHEMA: 'true' });
        await associateXmlSchema(mockExtensionContext());
        
        assert.strictEqual((xmlExtension.activate as sinon.SinonStub).called, true);
        sinon.assert.calledOnce(addXMLFileAssociationsStub);
        sinon.assert.calledWith(addXMLFileAssociationsStub, [{
            pattern: '**/*.policy.xml',
            systemId: 'resources/policySchemas/policies.xsd'
        }]);
        mockProcess.restore();
    });

    it('should be case insensitive when checking environment variable value', async () => {
        mockProcess = mockEnv({ APIM_AUTO_ASSOCIATE_SCHEMA: 'FALSE' });
        await associateXmlSchema(mockExtensionContext());
        
        sinon.assert.notCalled(addXMLFileAssociationsStub);
        mockProcess.restore();
    });
});

function mockExtensionContext(): vscode.ExtensionContext {
    return {
        subscriptions: [],
        extensionPath: '',
        asAbsolutePath: (relativePath: string) => relativePath,
        globalState: {
            get: sinon.stub().returns(undefined),
            update: sinon.stub().resolves()
        }
    } as any;
}