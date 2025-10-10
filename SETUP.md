# Environment Setup Guide

This repository includes an Azure AI Agent built with the Microsoft 365 Agents SDK. Follow these steps to configure your environment variables.

## Quick Setup

1. **Copy the sample file:**
   ```bash
   cp .env.sample .localConfigs
   ```

2. **Fill in the required Azure OpenAI values in `.localConfigs`:**
   - `AZURE_OPENAI_API_KEY` - Your Azure OpenAI API key
   - `AZURE_OPENAI_ENDPOINT` - Your Azure OpenAI endpoint URL
   - `AZURE_OPENAI_DEPLOYMENT_NAME` - Your model deployment name

3. **Optional: Configure Azure AI Studio (for advanced features):**
   - `AZURE_AI_PROJECT_ENDPOINT` - Your Azure AI Studio project endpoint
   - `AZURE_AI_AGENT_ID` - Your pre-built agent ID

4. **Run the application:**
   - For playground: Press F5 in VS Code and select "Debug in Microsoft 365 Agents Playground"
   - For Teams: Use the "Start App Locally" task

## Required Services

### Azure OpenAI
- Create an Azure OpenAI resource in the [Azure Portal](https://portal.azure.com)
- Deploy a model (e.g., GPT-3.5-turbo or GPT-4)
- Get your API key and endpoint from the resource overview

### Azure AI Studio (Optional)
- Create an AI Studio project at [ai.azure.com](https://ai.azure.com)
- Configure agents and get your project endpoint

## Environment Files

- `.env.sample` - Template with all possible variables (this file)
- `.localConfigs` - Your local configuration (gitignored)
- `env/.env.dev` - Development environment (committed, no secrets)
- `env/.env.playground` - Playground environment configuration

## Security Note

Never commit files containing actual API keys or secrets to version control. The `.localConfigs` file is gitignored for this reason.