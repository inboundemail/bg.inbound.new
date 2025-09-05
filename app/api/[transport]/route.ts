import { auth } from "@/lib/auth";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { withMcpAuth } from "better-auth/plugins";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, emailAgent, session, agentLaunchLog } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Cursor API interfaces (updated to match official API spec)
interface CursorAgentRequest {
    prompt: {
        text: string;
        images?: Array<{
            data: string;
            dimension?: {
                width: number;
                height: number;
            };
        }>;
    };
    model?: string;
    source: {
        repository: string;
        ref?: string;
    };
    target?: {
        autoCreatePr?: boolean;
        branchName?: string;
    };
    webhook?: {
        url: string;
        secret?: string;
    };
}

interface CursorAgent {
    id: string;
    name: string;
    status: 'RUNNING' | 'FINISHED' | 'ERROR' | 'CREATING' | 'EXPIRED';
    source: {
        repository: string;
        ref: string;
    };
    target: {
        branchName: string;
        url: string;
        prUrl?: string;
        autoCreatePr: boolean;
    };
    summary?: string;
    createdAt: string;
}

interface CursorAgentListResponse {
    agents: CursorAgent[];
    nextCursor?: string;
}

interface CursorMessage {
    id: string;
    type: 'user_message' | 'assistant_message';
    text: string;
}

interface CursorConversationResponse {
    id: string;
    messages: CursorMessage[];
}

interface CursorApiKeyInfo {
    apiKeyName: string;
    createdAt: string;
    userEmail?: string;
}

interface CursorModel {
    models: string[];
}

interface CursorRepository {
    owner: string;
    name: string;
    repository: string;
}

async function getCursorApiKey(userId: string): Promise<string | null> {
    try {
        // First try to get user's default API key
        const userResult = await db.select({ defaultCursorApiKey: user.defaultCursorApiKey })
            .from(user)
            .where(eq(user.id, userId))
            .limit(1);

        if (userResult[0]?.defaultCursorApiKey) {
            return userResult[0].defaultCursorApiKey;
        }

        // Fallback to any email agent's API key
        const agentResult = await db.select({ cursorApiKey: emailAgent.cursorApiKey })
            .from(emailAgent)
            .where(eq(emailAgent.userId, userId))
            .limit(1);

        return agentResult[0]?.cursorApiKey || null;
    } catch (error) {
        console.error('Error getting Cursor API key:', error);
        return null;
    }
}

