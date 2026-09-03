const https = require('https');
const fs = require('fs');

function httpRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          bodyText: body.toString('utf8'),
          rawBody: body
        });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('=== TEST 1: ISOLATION BEFORE UPLOAD ===');
  const donutBefore = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-6/image',
    method: 'GET'
  });
  console.log('Donut image length before:', donutBefore.rawBody.length);

  const samosaPattiBefore = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-13/image',
    method: 'GET'
  });
  console.log('Samosa Patti length before:', samosaPattiBefore.rawBody.length);

  console.log('\n=== TEST 2: UPLOAD IMAGE TO PRODUCT (PUT /api/products/special-12) ===');
  // Use authentic pani_puri image binary
  const paniBuf = fs.readFileSync('public/images/pani_puri.jpg');
  const paniBase64 = 'data:image/jpeg;base64,' + paniBuf.toString('base64');

  const updatePayload = JSON.stringify({
    imageBase64: paniBase64
  });

  const putRes = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-12',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(updatePayload)
    }
  }, updatePayload);

  console.log('PUT /api/products/special-12 status:', putRes.status);
  const putData = JSON.parse(putRes.bodyText);
  console.log('PUT response success:', putData.success);
  console.log('Updated product image URL:', putData.product?.image);

  console.log('\n=== TEST 3: RETRIEVE STORED BINARY VIA GET /api/products/special-12/image ===');
  const getImgRes = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-12/image',
    method: 'GET'
  });
  console.log('GET image status:', getImgRes.status);
  console.log('GET Content-Type:', getImgRes.headers['content-type']);
  console.log('Retrieved bytes length:', getImgRes.rawBody.length);
  console.log('Original uploaded bytes length:', paniBuf.length);
  const isByteExact = getImgRes.rawBody.equals(paniBuf);
  console.log('Is retrieved binary 100% byte-exact to uploaded image?', isByteExact);

  console.log('\n=== TEST 4: CROSS-PRODUCT ISOLATION CHECK ===');
  const donutAfter = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-6/image',
    method: 'GET'
  });
  console.log('Donut image length after:', donutAfter.rawBody.length);
  console.log('Donut untouched?', donutAfter.rawBody.equals(donutBefore.rawBody));

  const samosaPattiAfter = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products/special-13/image',
    method: 'GET'
  });
  console.log('Samosa Patti length after:', samosaPattiAfter.rawBody.length);
  console.log('Samosa Patti untouched?', samosaPattiAfter.rawBody.equals(samosaPattiBefore.rawBody));

  console.log('\n=== TEST 5: LIGHTWEIGHT GET /api/products PAYLOAD ===');
  const listRes = await httpRequest({
    hostname: 'hyderinimco.onrender.com',
    path: '/api/products',
    method: 'GET'
  });
  console.log('GET /api/products status:', listRes.status);
  console.log('Total catalog JSON payload size in KB:', (Buffer.byteLength(listRes.bodyText) / 1024).toFixed(1) + ' KB');
  const listData = JSON.parse(listRes.bodyText);
  const special12InList = listData.products.find(p => p.id === 'special-12');
  console.log('special-12 image in list:', special12InList?.image);
  console.log('Does list contain raw Base64 data?', listRes.bodyText.includes('data:image'));
}

run().catch(console.error);
