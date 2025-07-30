// Slack API helper functions
// These functions require a valid Slack access token from the authenticated user

interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_member: boolean;
  num_members?: number;
}

interface SlackMessage {
  type: string;
  ts: string;
  user: string;
  text: string;
  team?: string;
  attachments?: any[];
  blocks?: any[];
}

interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  real_name: string;
  tz: string;
  profile: {
    title: string;
    phone: string;
    skype: string;
    real_name: string;
    display_name: string;
    status_text: string;
    status_emoji: string;
    email?: string;
    image_24: string;
    image_32: string;
    image_48: string;
    image_72: string;
    image_192: string;
    image_512: string;
  };
}

export class SlackAPI {
  private accessToken: string;
  private baseURL = 'https://slack.com/api';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API Error: ${data.error}`);
    }

    return data;
  }

  // List all channels the user has access to
  async listChannels(): Promise<SlackChannel[]> {
    let allChannels: SlackChannel[] = [];
    let cursor: string | undefined;
    
    do {
      // Fetch all types of conversations (public channels, private channels, DMs, etc.)
      const params = new URLSearchParams({
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
        limit: '200' // Optimal limit as per Slack documentation
      });

      // Add cursor for pagination if we have one
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await this.makeRequest(`conversations.list?${params}`, {
        method: 'GET',
      });

      // Add channels from this page to our collection
      if (response.channels) {
        allChannels.push(...response.channels);
      }

      // Get cursor for next page
      cursor = response.response_metadata?.next_cursor;
      
      // Continue if cursor is not empty string and exists
    } while (cursor && cursor !== '');

    return allChannels;
  }

  // Get messages from a channel
  async getChannelHistory(channelId: string, limit: number = 100): Promise<SlackMessage[]> {
    const response = await this.makeRequest('conversations.history', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
        limit,
      }),
    });

    return response.messages || [];
  }

  // Send a message to a channel
  async sendMessage(channelId: string, text: string): Promise<any> {
    const response = await this.makeRequest('chat.postMessage', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
        text,
      }),
    });

    return response;
  }

  // Get user information
  async getUserInfo(userId: string): Promise<SlackUser> {
    const response = await this.makeRequest('users.info', {
      method: 'POST',
      body: JSON.stringify({
        user: userId,
      }),
    });

    return response.user;
  }

  // Get current user's information
  async getCurrentUser(): Promise<SlackUser> {
    const response = await this.makeRequest('users.identity', {
      method: 'GET',
    });

    return response.user;
  }

  // Join a channel
  async joinChannel(channelId: string): Promise<any> {
    const response = await this.makeRequest('conversations.join', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
      }),
    });

    return response;
  }

  // Leave a channel
  async leaveChannel(channelId: string): Promise<any> {
    const response = await this.makeRequest('conversations.leave', {
      method: 'POST',
      body: JSON.stringify({
        channel: channelId,
      }),
    });

    return response;
  }

  // Get team/workspace information
  async getTeamInfo(): Promise<any> {
    const response = await this.makeRequest('team.info', {
      method: 'GET',
    });

    return response.team;
  }
}

// Helper function to create a Slack API client from a session
export function createSlackClient(accessToken: string): SlackAPI {
  return new SlackAPI(accessToken);
} 