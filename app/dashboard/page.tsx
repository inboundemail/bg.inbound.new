"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface SlackConnection {
  id: string;
  slackTeamId: string;
  slackUserId: string;
  slackTeamName?: string;
  slackUserName?: string;
  tokenType: string;
  scope: string;
  selectedChannelId?: string;
  selectedChannelName?: string;
  webhookId?: string;
  webhookUrl?: string;
  webhookActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount: number;
  isArchived: boolean;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [slackConnections, setSlackConnections] = useState<SlackConnection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectingToSlack, setConnectingToSlack] = useState(false);
  const [browsingChannels, setBrowsingChannels] = useState<string | null>(null); // connectionId being browsed
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [generatingWebhook, setGeneratingWebhook] = useState<string | null>(null);
  const [deletingWebhook, setDeletingWebhook] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session) {
      loadSlackConnections();
    }
  }, [session]);

  useEffect(() => {
    // Check for success/error parameters
    const slackConnected = searchParams.get('slack_connected');
    const error = searchParams.get('error');

    if (slackConnected === 'true') {
      // Refresh connections list
      loadSlackConnections();
      // Clean URL
      router.replace('/dashboard');
    }

    if (error) {
      console.error('Slack connection error:', error);
      // You could show a toast or alert here
    }
  }, [searchParams, router]);

  const loadSlackConnections = async () => {
    try {
      const response = await fetch('/api/slack/connections');
      if (response.ok) {
        const data = await response.json();
        setSlackConnections(data.connections);
      }
    } catch (error) {
      console.error('Failed to load Slack connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleConnectSlack = async () => {
    setConnectingToSlack(true);
    try {
      const response = await fetch('/api/slack/oauth');
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.authUrl;
      } else {
        console.error('Failed to initiate Slack OAuth');
      }
    } catch (error) {
      console.error('Slack OAuth error:', error);
    } finally {
      setConnectingToSlack(false);
    }
  };

  const handleDisconnectSlack = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/slack/connections?id=${connectionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadSlackConnections();
      }
    } catch (error) {
      console.error('Failed to disconnect Slack:', error);
    }
  };

  const loadChannels = async (connection: SlackConnection) => {
    setBrowsingChannels(connection.id);
    setLoadingChannels(true);
    try {
      const response = await fetch(`/api/slack/channels?teamId=${connection.slackTeamId}`);
      if (response.ok) {
        const data = await response.json();
        setChannels(data.channels);
      } else {
        console.error('Failed to load channels');
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoadingChannels(false);
    }
  };

  const saveSelectedChannel = async (connectionId: string, channel: SlackChannel) => {
    try {
      const response = await fetch('/api/slack/connections', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          connectionId,
          channelId: channel.id,
          channelName: channel.name,
        }),
      });
      if (response.ok) {
        await loadSlackConnections();
        setBrowsingChannels(null);
        setChannels([]);
      }
    } catch (error) {
      console.error('Failed to save selected channel:', error);
    }
  };

  const generateWebhook = async (connectionId: string) => {
    setGeneratingWebhook(connectionId);
    try {
      const response = await fetch('/api/slack/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ connectionId }),
      });
      if (response.ok) {
        await loadSlackConnections();
      } else {
        console.error('Failed to generate webhook');
      }
    } catch (error) {
      console.error('Failed to generate webhook:', error);
    } finally {
      setGeneratingWebhook(null);
    }
  };

  const deleteWebhook = async (connectionId: string) => {
    setDeletingWebhook(connectionId);
    try {
      const response = await fetch(`/api/slack/webhook?connectionId=${connectionId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        await loadSlackConnections();
      } else {
        console.error('Failed to delete webhook');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    } finally {
      setDeletingWebhook(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
      console.log('Copied to clipboard:', text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/signin");
  };

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">

      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Dashboard of {session.user.name}</h1>
        </div>
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome to your Dashboard</CardTitle>
            <CardDescription>Manage your account and Slack connections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Email:</p>
                <p className="text-sm text-gray-600">{session.user.email}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Member Since:</p>
                <p className="text-sm text-gray-600">
                  {new Date(session.user.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Slack Connections Card */}
        <Card>
          <CardHeader>
            <CardTitle>Slack Connections</CardTitle>
            <CardDescription>
              Connect your Slack workspaces to enable channel reading and message posting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingConnections ? (
              <p className="text-sm text-gray-600">Loading connections...</p>
            ) : slackConnections.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Slack workspaces connected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by connecting your first Slack workspace.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slackConnections.map((connection) => (
                  <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-8 w-8 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {connection.slackTeamName || 'Slack Workspace'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Connected as {connection.slackUserName || 'User'}
                        </p>
                        {connection.selectedChannelName ? (
                          <p className="text-xs text-green-600 font-medium">
                            📁 #{connection.selectedChannelName}
                          </p>
                        ) : (
                          <p className="text-xs text-amber-600">
                            ⚠️ No channel selected
                          </p>
                        )}
                        {connection.webhookActive && connection.webhookUrl ? (
                          <p className="text-xs text-blue-600 font-medium">
                            🔗 Webhook Active
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400">
                            📭 No webhook configured
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Connected
                      </span>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => loadChannels(connection)}
                        disabled={loadingChannels && browsingChannels === connection.id}
                      >
                        {loadingChannels && browsingChannels === connection.id ? "Loading..." : "Browse Channels"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnectSlack(connection.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
                        )}

            {/* Channel Browser */}
            {browsingChannels && (
              <Card className="mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Select Channel</CardTitle>
                      <CardDescription>
                        Choose a channel for this workspace
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBrowsingChannels(null);
                        setChannels([]);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingChannels ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">Loading channels...</p>
                    </div>
                  ) : channels.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">No channels found</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {channels.map((channel) => (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {channel.isPrivate ? (
                                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                </svg>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                #{channel.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {channel.isPrivate ? 'Private' : 'Public'} • {channel.memberCount} members
                                {!channel.isMember && <span className="text-amber-600"> • Not a member</span>}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => saveSelectedChannel(browsingChannels, channel)}
                            disabled={!channel.isMember}
                          >
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Webhook Management Section */}
            {slackConnections.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Webhook Management</h3>
                <p className="text-sm text-gray-600">
                  Generate webhook URLs to receive emails from Inbound and forward them to your selected Slack channels.
                </p>
                
                {slackConnections.map((connection) => (
                  <Card key={`webhook-${connection.id}`} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{connection.slackTeamName || 'Slack Workspace'}</h4>
                          <p className="text-sm text-gray-500">
                            {connection.selectedChannelName ? `#${connection.selectedChannelName}` : 'No channel selected'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {connection.webhookActive && connection.webhookUrl ? (
                            <>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteWebhook(connection.id)}
                                disabled={deletingWebhook === connection.id}
                              >
                                {deletingWebhook === connection.id ? "Deleting..." : "Delete Webhook"}
                              </Button>
                            </>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => generateWebhook(connection.id)}
                              disabled={!connection.selectedChannelId || generatingWebhook === connection.id}
                            >
                              {generatingWebhook === connection.id ? "Generating..." : "Generate Webhook"}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {connection.webhookActive && connection.webhookUrl && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700">Webhook URL:</p>
                              <code className="text-xs bg-white px-2 py-1 rounded border break-all">
                                {connection.webhookUrl}
                              </code>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(connection.webhookUrl!)}
                              className="ml-2 flex-shrink-0"
                            >
                              📋 Copy
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Use this URL in your Inbound email service to receive webhooks. 
                            Emails will be forwarded to #{connection.selectedChannelName}.
                          </p>
                        </div>
                      )}
                      
                      {!connection.selectedChannelId && (
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                          <p className="text-sm text-amber-800">
                            ⚠️ Please select a Slack channel first before generating a webhook.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            <Button
              onClick={handleConnectSlack}
              disabled={connectingToSlack}
              className="w-full"
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
              </svg>
              {connectingToSlack ? "Connecting..." : "Connect Slack Workspace"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 