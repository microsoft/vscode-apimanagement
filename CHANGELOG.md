# Change Log

All notable changes to the "Azure Api Management VS Code" extension will be documented in this file.

## [1.0.8 - 2023-09-12]

- Fixed loading API Management instances when expanding an Azure subscription

## [1.0.7 - 2023-09-08]

- Update api-version to 2019-12-01
- Fix issue with policy debugging

## [1.0.6 - 2023-05-06]

- Overridding fevents version to move off a vulnerable package

## [1.0.5 - 2022-06-24]

- Enable Authorizations in Consumption Sku

## [1.0.4 - 2022-06-05]

- Update to latest API Management devops resource kit
- Authorization Manager feature preview.
  - Authorization Providers, Authorizations, Access Policies Management

## [1.0.3 - 2021-07-08]

- Provide Subscription Management Support
- Support importing Function App with Swagger file
- Minor bug fixes.

## [1.0.2 - 2021-04-13]

- Add Self-hosted gateway debugging  
- Added policy support for Dapr
- Minor bug fixes.

## [1.0.0 - 2021-03-01]

- Migrate to new Azure VScode Tools  
- Update to latest Azure API Management SDKs

## [0.1.8 - 2020-12-10]

- Switch / Release API Revisions
- API filter
- Import Azure Function/Web App from different Subscriptions
- Small bug fixes

## [0.1.7 - 2020-10-30]

- Scaffold Azure Functions
- Show diffs against last saved version

## [0.1.6 - 2020-09-22]

- Policy debugging

## [0.1.5 - 2020-09-08]

- Fixed OpenAPI host URL
- Fixed provisioning APIM instance error

## [0.1.4 - 2020-07-27]

- Migrate Vscode Extesion to latest APIM Arm SDK

## [0.1.3 - 2020-04-11]

### Added
- Import Azure Functions HttpTriggers.
- Import App Service WebApp.
- Manage APIs for Self-hosted gateways.
- Generate Docker command for Self-hosted gateways.
- Generate Kubernetes deployment file for Self-hosted gateways.

### Fixed
- Check for newer csharp extension for policy editing.

## [0.1.2 - 2020-01-06]

### Added
- Experimental Intellisense support for policy editing.
- Integrate [DevOps ResourceKit](https://github.com/Azure/azure-api-management-devops-resource-kit) Extract functionality.

### Fixed
- Remove repeating protocol segments from OpenApi file.

## [0.1.1 - 2019-06-28]

### Added
- Marketplace badges to readme.

### Fixed
- Display name of extension.

## [0.1.0 - 2019-06-27]

### Added
- Create and delete an API Management instance
- Create an API by importing itsan OpenAPI specification
- Edit APIs and operations in Azure Resource Manager or OpenAPI formats
- Edit policies at any scope
- Associate an API with a product
- Create, delete, and edit Named Values
- Test an API using REST Client
- Command Palette support for most features
