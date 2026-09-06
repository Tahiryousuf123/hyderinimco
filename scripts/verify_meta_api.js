/**
 * Safe Meta API Credential Verification Script
 * Queries Meta Graph API to verify configured phone number details.
 *
 * Security Guarantee:
 * - NEVER logs, prints, or outputs META_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN.
 * - Only prints safe public metadata: verified name, display phone, ID.
 */

import 'dotenv/config';
import { getMetaConfig } from '../server/services/whatsappCloudApi.js';

async function verifyMetaApiCredentials() {
  console.log('===============================================================');
  console.log('  🔍 META WHATSAPP CLOUD API SAFE CREDENTIAL VERIFICATION');
  console.log('===============================================================\n');

  const { token, phoneId, graphApiVersion } = getMetaConfig();

  if (!token) {
    console.error('❌ FAIL: No access token found in .env (checked META_ACCESS_TOKEN & WHATSAPP_ACCESS_TOKEN).');
    process.exit(1);
  }

  if (!phoneId) {
    console.error('❌ FAIL: No phone number ID found in .env (WHATSAPP_PHONE_NUMBER_ID).');
    process.exit(1);
  }

  console.log(`Target Phone Number ID : ${phoneId}`);
  console.log(`Meta Graph API Version : ${graphApiVersion}`);
  console.log(`Access Token Present   : YES [${token.length} chars, token hidden for security]`);
  console.log('\nContacting Meta Graph API endpoint...');

  try {
    const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('\n❌ Meta Graph API Verification Failed!');
      console.error(`Status Code : HTTP ${res.status}`);
      console.error(`Error Code  : ${data.error?.code || 'Unknown'}`);
      console.error(`Message     : ${data.error?.message || 'Unknown error'}`);
      process.exit(1);
    }

    console.log('\n✅ Meta Graph API Authentication SUCCESSFUL!\n');
    console.log('--- Official Meta Business Details ---');
    console.log(`Verified Brand Name   : ${data.verified_name || 'N/A'}`);
    console.log(`Display Phone Number  : ${data.display_phone_number || 'N/A'}`);
    console.log(`Quality Rating        : ${data.quality_rating || 'N/A'}`);
    console.log(`Code Verification     : ${data.code_verification_status || 'N/A'}`);
    console.log(`Phone Number ID       : ${data.id || phoneId}`);
    console.log('--------------------------------------\n');
    console.log('Status: Authenticated and ready for production messaging.\n');
    process.exitCode = 0;
    return;
  } catch (err) {
    console.error('❌ Network Connection Error:', err.message);
    process.exitCode = 1;
    return;
  }
}

verifyMetaApiCredentials();
