/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ServiceClient } from "@azure/ms-rest-js";
import { buildSchema, GraphQLField, GraphQLFieldMap, GraphQLNamedType, GraphQLObjectType, GraphQLSchema } from "graphql";
import { AzureParentTreeItem, AzureTreeItem, createGenericClient, ISubscriptionContext } from "vscode-azureextensionui";
import { IApiContract } from "../azure/apim/TempApiContract";
import { TempSchema } from "../azure/apim/TempSchema";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { GraphqlMutationsTreeItem } from "./GraphqlMutationsTreeItem";
import { GraphqlQueriesTreeItem } from "./GraphqlQueriesTreeItem";
//import { GraphqlSubscriptionsTreeItem } from "./GraphqlSubscriptionsTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

// tslint:disable: no-any
export class GraphqlApiTreeItem extends AzureParentTreeItem<IApiTreeRoot> {
    public static contextValue: string = 'azureApiManagementGraphql';
    public contextValue: string = GraphqlApiTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showArmApi';
    public policyTreeItem: ApiPolicyTreeItem;

    private _name: string;
    private _label: string;
    private _root: IApiTreeRoot;
    private _queriesTreeItem: GraphqlQueriesTreeItem;
    private _mutationsTreeItem: GraphqlMutationsTreeItem;
    //private _subscriptionsTreeItem: GraphqlSubscriptionsTreeItem;

    constructor(
        parent: AzureParentTreeItem,
        public apiContract: IApiContract,
        apiVersion?: string) {
        super(parent);

        if (!apiVersion) {
            const label = nonNullProp(this.apiContract.properties, 'displayName');
            this._label = label.concat(" (GraphqlAPI)");
        } else {
            this._label = apiVersion.concat(" (GraphqlAPI)");
        }

        this._name = nonNullProp(this.apiContract, 'name');
        this._root = this.createRoot(parent.root, this._name, this.apiContract.properties.type);
        this.policyTreeItem = new ApiPolicyTreeItem(this);
    }

    public get id(): string {
        return this._label;
    }

    public get label(): string {
        return this._label;
    }

    public get root(): IApiTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('api');
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IApiTreeRoot>[]> {
        const client: ServiceClient = await createGenericClient(this.root.credentials);
        const schemasString = await client.sendRequest({
            method: "GET",
            // tslint:disable-next-line: no-non-null-assertion
            url: `https://management.azure.com/subscriptions/${this.root.subscriptionId}/resourceGroups/${this.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.root.serviceName}/apis/${this.root.apiName}/schemas?api-version=2021-04-01-preview`
        });
        // tslint:disable: no-unsafe-any
        // tslint:disable-next-line: no-unnecessary-local-variable
        const schemas : TempSchema[] = schemasString.parsedBody.value;

        const valueList: GraphQLSchema[] = [];
        // tslint:disable-next-line: no-any
        const queryTypes: GraphQLField<any, any, {
            // tslint:disable-next-line: no-any
            [key: string]: any;
        }>[] = [];
        const mutationTypes: GraphQLField<any, any, {
            // tslint:disable-next-line: no-any
            [key: string]: any;
        }>[] = [];
        const subscriptionTypes: GraphQLField<any, any, {
            // tslint:disable-next-line: no-any
            [key: string]: any;
        }>[] = [];
        for (const schema of schemas) {
            const builtSchema : GraphQLSchema = buildSchema(schema.properties.document.value);
            valueList.push(builtSchema);
            const typeMap = builtSchema.getTypeMap();
            for (const key of Object.keys(typeMap)) {
                const value: GraphQLNamedType = typeMap[key];
                if (key === "Query" && value instanceof GraphQLObjectType) {
                    const fields: GraphQLFieldMap<any, any> = value.getFields();
                    for (const fieldKey of Object.keys(fields)) {
                        const fieldValue  = fields[fieldKey];
                        queryTypes.push(fieldValue);
                    }
                } else if (key === "Mutation" && value instanceof GraphQLObjectType) {
                    const fields: GraphQLFieldMap<any, any> = value.getFields();
                    for (const fieldKey of Object.keys(fields)) {
                        const fieldValue  = fields[fieldKey];
                        mutationTypes.push(fieldValue);
                    }
                } else if (key === "Subscription" && value instanceof GraphQLObjectType) {
                    const fields: GraphQLFieldMap<any, any> = value.getFields();
                    for (const fieldKey of Object.keys(fields)) {
                        const fieldValue  = fields[fieldKey];
                        subscriptionTypes.push(fieldValue);
                    }
                }
            }
        }
        this._queriesTreeItem = new GraphqlQueriesTreeItem(this, queryTypes);
        this._mutationsTreeItem = new GraphqlMutationsTreeItem(this, mutationTypes);
        /*this._subscriptionsTreeItem = new GraphqlSubscriptionsTreeItem(this, subscriptionTypes);

        return [this._queriesTreeItem, this._mutationsTreeItem, this._subscriptionsTreeItem, this.policyTreeItem];
        */
        return [this._queriesTreeItem, this._mutationsTreeItem, this.policyTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    private createRoot(subRoot: ISubscriptionContext, apiName: string, apiType: string): IApiTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            apiName: apiName,
            apiType: apiType
        });
    }
}
