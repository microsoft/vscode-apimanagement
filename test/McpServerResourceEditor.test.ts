/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import * as sinon from 'sinon';
import { McpServerResourceEditor } from '../src/explorer/editors/arm/McpServerResourceEditor';
import { ApimService } from '../src/azure/apim/ApimService';
import { IMcpServerApiContract } from '../src/azure/apim/contracts';
import { IApiTreeRoot } from '../src/explorer/IApiTreeRoot';
import { ITreeItemWithRoot } from '../src/explorer/ITreeItemWithRoot';

describe('McpServerResourceEditor', () => {
    let sandbox: sinon.SinonSandbox;
    let editor: McpServerResourceEditor;
    let mockApimService: sinon.SinonStubbedInstance<ApimService>;
    let mockContext: ITreeItemWithRoot<IApiTreeRoot>;
    let mockRoot: IApiTreeRoot;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        editor = new McpServerResourceEditor();

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
                    },
                    {
                        name: "retrieve-resource",
                        description: "A demonstration of a GET call on a sample resource.",
                        operationId: "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-resource-group/providers/Microsoft.ApiManagement/service/test-service/apis/echo-api/operations/retrieve-resource"
                    }
                ]
            }
        };

        it('should return editable properties when getMcpServer succeeds', async () => {
            // Arrange
            mockApimService.getMcpServer.resolves(sampleMcpServerContract);

            // Act
            const result = await editor.getDataInternal(mockContext);

            // Assert
            expect(mockApimService.getMcpServer.calledOnce).to.be.true;
            expect(mockApimService.getMcpServer.calledWith('test-api')).to.be.true;
            
            expect(result).to.deep.equal({
                displayName: "Echo API MCP",
                description: "Test MCP server description",
                path: "echo-mcp"
            });
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

        it('should handle undefined description gracefully', async () => {
            // Arrange
            const contractWithoutDescription = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    description: undefined
                }
            };
            mockApimService.getMcpServer.resolves(contractWithoutDescription);

            // Act
            const result = await editor.getDataInternal(mockContext);

            // Assert
            expect(result).to.deep.equal({
                displayName: "Echo API MCP",
                description: undefined,
                path: "echo-mcp"
            });
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

        const editedData = {
            displayName: "Updated Echo API MCP",
            description: "Updated description",
            path: "updated-echo-mcp"
        };

        beforeEach(() => {
            // Set up cache with sample data
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            (editor as any).fullArmDefinitionCache.set(cacheKey, sampleMcpServerContract);
        });

        it('should merge edited data with cached full payload and update successfully', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    displayName: "Updated Echo API MCP",
                    description: "Updated description",
                    path: "updated-echo-mcp"
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            const result = await editor.updateDataInternal(mockContext, editedData);

            // Assert
            expect(mockApimService.createOrUpdateMcpServer.calledOnce).to.be.true;
            expect(mockApimService.createOrUpdateMcpServer.calledWith('test-api', expectedUpdatedContract)).to.be.true;
            
            expect(result).to.deep.equal({
                displayName: "Updated Echo API MCP",
                description: "Updated description",
                path: "updated-echo-mcp"
            });
        });

        it('should update cache after successful update', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    displayName: "Updated Echo API MCP",
                    description: "Updated description",
                    path: "updated-echo-mcp"
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            await editor.updateDataInternal(mockContext, editedData);

            // Assert
            const cache = (editor as any).fullArmDefinitionCache;
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            expect(cache.get(cacheKey)).to.deep.equal(expectedUpdatedContract);
        });

        it('should preserve non-editable properties during update', async () => {
            // Arrange
            const expectedUpdatedContract = {
                ...sampleMcpServerContract,
                properties: {
                    ...sampleMcpServerContract.properties,
                    displayName: "Updated Echo API MCP",
                    description: "Updated description",
                    path: "updated-echo-mcp"
                }
            };
            mockApimService.createOrUpdateMcpServer.resolves(expectedUpdatedContract);

            // Act
            await editor.updateDataInternal(mockContext, editedData);

            // Assert
            const actualPayload = mockApimService.createOrUpdateMcpServer.getCall(0).args[1];
            expect(actualPayload.id).to.equal(sampleMcpServerContract.id);
            expect(actualPayload.type).to.equal(sampleMcpServerContract.type);
            expect(actualPayload.name).to.equal(sampleMcpServerContract.name);
            expect(actualPayload.properties.apiRevision).to.equal(sampleMcpServerContract.properties.apiRevision);
            expect(actualPayload.properties.subscriptionRequired).to.equal(sampleMcpServerContract.properties.subscriptionRequired);
            expect(actualPayload.properties.protocols).to.deep.equal(sampleMcpServerContract.properties.protocols);
            expect(actualPayload.properties.mcpTools).to.deep.equal(sampleMcpServerContract.properties.mcpTools);
        });

        it('should throw error when full payload is not found in cache', async () => {
            // Arrange
            const cacheKey = `${mockRoot.subscriptionId}/${mockRoot.resourceGroupName}/${mockRoot.serviceName}/${mockRoot.apiName}`;
            (editor as any).fullArmDefinitionCache.delete(cacheKey);

            // Act & Assert
            try {
                await editor.updateDataInternal(mockContext, editedData);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err.message).to.equal('Full payload not found in cache. Please reopen the editor and try again.');
            }
        });

        it('should propagate error when createOrUpdateMcpServer fails', async () => {
            // Arrange
            const error = new Error('Update failed');
            mockApimService.createOrUpdateMcpServer.rejects(error);

            // Act & Assert
            try {
                await editor.updateDataInternal(mockContext, editedData);
                expect.fail('Should have thrown error');
            } catch (err) {
                expect(err).to.equal(error);
            }
        });
    });
});
