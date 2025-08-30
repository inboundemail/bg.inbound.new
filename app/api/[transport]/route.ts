import { auth } from "@/lib/auth";
import { createMcpHandler } from "@vercel/mcp-adapter";
import { withMcpAuth } from "better-auth/plugins";
import { z } from "zod";
import { db } from "@/lib/db";
import { user, emailAgent, session } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Cursor API interfaces
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
    status: string;
    createdAt: string;
    updatedAt: string;
    source: {
        repository: string;
        ref: string;
    };
    target: {
        autoCreatePr: boolean;
        branchName?: string;
        prUrl?: string;
    };
    summary?: string;
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
                },
                async ({ prompt, repository, ref, model, autoCreatePr }) => {
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

                        return {
                            content: [{
                                type: "text",
                                text: `✅ Background agent created successfully!\n\n` +
                                    `🤖 Agent ID: ${result.id}\n` +
                                    `📁 Repository: ${repository}\n` +
                                    `🌿 Branch: ${ref}\n` +
                                    `🧠 Model: ${model}\n` +
                                    `📝 Auto-create PR: ${autoCreatePr ? 'Yes' : 'No'}\n\n` +
                                    `⚠️ The agent is now working asynchronously in the background. It will analyze your repository and implement the requested changes. ` +
                                    `${autoCreatePr ? 'A Pull Request will be automatically created when the work is complete.' : 'You will need to manually create a PR from the generated branch.'}\n\n` +
                                    `Use 'get_cursor_agent' with ID '${result.id}' to check progress.`
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

                        const data = await response.json();
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
                                text: `📋 **Cursor Background Agents** (${filteredAgents.length} of ${agents.length} total):\n\n${agentList}`
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

                        const details = `${statusIcon} **Agent: ${agent.id}**\n\n` +
                            `📊 **Status:** ${agent.status}\n` +
                            `📁 **Repository:** ${agent.source.repository}\n` +
                            `🌿 **Branch:** ${agent.source.ref}\n` +
                            `🕐 **Created:** ${new Date(agent.createdAt).toLocaleString()}\n` +
                            `🕐 **Last Updated:** ${new Date(agent.updatedAt).toLocaleString()}\n` +
                            `📝 **Auto-create PR:** ${agent.target.autoCreatePr ? 'Yes' : 'No'}\n` +
                            (agent.target.branchName ? `🌿 **Target Branch:** ${agent.target.branchName}\n` : '') +
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