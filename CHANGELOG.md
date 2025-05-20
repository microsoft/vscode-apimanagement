# Change Log

All notable changes to the "Azure Api Management VS Code" extension will be documented in this file.

## 1.2.0

### New features

- **MCP servers support**: This feature enables you to view MCP servers within an APIM service and modify the policies associated with these MCP servers.
![ViewMCPServers](https://github.com/user-attachments/assets/4efdbd9f-66a8-42a0-89a7-69917df1d58a)

- **Copy Subscription Key**: This feature enables you to copy the primary and secondary key for any APIM subscription.
![CopySubscriptionKey](https://github.com/user-attachments/assets/7454be8c-b98f-4237-858e-d04aa3dee0e3) 

- **Add language model tool for GitHub Copilot**: This feature provides language model tool `Get available APIM policies` to help GitHub Copilot draft APIM policies better.
![LanguageModelTool](https://github.com/user-attachments/assets/79f0d220-6565-4897-80c2-01ea53154752)

- **Walkthrough to guide you in importing and testing an API**: This walkthrough helps you quickly get started with APIM by importing and testing an API.
![Walkthrough](https://github.com/user-attachments/assets/edb6ec05-13d7-4782-a07f-b968002e77cc)

## 1.1.0

### New features

- **Explain APIM Policy Using GitHub Copilot**: This feature leverages the power of AI to provide clear and concise explanations of your policies, making it easier to understand and manage them.
![ExplainAPIMPolicies](https://github.com/user-attachments/assets/32e4ab6c-002d-4e68-97fd-3ac6d4b35dfc)

- **Draft APIM Policy Using GitHub Copilot**: This feature helps you create policies quickly and accurately, saving you time and effort.
![DraftAPIMPolicies](https://github.com/user-attachments/assets/92faa63f-43b2-4926-9c97-aa5139b59847)

- **Enhancing IntelliSense and Problem Detection in APIM Policy Files**: We've added the capability to associate an XML schema with any opened APIM policy files (ending with `.policy.xml`). This enhancement provides IntelliSense and problem detection, ensuring your policies are correctly formatted and error-free.
![PolicyIntelliSense](https://github.com/user-attachments/assets/5d437894-4ea5-4bf2-961d-32019f73b796)

- **Automatic Tracing Before Policy Debugging**: To streamline the debugging process, we enabled automatic tracing before policy debugging. This setup now allows you to trace and diagnose issues more efficiently, improving the overall workflow.
![AutoEnableTracing](https://github.com/user-attachments/assets/2520b6b0-ed75-4d51-a88d-c5443baa3e4f)

### Updates
- Renamed `Authorizations` to `Credential Managers`

### Removals
- Removed the `Extract Service` and `Extract API` functionality, as it depends on DevOps Resource Kit which is deprecated
- Removed the `Initialize workspace folder` command as it's no longer needed after we introduced new XML schema for policy files

## 1.0.10

### Updates
- Remove the dependency to Azure Account extension

## 1.0.9

### Updates
- Update api-version to 2022-08-01
- Upgrade deprecated packages used in the extension

### Removals
- Remove the experimental Scaffold Azure Functions functionality due to deprecated packages, ensuring better stability for future updates

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
