/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import { McpServerToolsEditor } from '../src/explorer/editors/arm/McpServerToolsEditor';
import { ApimService } from '../src/azure/apim/ApimService';
import { IMcpServerApiContract, IMcpToolContract } from '../src/azure/apim/contracts';
import { IApiTreeRoot } from '../src/explorer/IApiTreeRoot';
import { ITreeItemWithRoot } from '../src/explorer/ITreeItemWithRoot';

describe('McpServerToolsEditor', () => {
    let sandbox: sinon.SinonSandbox;
    let editor: McpServerToolsEditor;
    let mockApimService: sinon.SinonStubbedInstance<ApimService>;
    let mockContext: ITreeItemWithRoot<IApiTreeRoot>;
    let mockRoot: IApiTreeRoot;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        editor = new McpServerToolsEditor();

        // Create mock root
        mockRoot = {
            credentials: {} as any,
            environment: {
                resourceManagerEndpointUrl: 'https://management.azure.com/'
            } as any,
            subscriptionId: '00000000-0000-0000-0000-000000000000',
            resourceGroupName: 'test-resource-group',
            serviceName: 'test-service',
            apiName: 'test-api'
        } as IApiTreeRoot;

        // Create mock context
        mockContext = {
            root: mockRoot
        } as ITreeItemWithRoot<IApiTreeRoot>;

        // Create mock ApimService
        mockApimService = sandbox.createStubInstance(ApimService);
        
        // Stub the ApimService constructor
        sandbox.stub(ApimService.prototype, 'getMcpServer').callsFake(mockApimService.getMcpServer);
        sandbox.stub(ApimService.prototype, 'createOrUpdateMcpServer').callsFake(mockApimService.createOrUpdateMcpServer);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('getDataInternal', () => {
        const sampleMcpTools: IMcpToolContract[] = [
            {
                name: 'remove-resource',
                description: 'A demonstration of a DELETE call which traditionally deletes the resource.',
                operationId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/remove-resource'
            },
            {
                name: 'retrieve-resource',
                description: 'A demonstration of a GET call on a sample resource.',
                operationId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/retrieve-resource'
            },
            {
                name: 'create-resource',
                description: 'A demonstration of a POST call to create a new resource.',
                operationId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/create-resource'
            }
        ];

        const sampleMcpServerContract: IMcpServerApiContract = {
            id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api-mcp",
            type: "Microsoft.ApiManagement/service/apis",
            name: "echo-api-mcp",
            properties: {
                displayName: "Echo API MCP",
                apiRevision: "1",
                description: "Test MCP server description",
                subscriptionRequired: false,
                serviceUrl: undefined,
                backendId: undefined,
                path: "echo-mcp",
                protocols: ["http", "https"],
                subscriptionKeyParameterNames: {
                    header: "Ocp-Apim-Subscription-Key",
                    query: "subscription-key"
                },
                type: "mcp",
                isCurrent: true,
                mcpTools: sampleMcpTools
            }
        };

        it('should return MCP tools array when getMcpServer succeeds', async () => {
            // Arrange
            mockApimService.getMcpServer.resolves(sampleMcpServerContract);

            // Act
            const result = await editor.getDataInternal(mockContext);

            // Assert
            expect(mockApimService.getMcpServer.calledOnce).to.be.true;
            expect(mockApimService.getMcpServer.calledWith('test-api')).to.be.true;
            expect(result).to.deep.equal(sampleMcpTools);
        });

        it('should cache the full ARM definition after successful retrieval', async () => {
            // Arrange
            mockApimService.getMcpServer.resolves(sampleMcpServerContract);

            // Act
            await editor.getDataInternal(mockContext);

            // Assert
            const cache = (editor as any).fullArmDefinitionCache;
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            expect(cache.has(cacheKey)).to.be.true;
            expect(cache.get(cacheKey)).to.deep.equal(sampleMcpServerContract);
        });

        it('should propagate error when getMcpServer fails', async () => {
            // Arrange
            const error = new Error('API call failed');
            mockApimService.getMcpServer.rejects(error);

            // Act & Assert
            try {
                await editor.getDataInternal(mockContext);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });
    });

    describe('updateDataInternal', () => {
        const sampleMcpServerContract: IMcpServerApiContract = {
            id: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api-mcp",
            type: "Microsoft.ApiManagement/service/apis",
            name: "echo-api-mcp",
            properties: {
                displayName: "Echo API MCP",
                apiRevision: "1",
                description: "Test MCP server description",
                subscriptionRequired: false,
                serviceUrl: undefined,
                backendId: undefined,
                path: "echo-mcp",
                protocols: ["http", "https"],
                subscriptionKeyParameterNames: {
                    header: "Ocp-Apim-Subscription-Key",
                    query: "subscription-key"
                },
                type: "mcp",
                isCurrent: true,
                mcpTools: [
                    {
                        name: "remove-resource",
                        description: "A demonstration of a DELETE call which traditionally deletes the resource.",
                        operationId: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/remove-resource"
                    }
                ]
            }
        };

        const editedTools: IMcpToolContract[] = [
            {
                name: 'updated-remove-resource',
                description: 'Updated description for DELETE operation.',
                operationId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/updated-remove-resource'
            },
            {
                name: 'new-tool',
                description: 'A new tool added to the collection.',
                operationId: '/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/new-tool'
            }
        ];

        beforeEach(() => {
            // Set up cache with sample data
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            (editor as any).fullArmDefinitionCache.set(cacheKey, sampleMcpServerContract);
        });

        it('should merge edited tools with cached full payload and update successfully', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    mcpTools: editedTools
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            const result = await editor.updateDataInternal(mockContext, editedTools);

            // Assert
            expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
            expect(mockApimService.createOrUpdateMcpServer.calledWith('test-api', expectedUpdatedContract)).to.be.true;
            expect(result).to.deep.equal(editedTools);
        });

        it('should update cache after successful update', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    mcpTools: editedTools
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            await editor.updateDataInternal(mockContext, editedTools);

            // Assert
            const cache = (editor as any).fullArmDefinitionCache;
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            expect(cache.get(cacheKey)).to.deep.equal(expectedUpdatedContract);
        });

        it('should preserve non-tool properties during update', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    mcpTools: editedTools
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            await editor.updateDataInternal(mockContext, editedTools);

            // Assert
            const actualPayload = mockApimService.createOrUpdateMcpServer.getCall(0).args[1];
            expect(actualPayload.id).to.equal(sampleMcpServerContract.id);
            expect(actualPayload.type).to.equal(sampleMcpServerContract.type);
            expect(actualPayload.name).to.equal(sampleMcpServerContract.name);
            expect(actualPayload.properties.displayName).to.equal(sampleMcpServerContract.properties.displayName);
            expect(actualPayload.properties.apiRevision).to.equal(sampleMcpServerContract.properties.apiRevision);
            expect(actualPayload.properties.description).to.equal(sampleMcpServerContract.properties.description);
            expect(actualPayload.properties.subscriptionRequired).to.equal(sampleMcpServerContract.properties.subscriptionRequired);
            expect(actualPayload.properties.path).to.equal(sampleMcpServerContract.properties.path);
            expect(actualPayload.properties.protocols).to.deep.equal(sampleMcpServerContract.properties.protocols);
            expect(actualPayload.properties.type).to.equal(sampleMcpServerContract.properties.type);
            expect(actualPayload.properties.isCurrent).to.equal(sampleMcpServerContract.properties.isCurrent);
        });

        it('should handle empty tools array update', async () => {
            // Arrange
            const emptyTools: IMcpToolContract[] = [];
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    mcpTools: emptyTools
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            const result = await editor.updateDataInternal(mockContext, emptyTools);

            // Assert
            expect(result).to.deep.equal([]);
            const actualPayload = mockApimService.createOrUpdateMcpServer.getCall(0).args[1];
            expect(actualPayload.properties.mcpTools).to.deep.equal([]);
        });

        it('should throw error when full payload is not found in cache', async () => {
            // Arrange
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            (editor as any).fullArmDefinitionCache.delete(cacheKey);

            // Act & Assert
            try {
                await editor.updateDataInternal(mockContext, editedTools);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.equal('Full payload not found in cache. Please reopen the editor and try again.');
            }

            // Verify that createOrUpdateMcpServer was not called
            expect(mockApimService.createOrUpdateMcpServer.called).to.be.false;
        });

        it('should propagate error when createOrUpdateMcpServer fails', async () => {
            // Arrange
            const error = new Error('Update failed');
            mockApimService.createOrUpdateMcpServer.rejects(error);

            // Act & Assert
            try {
                await editor.updateDataInternal(mockContext, editedTools);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });

        it('should return updated tools from server response', async () => {
            // Arrange
            const serverReturnedTools = [
                {
                    name: 'server-modified-tool',
                    description: 'Tool modified by server',
                    operationId: '/server/modified/operation'
                }
            ];
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    mcpTools: serverReturnedTools
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            const result = await editor.updateDataInternal(mockContext, editedTools);

            // Assert
            expect(result).to.deep.equal(serverReturnedTools);
        });
    });
});
