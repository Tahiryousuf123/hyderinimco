/**
 * Official Meta WhatsApp Cloud API Phone Registration & Verification Tool
 * Handles phone status querying, OTP verification, and PIN registration.
 *
 * Security Guarantee:
 * - NEVER prints or logs META_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN.
 * - Masks sensitive OTP/PIN values from terminal output.
 */

import 'dotenv/config';
import { getMetaConfig } from '../server/services/whatsappCloudApi.js';

export async function getPhoneStatus() {
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  if (!token || !phoneId) {
    throw new Error('Missing token or phone number ID in configuration.');
  }

  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}?fields=id,verified_name,display_phone_number,quality_rating,code_verification_status,status,account_mode,name_status,platform_type,is_pin_enabled`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Meta API error [${data.error?.code}]: ${data.error?.message}`);
  }
  return data;
}

export async function requestCode(method = 'SMS', language = 'en') {
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/request_code`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code_method: method, language })
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function verifyCode(code) {
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/verify_code`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ code: String(code).trim() })
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export async function registerWithPin(pin) {
  const { token, phoneId, graphApiVersion } = getMetaConfig();
  const url = `https://graph.facebook.com/${graphApiVersion}/${phoneId}/register`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      pin: String(pin).trim()
    })
  });

  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const action = process.argv[2] || 'status';
  const param = process.argv[3] || '';

  console.log('===============================================================');
  console.log('  📱 META WHATSAPP CLOUD API PHONE REGISTRATION TOOL');
  console.log('===============================================================\n');

  try {
    if (action === 'status') {
      const status = await getPhoneStatus();
      console.log('--- Current Phone Status ---');
      console.log(`Phone Number ID        : ${status.id}`);
      console.log(`Display Number         : ${status.display_phone_number}`);
      console.log(`Verified Brand Name    : ${status.verified_name}`);
      console.log(`Platform Type          : ${status.platform_type}`);
      console.log(`Code Verification      : ${status.code_verification_status}`);
      console.log(`Registration Status    : ${status.status}`);
      console.log(`Account Mode           : ${status.account_mode}`);
      console.log(`PIN Enabled            : ${status.is_pin_enabled}`);
      console.log('----------------------------\n');
    } else if (action === 'request-code') {
      const method = (param || 'SMS').toUpperCase();
      console.log(`Requesting verification code via ${method}...`);
      const result = await requestCode(method);
      if (result.ok) {
        console.log('✅ Verification code requested successfully! Check your phone for SMS/Call.');
      } else {
        console.error('❌ Request Code Failed:');
        console.error(`Error Code    : ${result.data.error?.code}`);
        console.error(`Subcode       : ${result.data.error?.error_subcode}`);
        console.error(`Title         : ${result.data.error?.error_user_title || result.data.error?.message}`);
        console.error(`Message       : ${result.data.error?.error_user_msg || result.data.error?.message}`);
      }
    } else if (action === 'verify-code') {
      if (!param) {
        console.error('❌ Error: OTP code is required. Usage: node scripts/register_meta_phone.js verify-code <OTP>');
        process.exit(1);
      }
      console.log('Submitting verification OTP to Meta...');
      const result = await verifyCode(param);
      if (result.ok) {
        console.log('✅ Verification code ACCEPTED by Meta! Status updated.');
      } else {
        console.error('❌ Verify Code Failed:');
        console.error(`Error Code    : ${result.data.error?.code}`);
        console.error(`Subcode       : ${result.data.error?.error_subcode}`);
        console.error(`Title         : ${result.data.error?.error_user_title || result.data.error?.message}`);
        console.error(`Message       : ${result.data.error?.error_user_msg || result.data.error?.message}`);
      }
    } else if (action === 'register') {
      if (!param) {
        console.error('❌ Error: 6-digit PIN is required. Usage: node scripts/register_meta_phone.js register <PIN>');
        process.exit(1);
      }
      console.log('Submitting registration PIN to Meta...');
      const result = await registerWithPin(param);
      if (result.ok) {
        console.log('✅ Registration SUCCESSFUL! Target status CONNECTED reached.');
      } else {
        console.error('❌ Registration Failed:');
        console.error(`Error Code    : ${result.data.error?.code}`);
        console.error(`Subcode       : ${result.data.error?.error_subcode}`);
        console.error(`Message       : ${result.data.error?.message}`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

if (process.argv[1]?.includes('register_meta_phone.js')) {
  main();
}
