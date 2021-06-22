/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export class TempSchema {
    public id: string;
    public name: string;
    // tslint:disable-next-line: no-reserved-keywords
    public type: string;
    public location?: string;
    public properties: {
        contentType: string,
        document: {
          value: string
        }
    };
}
