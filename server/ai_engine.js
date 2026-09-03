/**
 * Hyderi Nimco & Frozen — WhatsApp AI Ordering Agent
 * Powered exclusively by Google Gemini 2.5 Flash with Function Calling
 * MongoDB Atlas is the SOLE source of truth for products, prices, and orders.
 *
 * Architecture:
 *   WhatsApp → Gemini + tool declarations → tool executor → MongoDB → Gemini → WhatsApp
 *
 * NO keyword matching. NO rule engine. NO hardcoded products or prices.
 * If Gemini is unavailable, a clean service-unavailable message is returned.
 */

import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { isDBConnected, withTimeout } from './db.js';

/**
 * Calculates Karachi delivery charges based on Bykea rider distance
 */
export function calculateAreaDeliveryFee(areaName) {
  const a = (areaName || '').toLowerCase();
  if (a.includes('bahria')) return 1500;
  if (a.includes('korangi') || a.includes('landhi') || a.includes('industrial')) return 600;
  if (a.includes('malir') || a.includes('cantt') || a.includes('airport') || a.includes('model colony')) return 550;
  if (a.includes('clifton') || a.includes('defence') || a.includes('dha')) return 500;
  if (a.includes('saddar') || a.includes('garden') || a.includes('lines area')) return 450;
  if (a.includes('scheme 33') || a.includes('safoora') || a.includes('pechs') || a.includes('tariq road') || a.includes('bahadurabad')) return 400;
  if (a.includes('gulshan') || a.includes('johar') || a.includes('stadium')) return 350;
  if (a.includes('nazimabad') || a.includes('liaquatabad') || a.includes('gulberg')) {
    if (a.includes('north nazimabad') || a.includes('hydri')) return 100;
    return 250;
  }
  if (a.includes('north karachi') || a.includes('buffer zone') || a.includes('fb area') || a.includes('federal b')) return 200;
  if (a.includes('hydri') || a.includes('north nazimabad') || a.includes('pickup')) return 100;
  return 300; // Other Karachi areas default
}

// ---------------------------------------------------------------------------
// TOOL DEFINITIONS — sent to Gemini as function declarations
// ---------------------------------------------------------------------------
const TOOL_DECLARATIONS = [
  {
    name: 'get_products',
    description: 'Get all products from the live MongoDB catalog. Returns product ID, name, Urdu name, category, pack quantity, price, availability status, and badge. Always call this before quoting prices or recommending products.',
    parameters: {
      type: 'OBJECT',
      properties: {
        category: {
          type: 'STRING',
          description: 'Optional category filter: samosa, roll, kabab, pizza, deals, nimco, special, puri. Leave empty to get all products.'
        }
      },
      required: []
    }
  },
  {
    name: 'get_product_by_name',
    description: 'Search for a specific product by name, Urdu name, or keyword. Use this to find a product when the customer mentions it by name or description.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search query. E.g. "samosa", "chicken roll", "nimco", "pani puri"'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'check_availability',
    description: 'Check whether a specific product is currently available and get its current price from MongoDB.',
    parameters: {
      type: 'OBJECT',
      properties: {
        product_id: {
          type: 'STRING',
          description: 'The exact product ID from the catalog'
        }
      },
      required: ['product_id']
    }
  },
  {
    name: 'create_order',
    description: 'Create a confirmed order in MongoDB Atlas. ONLY call this after the customer has explicitly confirmed their order (e.g. said "haan", "confirm", "yes", "kar do", "book karo"). Do NOT call this speculatively. Each order must have at least one item and a delivery address.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customer_phone: { type: 'STRING', description: 'Customer WhatsApp phone number' },
        customer_name: { type: 'STRING', description: 'Customer name (if provided)' },
        delivery_address: { type: 'STRING', description: 'Full delivery address' },
        delivery_area: { type: 'STRING', description: 'Delivery area/neighbourhood name' },
        items: {
          type: 'ARRAY',
          description: 'List of items to order',
          items: {
            type: 'OBJECT',
            properties: {
              product_id: { type: 'STRING', description: 'Product ID from catalog' },
              product_name: { type: 'STRING', description: 'Product name for display' },
              quantity: { type: 'NUMBER', description: 'Number of packets/units' }
            },
            required: ['product_id', 'quantity']
          }
        },
        payment_method: { type: 'STRING', description: 'cod, easypaisa, or bank_transfer. Default: cod' },
        notes: { type: 'STRING', description: 'Any special instructions or notes from customer' },
        idempotency_key: { type: 'STRING', description: 'Unique key to prevent duplicate orders — use the WhatsApp message ID' }
      },
      required: ['customer_phone', 'items', 'delivery_address']
    }
  },
  {
    name: 'get_order_status',
    description: "Get the status of the customer's most recent order from MongoDB.",
    parameters: {
      type: 'OBJECT',
      properties: {
        customer_phone: { type: 'STRING', description: 'Customer WhatsApp phone number' }
      },
      required: ['customer_phone']
    }
  }
];

