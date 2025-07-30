import { Inbound } from '@inboundemail/sdk'

if (!process.env.INBOUND_API_KEY) {
  throw new Error('INBOUND_API_KEY environment variable is required')
}

const inbound = new Inbound({
  apiKey: process.env.INBOUND_API_KEY,
})

interface CreateEmailAgentParams {
  name: string;
  webhookUrl: string;
  agentId: string;
}

interface EmailAgentResult {
  endpointId: string;
  emailAddressId: string;
  emailAddress: string;
}

export async function createEmailAgent(params: CreateEmailAgentParams): Promise<EmailAgentResult> {
  try {
    // First, create an endpoint that points to our webhook URL
    let endpoint;
    try {
      endpoint = await inbound.endpoints.create({
        name: `Email Agent: ${params.name}`,
        type: 'webhook',
        config: {
          url: params.webhookUrl,
          timeout: 10,
          retryAttempts: 3,
        }
      });
      console.log('Successfully created endpoint:', endpoint.id);
    } catch (error) {
      console.error('Error creating endpoint:', error);
      throw error;
    }

    

    // Then create the email address using the name
    const emailAddress = await inbound.emailAddresses.create({
      address: `${params.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}@bg.inbound.new`,
      domainId: process.env.INBOUND_DOMAIN_ID!, // You'll need to set this
      endpointId: endpoint.id,
      isActive: true
    });

    return {
      endpointId: endpoint.id,
      emailAddressId: emailAddress.id,
      emailAddress: emailAddress.address
    };
  } catch (error) {
    console.error('Error creating email agent:', error);
    throw new Error(`Failed to create email agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteEmailAgent(endpointId: string, emailAddressId: string): Promise<void> {
  try {
    // Delete the email address first
    if (emailAddressId) {
      await inbound.emailAddresses.delete(emailAddressId);
    }
    
    // Then delete the endpoint
    if (endpointId) {
      await inbound.endpoints.delete(endpointId);
    }
  } catch (error) {
    console.error('Error deleting email agent:', error);
    // Don't throw here - we want to clean up our database even if InboundEmail cleanup fails
  }
}

export async function updateEmailAgentStatus(emailAddressId: string, isActive: boolean): Promise<void> {
  try {
    if (emailAddressId) {
      await inbound.emailAddresses.update(emailAddressId, {
        isActive
      });
    }
  } catch (error) {
    console.error('Error updating email agent status:', error);
    throw new Error(`Failed to update email agent status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export { inbound };