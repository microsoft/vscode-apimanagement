/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getNameFromId, getResourceGroupFromId, getSubscriptionFromId } from '../extension.bundle';

// tslint:disable: no-unsafe-any
suite("Azure Resource Util", () => {
    const resourceId: string = "/subscriptions/a59d7183-f4a0-4b15-8ecc-9542203d3c54/resourceGroups/apim-rg/providers/Microsoft.ApiManagement/service/apim-service";

    test("Parse name from azure resource id", async () => {
        const name: string = getNameFromId(resourceId);
        assert.equal(name, "apim-service");
    });

    test("Parse resource group name from azure resource id", async () => {
        const rg: string = getResourceGroupFromId(resourceId);
        assert.equal(rg, "apim-rg");
    });

    test("Parse subscription from azure resource id", async () => {
        const sub: string = getSubscriptionFromId(resourceId);
        assert.equal(sub, "a59d7183-f4a0-4b15-8ecc-9542203d3c54");
    });
});
