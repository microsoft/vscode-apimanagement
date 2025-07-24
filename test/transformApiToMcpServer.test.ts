/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { ApiContract, OperationContract } from '@azure/arm-apimanagement';
import { transformApiToMcpServer } from '../src/commands/transformApiToMcpServer';
import { McpTransformativeTreeItem } from '../src/explorer/McpTransformativeTreeItem';
import { ApimService } from '../src/azure/apim/ApimService';
import { IServiceTreeRoot } from '../src/explorer/IServiceTreeRoot';

describe('transformApiToMcpServer', () => {
    let sandbox: sinon.SinonSandbox;
    let mockContext: IActionContext;
    let mockNode: McpTransformativeTreeItem;
    let mockRoot: IServiceTreeRoot;
    let mockUiUtils: sinon.SinonStub;
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
                api: {
                    listByService: sandbox.stub()
                },
                apiOperation: {
                    listByApi: sandbox.stub()
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

        // Mock McpTransformativeTreeItem
        mockNode = {
            root: mockRoot,
            refresh: sandbox.stub().resolves()
        } as any;

        // Mock uiUtils.listAllIterator
        mockUiUtils = sandbox.stub(uiUtils, 'listAllIterator');

        // Mock ApimService
        mockApimService = sandbox.createStubInstance(ApimService);
        sandbox.stub(ApimService.prototype, 'createOrUpdateMcpServer').callsFake(mockApimService.createOrUpdateMcpServer);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('successful flow', () => {
        it('should successfully transform API to MCP server', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API',
                path: 'test-path'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    description: 'Test operation 1',
                    method: 'GET'
                },
                {
                    name: 'operation2',
                    displayName: 'Operation 2',
                    description: 'Test operation 2',
                    method: 'POST'
                }
            ];

            // Mock API listing
            mockUiUtils.onFirstCall().resolves([mockApi]);
            
            // Mock operation listing
            mockUiUtils.onSecondCall().resolves(mockOperations);

            // Mock user selections
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([
                    { label: 'Operation 1', operation: mockOperations[0] },
                    { label: 'Operation 2', operation: mockOperations[1] }
                ]);

            // Mock user input for MCP server name and API URL suffix
            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .resolves('my-custom-mcp')
                .onSecondCall()
                .resolves('test-path-mcp');

            // Mock progress dialog
            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));

            // Mock ApimService.createMcpServer
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(mockUiUtils.calledTwice).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).calledTwice).to.be.true;
            expect((mockContext.ui.showInputBox as sinon.SinonStub).calledTwice).to.be.true;
            expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
            expect(mockVscodeWindow.calledOnce).to.be.true;
            expect(mockVscodeWindow.calledWith('Successfully created MCP server "my-custom-mcp" from API "Test API".')).to.be.true;

            // Verify the MCP server payload
            const createMcpServerCall = mockApimService.createOrUpdateMcpServer.getCall(0);
            const mcpApiName = createMcpServerCall.args[0];
            const mcpServerPayload = createMcpServerCall.args[1];

            expect(mcpApiName).to.equal('my-custom-mcp');
            expect(mcpServerPayload.properties.displayName).to.equal('my-custom-mcp');
            expect(mcpServerPayload.properties.path).to.equal('test-path-mcp');
            expect(mcpServerPayload.properties.mcpTools).to.have.length(2);
            expect(mcpServerPayload.properties.mcpTools[0].name).to.equal('operation1');
            expect(mcpServerPayload.properties.mcpTools[1].name).to.equal('operation2');
        });

        it('should use default API URL suffix when API has no path', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
                // No path property
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    description: 'Test operation 1',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([{ label: 'Operation 1', operation: mockOperations[0] }]);

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .resolves('my-custom-mcp')
                .onSecondCall()
                .resolves('test-api-mcp');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            const showInputBoxCall = (mockContext.ui.showInputBox as sinon.SinonStub).getCall(1);
            const inputBoxOptions = showInputBoxCall.args[0];
            expect(inputBoxOptions.value).to.equal('test-api-mcp');
        });

        it('should successfully create MCP server with empty API URL suffix for root path', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API',
                path: 'test-path'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    description: 'Test operation 1',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([{ label: 'Operation 1', operation: mockOperations[0] }]);

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .resolves('my-custom-mcp')
                .onSecondCall()
                .resolves(''); // Empty API URL suffix for root path

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
            const createMcpServerCall = mockApimService.createOrUpdateMcpServer.getCall(0);
            const mcpServerPayload = createMcpServerCall.args[1];
            expect(mcpServerPayload.properties.path).to.equal(''); // Empty path for root
            expect(mockVscodeWindow.calledWith('Successfully created MCP server "my-custom-mcp" from API "Test API".')).to.be.true;
        });
    });

    describe('early return scenarios', () => {
        it('should return early when node is undefined', async () => {
            // Act
            await transformApiToMcpServer(mockContext, undefined);

            // Assert
            expect(mockUiUtils.notCalled).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
        });

        it('should return early when no APIs are found', async () => {
            // Arrange
            mockUiUtils.onFirstCall().resolves([]);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(mockUiUtils.calledOnce).to.be.true;
            expect(mockVscodeWindow.calledWith('No APIs found in the current API Management service.')).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).notCalled).to.be.true;
        });

        it('should return early when user cancels API selection', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            mockUiUtils.onFirstCall().resolves([mockApi]);
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .rejects(new UserCancelledError()); // User cancelled

            // Act & Assert
            try {
                await transformApiToMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown UserCancelledError');
            } catch (error) {
                expect(error).to.be.instanceOf(UserCancelledError);
            }
        });

        it('should return early when no operations are found', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves([]);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(mockUiUtils.calledTwice).to.be.true;
            expect(mockVscodeWindow.calledWith('No operations found in API "Test API".')).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).calledOnce).to.be.true;
        });

        it('should return early when user cancels operation selection', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .rejects(new UserCancelledError()); // User cancelled

            // Act & Assert
            try {
                await transformApiToMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown UserCancelledError');
            } catch (error) {
                expect(error).to.be.instanceOf(UserCancelledError);
            }
        });

        it('should return early when no operations are selected', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([]); // Empty selection

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(mockUiUtils.calledTwice).to.be.true;
            expect((mockContext.ui.showQuickPick as sinon.SinonStub).calledTwice).to.be.true;
            expect((mockContext.ui.showInputBox as sinon.SinonStub).notCalled).to.be.true;
        });
    });

    describe('error handling', () => {
        it('should handle general errors and compose error message', async () => {
            // Arrange
            const originalError = new Error('Something went wrong');
            mockUiUtils.onFirstCall().rejects(originalError);

            // Act & Assert
            try {
                await transformApiToMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Failed to transform API to MCP server: Something went wrong');
            }
        });

        it('should handle createMcpServer error', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([{ label: 'Operation 1', operation: mockOperations[0] }]);

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .resolves('test-suffix');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            
            const createError = new Error('Create MCP server failed');
            mockApimService.createOrUpdateMcpServer.rejects(createError);

            // Act & Assert
            try {
                await transformApiToMcpServer(mockContext, mockNode);
                expect.fail('Should have thrown error');
            } catch (error) {
                expect(error.message).to.equal('Failed to transform API to MCP server: Create MCP server failed');
            }
        });
    });

    describe('operation formatting', () => {
        it('should format operations with description correctly', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    description: 'This is a test operation',
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });

            let operationQuickPickItems: any[] = [];
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .callsFake((items) => {
                    operationQuickPickItems = items;
                    return Promise.resolve([{ label: 'Operation 1', operation: mockOperations[0] }]);
                });

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .resolves('test-suffix');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(operationQuickPickItems[0].description).to.equal('GET - This is a test operation');
        });

        it('should format operations without description correctly', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    method: 'POST'
                    // No description
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });

            let operationQuickPickItems: any[] = [];
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .callsFake((items) => {
                    operationQuickPickItems = items;
                    return Promise.resolve([{ label: 'Operation 1', operation: mockOperations[0] }]);
                });

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .resolves('test-suffix');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            expect(operationQuickPickItems[0].description).to.equal('POST');
        });
    });

    describe('MCP payload construction', () => {
        it('should construct correct MCP server payload', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'my-test-api',
                displayName: 'My Test API',
                path: 'custom-path'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'getUsers',
                    displayName: 'Get Users',
                    description: 'Retrieve all users',
                    method: 'GET'
                },
                {
                    name: 'createUser',
                    displayName: 'Create User',
                    description: 'Create a new user',
                    method: 'POST'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'My Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([
                    { label: 'Get Users', operation: mockOperations[0] },
                    { label: 'Create User', operation: mockOperations[1] }
                ]);

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .onFirstCall()
                .resolves('my-custom-mcp-server')
                .onSecondCall()
                .resolves('my-custom-mcp-suffix');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            const createMcpServerCall = mockApimService.createOrUpdateMcpServer.getCall(0);
            const mcpApiName = createMcpServerCall.args[0];
            const mcpServerPayload = createMcpServerCall.args[1];

            expect(mcpApiName).to.equal('my-custom-mcp-server');
            
            const expectedPayload = {
                id: `/subscriptions/test-subscription-id/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/my-custom-mcp-server`,
                name: 'my-custom-mcp-server',
                properties: {
                    type: 'mcp',
                    displayName: 'my-custom-mcp-server',
                    subscriptionRequired: false,
                    path: 'my-custom-mcp-suffix',
                    protocols: ['http', 'https'],
                    mcpTools: [
                        {
                            name: 'getUsers',
                            description: 'Retrieve all users',
                            operationId: `/subscriptions/test-subscription-id/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/my-test-api/operations/getUsers`
                        },
                        {
                            name: 'createUser',
                            description: 'Create a new user',
                            operationId: `/subscriptions/test-subscription-id/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/my-test-api/operations/createUser`
                        }
                    ]
                }
            };

            expect(mcpServerPayload).to.deep.equal(expectedPayload);
        });

        it('should handle operations with empty description', async () => {
            // Arrange
            const mockApi: ApiContract = {
                name: 'test-api',
                displayName: 'Test API'
            };

            const mockOperations: OperationContract[] = [
                {
                    name: 'operation1',
                    displayName: 'Operation 1',
                    description: '', // Empty description
                    method: 'GET'
                }
            ];

            mockUiUtils.onFirstCall().resolves([mockApi]);
            mockUiUtils.onSecondCall().resolves(mockOperations);

            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onFirstCall()
                .resolves({ label: 'Test API', api: mockApi });
            
            (mockContext.ui.showQuickPick as sinon.SinonStub)
                .onSecondCall()
                .resolves([{ label: 'Operation 1', operation: mockOperations[0] }]);

            (mockContext.ui.showInputBox as sinon.SinonStub)
                .resolves('test-suffix');

            mockVscodeWindowProgress.callsFake((_options, callback) => callback({}));
            mockApimService.createOrUpdateMcpServer.resolves({} as any);

            // Act
            await transformApiToMcpServer(mockContext, mockNode);

            // Assert
            const createMcpServerCall = mockApimService.createOrUpdateMcpServer.getCall(0);
            const mcpServerPayload = createMcpServerCall.args[1];
            
            expect(mcpServerPayload.properties.mcpTools[0].description).to.equal('');
        });
    });
});
