/**
 * Microsoft Agent with Azure AI Projects Integration
 * 
 * This application demonstrates how to wrap Azure AI Projects agents 
 * within the Microsoft 365 Agents SDK to create intelligent Teams bots.
 * 
 * Architecture:
 * Azure AI Foundry Agent → M365 Agents SDK → Azure AI Projects → AI Agent
 */

// M365 Agents SDK - Provides M365 Agents SDK handling and activity handling
const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");

// Azure AI Projects SDK - Connects to Azure AI Studio agents
const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

const config = require("./config");

// Azure Authentication - Uses managed identity in production, Azure CLI in development
const credential = new DefaultAzureCredential();

// Azure AI Projects Client - Connects to your AI agent in Azure AI Studio
const client = new AIProjectClient(
  config.azureAIProjectEndpoint, // Your Azure AI Projects workspace endpoint
  credential
);

// Conversation State Management - Maps Teams conversations to Azure AI threads
// This ensures each Teams conversation maintains its own AI conversation context
const conversationThreads = new Map(); // conversationId → threadId

// M365 Agents SDK Setup - Creates the bot application framework
const storage = new MemoryStorage(); // In-memory storage for bot state
const agentApp = new AgentApplication({
  storage, // Bot conversation state storage
});

// Welcome Message Handler - Triggered when bot is added to a conversation
agentApp.onConversationUpdate("membersAdded", async (context) => {
  await context.sendActivity(`Hi there! I'm an agent to chat with you.`);
});

// MAIN MESSAGE HANDLER - This is where M365 SDK meets Azure AI Projects
// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.onActivity(ActivityTypes.Message, async (context) => {
  try {
    // Extract Teams conversation identifier
    const conversationId = context.activity.conversation.id;
    
    // THREAD MANAGEMENT - Key integration point between Teams and Azure AI
    // Each Teams conversation gets mapped to a persistent Azure AI thread
    let threadId = conversationThreads.get(conversationId);
    if (!threadId) {
      // Create new Azure AI conversation thread
      const thread = await client.agents.threads.create();
      threadId = thread.id;
      // Store mapping for future messages in this Teams conversation
      conversationThreads.set(conversationId, threadId);
    }

    // AZURE AI INTEGRATION - Forward Teams message to Azure AI agent
    // Add user's Teams message to the Azure AI conversation thread
    await client.agents.messages.create(threadId, "user", context.activity.text);

    // Get your specific Azure AI agent (configured in Azure AI Studio)
    const agent = await client.agents.getAgent(config.azureAIAgentId);
    
    // Create a "run" - This triggers the AI agent to process all messages in the thread
    // The agent will consider the full conversation history and generate a response
    let run = await client.agents.runs.create(threadId, agent.id);

    // ASYNCHRONOUS PROCESSING - Azure AI agents run asynchronously
    // Poll until the AI agent completes processing (thinking time)
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
      run = await client.agents.runs.get(threadId, run.id);
    }

    // Handle execution failures
    if (run.status === "failed") {
      console.error(`Agent run failed:`, run.lastError);
      await context.sendActivity("Sorry, I encountered an error processing your request.");
      return;
    }

    // RESPONSE RETRIEVAL - Get the AI agent's response from Azure AI Projects
    const messages = await client.agents.messages.list(threadId, { order: "desc", limit: 1 });
    
    // Extract the assistant's response and send back to Teams
    for await (const message of messages) {
      if (message.role === "assistant") {
        const content = message.content.find((c) => c.type === "text" && "text" in c);
        if (content) {
          // TEAMS INTEGRATION - Send AI response back through M365 Agents SDK
          await context.sendActivity(content.text.value);
          return;
        }
      }
    }
    
    // Fallback response if no AI-generated content found
    await context.sendActivity("I received your message but couldn't generate a response.");
    
  } catch (error) {
    // ERROR HANDLING - Log errors and provide user-friendly response
    console.error("Error in agent processing:", error.message);
    await context.sendActivity("Sorry, I encountered an error. Please try again.");
  }
});

// Export the configured bot application for the hosting framework
module.exports = {
  agentApp, // M365 Agents SDK bot application with Azure AI integration
};