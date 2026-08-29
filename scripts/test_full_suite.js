import http from 'http';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:5000';

function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, text: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('========================================');
  console.log('🚀 RUNNING COMPREHENSIVE HYDERI AUDIT SUITE');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name} -> ${detail}`);
      failed++;
    }
  }

  try {
    // 1. Check Homepage HTTP 200
    const home = await makeRequest('GET', '/');
    assert('Homepage loads with HTTP 200', home.status === 200);

    // 2. Check Products API & Count
    const prodsRes = await makeRequest('GET', '/api/products');
    assert('GET /api/products returns HTTP 200', prodsRes.status === 200);
    assert('GET /api/products has success: true', prodsRes.body.success === true);
    assert('Product catalog has EXACTLY 54 brochure items', prodsRes.body.products.length === 54, `Count was ${prodsRes.body.products?.length}`);

    // Category Breakdown verification
    const samosas = prodsRes.body.products.filter(p => p.category === 'samosa');
    const rolls = prodsRes.body.products.filter(p => p.category === 'roll');
    const kababs = prodsRes.body.products.filter(p => p.category === 'kabab');
    const pizzas = prodsRes.body.products.filter(p => p.category === 'pizza');
    const specials = prodsRes.body.products.filter(p => p.category === 'special');

    assert('SAMOSA category has exactly 13 items', samosas.length === 13, `Found ${samosas.length}`);
    assert('ROLL category has exactly 13 items', rolls.length === 13, `Found ${rolls.length}`);
    assert('KABAB category has exactly 11 items', kababs.length === 11, `Found ${kababs.length}`);
    assert('PIZZA category has exactly 2 items', pizzas.length === 2, `Found ${pizzas.length}`);
    assert('OTHER SPECIAL category has exactly 15 items', specials.length === 15, `Found ${specials.length}`);

    // 3. Check Settings API
    const settingsRes = await makeRequest('GET', '/api/settings');
    assert('GET /api/settings returns HTTP 200', settingsRes.status === 200);
    assert('Settings has store name & phone', !!settingsRes.body.settings?.phone1);
    assert('Settings has Meezan Bank details for ARSALAN', settingsRes.body.settings?.paymentAccounts?.bankTransfer?.accountTitle === 'ARSALAN');
    assert('Settings has EasyPaisa for Arsalan Arsalan (0336-2438422)', settingsRes.body.settings?.paymentAccounts?.easypaisa?.accountNumber === '0336-2438422');
    assert('Settings has Cash on Delivery (COD)', !!settingsRes.body.settings?.paymentAccounts?.cod);
    assert('JazzCash is removed', !settingsRes.body.settings?.paymentAccounts?.jazzcash);

    // 4. Test AI Chatbot API
    const chatRes1 = await makeRequest('POST', '/api/chat', { message: 'samosa ke rate batao' });
    assert('POST /api/chat responds to Samosa query', chatRes1.status === 200 && chatRes1.body.reply?.length > 10);

    const chatRes2 = await makeRequest('POST', '/api/chat', { message: '50 logon ki dawat hai kitne samosay chahiye' });
    assert('POST /api/chat handles party calculations', chatRes2.status === 200 && (chatRes2.body.reply?.toLowerCase().includes('dawat') || chatRes2.body.reply?.toLowerCase().includes('party') || chatRes2.body.reply?.includes('دعوت')));

    // 5. Test WhatsApp AI Simulator API
    const waRes = await makeRequest('POST', '/api/whatsapp/simulate', { message: 'Assalam o Alaikum menu rates please' });
    assert('POST /api/whatsapp/simulate returns auto-reply', waRes.status === 200 && !!waRes.body.autoReply?.message);

    // 6. Test Admin Auth API
    const authOwner = await makeRequest('POST', '/api/admin/login', { pin: '1970', role: 'manager' });
    assert('Store Owner login with PIN 1970 succeeds', authOwner.status === 200 && authOwner.body.role === 'manager');

    const authAdmin = await makeRequest('POST', '/api/admin/login', { pin: '7860', role: 'superadmin' });
    assert('SuperAdmin login with PIN 7860 succeeds', authAdmin.status === 200 && authAdmin.body.role === 'superadmin');

    const authBad = await makeRequest('POST', '/api/admin/login', { pin: '0000', role: 'manager' });
    assert('Invalid PIN rejected with 401', authBad.status === 401);

    // 7. Test Order Placement & Lifecycle
    const sampleOrder = {
      customer: {
        fullName: 'Test Customer Ali',
        phone: '03001234567',
        area: 'North Nazimabad (Local Shop Pickup / Fast Express)',
        address: 'House # 12, Block B, North Nazimabad',
        notes: 'Test order verification'
      },
      items: [
        { id: 'samosa-1', name: 'Chicken Vonton', packQuantity: '12 pcs', price: 240, quantity: 2 },
        { id: 'roll-1', name: 'Chicken One Bite Roll', packQuantity: '24 pcs', price: 500, quantity: 1 }
      ],
      subtotal: 980,
      deliveryFee: 150,
      totalAmount: 1130,
      paymentMethod: 'easypaisa',
      senderAccountName: 'Ali Test Account',
      transactionId: 'EP-987654321',
      notes: 'Please verify payment'
    };

    const orderRes = await makeRequest('POST', '/api/orders', sampleOrder);
    assert('POST /api/orders creates order successfully', orderRes.status === 200 && orderRes.body.success === true);
    const createdOrder = orderRes.body.order;
    assert('Created order has valid Order Ref (e.g. HYD-XXXX)', !!createdOrder?.orderRef && createdOrder.orderRef.startsWith('HYD-'));

    // 8. Test Order Tracking API
    const trackRes = await makeRequest('GET', `/api/orders/${createdOrder.orderRef}`);
    assert('GET /api/orders/:ref tracks created order', trackRes.status === 200 && trackRes.body.order?.orderRef === createdOrder.orderRef);

    // 9. Test Order Status Update API
    const statusUpdateRes = await makeRequest('PATCH', `/api/orders/${createdOrder.id}/status`, { status: 'payment_verified' });
    assert('PATCH /api/orders/:id/status updates status', statusUpdateRes.status === 200 && statusUpdateRes.body.order?.status === 'payment_verified');

    // 10. Verify Image Assets exist
    const imageFiles = [
      'public/images/hyderi_brochure_menu.jpg',
      'public/images/hyderi_brand_banner.jpg',
      'public/images/samosa_classic.jpg',
      'public/images/samosa_onebite.jpg',
      'public/images/wonton_crispy.jpg',
      'public/images/spring_roll_crispy.jpg',
      'public/images/spring_roll_golden.jpg',
      'public/images/shami_kabab_real.jpg',
      'public/images/seekh_kabab_real.jpg',
      'public/images/chapli_kabab_real.jpg',
      'public/images/mini_pizza_real.jpg',
      'public/images/nuggets_real.jpg',
      'public/images/french_fries_real.jpg',
      'public/images/paratha_real.jpg'
    ];

    let allImagesExist = true;
    for (const img of imageFiles) {
      const exists = fs.existsSync(path.join(process.cwd(), img));
      if (!exists) {
        console.error(`Missing image asset: ${img}`);
        allImagesExist = false;
      }
    }
    assert('All 14 genuine food photography & brand images exist in public/images/', allImagesExist);

  } catch (err) {
    console.error('Fatal Suite Error:', err);
    failed++;
  }

  console.log('\n========================================');
  console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
