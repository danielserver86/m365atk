const config = {
  azureOpenAIKey: process.env.AZURE_OPENAI_API_KEY,
  azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
  azureOpenAIDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  azureAIProjectEndpoint: process.env.AZURE_AI_PROJECT_ENDPOINT,
  azureAIAgentId: process.env.AZURE_AI_AGENT_ID,
};

module.exports = config;
