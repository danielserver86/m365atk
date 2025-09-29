const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");
const { AIProjectClient } = require("@azure/ai-projects");
const { DefaultAzureCredential } = require("@azure/identity");

const config = require("./config");

console.log("Azure AI Project Endpoint:", config.azureAIProjectEndpoint);
console.log("Azure AI Agent ID:", config.azureAIAgentId);

const client = new AIProjectClient(
  config.azureAIProjectEndpoint,
  new DefaultAzureCredential()
);

// Store conversation threads (conversation ID -> thread ID mapping)
const conversationThreads = new Map();

// Define storage and application
const storage = new MemoryStorage();
const agentApp = new AgentApplication({
  storage,
});

agentApp.onConversationUpdate("membersAdded", async (context) => {
  await context.sendActivity(`Hi there! I'm an agent to chat with you.`);
});

// Listen for ANY message to be received. MUST BE AFTER ANY OTHER MESSAGE HANDLERS
agentApp.onActivity(ActivityTypes.Message, async (context) => {
  try {
    const conversationId = context.activity.conversation.id;
    
    // Get or create thread for this conversation
    let threadId = conversationThreads.get(conversationId);
    if (!threadId) {
      const thread = await client.agents.threads.create();
      threadId = thread.id;
      conversationThreads.set(conversationId, threadId);
      console.log(`Created new thread ${threadId} for conversation ${conversationId}`);
    }

    // Add user message to thread
    await client.agents.messages.create(threadId, "user", context.activity.text);

    // Get the agent and create a run
    const agent = await client.agents.getAgent(config.azureAIAgentId);
    let run = await client.agents.runs.create(threadId, agent.id);

    // Poll until the run reaches a terminal status
    while (run.status === "queued" || run.status === "in_progress") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      run = await client.agents.runs.get(threadId, run.id);
    }

    if (run.status === "failed") {
      console.error(`Run failed: `, run.lastError);
      await context.sendActivity("Sorry, I encountered an error processing your request.");
      return;
    }

    // Get the latest messages from the thread
    const messages = await client.agents.messages.list(threadId, { order: "desc", limit: 1 });
    
    // Find the assistant's response
    for await (const message of messages) {
      if (message.role === "assistant") {
        const content = message.content.find((c) => c.type === "text" && "text" in c);
        if (content) {
          await context.sendActivity(content.text.value);
          return;
        }
      }
    }
    
    // Fallback if no assistant message found
    await context.sendActivity("I received your message but couldn't generate a response.");
    
  } catch (error) {
    console.error("Error in agent processing:", error);
    await context.sendActivity("Sorry, I encountered an error. Please try again.");
  }
});

module.exports = {
  agentApp,
};