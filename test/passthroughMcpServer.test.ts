/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
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
    let mockApimService: sinon.SinonStubbedInstance<ApimService>;
    let mockVscodeWindow: sinon.SinonStub;
    let mockVscodeWindowProgress: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Mock VSCode window methods
        mockVscodeWindow = sandbox.stub(vscode.window, 'showInformationMessage');
        mockVscodeWindowProgress = sandbox.stub(vscode.window, 'withProgress');

        // Mock ActionContext
        mockContext = {
            ui: {
                showQuickPick: sandbox.stub(),
                showInputBox: sandbox.stub()
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

        // Mock ApimService
        mockApimService = sandbox.createStubInstance(ApimService);
        sandbox.stub(ApimService.prototype, 'createOrUpdateMcpServer').callsFake(mockApimService.createOrUpdateMcpServer);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('successful flow', () => {
        it('should successfully create passthrough MCP server with SSE protocol', async () => {
            // Arrange
            setupSuccessfulUserInputs('SSE');
            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            verifyUserInputSequence();
            verifyBackendCreation('https://example.com/mcp');
            verifyMcpServerCreationWithSSE();
            verifySuccessMessage('SSE');
        });

        it('should successfully create passthrough MCP server with Streamable HTTP protocol', async () => {
            // Arrange
            setupSuccessfulUserInputs('Streamable HTTP');
            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            verifyUserInputSequence(false); // No SSE endpoints for Streamable HTTP
            verifyBackendCreation('https://example.com/mcp');
            verifyMcpServerCreationWithoutSSE();
            verifySuccessMessage('Streamable HTTP');
        });
    });

    describe('early return scenarios', () => {
        it('should return early when node is undefined', async () => {
            // Act
            await passthroughMcpServer(mockContext, undefined);

            // Assert
            expect((mockContext.ui.showInputBox as sinon.SinonStub).notCalled).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
        });
    });

    describe('user cancellation scenarios', () => {
        it('should handle user cancellation during server name input', async () => {
            // Arrange
            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .rejects(new UserCancelledError());

            // Act & Assert
            try {
                await passthroughMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown UserCancelledError');
            } catch (error) {
                expect(error).to.be.instanceOf(UserCancelledError);
            }
        });

        it('should handle user cancellation during protocol selection', async () => {
            // Arrange
            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onCall(0).resolves('test-server')
                .onCall(1).resolves('Test Server');

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .rejects(new UserCancelledError());

            // Act & Assert
            try {
                await passthroughMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown UserCancelledError');
            } catch (error) {
                expect(error).to.be.instanceOf(UserCancelledError);
            }
        });
    });

    describe('input validation', () => {
        it('should validate server name input', async () => {
            // Arrange
            setupInputBoxForValidation(0);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const inputBoxCall = (mockContext.ui.showInputBox as sinon.SinonStub).getCall(0);
            const validateInput = inputBoxCall.args[0].validateInput;
            
            expect(validateInput('')).to.equal('Name is required');
            expect(validateInput('   ')).to.equal('Name is required');
            expect(validateInput('valid-name')).to.be.undefined;
        });

        it('should validate server URL input', async () => {
            // Arrange
            setupInputBoxForValidation(1);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const inputBoxCall = (mockContext.ui.showInputBox as sinon.SinonStub).getCall(1);
            const validateInput = inputBoxCall.args[0].validateInput;
            
            expect(validateInput('')).to.equal('URL is required');
            expect(validateInput('   ')).to.equal('URL is required');
            expect(validateInput('invalid-url')).to.equal('Please enter a valid URL starting with http:// or https://');
            expect(validateInput('ftp://example.com')).to.equal('Please enter a valid URL starting with http:// or https://');
            expect(validateInput('http://example.com')).to.be.undefined;
            expect(validateInput('https://example.com')).to.be.undefined;
        });

        it('should validate API URL suffix input', async () => {
            // Arrange
            setupInputBoxForValidation(2);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const inputBoxCall = (mockContext.ui.showInputBox as sinon.SinonStub).getCall(2);
            const validateInput = inputBoxCall.args[0].validateInput;
            
            expect(validateInput('')).to.equal('API URL suffix is required');
            expect(validateInput('   ')).to.equal('API URL suffix is required');
            expect(validateInput('valid-suffix')).to.be.undefined;
        });

        it('should validate SSE endpoint input for SSE protocol', async () => {
            // Arrange
            const inputBoxStub = mockContext.ui.showInputBox as sinon.SinonStub;
            inputBoxStub
                .onCall(0).resolves('test-server') // Server name
                .onCall(1).resolves('https://example.com/mcp') // Server URL
                .onCall(2).resolves('test-api-suffix') // API URL suffix
                .onCall(3).resolves('/sse') // SSE endpoint
                .onCall(4).resolves('/messages'); // Messages endpoint

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .resolves({ label: 'SSE', description: 'Server-Sent Events' });

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const inputBoxCall = inputBoxStub.getCall(3);
            const validateInput = inputBoxCall.args[0].validateInput;
            
            expect(validateInput('')).to.equal('SSE endpoint is required');
            expect(validateInput('   ')).to.equal('SSE endpoint is required');
            expect(validateInput('/sse')).to.be.undefined;
        });

        it('should validate messages endpoint input for SSE protocol', async () => {
            // Arrange
            setupSuccessfulUserInputs('SSE');

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const inputBoxCall = (mockContext.ui.showInputBox as sinon.SinonStub).getCall(4);
            const validateInput = inputBoxCall.args[0].validateInput;
            
            expect(validateInput('')).to.equal('Messages endpoint is required');
            expect(validateInput('   ')).to.equal('Messages endpoint is required');
            expect(validateInput('/messages')).to.be.undefined;
        });
    });

    describe('error handling', () => {
        it('should handle general errors and compose error message', async () => {
            // Arrange
            const originalError = new Error('Something went wrong');
            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .rejects(originalError);

            // Act & Assert
            try {
                await passthroughMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Failed to proxy MCP server: Something went wrong');
            }
        });

        it('should handle backend creation error', async () => {
            // Arrange
            setupSuccessfulUserInputs('SSE');
            const backendError = new Error('Backend creation failed');
            mockVscodeWindowProgress
                .onFirstCall()
                .callsFake((_options, _callback) => {
                    throw backendError;
                });

            // Act & Assert
            try {
                await passthroughMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Failed to proxy MCP server: Backend creation failed');
            }
        });

        it('should handle MCP server creation error', async () => {
            // Arrange
            setupSuccessfulUserInputs('SSE');
            mockVscodeWindowProgress
                .onFirstCall()
                .callsFake((_options, callback) => callback({})); // Backend creation succeeds
            
            const mcpServerError = new Error('MCP server creation failed');
            mockVscodeWindowProgress
                .onSecondCall()
                .callsFake((_options, _callback) => {
                    throw mcpServerError;
                });

            // Act & Assert
            try {
                await passthroughMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Failed to proxy MCP server: MCP server creation failed');
            }
        });
    });

    describe('backend creation', () => {
        it('should create backend with correct contract', async () => {
            // Arrange
            setupSuccessfulUserInputs('SSE');
            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await passthroughMcpServer(mockContext, mockNode);

            // Assert
            const createOrUpdateCall = mockRoot.client.backend.createOrUpdate as sinon.SinonStub;
            expect(createOrUpdateCall.calledOnce).to.be.true;
            
            const [resourceGroup, serviceName, backendName, backendContract] = createOrUpdateCall.getCall(0).args;
            expect(resourceGroup).to.equal('test-resource-group');
            expect(serviceName).to.equal('test-service');
            expect(backendName).to.be.a('string');
            expect(backendName.length).to.be.greaterThan(0);
            
            const expectedContract: BackendContract = {
                url: 'https://example.com/mcp',
                protocol: 'http'
            };
            expect(backendContract).to.deep.equal(expectedContract);
        });
    });

    // Helper functions
    function setupSuccessfulUserInputs(protocol: 'SSE' | 'Streamable HTTP'): void {
        const inputBoxStub = mockContext.ui.showInputBox as sinon.SinonStub;
        
        inputBoxStub
            .onCall(0).resolves('test-server') // Server name
            .onCall(1).resolves('https://example.com/mcp') // Server URL
            .onCall(2).resolves('test-api-suffix'); // API URL suffix

        if (protocol === 'SSE') {
            inputBoxStub
                .onCall(3).resolves('/sse') // SSE endpoint
                .onCall(4).resolves('/messages'); // Messages endpoint
        }

        (mockContext.ui.showQuickPick as sinon.SinonStub)
            .resolves({ 
                label: protocol, 
                description: protocol === 'SSE' ? 'Server-Sent Events' : 'Streamable HTTP protocol'
            });
    }

    function setupInputBoxForValidation(callIndex: number): void {
        const inputBoxStub = mockContext.ui.showInputBox as sinon.SinonStub;
        
        // Set up other calls to return valid values
        inputBoxStub.onCall(0).resolves('test-server');
        inputBoxStub.onCall(1).resolves('https://example.com/mcp');
        inputBoxStub.onCall(2).resolves('test-api-suffix');
        inputBoxStub.onCall(3).resolves('/sse');
        inputBoxStub.onCall(4).resolves('/messages');

        // The specific call we want to test validation for
        inputBoxStub.onCall(callIndex).callThrough();

        (mockContext.ui.showQuickPick as sinon.SinonStub)
            .resolves({ label: 'Streamable HTTP', description: 'Streamable HTTP protocol' });

        mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
        mockApimService.createOrUpdateMcpServer.resolves({} as any);
    }

    function verifyUserInputSequence(includeSSEEndpoints = true): void {
        const inputBoxStub = mockContext.ui.showInputBox as sinon.SinonStub;
        const quickPickStub = mockContext.ui.showQuickPick as sinon.SinonStub;
        
        const expectedCalls = includeSSEEndpoints ? 5 : 3;
        expect(inputBoxStub.callCount).to.equal(expectedCalls);
        expect(quickPickStub.calledOnce).to.be.true;
    }

    function verifyBackendCreation(expectedUrl: string): void {
        const createOrUpdateCall = mockRoot.client.backend.createOrUpdate as sinon.SinonStub;
        expect(createOrUpdateCall.calledOnce).to.be.true;
        
        const backendContract = createOrUpdateCall.getCall(0).args[3];
        expect(backendContract.url).to.equal(expectedUrl);
        expect(backendContract.protocol).to.equal('http');
    }

    function verifyMcpServerCreationWithSSE(): void {
        expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
        
        const [mcpServerName, mcpServerPayload] = mockApimService.createOrUpdateMcpServer.getCall(0).args;
        expect(mcpServerName).to.equal('test-server');
        expect(mcpServerPayload.properties.displayName).to.equal('test-server');
        expect(mcpServerPayload.properties.path).to.equal('test-api-suffix');
        expect(mcpServerPayload.properties.type).to.equal('mcp');
        expect(mcpServerPayload.properties.backendId).to.be.a('string');
        expect(mcpServerPayload.properties.mcpProperties).to.deep.equal({
            transportType: 'sse',
            endpoints: {
                sse: {
                    method: 'GET',
                    uriTemplate: '/sse'
                },
                messages: {
                    method: 'POST',
                    uriTemplate: '/messages'
                }
            }
        });
    }

    function verifyMcpServerCreationWithoutSSE(): void {
        expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
        
        const [mcpServerName, mcpServerPayload] = mockApimService.createOrUpdateMcpServer.getCall(0).args;
        expect(mcpServerName).to.equal('test-server');
        expect(mcpServerPayload.properties.displayName).to.equal('test-server');
        expect(mcpServerPayload.properties.path).to.equal('test-api-suffix');
        expect(mcpServerPayload.properties.type).to.equal('mcp');
        expect(mcpServerPayload.properties.backendId).to.be.a('string');
        expect(mcpServerPayload.properties.mcpProperties).to.be.undefined;
    }

    function verifySuccessMessage(protocol: string): void {
        expect(mockVscodeWindow.calledOnce).to.be.true;
        expect(mockVscodeWindow.calledWith(
            `Successfully proxied MCP server "test-server" with ${protocol} protocol.`
        )).to.be.true;
        expect((mockNode.refresh as sinon.SinonStub).calledOnce).to.be.true;
    }
});