// ---------------------------------------------------------------------------
// TOOL EXECUTOR — runs server-side, accesses MongoDB directly
// ---------------------------------------------------------------------------
async function executeToolCall(toolName, args, customerPhone) {
  switch (toolName) {

    case 'get_products': {
      if (!isDBConnected()) return { error: 'Database unavailable' };
      try {
        const filter = {};
        if (args.category) filter.category = args.category;
        const products = await withTimeout(
          Product.find(filter, { _id: 0, __v: 0, image: 0, description: 0, descriptionUrdu: 0, dealItems: 0 }).lean(),
          5000
        );
        return {
          products: products.map(p => ({
            id: p.id,
            name: p.name,
            nameUrdu: p.nameUrdu || '',
            category: p.category,
            packQuantity: p.packQuantity,
            price: p.price,
            available: p.isAvailable !== false,
            badge: p.badge || ''
          }))
        };
      } catch (e) {
        console.error('[Tool:get_products] Error:', e.message);
        return { error: e.message };
      }
    }

    case 'get_product_by_name': {
      if (!isDBConnected()) return { error: 'Database unavailable' };
      try {
        const q = (args.query || '').trim().toLowerCase();
        const allProducts = await withTimeout(
          Product.find({}, { _id: 0, __v: 0, image: 0 }).lean(),
          5000
        );
        const matches = allProducts.filter(p => {
          const n = (p.name || '').toLowerCase();
          const u = (p.nameUrdu || '').toLowerCase();
          const id = (p.id || '').toLowerCase();
          const cat = (p.category || '').toLowerCase();
          return n.includes(q) || u.includes(q) || id.includes(q) || cat.includes(q) ||
            q.split(' ').some(word => word.length > 2 && (n.includes(word) || id.includes(word)));
        });
        if (matches.length === 0) return { found: false, message: `No product found matching "${args.query}"` };
        return {
          found: true,
          products: matches.slice(0, 5).map(p => ({
            id: p.id,
            name: p.name,
            nameUrdu: p.nameUrdu || '',
            category: p.category,
            packQuantity: p.packQuantity,
            price: p.price,
            available: p.isAvailable !== false
          }))
        };
      } catch (e) {
        console.error('[Tool:get_product_by_name] Error:', e.message);
        return { error: e.message };
      }
    }

    case 'check_availability': {
      if (!isDBConnected()) return { error: 'Database unavailable' };
      try {
        const product = await withTimeout(
          Product.findOne({ id: args.product_id }, { _id: 0, __v: 0, image: 0 }).lean(),
          5000
        );
        if (!product) return { available: false, message: `Product "${args.product_id}" not found in catalog` };
        return {
          available: product.isAvailable !== false,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            packQuantity: product.packQuantity,
            category: product.category
          }
        };
      } catch (e) {
        console.error('[Tool:check_availability] Error:', e.message);
        return { error: e.message };
      }
    }

    case 'create_order': {
      if (!isDBConnected()) return { error: 'Database unavailable — order cannot be created' };

      // Idempotency check
      const idempKey = args.idempotency_key || `wa_${customerPhone}_${Date.now()}`;
      try {
        const existingByKey = await withTimeout(
          Order.findOne({ 'notes': { $regex: `idempotency:${idempKey}` } }).lean(),
          5000
        );
        if (existingByKey) {
          return {
            success: true,
            duplicate: true,
            orderRef: existingByKey.orderRef,
            message: 'Order was already created — not duplicated'
          };
        }
      } catch (e) { /* non-fatal — continue with creation */ }

      // Validate and price each item from MongoDB (NEVER trust Gemini's prices)
      const validatedItems = [];
      let subtotal = 0;

      for (const item of (args.items || [])) {
        try {
          const dbProduct = await withTimeout(
            Product.findOne({ id: item.product_id }, { _id: 0, __v: 0, image: 0 }).lean(),
            5000
          );
          if (!dbProduct) {
            return { success: false, error: `Product "${item.product_id}" not found in MongoDB. Order aborted.` };
          }
          if (dbProduct.isAvailable === false) {
            return { success: false, error: `Product "${dbProduct.name}" is currently out of stock. Please remove it or choose an alternative.` };
          }
          const qty = Math.max(1, Math.round(Number(item.quantity) || 1));
          const itemTotal = dbProduct.price * qty;
          subtotal += itemTotal;
          validatedItems.push({
            id: dbProduct.id,
            name: dbProduct.name,
            nameUrdu: dbProduct.nameUrdu || '',
            packQuantity: dbProduct.packQuantity,
            price: dbProduct.price, // Always MongoDB price
            quantity: qty,
            itemTotal
          });
        } catch (e) {
          return { success: false, error: `Failed to validate product "${item.product_id}": ${e.message}` };
        }
      }

      if (validatedItems.length === 0) return { success: false, error: 'No valid items in order' };
      if (!args.delivery_address || String(args.delivery_address).trim().length < 5) {
        return { success: false, error: 'Delivery address is required and must be specific' };
      }

      // Compute area-based delivery fee according to Bykea rates
      const deliveryFee = calculateAreaDeliveryFee(args.delivery_area || args.delivery_address);
      const totalAmount = subtotal + deliveryFee;

      // Generate order reference
      const now = new Date();
      const orderRef = `WA-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
      const orderId = `wa_order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const orderDoc = {
        id: orderId,
        orderRef,
        createdAt: now,
        formattedDate: now.toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        customer: {
          fullName: args.customer_name || 'WhatsApp Customer',
          phone: args.customer_phone || customerPhone,
          address: args.delivery_address,
          area: args.delivery_area || ''
        },
        items: validatedItems,
        subtotal,
        deliveryFee,
        totalAmount,
        paymentMethod: args.payment_method || 'cod',
        paymentDetails: {},
        status: 'pending_verification',
        notes: [
          args.notes || '',
          `WhatsApp Order | idempotency:${idempKey}`
        ].filter(Boolean).join(' | '),
        source: 'whatsapp'
      };

      try {
        await Order.create(orderDoc);
        console.log(`[WhatsApp Order] Created order ${orderRef} for phone ${customerPhone} — Rs. ${totalAmount}`);
        return {
          success: true,
          orderRef,
          items: validatedItems.map(i => `${i.quantity}x ${i.name} @ Rs.${i.price} = Rs.${i.itemTotal}`),
          subtotal,
          deliveryFee,
          totalAmount,
          paymentMethod: args.payment_method || 'cod'
        };
      } catch (e) {
        console.error('[Tool:create_order] MongoDB write error:', e.message);
        if (e.code === 11000) {
          return { success: false, error: 'Duplicate order detected — not created again' };
        }
        return { success: false, error: `Failed to save order: ${e.message}` };
      }
    }

    case 'get_order_status': {
      if (!isDBConnected()) return { error: 'Database unavailable' };
      try {
        const phone = (args.customer_phone || customerPhone || '').replace(/[^0-9]/g, '');
        // Search by WhatsApp phone in customer.phone field — try both 03xx and 923xx formats
        const variants = [phone, phone.replace(/^92/, '0'), '92' + phone.replace(/^0/, '')];
        const order = await withTimeout(
          Order.findOne({
            $or: [
              { 'customer.phone': { $in: variants } },
              { 'notes': { $regex: phone } }
            ]
          }).sort({ createdAt: -1 }).lean(),
          5000
        );
        if (!order) return { found: false, message: 'No order found for this number' };
        return {
          found: true,
          orderRef: order.orderRef,
          status: order.status,
          totalAmount: order.totalAmount,
          items: (order.items || []).map(i => `${i.quantity}x ${i.name}`),
          createdAt: order.formattedDate || order.createdAt,
          paymentMethod: order.paymentMethod
        };
      } catch (e) {
        console.error('[Tool:get_order_status] Error:', e.message);
        return { error: e.message };
      }
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — injected once per Gemini conversation
// ---------------------------------------------------------------------------
function buildSystemPrompt() {
  return `You are the official AI Sales & Customer Care Agent for "New Hyderi Nimco & Frozen Foods (Since 1970)" on WhatsApp.

IDENTITY & LANGUAGE:
- Speak warm, respectful Roman Urdu by default. Switch to English or Urdu if the customer uses those.
- Greet with: "Wa Alaikum Assalam 😊 Hyderi Nimco & Frozen mein khushamdeed!"
- Be like a helpful Pakistani sales employee — friendly, respectful, patient.
- Understand Urdu, Roman Urdu, English, and mixed naturally. No exact command syntax is required.

TOOL USAGE — CRITICAL RULES:
1. ALWAYS call get_products or get_product_by_name BEFORE quoting any price. NEVER quote prices from memory.
2. NEVER invent or guess a product, price, or availability. Only use what the tools return.
3. If a product is not in the tool result, tell the customer it is not available rather than inventing it.
4. For product recommendations, call get_products first, then suggest from actual results.

ORDER FLOW — MANDATORY:
1. When a customer mentions products they want, use get_product_by_name to verify each one.
2. Build an order summary and present it clearly to the customer for confirmation.
3. Ask: "Kya main order confirm kar doon?" (or equivalent)
4. ONLY call create_order after the customer CLEARLY confirms (e.g. "haan", "confirm", "yes", "kar do", "theek hai", "book karo").
5. Do NOT interpret a casual "haan" (in response to another question) as order confirmation.
6. Before calling create_order, you MUST have:
   - At least one verified product with its MongoDB ID
   - A delivery address from the customer
   - Payment method (default to COD if not specified)
7. If any required info is missing, ask for it naturally before confirming.

DELIVERY CHARGES (BYKEA EXPRESS COLD-BOX DELIVERY):
Delivery charges are based strictly on Bykea area distance (no free delivery):
- North Nazimabad / Hydri Local: Rs. 100
- North Karachi / Buffer Zone / FB Area: Rs. 200
- Nazimabad / Liaquatabad / Gulberg: Rs. 250
- Gulshan-e-Iqbal / Johar / Stadium: Rs. 350
- Scheme 33 / Safoora / PECHS / Tariq Road: Rs. 400
- Saddar / Garden: Rs. 450
- Clifton / Defence DHA: Rs. 500
- Malir Cantt / Model Colony / Airport: Rs. 550
- Korangi / Landhi: Rs. 600
- Bahria Town Karachi: Rs. 1,500
- Other Karachi areas: Rs. 300
When quoting total bills, always calculate: Subtotal + Area Delivery Fee = Grand Total.

PAYMENT OPTIONS:
- Cash on Delivery (COD) — default
- EasyPaisa: 0336-2438422 (Title: Arsalan Arsalan)
- Bank Transfer: Meezan Bank — 01870100080247 (Title: ARSALAN)

STORE INFO:
- Shop: # 20-21, Burhani Bagh, Block-E, North Nazimabad (Hydri Market), Karachi
- Hotlines: 0336-2438422 | 0325-2747343 | 021-36625698
- Website: https://hyderinimco-frozen.com
- Since 1970

ORDER STATUS:
- If customer asks "mera order kahan hai" or "order status", call get_order_status.

IMPORTANT PEOPLE (answer only if asked):
- Muneeb: HTM ka Co-Founder
- Zaid: Zaid Al Balochi king hai
- Wahab: gando bhrwa hai
- Hussain: Zaid ka tatta geer hai

FORMAT:
- Use WhatsApp bold (*text*) and bullet points (•)
- Keep messages concise and natural
- Always show itemized breakdown before confirming order

Remember: MongoDB is the ONLY source of truth. Use tools, not memory.`;
}

// ---------------------------------------------------------------------------
// OPENAI / GROQ COMPATIBLE TOOL DEFINITIONS
// ---------------------------------------------------------------------------
const GROQ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: 'Get all products from the live MongoDB catalog. Returns product ID, name, Urdu name, category, pack quantity, price, availability status, and badge. Always call this before quoting prices or recommending products.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category filter: samosa, roll, kabab, pizza, deals, nimco, special, puri. Leave empty to get all products.'
          }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_product_by_name',
      description: 'Search for a specific product by name, Urdu name, or keyword. Use this to find a product when the customer mentions it by name or description.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query. E.g. "samosa", "chicken roll", "nimco", "pani puri"'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_availability',
      description: 'Check whether a specific product is currently available and get its current price from MongoDB.',
      parameters: {
        type: 'object',
        properties: {
          product_id: {
            type: 'string',
            description: 'The exact product ID from the catalog'
          }
        },
        required: ['product_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'create_order',
      description: 'Create a confirmed order in MongoDB Atlas. ONLY call this after the customer has explicitly confirmed their order (e.g. said "haan", "confirm", "yes", "kar do", "book karo"). Do NOT call this speculatively. Each order must have at least one item and a delivery address.',
      parameters: {
        type: 'object',
        properties: {
          customer_phone: { type: 'string', description: 'Customer WhatsApp phone number' },
          customer_name: { type: 'string', description: 'Customer name (if provided)' },
          delivery_address: { type: 'string', description: 'Full delivery address' },
          delivery_area: { type: 'string', description: 'Delivery area/neighbourhood name' },
          items: {
            type: 'array',
            description: 'List of items to order',
            items: {
              type: 'object',
              properties: {
                product_id: { type: 'string', description: 'Product ID from catalog' },
                product_name: { type: 'string', description: 'Product name for display' },
                quantity: { type: 'number', description: 'Number of packets/units' }
              },
              required: ['product_id', 'quantity']
            }
          },
          payment_method: { type: 'string', description: 'cod, easypaisa, or bank_transfer. Default: cod' },
          notes: { type: 'string', description: 'Any special instructions or notes from customer' },
          idempotency_key: { type: 'string', description: 'Unique key to prevent duplicate orders — use the WhatsApp message ID' }
        },
        required: ['customer_phone', 'items', 'delivery_address']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_order_status',
      description: "Get the status of the customer's most recent order from MongoDB.",
      parameters: {
        type: 'object',
        properties: {
          customer_phone: { type: 'string', description: 'Customer WhatsApp phone number' }
        },
        required: ['customer_phone']
      }
    }
  }
];

// ---------------------------------------------------------------------------
// GROQ AI ENGINE — Ultra-fast (sub-second response, 30 RPM, 14,400 req/day FREE)
// ---------------------------------------------------------------------------
async function generateGroqResponseAsync(userMessage, conversationHistory = [], customerPhone = '', messageId = '') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const groqModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.6-27b',
    'qwen/qwen3.8-27b'
  ];

  const systemPrompt = buildSystemPrompt();
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  for (const msg of (conversationHistory || [])) {
    messages.push({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text || ''
    });
  }
  messages.push({ role: 'user', content: userMessage });

  for (const modelName of groqModels) {
    try {
      const currentMessages = [...messages];
      let finalReply = null;

      for (let round = 0; round < 6; round++) {
        const t0 = Date.now();
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: modelName,
            messages: currentMessages,
            tools: GROQ_TOOLS,
            temperature: 0.6,
            max_tokens: 1024
          }),
          signal: AbortSignal.timeout(15000)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[AI Engine:Groq] ${modelName} HTTP ${res.status}:`, errText.slice(0, 200));
          break; // try next model
        }

        const data = await res.json();
        const choice = data?.choices?.[0];
        const msg = choice?.message;
        if (!msg) break;

        const toolCalls = msg.tool_calls || [];
        if (toolCalls.length === 0) {
          finalReply = (msg.content || '').trim();
          console.log(`[AI Engine:Groq] ${modelName} responded in ${Date.now() - t0}ms (${finalReply.length} chars)`);
          break;
        }

        // Add assistant message with tool calls
        currentMessages.push(msg);

        // Execute all tools called by Groq
        for (const tc of toolCalls) {
          const toolName = tc.function?.name;
          let toolArgs = {};
          try {
            toolArgs = typeof tc.function?.arguments === 'string'
              ? JSON.parse(tc.function.arguments)
              : (tc.function?.arguments || {});
          } catch (e) {
            console.warn(`[AI Tool:Groq] Failed to parse args for ${toolName}:`, tc.function?.arguments);
          }

          console.log(`[AI Tool:Groq] Calling: ${toolName}(${JSON.stringify(toolArgs).slice(0, 150)})`);
          const toolResult = await executeToolCall(toolName, toolArgs, customerPhone);
          console.log(`[AI Tool:Groq] ${toolName} result:`, JSON.stringify(toolResult).slice(0, 200));

          currentMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(toolResult)
          });
        }
      }

      if (finalReply && finalReply.length > 0) {
        return {
          reply: finalReply,
          suggestions: ['🛒 Order Book Karna Hai', '💳 Payment Details', '🥟 Full Menu', '🛵 Delivery Areas'],
          action: null
        };
      }
    } catch (err) {
      console.warn(`[AI Engine:Groq] ${modelName} error:`, err.message);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// GEMINI FALLBACK ENGINE — used if Groq is unavailable
// ---------------------------------------------------------------------------
async function generateGeminiResponseAsync(userMessage, conversationHistory = [], customerPhone = '', messageId = '') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('[AI Engine:Gemini] GEMINI_API_KEY is not configured in environment variables.');
    return {
      reply: 'Maafi chahte hain, AI service abhi temporarily unavailable hai. Thodi der baad dobara try karein, ya seedha call karein: 0336-2438422',
      suggestions: [],
      action: null
    };
  }

  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview'
  ];
  const systemPrompt = buildSystemPrompt();

  // Build conversation contents
  const contentsPayload = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Ji bilkul! Main New Hyderi Nimco & Frozen ka AI Agent hoon. Main MongoDB se live prices check kar ke aapki madad karunga.' }] }
  ];

  // Append history (last 20 messages)
  for (const msg of (conversationHistory || [])) {
    contentsPayload.push({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || '' }]
    });
  }

  // Append current user message
  contentsPayload.push({ role: 'user', parts: [{ text: userMessage }] });

  for (const modelName of modelsToTry) {
    try {
      let currentContents = [...contentsPayload];
      let finalReply = null;

      // Agentic loop: up to 6 tool-call rounds
      for (let round = 0; round < 6; round++) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const body = {
          contents: currentContents,
          tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024
          }
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(30000)
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`[AI Engine:Gemini] Gemini ${modelName} HTTP ${res.status}:`, errText.slice(0, 200));
          break; // try next model
        }

        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const content = candidate?.content;

        if (!content || !content.parts) break;

        // Check for function calls in this response
        const functionCallParts = content.parts.filter(p => p.functionCall);
        const textParts = content.parts.filter(p => p.text && p.text.trim());

        if (functionCallParts.length === 0) {
          // No more tool calls — this is the final text response
          finalReply = textParts.map(p => p.text).join('\n').trim();
          break;
        }

        // Execute all tool calls in this round
        currentContents.push({ role: 'model', parts: content.parts });

        const toolResultParts = [];
        for (const fcPart of functionCallParts) {
          const { name: toolName, args: toolArgs } = fcPart.functionCall;
          console.log(`[AI Tool:Gemini] Calling: ${toolName}(${JSON.stringify(toolArgs).slice(0, 150)})`);

          const toolResult = await executeToolCall(toolName, toolArgs || {}, customerPhone);
          console.log(`[AI Tool:Gemini] ${toolName} result:`, JSON.stringify(toolResult).slice(0, 200));

          toolResultParts.push({
            functionResponse: {
              name: toolName,
              response: toolResult
            }
          });
        }

        currentContents.push({ role: 'user', parts: toolResultParts });
      }

      if (finalReply && finalReply.length > 0) {
        console.log(`[AI Engine:Gemini] ${modelName} responded successfully (${finalReply.length} chars)`);
        return {
          reply: finalReply,
          suggestions: ['🛒 Order Book Karna Hai', '💳 Payment Details', '🥟 Full Menu', '🛵 Delivery Areas'],
          action: null
        };
      }

    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'TimeoutError') {
        console.error(`[AI Engine:Gemini] Gemini ${modelName} timed out after 30s`);
      } else {
        console.error(`[AI Engine:Gemini] Gemini ${modelName} error:`, err.message);
      }
    }
  }

  // All Gemini models failed — return clean unavailable message
  console.error('[AI Engine] All AI models failed. Returning service-unavailable message.');
  return {
    reply: 'Maafi chahte hain, AI service abhi temporarily unavailable hai. Thodi der baad dobara try karein, ya seedha call karein: 0336-2438422 | 021-36625698',
    suggestions: [],
    action: null
  };
}

// ---------------------------------------------------------------------------
// MAIN AI ENGINE ENTRYPOINT — Groq Primary (Super Fast) + Gemini Fallback
// ---------------------------------------------------------------------------
export async function generateAIResponseAsync(userMessage, conversationHistory = [], customerPhone = '', messageId = '') {
  // 1. Try Groq first for lightning-fast sub-second response & massive free quota
  if (process.env.GROQ_API_KEY) {
    try {
      const groqResult = await generateGroqResponseAsync(userMessage, conversationHistory, customerPhone, messageId);
      if (groqResult && groqResult.reply) {
        return groqResult;
      }
    } catch (err) {
      console.warn('[AI Engine] Groq primary failed, falling back to Gemini:', err.message);
    }
  }

  // 2. Fallback to Gemini if Groq is not configured or failed
  return await generateGeminiResponseAsync(userMessage, conversationHistory, customerPhone, messageId);
}

// ---------------------------------------------------------------------------
// LEGACY EXPORTS — kept for compatibility with any non-WhatsApp callers
// These are NOT reachable from the WhatsApp message flow.
// ---------------------------------------------------------------------------
export async function getLiveProducts() {
  if (!isDBConnected()) return [];
  try {
    return await withTimeout(Product.find({}, { _id: 0, __v: 0 }).lean(), 5000);
  } catch (e) {
    return [];
  }
}

/**
 * generateAIResponse — LEGACY RULE ENGINE.
 * NOT called from WhatsApp flow. Exists only for backward compatibility.
 * @deprecated Use generateAIResponseAsync instead.
 */
export function generateAIResponse(userMessage, conversationHistory = [], products = []) {
  // Intentionally returns a service-unavailable response.
  // This function is NOT reachable from the WhatsApp message handler.
  console.warn('[AI Engine] generateAIResponse() called — this is a legacy function and should not be reached from WhatsApp flow.');
  return {
    reply: 'Maafi chahte hain, AI service abhi temporarily unavailable hai. Call karein: 0336-2438422',
    suggestions: [],
    action: null
  };
}
