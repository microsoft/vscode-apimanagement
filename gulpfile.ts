/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { gulp_webpack } from '@microsoft/vscode-azext-dev';

exports['webpack-dev'] = () => gulp_webpack('development');
exports['webpack-prod'] = () => gulp_webpack('production');
