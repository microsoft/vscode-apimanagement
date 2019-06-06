/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IOpenApiImportObject, OpenApiParser } from '../extension.bundle';
import { assertThrowsAsync } from './assertThrowsAsync';
import {openApi2_0, openApi3_0} from './testData';

// tslint:disable: no-use-before-declare
// tslint:disable: no-unsafe-any
suite("Open API Parser", () => {
  test("Parse OpenAPI Json 2.0", async () => {
    const parsedOpenAPI: IOpenApiImportObject = await new OpenApiParser().parse(openApi2_0);
    assert.deepEqual(parsedOpenAPI.sourceDocument, openApi2_0);
    assert.equal(parsedOpenAPI.importFormat, "swagger-json");
    assert.equal(parsedOpenAPI.version, "2.0");
  });

  test("Parse OpenAPI Json > 3.0", async () => {
    const parsedOpenAPI: IOpenApiImportObject = await new OpenApiParser().parse(openApi3_0);
    assert.deepEqual(parsedOpenAPI.sourceDocument, openApi3_0);
    assert.equal(parsedOpenAPI.importFormat, "openapi+json");
    assert.equal(parsedOpenAPI.version, "3.0.0");
  });

  test("Invalid OpenAPI input", async () => {
    // tslint:disable-next-line:no-any
    const invalidSwagger : any = {};
    await assertThrowsAsync(async () => new OpenApiParser().parse(invalidSwagger), /Could not parse the OpenAPI document./);
  });
});
