const https = require('https');

https.get('https://hyderinimco.onrender.com/api/products', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      const prods = data.products || [];
      console.log('Total products from production API:', prods.length);

      const targets = ['Samosa Patti', 'Lachcha Paratha', 'Plain Puri', 'Pani Puri', 'Chicken Donuts'];
      const matched = prods.filter(p => targets.some(t => p.name.toLowerCase().includes(t.toLowerCase())));

      console.log('\n--- MATCHED TARGET PRODUCTS IN PRODUCTION MONGODB ---');
      for (const m of matched) {
        console.log(JSON.stringify({
          id: m.id,
          name: m.name,
          category: m.category,
          image: m.image,
          updatedAt: m.updatedAt
        }, null, 2));
      }

      console.log('\n--- ALL 62 PRODUCT IMAGES SUMMARY ---');
      const imageMap = {};
      for (const p of prods) {
        imageMap[p.image] = (imageMap[p.image] || 0) + 1;
      }
      console.log('Unique images count:', Object.keys(imageMap).length);
      console.log('Images frequency distribution:');
      for (const [img, count] of Object.entries(imageMap)) {
        if (count > 1) {
          const names = prods.filter(p => p.image === img).map(p => p.name);
          console.log(`Image [${img}] is shared by ${count} products:`, names);
        }
      }
    } catch (e) {
      console.error('Error:', e.message, body.slice(0, 200));
    }
  });
});
