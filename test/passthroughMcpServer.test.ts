/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { BackendContract } from '@azure/arm-apimanagement';
import { passthroughMcpServer } from '../src/commands/passthroughMcpServer';
import { McpPassthroughTreeItem } from '../src/explorer/McpPassthroughTreeItem';
import { ApimService } from '../src/azure/apim/ApimService';
import { IServiceTreeRoot } from '../src/explorer/IServiceTreeRoot';

describe('passthroughMcpServer', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: IActionContext;
    let mockNode: McpPassthroughTreeItem;
    let mockRoot: IServiceTreeRoot;
    let mockApimServiceStub: sinon.SinonStubbedInstance<ApimService>;
    let showInformationMessageStub: sinon.SinonStub;
    let withProgressStub: sinon.SinonStub;
    let showQuickPickStub: sinon.SinonStub;
    let showInputBoxStub: sinon.SinonStub;

    const testServerName = 'test-server';
    const testServerUrl = 'https://example.com/mcp';
    const testApiSuffix = 'test-api-suffix';
    const sseEndpoint = '/sse';
    const messagesEndpoint = '/messages';

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Mock VSCode window methods
        showInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
        withProgressStub = sandbox.stub(vscode.window, 'withProgress');

        // Mock ActionContext UI methods
        showQuickPickStub = sandbox.stub();
        showInputBoxStub = sandbox.stub();

        mockContext = {
            ui: {
                showQuickPick: showQuickPickStub,
                showInputBox: showInputBoxStub
            }
        } as any;

        // Mock ServiceTreeRoot
        mockRoot = {
            client: {
                backend: {
                    createOrUpdate: sandbox.stub().resolves()
                }
            },
            credentials: {} as any,
            environment: {
                resourceManagerEndpointUrl: 'https://management.azure.com'
            },
            subscriptionId: 'test-subscription-id',
            resourceGroupName: 'test-resource-group',
            serviceName: 'test-service'
        } as any;

        // Mock McpPassthroughTreeItem
        mockNode = {
            root: mockRoot,
            refresh: sandbox.stub().resolves()
        } as any;

        // Mock ApimService - stubbing the static method directly
        mockApimServiceStub = sandbox.createStubInstance(ApimService);
        sandbox.stub(ApimService.prototype, 'createOrUpdateMcpServer').callsFake(mockApimServiceStub.createOrUpdateMcpServer);

        // Default withProgress behavior for successful tests
        withProgressStub.callsFake((_options, callback) => callback({}));
    });

    afterEach(() => {
        sandbox.restore();
    });

    // Helper functions
    const setupSuccessfulUserInputs = (protocol: 'SSE' | 'Streamable HTTP') => {
        showInputBoxStub
            .onCall(0).resolves(testServerName)
            .onCall(1).resolves(testServerUrl)
            .onCall(2).resolves(testApiSuffix);

        if (protocol === 'SSE') {
            showInputBoxStub
                .onCall(3).resolves(sseEndpoint)
                .onCall(4).resolves(messagesEndpoint);
        }

        showQuickPickStub.resolves({
            label: protocol,
            description: protocol === 'SSE' ? 'Server-Sent Events' : 'Streamable HTTP protocol'
        });
    };

    const setupInputBoxForValidation = (callIndex: number) => {
        // Set up other calls to return valid values to allow validation function to be called
        showInputBoxStub.onCall(0).resolves(testServerName);
        showInputBoxStub.onCall(1).resolves(testServerUrl);
        showInputBoxStub.onCall(2).resolves(testApiSuffix);
        showInputBoxStub.onCall(3).resolves(sseEndpoint);
        showInputBoxStub.onCall(4).resolves(messagesEndpoint);

        // The specific call we want to test validation for, ensuring its validator is invoked
        showInputBoxStub.onCall(callIndex).callThrough();

        showQuickPickStub.resolves({ label: 'Streamable HTTP', description: 'Streamable HTTP protocol' });
        mockApimServiceStub.createOrUpdateMcpServer.resolves({} as any);
    };

    const verifyUserInputSequence = (expectSSEEndpoints = true) => {
        const expectedInputBoxCalls = expectSSEEndpoints ? 5 : 3;
        expect(showInputBoxStub.callCount).to.equal(expectedInputBoxCalls);
        expect(showQuickPickStub.calledOnce).to.be.true;
    };

    const verifyBackendCreation = (expectedUrl: string) => {
        const createOrUpdateCall = mockRoot.client.backend.createOrUpdate as sinon.SinonStub;
        expect(createOrUpdateCall.calledOnce).to.be.true;

        const [resourceGroup, serviceName, backendName, backendContract] = createOrUpdateCall.getCall(0).args;
        expect(resourceGroup).to.equal(mockRoot.resourceGroupName);
        expect(serviceName).to.equal(mockRoot.serviceName);
        expect(backendName).to.be.a('string').and.not.empty;

        const expectedContract: BackendContract = {
            url: expectedUrl,
            protocol: 'http'
        };
        expect(backendContract).to.deep.equal(expectedContract);
    };

    const verifyMcpServerCreation = (expectSSE: boolean) => {
        expect(mockApimServiceStub.createOrUpdateMcpServer.calledOnce).to.be.true;

        const [mcpServerName, mcpServerPayload] = mockApimServiceStub.createOrUpdateMcpServer.getCall(0).args;
        expect(mcpServerName).to.equal(testServerName);
        expect(mcpServerPayload.properties.displayName).to.equal(testServerName);
        expect(mcpServerPayload.properties.path).to.equal(testApiSuffix);
        expect(mcpServerPayload.properties.type).to.equal('mcp');
        expect(mcpServerPayload.properties.backendId).to.be.a('string').and.not.empty;

        if (expectSSE) {
            expect(mcpServerPayload.properties.mcpProperties).to.deep.equal({
                transportType: 'sse',
                endpoints: {
                    sse: { method: 'GET', uriTemplate: sseEndpoint },
                    messages: { method: 'POST', uriTemplate: messagesEndpoint }
                }
            });
        } else {
            expect(mcpServerPayload.properties.mcpProperties).to.be.undefined;
        }
    };

    const verifySuccessMessage = (protocol: string) => {
        expect(showInformationMessageStub.calledOnceWith(
            `Successfully proxied MCP server "${testServerName}" with ${protocol} protocol.`
        )).to.be.true;
        expect(mockNode.refresh).to.have.been.calledOnce;
    };

    describe('successful flow', () => {
        ['SSE', 'Streamable HTTP'].forEach(protocol => {
            it(`should successfully create passthrough MCP server with ${protocol} protocol`, async () => {
                const isSSE = protocol === 'SSE';
                setupSuccessfulUserInputs(protocol as 'SSE' | 'Streamable HTTP');
                mockApimServiceStub.createOrUpdateMcpServer.resolves({} as any);

                await passthroughMcpServer(mockContext, mockNode);

                verifyUserInputSequence(isSSE);
                verifyBackendCreation(testServerUrl);
                verifyMcpServerCreation(isSSE);
                verifySuccessMessage(protocol);
            });
        });

        it('should successfully create passthrough MCP server with empty API URL suffix for root path', async () => {
            // Arrange
            const inputBoxStub = mockContext.ui.showInputBox as sinon.SinonStub;
            inputBoxStub
                .onCall(0).resolves('test-server') // Server name
                .onCall(1).resolves('https://example.com/mcp') // Server URL
                .onCall(2).resolves(''); // Empty API URL suffix for root path

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .resolves({ label: 'Streamable HTTP', description: 'Streamable HTTP protocol' });

            withProgressStub.callsFake((_options, callback) => callback({}));
            mockApimServiceStub.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            expect(mockApimServiceStub.createOrUpdateMcpServer.calledOnce).to.be.true;
            const [mcpServerName, mcpServerPayload] = mockApimServiceStub.createOrUpdateMcpServer.getCall(0).args;
            expect(mcpServerName).to.equal('test-server');
            expect(mcpServerPayload.properties.path).to.equal(''); // Empty path for root
            // The success message uses a different test server name, so we can't use the helper
            expect(showInformationMessageStub.calledOnceWith(
                `Successfully proxied MCP server "test-server" with Streamable HTTP protocol.`
            )).to.be.true;
        });
    });

    describe('early return scenarios', () => {
        it('should return early when node is undefined', async () => {
            await passthroughMcpServer(mockContext, undefined);

            expect(showInputBoxStub.notCalled).to.be.true;
            expect(showQuickPickStub.notCalled).to.be.true;
        });
    });

    describe('user cancellation scenarios', () => {
        it('should handle user cancellation during server name input', async () => {
            showInputBoxStub.onFirstCall().rejects(new UserCancelledError());

            await expect(passthroughMcpServer(mockContext, mockNode)).to.be.rejectedWith(UserCancelledError);
            expect(showQuickPickStub.notCalled).to.be.true; // Ensure no further prompts
        });

        it('should handle user cancellation during protocol selection', async () => {
            showInputBoxStub.onCall(0).resolves(testServerName)
                              .onCall(1).resolves(testServerUrl);

            showQuickPickStub.rejects(new UserCancelledError());

            await expect(passthroughMcpServer(mockContext, mockNode)).to.be.rejectedWith(UserCancelledError);
            expect(showInputBoxStub.callCount).to.equal(3); // server name, server url, api suffix
        });
    });

    describe('input validation', () => {
        const validateAndAssert = async (callIndex: number, invalidInputs: string[], validInput: string, expectedErrorMessage: string) => {
            setupInputBoxForValidation(callIndex);
            await passthroughMcpServer(mockContext, mockNode); // Execute to set up stub calls

            const inputBoxCall = showInputBoxStub.getCall(callIndex);
            const validateInput = inputBoxCall.args[0].validateInput;

            invalidInputs.forEach(input => {
                expect(validateInput(input)).to.equal(expectedErrorMessage, `Expected "${input}" to be invalid`);
            });
            expect(validateInput(validInput)).to.be.undefined;
        };

        it('should validate server name input', async () => {
            await validateAndAssert(0, ['', '   '], 'valid-name', 'Name is required');
        });

        it('should validate server URL input', async () => {
            await validateAndAssert(1, ['', '   ', 'invalid-url', 'ftp://example.com'], 'https://example.com', 'Please enter a valid URL starting with http:// or https://');
        });

        it('should validate SSE endpoint input for SSE protocol', async () => {
            showQuickPickStub.resolves({ label: 'SSE', description: 'Server-Sent Events' }); // Ensure SSE path
            await validateAndAssert(3, ['', '   '], '/sse', 'SSE endpoint is required');
        });

        it('should validate messages endpoint input for SSE protocol', async () => {
            showQuickPickStub.resolves({ label: 'SSE', description: 'Server-Sent Events' }); // Ensure SSE path
            await validateAndAssert(4, ['', '   '], '/messages', 'Messages endpoint is required');
        });
    });

    describe('error handling', () => {
        it('should handle general errors and compose error message', async () => {
            const originalError = new Error('Something went wrong');
            showInputBoxStub.onFirstCall().rejects(originalError);

            await expect(passthroughMcpServer(mockContext, mockNode)).to.be.rejectedWith('Failed to proxy MCP server: Something went wrong');
        });

        it('should handle backend creation error', async () => {
            setupSuccessfulUserInputs('SSE');
            const backendError = new Error('Backend creation failed');
            withProgressStub.onFirstCall().callsFake((_options, _callback) => Promise.reject(backendError)); // Simulate error during backend creation

            await expect(passthroughMcpServer(mockContext, mockNode)).to.be.rejectedWith('Failed to proxy MCP server: Backend creation failed');
            expect(mockApimServiceStub.createOrUpdateMcpServer.notCalled).to.be.true; // MCP server not created if backend fails
        });

        it('should handle MCP server creation error', async () => {
            setupSuccessfulUserInputs('SSE');
            const mcpServerError = new Error('MCP server creation failed');

            // Simulate backend creation succeeding, then MCP server creation failing
            withProgressStub.onFirstCall().callsFake((_options, callback) => callback({})); // Backend creation progress
            mockApimServiceStub.createOrUpdateMcpServer.rejects(mcpServerError);

            await expect(passthroughMcpServer(mockContext, mockNode)).to.be.rejectedWith('Failed to proxy MCP server: MCP server creation failed');
            expect(mockRoot.client.backend.createOrUpdate).to.have.been.calledOnce; // Backend should have been attempted
        });
    });

    describe('backend creation details', () => {
        it('should create backend with correct contract', async () => {
            setupSuccessfulUserInputs('SSE');
            mockApimServiceStub.createOrUpdateMcpServer.resolves({} as any);

            await passthroughMcpServer(mockContext, mockNode);

            const createOrUpdateCall = mockRoot.client.backend.createOrUpdate as sinon.SinonStub;
            expect(createOrUpdateCall.calledOnce).to.be.true;

            const [resourceGroup, serviceName, backendName, backendContract] = createOrUpdateCall.getCall(0).args;
            expect(resourceGroup).to.equal('test-resource-group');
            expect(serviceName).to.equal('test-service');
            expect(backendName).to.match(/^apim-backend-/); // Expect a generated name
            expect(backendContract).to.deep.equal({
                url: testServerUrl,
                protocol: 'http'
            });
        });
    });
});