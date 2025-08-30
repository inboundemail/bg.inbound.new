#!/usr/bin/env node

// Test script to verify Cursor API integration
// Usage: node test-cursor-api.js <api-key> <github-repo-url>

const apiKey = process.argv[2];
const repository = process.argv[3] || 'https://github.com/test/test-repo';

if (!apiKey) {
  console.error('Usage: node test-cursor-api.js <api-key> [github-repo-url]');
  console.error('Example: node test-cursor-api.js your-api-key https://github.com/user/repo');
  process.exit(1);
}

async function testCursorAPI() {
  console.log('Testing Cursor API integration...\n');
  
  // Test 1: List agents
  console.log('1. Testing LIST agents endpoint...');
  try {
    const listResponse = await fetch('https://api.cursor.com/v0/agents?limit=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   Status: ${listResponse.status} ${listResponse.statusText}`);
    
    if (listResponse.ok) {
      const data = await listResponse.json();
      console.log(`   ✅ Success! Found ${data.agents?.length || 0} agents`);
      if (data.agents?.length > 0) {
        console.log(`   First agent: ${data.agents[0].id} - ${data.agents[0].status}`);
      }
    } else {
      const error = await listResponse.text();
      console.log(`   ❌ Error: ${error}`);
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: Create a test agent
  console.log('2. Testing CREATE agent endpoint...');
  const createRequest = {
    prompt: {
      text: "This is a test agent created by the API test script. Please add a simple README.md file with the text 'Test successful'."
    },
    source: {
      repository: repository,
      ref: "main"
    },
    target: {
      autoCreatePr: false,
      branchName: `test-cursor-api-${Date.now()}`
    }
  };
  
  console.log('   Request body:', JSON.stringify(createRequest, null, 2));
  
  try {
    const createResponse = await fetch('https://api.cursor.com/v0/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createRequest)
    });
    
    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`);
    
    const responseText = await createResponse.text();
    
    if (createResponse.ok) {
      const data = JSON.parse(responseText);
      console.log(`   ✅ Success! Agent created with ID: ${data.id}`);
      console.log('   Response:', JSON.stringify(data, null, 2));
      
      // Test 3: Get agent status
      if (data.id) {
        console.log('');
        console.log(`3. Testing GET agent status for ID: ${data.id}...`);
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        try {
          const statusResponse = await fetch(`https://api.cursor.com/v0/agents/${data.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`   Status: ${statusResponse.status} ${statusResponse.statusText}`);
          
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`   ✅ Agent status: ${statusData.status}`);
            console.log('   Agent details:', JSON.stringify(statusData, null, 2));
          } else {
            const error = await statusResponse.text();
            console.log(`   ❌ Error: ${error}`);
          }
        } catch (error) {
          console.log(`   ❌ Network error: ${error.message}`);
        }
      }
    } else {
      console.log(`   ❌ Error response: ${responseText}`);
      
      // Try to parse as JSON for better error details
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.error) {
          console.log('   Error details:', JSON.stringify(errorData.error, null, 2));
        }
      } catch (e) {
        // Not JSON, already printed above
      }
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
  
  console.log('\n✅ API test complete!');
}

testCursorAPI().catch(console.error);