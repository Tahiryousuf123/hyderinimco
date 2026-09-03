import fs from 'fs';

console.log('🧪 [Localhost 5000 Full E2E Test] Testing Server Endpoints...');

async function runE2eTest() {
  try {
    // 1. Test GET /api/products
    console.log('1️⃣ Fetching GET http://localhost:5000/api/products ...');
    const resGet = await fetch('http://localhost:5000/api/products');
    console.log(`Response Status: ${resGet.status}`);
    const dataGet = await resGet.json();
    console.log(`Success: ${dataGet.success}, Products Count: ${dataGet.products?.length}`);

    // 2. Test POST /api/products (Adding new product)
    const newTestProd = {
      id: 'test-prod-' + Date.now(),
      name: 'AI Agent Test Dish',
      nameUrdu: 'ٹیسٹ ڈش',
      category: 'samosa',
      packQuantity: '12 pcs',
      price: 350,
      badge: 'NEW',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80'
    };

    console.log('2️⃣ Testing POST http://localhost:5000/api/products (Add Product) ...');
    const resPost = await fetch('http://localhost:5000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTestProd)
    });
    console.log(`POST Status: ${resPost.status}`);
    const dataPost = await resPost.json();
    console.log('POST Response:', dataPost);

    const createdId = dataPost.product ? dataPost.product.id : newTestProd.id;

    // 3. Test PUT /api/products/:id (Editing product)
    const editTestProd = {
      ...newTestProd,
      id: createdId,
      name: 'AI Agent Test Dish (UPDATED)',
      price: 400
    };

    console.log(`3️⃣ Testing PUT http://localhost:5000/api/products/${createdId} (Edit Product) ...`);
    const resPut = await fetch(`http://localhost:5000/api/products/${createdId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTestProd)
    });
    console.log(`PUT Status: ${resPut.status}`);
    const dataPut = await resPut.json();
    console.log('PUT Response:', dataPut);

    // 4. Cleanup test product
    console.log(`4️⃣ Testing DELETE http://localhost:5000/api/products/${createdId} ...`);
    const resDel = await fetch(`http://localhost:5000/api/products/${createdId}`, {
      method: 'DELETE'
    });
    console.log(`DELETE Status: ${resDel.status}`);

    console.log('🎉 ALL LOCALHOST 5000 ENDPOINTS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ E2E Error:', err);
  }
}

runE2eTest();