const handler = withMcpAuth(auth, async (req: Request) => {
    const session = await auth.api.getMcpSession({
        headers: req.headers
    })
    if (!session) {
        //this is important and you must return 401
        return new Response(null, {
            status: 401
        })
    }
    // session contains the access token record with scopes and user ID
    return createMcpHandler(
        (server) => {
            // Helper function to get user's Cursor API key
            server.tool(
                "create_cursor_agent",
                "⚠️ CREATES BACKGROUND AGENT: This starts an autonomous AI coding agent that will work asynchronously on your repository and automatically create a Pull Request when complete. The agent works independently and may take several minutes to hours to finish. Multiple agents should have distinct, non-overlapping scopes to avoid conflicts.",
                {
                    prompt: z.string().describe("Detailed instructions for what the agent should accomplish"),
                    repository: z.string().describe("GitHub repository URL (e.g., 'https://github.com/user/repo')"),
                    ref: z.string().optional().default("main").describe("Git branch/ref to work from"),
                    model: z.string().optional().describe("AI model to use (e.g., 'claude-3.5-sonnet', 'gpt-4-turbo')"),
                    autoCreatePr: z.boolean().optional().default(true).describe("Whether to automatically create a PR when complete"),
                    webhookUrl: z.string().optional().describe("Webhook URL to receive completion notifications"),
                    webhookSecret: z.string().optional().describe("Secret for webhook signature verification"),
                    originalEmailId: z.string().optional().describe("Original email ID for automatic replies"),
                    senderEmail: z.string().optional().describe("Email address that triggered the agent"),
                    emailSubject: z.string().optional().describe("Subject of the triggering email"),
                },
                async ({ prompt, repository, ref, model, autoCreatePr, webhookUrl, webhookSecret, originalEmailId, senderEmail, emailSubject }) => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings or email agents."
                                }],
                            };
                        }

                        const agentRequest: CursorAgentRequest = {
                            prompt: { text: prompt },
                            source: {
                                repository,
                                ref: ref || "main"
                            }
                        };

                        // Add optional fields
                        if (model) {
                            agentRequest.model = model;
                        }

                        if (autoCreatePr !== undefined) {
                            agentRequest.target = {
                                autoCreatePr: autoCreatePr
                            };
                        }

                        // Add webhook configuration if provided
                        if (webhookUrl) {
                            agentRequest.webhook = {
                                url: webhookUrl,
                                secret: webhookSecret
                            };
                        }

                        const response = await fetch('https://api.cursor.com/v0/agents', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(agentRequest)
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to create Cursor agent: ${response.status} ${errorText}`
                                }],
                            };
                        }

                        const result = await response.json();

                        // Register webhook monitoring if webhook URL is provided
                        let webhookStatus = '';
                        if (webhookUrl) {
                            try {
                                const { nanoid } = await import('nanoid');
                                
                                // Create a temporary email agent record for webhook tracking
                                // This allows the existing webhook monitoring system to work
                                const tempAgentId = nanoid();
                                await db.insert(emailAgent).values({
                                    id: tempAgentId,
                                    userId: session.userId,
                                    name: `mcp-agent-${result.id.substring(0, 8)}`,
                                    githubRepository: repository,
                                    githubRef: ref || 'main',
                                    cursorApiKey: null, // Uses user's default
                                    webhookUrl: webhookUrl,
                                    webhookSecret: webhookSecret,
                                    isActive: false, // Not a real email agent
                                    allowedDomains: null,
                                    allowedEmails: null,
                                    inboundEndpointId: null,
                                    inboundEmailAddressId: null,
                                    emailAddress: null,
                                    createdAt: new Date(),
                                    updatedAt: new Date()
                                });

                                // Create agent launch log entry for tracking
                                const logId = nanoid();
                                await db.insert(agentLaunchLog).values({
                                    id: logId,
                                    emailAgentId: tempAgentId,
                                    userId: session.userId,
                                    senderEmail: senderEmail || '',
                                    emailSubject: emailSubject || `MCP Agent: ${prompt.substring(0, 50)}...`,
                                    cursorAgentId: result.id,
                                    status: 'success', // Agent created successfully
                                    createdAt: new Date()
                                });

                                webhookStatus = '\n🔔 Webhook monitoring registered - you\'ll receive notifications when the agent completes.';
                                console.log(`Webhook monitoring registered for agent ${result.id} with URL: ${webhookUrl}`);
                            } catch (error) {
                                console.error('Failed to register webhook monitoring:', error);
                                webhookStatus = '\n⚠️ Agent created but webhook registration failed - you may not receive completion notifications.';
                            }
                        }

                        return {
                            content: [{
                                type: "text",
                                text: `✅ Background agent created successfully!\n\n` +
                                    `🤖 Agent ID: ${result.id}\n` +
                                    `📁 Repository: ${repository}\n` +
                                    `🌿 Branch: ${ref}\n` +
                                    `🧠 Model: ${model || 'default'}\n` +
                                    `📝 Auto-create PR: ${autoCreatePr ? 'Yes' : 'No'}\n` +
                                    `🔔 Webhook URL: ${webhookUrl || 'None'}\n` +
                                    (originalEmailId ? `📧 Email Reply ID: ${originalEmailId}\n` : '') +
                                    `\n⚠️ The agent is now working asynchronously in the background. It will analyze your repository and implement the requested changes. ` +
                                    `${autoCreatePr ? 'A Pull Request will be automatically created when the work is complete.' : 'You will need to manually create a PR from the generated branch.'}` +
                                    webhookStatus + 
                                    `\n\nUse 'get_cursor_agent' with ID '${result.id}' to check progress.`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error creating Cursor agent: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "list_cursor_agents",
                "List all Cursor background agents for your account, showing their current status and progress",
                {
                    status: z.enum(["all", "running", "finished", "error"]).optional().default("all").describe("Filter agents by status"),
                    limit: z.number().optional().default(20).describe("Maximum number of agents to return (1-100)"),
                },
                async ({ status, limit }) => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch(`https://api.cursor.com/v0/agents?limit=${Math.min(limit || 20, 100)}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch agents: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const data: CursorAgentListResponse = await response.json();
                        const agents: CursorAgent[] = data.agents || [];

                        // Filter by status if specified
                        const filteredAgents = status === "all"
                            ? agents
                            : agents.filter(agent => agent.status.toLowerCase() === status.toLowerCase());

                        if (filteredAgents.length === 0) {
                            return {
                                content: [{
                                    type: "text",
                                    text: status === "all"
                                        ? "📭 No agents found."
                                        : `📭 No agents found with status: ${status}`
                                }],
                            };
                        }

                        const agentList = filteredAgents.map(agent => {
                            const statusIcon = agent.status === 'RUNNING' ? '🔄' :
                                agent.status === 'FINISHED' ? '✅' :
                                    agent.status === 'ERROR' ? '❌' : '⏸️';

                            return `${statusIcon} **${agent.id}**\n` +
                                `   Status: ${agent.status}\n` +
                                `   Repository: ${agent.source.repository}\n` +
                                `   Branch: ${agent.source.ref}\n` +
                                `   Created: ${new Date(agent.createdAt).toLocaleString()}\n` +
                                `   Updated: ${new Date(agent.updatedAt).toLocaleString()}` +
                                (agent.summary ? `\n   Summary: ${agent.summary}` : '') +
                                (agent.target.prUrl ? `\n   🔗 PR: ${agent.target.prUrl}` : '');
                        }).join('\n\n');

                        return {
                            content: [{
                                type: "text",
                                text: `📋 **Cursor Background Agents** (${filteredAgents.length} of ${agents.length} total)${data.nextCursor ? '\n\n➡️ More results available (use pagination in future versions)' : ''}:\n\n${agentList}`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching agents: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "get_cursor_agent",
                "Get detailed status and progress information for a specific Cursor background agent",
                {
                    agentId: z.string().describe("The ID of the agent to query"),
                },
                async ({ agentId }) => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            if (response.status === 404) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `❌ Agent '${agentId}' not found. It may have been deleted or you may not have access to it.`
                                    }],
                                };
                            }
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch agent: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const agent: CursorAgent = await response.json();

                        const statusIcon = agent.status === 'RUNNING' ? '🔄' :
                            agent.status === 'FINISHED' ? '✅' :
                                agent.status === 'ERROR' ? '❌' : '⏸️';

                        const details = `${statusIcon} **Agent: ${agent.name || agent.id}**\n\n` +
                            `🆔 **ID:** ${agent.id}\n` +
                            `📊 **Status:** ${agent.status}\n` +
                            `📁 **Repository:** ${agent.source.repository}\n` +
                            `🌿 **Branch:** ${agent.source.ref}\n` +
                            `🕐 **Created:** ${new Date(agent.createdAt).toLocaleString()}\n` +
                            `📝 **Auto-create PR:** ${agent.target.autoCreatePr ? 'Yes' : 'No'}\n` +
                            (agent.target.branchName ? `🌿 **Target Branch:** ${agent.target.branchName}\n` : '') +
                            (agent.target.url ? `🔗 **View in Cursor:** ${agent.target.url}\n` : '') +
                            (agent.target.prUrl ? `🔗 **Pull Request:** ${agent.target.prUrl}\n` : '') +
                            (agent.summary ? `\n📋 **Summary:**\n${agent.summary}` : '');

                        let statusMessage = '';
                        if (agent.status === 'RUNNING') {
                            statusMessage = '\n\n⏳ This agent is currently working on your repository. Check back later for updates.';
                        } else if (agent.status === 'FINISHED') {
                            statusMessage = '\n\n🎉 This agent has completed its work successfully!';
                        } else if (agent.status === 'ERROR') {
                            statusMessage = '\n\n⚠️ This agent encountered an error and stopped.';
                        }

                        return {
                            content: [{
                                type: "text",
                                text: details + statusMessage
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching agent details: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "delete_cursor_agent",
                "⚠️ DESTRUCTIVE: Stop and delete a Cursor background agent. This will terminate any work in progress and cannot be undone.",
                {
                    agentId: z.string().describe("The ID of the agent to delete"),
                    confirm: z.boolean().describe("Confirmation that you want to delete the agent (must be true)"),
                },
                async ({ agentId, confirm }) => {
                    if (!confirm) {
                        return {
                            content: [{
                                type: "text",
                                text: "❌ Agent deletion cancelled. Set 'confirm' to true to proceed with deletion."
                            }],
                        };
                    }

                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            if (response.status === 404) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `❌ Agent '${agentId}' not found. It may have already been deleted.`
                                    }],
                                };
                            }
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to delete agent: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        return {
                            content: [{
                                type: "text",
                                text: `✅ Agent '${agentId}' has been successfully deleted and stopped.`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error deleting agent: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "get_agent_conversation",
                "Retrieve the conversation history of a background agent to see all messages and interactions",
                {
                    agentId: z.string().describe("The ID of the agent to get conversation history for"),
                },
                async ({ agentId }) => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}/conversation`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            if (response.status === 404) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `❌ Agent '${agentId}' not found or no conversation available.`
                                    }],
                                };
                            }
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch conversation: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const conversationData: CursorConversationResponse = await response.json();
                        
                        if (conversationData.messages.length === 0) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `💬 **Agent ${agentId} Conversation**\n\nNo messages in conversation yet.`
                                }],
                            };
                        }

                        const messageList = conversationData.messages.map((message, index) => {
                            const messageIcon = message.type === 'user_message' ? '👤' : '🤖';
                            const messageType = message.type === 'user_message' ? 'User' : 'Agent';
                            return `${messageIcon} **${messageType} (#${index + 1}):**\n${message.text}`;
                        }).join('\n\n---\n\n');

                        return {
                            content: [{
                                type: "text",
                                text: `💬 **Agent ${agentId} Conversation** (${conversationData.messages.length} messages):\n\n${messageList}`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "add_agent_followup",
                "Send additional instructions to a running background agent to modify or extend its current task",
                {
                    agentId: z.string().describe("The ID of the agent to send follow-up instructions to"),
                    followupText: z.string().describe("Additional instructions or modifications for the agent"),
                },
                async ({ agentId, followupText }) => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch(`https://api.cursor.com/v0/agents/${agentId}/followup`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                prompt: {
                                    text: followupText
                                }
                            })
                        });

                        if (!response.ok) {
                            if (response.status === 404) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `❌ Agent '${agentId}' not found. It may have been deleted or completed.`
                                    }],
                                };
                            }
                            if (response.status === 409) {
                                return {
                                    content: [{
                                        type: "text",
                                        text: `❌ Cannot send follow-up to agent '${agentId}' - it may be deleted or archived.`
                                    }],
                                };
                            }
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to send follow-up: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const result = await response.json();

                        return {
                            content: [{
                                type: "text",
                                text: `✅ Follow-up instructions sent successfully to agent '${result.id}'!\n\n📝 **Instructions:** ${followupText}\n\n⏳ The agent will incorporate these additional instructions into its current work.`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error sending follow-up: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "get_api_key_info",
                "Get information about your Cursor API key including creation date and associated email",
                {},
                async () => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch('https://api.cursor.com/v0/me', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch API key info: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const keyInfo: CursorApiKeyInfo = await response.json();

                        return {
                            content: [{
                                type: "text",
                                text: `🔑 **API Key Information:**\n\n` +
                                    `📛 **Name:** ${keyInfo.apiKeyName}\n` +
                                    `📅 **Created:** ${new Date(keyInfo.createdAt).toLocaleString()}\n` +
                                    (keyInfo.userEmail ? `📧 **Email:** ${keyInfo.userEmail}\n` : '') +
                                    `\n✅ API key is valid and active.`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching API key info: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "list_available_models",
                "Get a list of AI models available for background agents",
                {},
                async () => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch('https://api.cursor.com/v0/models', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch models: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const modelsData: CursorModel = await response.json();

                        const modelList = modelsData.models.map((model, index) => 
                            `${index + 1}. **${model}**`
                        ).join('\n');

                        return {
                            content: [{
                                type: "text",
                                text: `🧠 **Available Models** (${modelsData.models.length} total):\n\n${modelList}`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching models: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );

            server.tool(
                "list_github_repositories",
                "Get a list of GitHub repositories you have access to for background agents",
                {},
                async () => {
                    try {
                        const apiKey = await getCursorApiKey(session.userId);
                        if (!apiKey) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "❌ No Cursor API key found. Please configure a Cursor API key in your account settings."
                                }],
                            };
                        }

                        const response = await fetch('https://api.cursor.com/v0/repositories', {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });

                        if (!response.ok) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `❌ Failed to fetch repositories: ${response.status} ${response.statusText}`
                                }],
                            };
                        }

                        const reposData: { repositories: CursorRepository[] } = await response.json();

                        if (reposData.repositories.length === 0) {
                            return {
                                content: [{
                                    type: "text",
                                    text: "📁 No GitHub repositories found. Make sure you have connected your GitHub account to Cursor."
                                }],
                            };
                        }

                        const repoList = reposData.repositories.map((repo, index) => 
                            `${index + 1}. **${repo.owner}/${repo.name}**\n   🔗 ${repo.repository}`
                        ).join('\n\n');

                        return {
                            content: [{
                                type: "text",
                                text: `📁 **Available GitHub Repositories** (${reposData.repositories.length} total):\n\n${repoList}`
                            }],
                        };
                    } catch (error) {
                        return {
                            content: [{
                                type: "text",
                                text: `❌ Error fetching repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
                            }],
                        };
                    }
                },
            );
        },
        {
            capabilities: {
                tools: {
                    create_cursor_agent: {
                        description: "⚠️ CREATES BACKGROUND AGENT: Start an autonomous AI coding agent that works asynchronously and creates PRs",
                    },
                    list_cursor_agents: {
                        description: "List all your Cursor background agents and their status",
                    },
                    get_cursor_agent: {
                        description: "Get detailed status and progress for a specific agent",
                    },
                    delete_cursor_agent: {
                        description: "⚠️ DESTRUCTIVE: Stop and delete a background agent permanently",
                    },
                    get_agent_conversation: {
                        description: "View the complete conversation history of a background agent",
                    },
                    add_agent_followup: {
                        description: "Send additional instructions to a running agent to modify its task",
                    },
                    get_api_key_info: {
                        description: "Get information about your Cursor API key",
                    },
                    list_available_models: {
                        description: "List all AI models available for background agents",
                    },
                    list_github_repositories: {
                        description: "List GitHub repositories you have access to",
                    },
                },
            },
        },
        {
            basePath: "/api",
            verboseLogs: true,
            maxDuration: 60,
            redisUrl: process.env.REDIS_URL || "",
        },
    )(req);
});

export { handler as GET, handler as POST, handler as DELETE };