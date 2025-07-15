/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { copyMcpServerUrl } from '../src/commands/copyMcpServerUrl';
import { McpServerTreeItem } from '../src/explorer/McpServerTreeItem';
import { IMcpServerApiContract } from '../src/azure/apim/contracts';
import { IApiTreeRoot } from '../src/explorer/IApiTreeRoot';

describe('copyMcpServerUrl', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: IActionContext;
    let mockNode: McpServerTreeItem;
    let mockRoot: IApiTreeRoot;
    let mockVscodeWindow: sinon.SinonStub;
    let mockVscodeEnv: sinon.SinonStub;
    let mockShowErrorMessage: sinon.SinonStub;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        // Create mock functions
        mockVscodeEnv = sandbox.stub().resolves();
        mockVscodeWindow = sandbox.stub(vscode.window, 'showInformationMessage').resolves();
        mockShowErrorMessage = sandbox.stub(vscode.window, 'showErrorMessage').resolves();

        // Replace the entire clipboard object to avoid property descriptor issues
        sandbox.stub(vscode.env, 'clipboard').value({
            writeText: mockVscodeEnv,
            readText: sandbox.stub().resolves('')
        });

        // Mock ActionContext
        mockContext = {
            ui: {
                showQuickPick: sandbox.stub()
            }
        } as any;

        // Mock ApiTreeRoot
        mockRoot = {
            client: {
                apiManagementService: {
                    get: sandbox.stub().resolves({
                        gatewayUrl: 'https://test-apim.azure-api.net'
                    })
                }
            },
            resourceGroupName: 'test-resource-group',
            serviceName: 'test-service'
        } as any;
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('early return scenarios', () => {
        it('should return early when node is undefined', async () => {
            // Act
            await copyMcpServerUrl(mockContext, undefined);

            // Assert
            expect(mockVscodeEnv.notCalled).to.be.true;
            expect(mockVscodeWindow.notCalled).to.be.true;
            expect(mockShowErrorMessage.notCalled).to.be.true;
        });
    });

    describe('transformative MCP servers', () => {
        beforeEach(() => {
            const mcpServerContract: IMcpServerApiContract = {
                id: '/apis/test-server',
                name: 'test-server',
                type: 'Microsoft.ApiManagement/service/apis',
                properties: {
                    displayName: 'Test Server',
                    apiRevision: '1',
                    subscriptionRequired: false,
                    path: 'test-api-suffix',
                    protocols: ['https'],
                    subscriptionKeyParameterNames: {
                        header: 'Ocp-Apim-Subscription-Key',
                        query: 'subscription-key'
                    },
                    type: 'mcp',
                    isCurrent: true,
                    mcpTools: [
                        {
                            name: 'testTool',
                            description: 'Test tool',
                            operationId: 'test-operation'
                        }
                    ]
                }
            };

            mockNode = {
                mcpServerContract,
                root: mockRoot
            } as any;
        });

        it('should generate SSE URL for transformative server when SSE is selected', async () => {
            // Arrange
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .resolves({ label: 'SSE' });

            // Act
            await copyMcpServerUrl(mockContext, mockNode);

            // Assert
            expect(mockVscodeEnv.calledOnce).to.be.true;
            expect(mockVscodeEnv.calledWith('https://test-apim.azure-api.net/test-api-suffix/sse')).to.be.true;
            expect(mockVscodeWindow.calledOnce).to.be.true;
            expect(mockShowErrorMessage.notCalled).to.be.true;
        });

        it('should generate MCP URL for transformative server when Streamable HTTP is selected', async () => {
            // Arrange
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .resolves({ label: 'Streamable HTTP' });

            // Act
            await copyMcpServerUrl(mockContext, mockNode);

            // Assert
            expect(mockVscodeEnv.calledOnce).to.be.true;
            expect(mockVscodeEnv.calledWith('https://test-apim.azure-api.net/test-api-suffix/mcp')).to.be.true;
            expect(mockVscodeWindow.calledOnce).to.be.true;
            expect(mockShowErrorMessage.notCalled).to.be.true;
        });

        it('should handle user cancellation during endpoint selection', async () => {
            // Arrange
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .rejects(new UserCancelledError());

            // Act
            await copyMcpServerUrl(mockContext, mockNode);

            // Assert - should return early without copying or showing messages
            expect(mockVscodeEnv.notCalled).to.be.true;
            expect(mockVscodeWindow.notCalled).to.be.true;
            expect(mockShowErrorMessage.notCalled).to.be.true;
        });
    });

    describe('passthrough MCP servers', () => {
        describe('with SSE transport and valid SSE endpoint', () => {
            beforeEach(() => {
                const mcpServerContract: IMcpServerApiContract = {
                    id: '/apis/test-passthrough',
                    name: 'test-passthrough',
                    type: 'Microsoft.ApiManagement/service/apis',
                    properties: {
                        displayName: 'Test Passthrough Server',
                        apiRevision: '1',
                        subscriptionRequired: false,
                        path: 'passthrough-api',
                        protocols: ['https'],
                        subscriptionKeyParameterNames: {
                            header: 'Ocp-Apim-Subscription-Key',
                            query: 'subscription-key'
                        },
                        type: 'mcp',
                        isCurrent: true,
                        mcpTools: [], // Empty tools array makes it passthrough
                        mcpProperties: {
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
                        }
                    }
                } as any;

                mockNode = {
                    mcpServerContract,
                    root: mockRoot
                } as any;
            });

            it('should generate SSE endpoint URL for passthrough server with SSE', async () => {
                // Act
                await copyMcpServerUrl(mockContext, mockNode);

                // Assert
                expect(mockVscodeEnv.calledOnce).to.be.true;
                expect(mockVscodeEnv.calledWith('https://test-apim.azure-api.net/passthrough-api/sse')).to.be.true;
                expect(mockVscodeWindow.calledOnce).to.be.true;
                expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
                expect(mockShowErrorMessage.notCalled).to.be.true;
            });
        });

        describe('with SSE transport but missing SSE endpoint', () => {
            beforeEach(() => {
                const mcpServerContract: IMcpServerApiContract = {
                    id: '/apis/test-passthrough-invalid',
                    name: 'test-passthrough-invalid',
                    type: 'Microsoft.ApiManagement/service/apis',
                    properties: {
                        displayName: 'Test Invalid Passthrough Server',
                        apiRevision: '1',
                        subscriptionRequired: false,
                        path: 'invalid-passthrough-api',
                        protocols: ['https'],
                        subscriptionKeyParameterNames: {
                            header: 'Ocp-Apim-Subscription-Key',
                            query: 'subscription-key'
                        },
                        type: 'mcp',
                        isCurrent: true,
                        mcpTools: [],
                        mcpProperties: {
                            transportType: 'sse',
                            endpoints: {
                                // Missing sse endpoint
                                messages: {
                                    method: 'POST',
                                    uriTemplate: '/messages'
                                }
                            }
                        }
                    }
                } as any;

                mockNode = {
                    mcpServerContract,
                    root: mockRoot
                } as any;
            });

            it('should throw error when SSE transport is configured but SSE endpoint is missing', async () => {
                // Act & Assert
                try {
                    await copyMcpServerUrl(mockContext, mockNode);
                    expect.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).to.equal('SSE transport type is configured but no SSE endpoint is defined for this passthrough MCP server.');
                }

                expect(mockVscodeEnv.notCalled).to.be.true;
                expect(mockVscodeWindow.notCalled).to.be.true;
                expect(mockShowErrorMessage.calledOnce).to.be.true;
            });
        });

        describe('with SSE transport but no endpoints object', () => {
            beforeEach(() => {
                const mcpServerContract: IMcpServerApiContract = {
                    id: '/apis/test-passthrough-no-endpoints',
                    name: 'test-passthrough-no-endpoints',
                    type: 'Microsoft.ApiManagement/service/apis',
                    properties: {
                        displayName: 'Test No Endpoints Passthrough Server',
                        apiRevision: '1',
                        subscriptionRequired: false,
                        path: 'no-endpoints-passthrough-api',
                        protocols: ['https'],
                        subscriptionKeyParameterNames: {
                            header: 'Ocp-Apim-Subscription-Key',
                            query: 'subscription-key'
                        },
                        type: 'mcp',
                        isCurrent: true,
                        mcpTools: [],
                        mcpProperties: {
                            transportType: 'sse'
                            // Missing endpoints object
                        }
                    }
                } as any;

                mockNode = {
                    mcpServerContract,
                    root: mockRoot
                } as any;
            });

            it('should throw error when SSE transport is configured but endpoints object is missing', async () => {
                // Act & Assert
                try {
                    await copyMcpServerUrl(mockContext, mockNode);
                    expect.fail('Should have thrown error');
                } catch (error) {
                    expect(error.message).to.equal('SSE transport type is configured but no SSE endpoint is defined for this passthrough MCP server.');
                }

                expect(mockVscodeEnv.notCalled).to.be.true;
                expect(mockVscodeWindow.notCalled).to.be.true;
                expect(mockShowErrorMessage.calledOnce).to.be.true;
            });
        });

        describe('without SSE transport', () => {
            beforeEach(() => {
                const mcpServerContract: IMcpServerApiContract = {
                    id: '/apis/test-passthrough-no-sse',
                    name: 'test-passthrough-no-sse',
                    type: 'Microsoft.ApiManagement/service/apis',
                    properties: {
                        displayName: 'Test No SSE Passthrough Server',
                        apiRevision: '1',
                        subscriptionRequired: false,
                        path: 'no-sse-passthrough-api',
                        protocols: ['https'],
                        subscriptionKeyParameterNames: {
                            header: 'Ocp-Apim-Subscription-Key',
                            query: 'subscription-key'
                        },
                        type: 'mcp',
                        isCurrent: true,
                        mcpTools: [] // Empty tools array makes it passthrough
                        // No mcpProperties means no SSE
                    }
                };

                mockNode = {
                    mcpServerContract,
                    root: mockRoot
                } as any;
            });

            it('should generate base URL for passthrough server without SSE', async () => {
                // Act
                await copyMcpServerUrl(mockContext, mockNode);

                // Assert
                expect(mockVscodeEnv.calledOnce).to.be.true;
                expect(mockVscodeEnv.calledWith('https://test-apim.azure-api.net/no-sse-passthrough-api')).to.be.true;
                expect(mockVscodeWindow.calledOnce).to.be.true;
                expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
                expect(mockShowErrorMessage.notCalled).to.be.true;
            });
        });

        describe('with streamable HTTP transport', () => {
            beforeEach(() => {
                const mcpServerContract: IMcpServerApiContract = {
                    id: '/apis/test-passthrough-http',
                    name: 'test-passthrough-http',
                    type: 'Microsoft.ApiManagement/service/apis',
                    properties: {
                        displayName: 'Test HTTP Passthrough Server',
                        apiRevision: '1',
                        subscriptionRequired: false,
                        path: 'http-passthrough-api',
                        protocols: ['https'],
                        subscriptionKeyParameterNames: {
                            header: 'Ocp-Apim-Subscription-Key',
                            query: 'subscription-key'
                        },
                        type: 'mcp',
                        isCurrent: true
                    }
                } as any;

                mockNode = {
                    mcpServerContract,
                    root: mockRoot
                } as any;
            });

            it('should generate base URL for passthrough server with HTTP transport', async () => {
                // Act
                await copyMcpServerUrl(mockContext, mockNode);

                // Assert
                expect(mockVscodeEnv.calledOnce).to.be.true;
                expect(mockVscodeEnv.calledWith('https://test-apim.azure-api.net/http-passthrough-api')).to.be.true;
                expect(mockVscodeWindow.calledOnce).to.be.true;
                expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
                expect(mockShowErrorMessage.notCalled).to.be.true;
            });
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            const mcpServerContract: IMcpServerApiContract = {
                id: '/apis/test-error',
                name: 'test-error',
                type: 'Microsoft.ApiManagement/service/apis',
                properties: {
                    displayName: 'Test Error Server',
                    apiRevision: '1',
                    subscriptionRequired: false,
                    path: 'error-api',
                    protocols: ['https'],
                    subscriptionKeyParameterNames: {
                        header: 'Ocp-Apim-Subscription-Key',
                        query: 'subscription-key'
                    },
                    type: 'mcp',
                    isCurrent: true,
                    mcpTools: [
                        {
                            name: 'testTool',
                            description: 'Test tool',
                            operationId: 'test-operation'
                        }
                    ]
                }
            };

            mockNode = {
                mcpServerContract,
                root: mockRoot
            } as any;
        });

        it('should handle API management service get error', async () => {
            // Arrange
            const serviceError = new Error('Service not found');
            (mockRoot.client.apiManagementService.get as sinon.SinonStub)
                .rejects(serviceError);

            // Act & Assert
            try {
                await copyMcpServerUrl(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Service not found');
            }

            expect(mockVscodeEnv.notCalled).to.be.true;
            expect(mockVscodeWindow.notCalled).to.be.true;
            expect(mockShowErrorMessage.calledOnce).to.be.true;
        });

        it('should handle clipboard write error', async () => {
            // Arrange
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .resolves({ label: 'SSE' });
            
            const clipboardError = new Error('Clipboard access denied');
            mockVscodeEnv.rejects(clipboardError);

            // Act & Assert
            try {
                await copyMcpServerUrl(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Clipboard access denied');
            }

            expect(mockVscodeWindow.notCalled).to.be.true;
            expect(mockShowErrorMessage.calledOnce).to.be.true;
        });

        it('should handle general error during operation', async () => {
            // Arrange
            const generalError = new Error('Unexpected error');
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .rejects(generalError);

            // Act & Assert
            try {
                await copyMcpServerUrl(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Unexpected error');
            }

            expect(mockVscodeEnv.notCalled).to.be.true;
            expect(mockVscodeWindow.notCalled).to.be.true;
            expect(mockShowErrorMessage.calledOnce).to.be.true;
        });
    });
});