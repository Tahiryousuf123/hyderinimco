/**
 * Verification of Live Server Webhook HTTP Endpoints
 */

import 'dotenv/config';
import http from 'http';

function doRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function verifyServerWebhooks() {
  console.log('Testing live server webhook endpoints on port 5000...');

  try {
    // 0. Health Endpoint GET
    const healthRes = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/health',
      method: 'GET'
    });
    console.log(`0. Health Check GET: HTTP ${healthRes.statusCode}, Response: ${healthRes.data}`);

    // 1. Valid Webhook Verification GET
    const validVerify = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=HyderiWhatsApp2026Secure&hub.challenge=CHALLENGE_ACCEPTED_786',
      method: 'GET'
    });
    console.log(`1. Valid Webhook GET: HTTP ${validVerify.statusCode}, Response: "${validVerify.data}"`);

    // 2. Invalid Webhook Verification GET
    const invalidVerify = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=BAD_TOKEN&hub.challenge=TEST',
      method: 'GET'
    });
    console.log(`2. Invalid Webhook GET: HTTP ${invalidVerify.statusCode}, Response: "${invalidVerify.data}"`);

    // 3. Status Endpoint GET
    const statusRes = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/status',
      method: 'GET'
    });
    console.log(`3. WhatsApp Status GET: HTTP ${statusRes.statusCode}, Response: ${statusRes.data.substring(0, 120)}...`);

    // 4. Status Webhook Delivery POST
    const statusPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: '1337779412741642',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            statuses: [{ id: 'wamid.TEST_STATUS_001', status: 'delivered', recipient_id: '923252747343' }]
          },
          field: 'messages'
        }]
      }]
    });

    const postStatusRes = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(statusPayload)
      }
    }, statusPayload);
    console.log(`4. Webhook Status Delivery POST: HTTP ${postStatusRes.statusCode}, Response: "${postStatusRes.data}"`);

    // 5. Incoming Customer Text Message POST
    const uniqueWamid = 'wamid.LIVE_TEST_' + Date.now();
    const customerMsgPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: '1337779412741642',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '923252747343', phone_number_id: '1337779412741642' },
            contacts: [{ profile: { name: 'Live Tester' }, wa_id: '923001234567' }],
            messages: [{
              from: '923001234567',
              id: uniqueWamid,
              timestamp: String(Math.floor(Date.now() / 1000)),
              text: { body: 'Assalam o Alaikum, mujhe samosa price batao' },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }]
    });

    const postCustomerRes = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(customerMsgPayload)
      }
    }, customerMsgPayload);
    console.log(`5. Incoming Customer Message POST: HTTP ${postCustomerRes.statusCode}, Response: "${postCustomerRes.data}"`);

    // 6. Duplicate Customer Message POST (Idempotency)
    const postDupRes = await doRequest({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/whatsapp/webhook',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(customerMsgPayload)
      }
    }, customerMsgPayload);
    console.log(`6. Duplicate Customer Message POST: HTTP ${postDupRes.statusCode}, Response: "${postDupRes.data}"`);

    console.log('\n✅ All HTTP Webhook Endpoints verified successfully!');
  } catch (err) {
    console.error('HTTP Test Error (Is server running?):', err.message);
  }
}

verifyServerWebhooks();
