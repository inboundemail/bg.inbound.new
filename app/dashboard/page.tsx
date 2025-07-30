"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface EmailAgent {
  id: string;
  name: string;
  githubRepository: string;
  githubRef: string;
  model: string;
  autoCreatePr: boolean;
  isActive: boolean;
  emailAddress: string;
  allowedDomains: string | null;
  allowedEmails: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentLog {
  id: string;
  emailAgentId: string;
  senderEmail: string;
  emailSubject: string | null;
  cursorAgentId: string | null;
  status: 'success' | 'failed' | 'rejected';
  errorMessage: string | null;
  createdAt: string;
  agentName: string | null;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [emailAgents, setEmailAgents] = useState<EmailAgent[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [hasDefaultKey, setHasDefaultKey] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [defaultKeyInput, setDefaultKeyInput] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    githubRepository: '',
    githubRef: 'main',
    cursorApiKey: '',
    model: 'claude-4-sonnet-thinking',
    autoCreatePr: false,
    allowedDomains: '',
    allowedEmails: ''
  });

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/signin");
    } else if (session) {
      fetchEmailAgents();
      fetchAgentLogs();
      checkDefaultKey();
    }
  }, [session, isPending, router]);

  const fetchEmailAgents = async () => {
    try {
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setEmailAgents(data.agents);
      }
    } catch (error) {
      console.error('Error fetching email agents:', error);
    }
  };

  const fetchAgentLogs = async () => {
    try {
      const response = await fetch('/api/agent-logs?limit=20');
      if (response.ok) {
        const data = await response.json();
        setAgentLogs(data.logs);
      }
    } catch (error) {
      console.error('Error fetching agent logs:', error);
    }
  };

  const checkDefaultKey = async () => {
    try {
      const response = await fetch('/api/user/cursor-key');
      if (response.ok) {
        const data = await response.json();
        setHasDefaultKey(data.hasKey);
      }
    } catch (error) {
      console.error('Error checking default key:', error);
    }
  };

  const handleCreateEmailAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Process form data to convert comma-separated strings to arrays
      const processedData = {
        ...formData,
        allowedDomains: formData.allowedDomains 
          ? formData.allowedDomains.split(',').map(d => d.trim()).filter(d => d.length > 0)
          : [],
        allowedEmails: formData.allowedEmails 
          ? formData.allowedEmails.split(',').map(e => e.trim()).filter(e => e.length > 0)
          : []
      };

      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(processedData),
      });

      if (response.ok) {
        setShowCreateForm(false);
        setFormData({
          name: '',
          githubRepository: '',
          githubRef: 'main',
          cursorApiKey: '',
          model: 'claude-4-sonnet-thinking',
          autoCreatePr: false,
          allowedDomains: '',
          allowedEmails: ''
        });
        fetchEmailAgents();
        fetchAgentLogs();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating email agent:', error);
      alert('Error creating email agent');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleEmailAgentStatus = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (response.ok) {
        fetchEmailAgents();
      }
    } catch (error) {
      console.error('Error toggling email agent status:', error);
    }
  };

  const deleteEmailAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email agent? This will also delete the associated email address.')) {
      return;
    }

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEmailAgents();
      }
    } catch (error) {
      console.error('Error deleting email agent:', error);
    }
  };

  const copyEmailAddress = async (emailAddress: string) => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      alert('Email address copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = emailAddress;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Email address copied to clipboard!');
    }
  };

  const handleSaveDefaultKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/user/cursor-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cursorApiKey: defaultKeyInput }),
      });

      if (response.ok) {
        setHasDefaultKey(true);
        setShowKeyForm(false);
        setDefaultKeyInput('');
        alert('Default Cursor API key saved successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving default key:', error);
      alert('Error saving default Cursor API key');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDefaultKey = async () => {
    if (!confirm('Are you sure you want to remove your default Cursor API key?')) {
      return;
    }

    try {
      const response = await fetch('/api/user/cursor-key', {
        method: 'DELETE',
      });

      if (response.ok) {
        setHasDefaultKey(false);
        alert('Default Cursor API key removed successfully!');
      }
    } catch (error) {
      console.error('Error removing default key:', error);
      alert('Error removing default Cursor API key');
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-4">
              <img src="/inbound-logo-3.png" alt="bg by inbound" className="h-16 w-16 rounded-xl" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">bg by inbound</h1>
                <p className="text-gray-600">Welcome, {session.user.name}!</p>
              </div>
            </div>
            <Button onClick={() => signOut()} variant="outline">
              Sign Out
            </Button>
          </div>
          <p className="text-center text-gray-600">Manage your email agents that convert emails into code changes.</p>
        </div>
        
        <div className="grid gap-6">
          {/* User Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Your Account</CardTitle>
              <CardDescription>Manage your account information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Email:</p>
                  <p className="text-sm text-gray-600">{session.user.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Member Since:</p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* Default Cursor API Key Section */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Default Cursor API Key</p>
                    <p className="text-xs text-gray-500">
                      {hasDefaultKey ? 'Set as default for all new agents' : 'Not configured'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {hasDefaultKey ? (
                      <>
                        <Button
                          onClick={() => setShowKeyForm(!showKeyForm)}
                          variant="outline"
                          size="sm"
                        >
                          Update
                        </Button>
                        <Button
                          onClick={handleRemoveDefaultKey}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setShowKeyForm(!showKeyForm)}
                        variant="outline"
                        size="sm"
                      >
                        Set Default
                      </Button>
                    )}
                  </div>
                </div>

                {showKeyForm && (
                  <form onSubmit={handleSaveDefaultKey} className="space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="defaultKey">Cursor API Key</Label>
                      <Input
                        id="defaultKey"
                        type="password"
                        value={defaultKeyInput}
                        onChange={(e) => setDefaultKeyInput(e.target.value)}
                        placeholder="Enter your Cursor API key"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        This will be used as the default for all new email agents.{' '}
                        <a href="https://cursor.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          Get your API key
                        </a>
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" disabled={isLoading} size="sm">
                        {isLoading ? 'Saving...' : 'Save Key'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowKeyForm(false);
                          setDefaultKeyInput('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  className="w-full"
                >
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>



          {/* Email Agents */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Your Email Agents</CardTitle>
                <CardDescription>
                  Create email agents that automatically generate code from emails
                </CardDescription>
              </div>
              <Button onClick={() => setShowCreateForm(!showCreateForm)}>
                {showCreateForm ? 'Cancel' : 'Create Email Agent'}
              </Button>
            </CardHeader>
            <CardContent>
              {/* Create Form */}
              {showCreateForm && (
                <form onSubmit={handleCreateEmailAgent} className="space-y-4 mb-6 p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Agent Name</Label>
                      <Input
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="support-bot"
                        required
                      />
                      <p className="text-xs text-gray-500">
                        Will create email: <code>{formData.name || 'your-name'}@bg.inbound.new</code>
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="githubRepository">GitHub Repository</Label>
                      <Input
                        id="githubRepository"
                        type="url"
                        value={formData.githubRepository}
                        onChange={(e) => setFormData({ ...formData, githubRepository: e.target.value })}
                        placeholder="https://github.com/username/repo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="githubRef">Branch/Ref</Label>
                      <Input
                        id="githubRef"
                        type="text"
                        value={formData.githubRef}
                        onChange={(e) => setFormData({ ...formData, githubRef: e.target.value })}
                        placeholder="main"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">AI Model</Label>
                      <select
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="claude-4-sonnet-thinking">Claude 4 Sonnet (Thinking)</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cursorApiKey">
                      Cursor API Key {hasDefaultKey && <span className="text-gray-500">(optional)</span>}
                    </Label>
                    <Input
                      id="cursorApiKey"
                      type="password"
                      value={formData.cursorApiKey}
                      onChange={(e) => setFormData({ ...formData, cursorApiKey: e.target.value })}
                      placeholder={hasDefaultKey ? "Leave blank to use account default" : "Your Cursor API key"}
                      required={!hasDefaultKey}
                    />
                    <p className="text-xs text-gray-500">
                      {hasDefaultKey ? (
                        'Leave blank to use your account default, or enter a specific key for this agent'
                      ) : (
                        <>
                          Get your API key from{' '}
                          <a href="https://cursor.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Cursor Dashboard
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="allowedDomains">Allowed Domains (optional)</Label>
                      <Input
                        id="allowedDomains"
                        type="text"
                        value={formData.allowedDomains}
                        onChange={(e) => setFormData({ ...formData, allowedDomains: e.target.value })}
                        placeholder="@company.com, @gmail.com"
                      />
                      <p className="text-xs text-gray-500">
                        Comma-separated domains. Leave blank to allow all.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allowedEmails">Allowed Emails (optional)</Label>
                      <Input
                        id="allowedEmails"
                        type="text"
                        value={formData.allowedEmails}
                        onChange={(e) => setFormData({ ...formData, allowedEmails: e.target.value })}
                        placeholder="user@company.com, admin@site.com"
                      />
                      <p className="text-xs text-gray-500">
                        Comma-separated specific email addresses.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      id="autoCreatePr"
                      type="checkbox"
                      checked={formData.autoCreatePr}
                      onChange={(e) => setFormData({ ...formData, autoCreatePr: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="autoCreatePr">Auto-create Pull Requests</Label>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Creating Email Agent...' : 'Create Email Agent'}
                  </Button>
                </form>
              )}

              {/* Email Agents List */}
              <div className="space-y-4">
                {emailAgents.map((agent) => (
                  <div key={agent.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        <Button
                          onClick={() => toggleEmailAgentStatus(agent.id, agent.isActive)}
                          variant="outline"
                          size="sm"
                        >
                          {agent.isActive ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          onClick={() => deleteEmailAgent(agent.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="font-mono text-blue-600 break-all">
                        {agent.emailAddress}
                      </div>
                      <Button 
                        onClick={() => copyEmailAddress(agent.emailAddress)} 
                        variant="outline" 
                        size="sm"
                      >
                        Copy
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>{agent.githubRepository.replace('https://github.com/', '')}</span>
                      <span>•</span>
                      <span>{agent.githubRef}</span>
                      <span>•</span>
                      <span>{agent.model}</span>
                      {agent.autoCreatePr && (
                        <>
                          <span>•</span>
                          <span>Auto PR</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {emailAgents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No email agents yet.</p>
                    <p>Create your first email agent to start converting emails to code!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agent Launch Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Launch Log</CardTitle>
              <CardDescription>Recent attempts to launch Cursor agents from emails</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {agentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-green-500' : 
                          log.status === 'rejected' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        <span className="font-medium text-sm">{log.agentName || 'Unknown Agent'}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{log.senderEmail}</span>
                      </div>
                      {log.emailSubject && (
                        <p className="text-sm text-gray-600 mb-1">{log.emailSubject}</p>
                      )}
                      {log.errorMessage && (
                        <p className="text-xs text-red-600">{log.errorMessage}</p>
                      )}
                      {log.cursorAgentId && (
                        <p className="text-xs text-blue-600">Agent ID: {log.cursorAgentId}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' : 
                        log.status === 'rejected' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {agentLogs.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No agent launches yet.</p>
                    <p>Send an email to one of your agents to see logs here!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 