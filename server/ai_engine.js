// Ultimate Conversational AI Sales & Customer Care Agent for New Hyderi Nimco & Frozen
// Powered by Google Gemini Flash + MongoDB Atlas Live Catalog + Per-Customer Multi-Turn Conversation Memory

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KNOWLEDGE_BASE_QA } from './knowledge_qa.js';
import { Product } from './models/Product.js';
import { isDBConnected } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 1. LIVE PRODUCT DATA PROVIDER
 * Primary Source of Truth: MongoDB Atlas
 * Fallback: Local server/data/products.json
 */
export async function getLiveProducts() {
  if (isDBConnected()) {
    try {
      const dbProducts = await Product.find({}, { _id: 0, __v: 0 }).lean();
      if (dbProducts && dbProducts.length > 0) {
        return dbProducts;
      }
    } catch (err) {
      console.error('[AI Engine] MongoDB live products fetch error:', err.message);
    }
  }

  // Fallback to local JSON if MongoDB is offline or uninitialized
  try {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    if (fs.existsSync(productsPath)) {
      const data = fs.readFileSync(productsPath, 'utf8');
      return JSON.parse(data || '[]');
    }
  } catch (e) {
    console.error('[AI Engine] Local products JSON fallback error:', e.message);
  }

  return [];
}

/**
 * Reads settings.json safely
 */
function getSettings() {
  try {
    const settingsPath = path.join(__dirname, 'data', 'settings.json');
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
    }
  } catch (e) {}
  return {};
}

/**
 * Semantic & Keyword Similarity Matcher against 350+ Patterns
 */
function findQAMatch(normalizedQuery) {
  const q = normalizedQuery.toLowerCase();
  let bestMatch = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE_QA) {
    for (const pattern of entry.patterns) {
      if (q === pattern) {
        return entry; // 100% exact match
      }
      if (q.includes(pattern)) {
        const score = pattern.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = entry;
        }
      }
    }
  }

  if (bestMatch && bestScore >= 6) {
    return bestMatch;
  }

  return null;
}

/**
 * Typo & Slang Normalization Dictionary for Pakistani Roman Urdu
 */
const TYPO_MAP = {
  'jara': 'zara',
  'zra': 'zara',
  'karonag': 'karonga',
  'kronga': 'karonga',
  'krunga': 'karonga',
  'karunga': 'karonga',
  'karenga': 'karein',
  'krna': 'karna',
  'kro': 'karo',
  'btao': 'batao',
  'btado': 'batao',
  'bataien': 'batao',
  'batayein': 'batao',
  'prce': 'price',
  'priz': 'price',
  'qeemat': 'price',
  'keemat': 'price',
  'qemat': 'price',
  'retes': 'rates',
  'ret': 'rate',
  'discnt': 'discount',
  'dicount': 'discount',
  'discont': 'discount',
  'riayat': 'discount',
  'qnty': 'quantity',
  'quantiy': 'quantity',
  'chkn': 'chicken',
  'chiken': 'chicken',
  'chikn': 'chicken',
  'chickn': 'chicken',
  'smosa': 'samosa',
  'smose': 'samosa',
  'samose': 'samosa',
  'samosay': 'samosa',
  'smosay': 'samosa',
  'kbab': 'kabab',
  'kbaab': 'kabab',
  'kebab': 'kabab',
  'kebabs': 'kabab',
  'rol': 'roll',
  'rols': 'roll',
  'rolls': 'roll',
  'piza': 'pizza',
  'pza': 'pizza',
  'momo': 'momos',
  'nuget': 'nuggets',
  'nugets': 'nuggets',
  'nugget': 'nuggets'
};

function normalizeText(text) {
  const raw = (text || '').toString().trim();
  let normalized = raw.toLowerCase()
    .replace(/[^\w\s\d\u0600-\u06FF]/gi, ' ')
    .replace(/\s+/g, ' ');

  const words = normalized.split(' ').map(w => TYPO_MAP[w] || w);
  normalized = words.join(' ');

  return { raw, normalized, words };
}

function detectLanguage(raw, normalized) {
  if (/[\u0600-\u06FF]/.test(raw)) return 'urdu_script';
  const englishWords = ['price', 'rate', 'menu', 'delivery', 'order', 'location', 'address', 'total', 'bill', 'discount'];
  const isEng = englishWords.some(w => normalized.includes(w));
  if (isEng && !normalized.includes('hai') && !normalized.includes('kaise') && !normalized.includes('kya')) return 'english';
  return 'roman_urdu';
}

function findMatchingProducts(normalized, products) {
  if (!products || !Array.isArray(products) || products.length === 0) return { isCategory: false, items: [] };

  const q = normalized.toLowerCase();
  
  // Specific item token matching FIRST (before general category fallback)
  const matched = products.filter(p => {
    const pName = (p.name || '').toLowerCase();
    const pUrdu = (p.nameUrdu || '').toLowerCase();
    const pId = (p.id || '').toLowerCase();
    
    // Direct string match
    if (q.includes(pName) || (pUrdu && q.includes(pUrdu)) || q.includes(pId)) return true;

    // Specific keyword token matchers
    if ((q.includes('nugget') || q.includes('nuggets')) && (pId.includes('nugget') || pName.includes('nugget'))) return true;
    if ((q.includes('cheese ball') || q.includes('cheese balls')) && (pId.includes('cheese-ball') || pName.includes('cheese ball'))) return true;
    if ((q.includes('momo') || q.includes('momos')) && (pId.includes('momo') || pName.includes('momo'))) return true;
    if ((q.includes('wonton') || q.includes('vonton')) && (pId.includes('vonton') || pName.includes('vonton'))) return true;
    if (q.includes('chapli') && (pId.includes('chapli') || pName.includes('chapli'))) return true;
    if (q.includes('seekh') && (pId.includes('seekh') || pName.includes('seekh'))) return true;
    if (q.includes('malai boti') && (pId.includes('malai') || pName.includes('malai'))) return true;

    return false;
  });

  if (matched.length > 0) {
    return { isCategory: false, title: 'Matched Items', items: matched };
  }

  // Category fallback if no specific item matched
  if (q.includes('samosa') || q.includes('samosay') || q.includes('smosa')) {
    const items = products.filter(p => p.category === 'samosa');
    if (items.length > 0) return { isCategory: true, title: 'Samosay', items };
  }
  if (q.includes('roll') || q.includes('rolls') || q.includes('rol')) {
    const items = products.filter(p => p.category === 'roll');
    if (items.length > 0) return { isCategory: true, title: 'Spring & Specialty Rolls', items };
  }
  if (q.includes('kabab') || q.includes('kebab') || q.includes('shami')) {
    const items = products.filter(p => p.category === 'kabab');
    if (items.length > 0) return { isCategory: true, title: 'Kababs & Special Snacks', items };
  }
  if (q.includes('pizza') || q.includes('pizzas')) {
    const items = products.filter(p => p.category === 'pizza');
    if (items.length > 0) return { isCategory: true, title: 'Mini Pizzas', items };
  }
  if (q.includes('deal') || q.includes('combo') || q.includes('package')) {
    const items = products.filter(p => p.isDeal || p.category === 'deals');
    if (items.length > 0) return { isCategory: true, title: 'Super Saver & Premium Deals', items };
  }

  return { isCategory: false, title: 'Items', items: [] };
}

function parseCustomerOrderList(userMessage, products) {
  const lines = userMessage.toLowerCase().split(/[\n,.]+/);
  const itemsFound = [];

  for (const line of lines) {
    const qMatch = line.match(/(\d+)\s*(packet|pack|pcs|pc|x|karo|bhej do)?/i);
    let qty = qMatch ? parseInt(qMatch[1]) : 1;

    for (const prod of products) {
      const prodName = prod.name.toLowerCase();
      const prodUrdu = (prod.nameUrdu || '').toLowerCase();
      const prodId = prod.id.toLowerCase();

      if (line.includes(prodName) || (prodUrdu && line.includes(prodUrdu)) || line.includes(prodId)) {
        const existingIdx = itemsFound.findIndex(i => i.product.id === prod.id);
        if (existingIdx !== -1) {
          itemsFound[existingIdx].quantity += qty;
          itemsFound[existingIdx].itemTotal = itemsFound[existingIdx].quantity * prod.price;
        } else {
          itemsFound.push({
            product: prod,
            quantity: qty,
            itemTotal: qty * prod.price
          });
        }
        break;
      }
    }
  }

  return itemsFound;
}

/**
 * 2. PRIMARY AI ENGINE: GOOGLE GEMINI FLASH (WITH MULTI-TURN CONVERSATION MEMORY)
 */
export async function generateAIResponseAsync(userMessage, conversationHistory = []) {
  const products = await getLiveProducts();
  const settings = getSettings();
  const apiKey = process.env.GEMINI_API_KEY || settings.geminiApiKey;

  if (apiKey) {
    try {
      const catalogSummary = products.map(p => {
        const avail = p.isAvailable === false ? '[CURRENTLY OUT OF STOCK ❌]' : '[AVAILABLE ✅]';
        return `- ID: "${p.id}" | ${p.name} (${p.nameUrdu || ''}) | Pack: ${p.packQuantity} | Price: Rs. ${p.price} | Status: ${avail} ${p.badge ? '| Badge: ' + p.badge : ''}`;
      }).join('\n');

      const systemPrompt = `You are the official AI Sales & Customer Care Agent for "New Hyderi Nimco & Frozen Foods (Since 1970)" on WhatsApp.
Your goal is to act like a real, helpful, respectful Pakistani sales employee. Speak warm, respectful Roman Urdu (or Urdu/English if customer speaks in Urdu/English). Use customer-friendly greetings ("Wa Alaikum Assalam 😊 Hyderi Nimco & Frozen mein khushamdeed!").

NON-NEGOTIABLE PRICE & AVAILABILITY RULES:
1. NEVER INVENT OR HALLUCINATE A PRODUCT PRICE, AVAILABILITY, OR PACK SIZE.
2. Rely strictly on the LIVE PRODUCTS CATALOG provided below.
3. If an item is [CURRENTLY OUT OF STOCK ❌], tell the customer politely that it is unavailable and suggest an available alternative.
4. When stating a price, always state the exact current catalog price and pack size (e.g. "Chicken Nuggets 12 pcs pack — Rs. 450").
5. When calculating totals, do exact arithmetic: (Quantities × Unit Prices) + Delivery Fee = Grand Total.
6. Free Delivery applies to orders of Rs. 5,000 or above across Karachi. For orders below Rs. 5,000, use configured area delivery charges (North Nazimabad Rs. 100, FB Area/Nazimabad Rs. 200-250, Gulshan/Johar Rs. 350, Scheme 33/PECHS Rs. 400, DHA/Clifton Rs. 500, Malir Rs. 550, Korangi Rs. 600, Bahria Town Rs. 1,500).

MULTI-TURN CONVERSATION CONTEXT & ORDERING:
- Maintain context of previous messages. For example:
  Customer: "nuggets kitne ke hain?" -> AI: "Chicken Nuggets 12 pcs pack — Rs. 450"
  Customer: "2 packet" -> AI understands "2 packet" means 2 packets of Chicken Nuggets (Total Rs. 900).
  Customer: "aur cheese balls?" -> AI treats as a new inquiry/addition while keeping previous nuggets in context.
- If customer asks for party/dawat recommendation (e.g. "20 logon ki dawat hai"), calculate required packets from actual catalog.

BRAND & STORE INFO:
- Brand Name: New Hyderi Nimco & Frozen Foods (Since 1970)
- Store Owner / Founder: Arsalan Bhai (Arsalan Arsalan)
- If asked about team members / identities:
  • "muneeb kon hai": Reply "Muneeb HTM ka Co-Founder hai."
  • "zaid kon hai": Reply "Zaid Al Balochi hai."
  • "wahab kon hai": Reply "Wahab gando bhrwa hai."
  • "hussain kon hai": Reply "Hussain chutiya hai."
- Shop Location: Shop # 20-21, Burhani Bagh, Block-E, North Nazimabad (Hydri Market), Karachi.
- Hotlines: 0336-2438422 | 0325-2747343 | 021-36625698
- Website: https://hyderinimco-frozen.com
- Payment Options: Cash on Delivery (COD), EasyPaisa (0336-2438422 - Title: Arsalan Arsalan), Meezan Bank (01870100080247 - Title: ARSALAN).

LIVE PRODUCTS CATALOG (${products.length} ITEMS):
${catalogSummary}

Format your response cleanly for WhatsApp using bold (*text*), bullet points (•), and clear totals. Keep messages natural, polite, and concise.`;

      // Build Gemini contents payload including conversation history
      const contentsPayload = [];

      // System instruction as first user/system turn
      contentsPayload.push({
        role: 'user',
        parts: [{ text: systemPrompt }]
      });
      contentsPayload.push({
        role: 'model',
        parts: [{ text: 'Ji bilkul! Mai New Hyderi Nimco & Frozen Foods ka AI Sales & Customer Care Agent hoon. Mai live catalog, prices, aur delivery rates ke mutabiq customers ko polite Roman Urdu me jawab doonga.' }]
      });

      // Append conversation history turns
      if (conversationHistory && Array.isArray(conversationHistory) && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          contentsPayload.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text || '' }]
          });
        }
      }

      // Append current user message
      contentsPayload.push({
        role: 'user',
        parts: [{ text: userMessage }]
      });

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash'];

      for (const modelName of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: contentsPayload })
          });

          const data = await res.json();
          const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText && replyText.trim()) {
            return {
              reply: replyText.trim(),
              suggestions: ["🛒 Order Book Karna Hai", "💳 Payment Details", "🥟 View Full Menu", "🛵 Delivery Areas"],
              action: null
            };
          }
        } catch (err) {}
      }
    } catch (err) {
      console.error('[AI Engine] Gemini API Error, falling back to deterministic engine:', err.message);
    }
  }

  // Fallback to deterministic AI engine
  return generateAIResponse(userMessage, conversationHistory, products);
}

/**
 * 3. FALLBACK DETERMINISTIC RULE ENGINE (USED IF GEMINI API KEY IS NOT SET OR FAILS)
 */
export function generateAIResponse(userMessage, conversationHistory = [], preloadedProducts = null) {
  const products = preloadedProducts || (isDBConnected() ? [] : getKnowledgeProducts());
  const { raw, normalized, words } = normalizeText(userMessage);
  const lang = detectLanguage(raw, normalized);

  const has = (k) => normalized.includes(k);
  const hasAny = (list) => list.some(k => normalized.includes(k));

  // Multi-turn context extraction: Check if user is supplying quantity for previously asked product
  let lastProduct = null;
  if (conversationHistory && conversationHistory.length > 0) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      const msg = conversationHistory[i];
      const match = findMatchingProducts(normalizeText(msg.text).normalized, products);
      if (match.items && match.items.length > 0) {
        lastProduct = match.items[0];
        break;
      }
    }
  }

  // Check if message is a quantity response e.g. "2 packet", "2 packet chahiye", "2 pack", "do packet"
  const qtyMatch = normalized.match(/^(\d+)\s*(packet|pack|pcs|pc|x|chahiye|de do|karo)?$/i) ||
                   normalized.match(/^(do|teen|chaar|paanch|che)\s*(packet|pack|pcs)?$/i);
  
  if (qtyMatch && lastProduct) {
    let qty = 1;
    if (qtyMatch[1] === 'do') qty = 2;
    else if (qtyMatch[1] === 'teen') qty = 3;
    else if (qtyMatch[1] === 'chaar') qty = 4;
    else if (qtyMatch[1] === 'paanch') qty = 5;
    else qty = parseInt(qtyMatch[1]) || 1;

    const total = qty * lastProduct.price;
    const isFreeDelivery = total >= 5000;
    const deliveryFee = isFreeDelivery ? 0 : 150;
    const grandTotal = total + deliveryFee;

    let replyMsg = `Ji bilkul! ${qty} packets *${lastProduct.name}* (${lastProduct.packQuantity}) noted. 👍\n\n` +
      `• Rate: Rs. ${lastProduct.price} × ${qty} = *Rs. ${total}/-*\n` +
      `• Delivery Fee: ${isFreeDelivery ? '🎉 *FREE*' : 'Rs. 150/-'}\n` +
      `• *Total Bill:* *Rs. ${grandTotal}/-*\n\n` +
      `Aur kuch add karna hai ya order confirm kar dein? COD (Cash on Delivery) ke liye apna delivery address bhej dein! 🥟✨`;

    return {
      reply: replyMsg,
      suggestions: ["✅ Confirm Order (COD)", "💳 Payment Details", "🥟 View Full Menu"],
      action: 'scroll_menu'
    };
  }

  const matchedCatalog = findMatchingProducts(normalized, products);

  // ROUTE 0-BILL: DYNAMIC MULTI-ITEM ORDER & TOTAL BILL CALCULATOR
  const parsedItems = parseCustomerOrderList(userMessage, products);
  const isAskingTotal = hasAny(['total', 'kitne huwe', 'kitne hue', 'kitna bana', 'kitne paise', 'kitne banenge', 'bill', 'hisab', 'batao kitna', 'batao kitne', 'kitna hua']);
  const isOrder = hasAny(['order karna', 'order confirm', 'order book', 'order place', 'mangwana', 'kharidna', 'bhej do', 'bhejo', 'deliver karo', 'pack karo']);

  if (parsedItems.length > 0 && (parsedItems.length >= 2 || isAskingTotal || isOrder)) {
    const subtotal = parsedItems.reduce((sum, item) => sum + item.itemTotal, 0);
    const isFreeDelivery = subtotal >= 5000;
    const deliveryFee = isFreeDelivery ? 0 : 150;
    const grandTotal = subtotal + deliveryFee;

    let itemsBreakdown = parsedItems.map(item => {
      return `• *${item.quantity}x ${item.product.name}* (${item.product.packQuantity})\n  Rate: Rs. ${item.product.price} × ${item.quantity} = *Rs. ${item.itemTotal}/-*`;
    }).join('\n');

    let replyMsg = `Ji bilkul bhai! Aapke order ka mukammal hisab aur total bill ye raha: 🧾🥟✨\n\n` +
      `📋 *Order Items Breakdown:*\n` +
      `${itemsBreakdown}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🛒 *Subtotal:* Rs. ${subtotal}/-\n` +
      `🛵 *Delivery Charges:* ${isFreeDelivery ? '🎉 *FREE* (Order Rs. 5,000+ par Free)' : 'Rs. 150/- (Poore Karachi me)'}\n` +
      `💰 *Grand Total (Kul Raqam):* *Rs. ${grandTotal}/-*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🛵 *Order Book Karne Ke Liye:*\n` +
      `Bas apna *Delivery Address* aur *Naam* yahan bhej dein. COD (Cash on Delivery) par deliver ho jayega!`;

    return {
      reply: replyMsg,
      suggestions: ["✅ Confirm Order (COD)", "📱 Pay via EasyPaisa", "🥟 Add More Items"],
      action: 'scroll_menu'
    };
  }

  // ROUTE BAHRIA: BAHRIA TOWN KARACHI DELIVERY
  if (hasAny(['bahria', 'bahria town', 'bahria city'])) {
    return {
      reply: `Ji bilkul bhai! Hyderi Nimco & Frozen ki delivery *Bahria Town Karachi* me bhi bilkul dastiyab hai! 🚚📦✨\n\n` +
        `🧊 *Bahria Town Express Chilled Delivery Details:*\n` +
        `• Bahria Town ke liye hum special Temperature-Controlled Cold Box me fresh frozen items rider ke zariye bhejte hain.\n` +
        `• 💰 *Delivery Charges:* Distance aur chilled packing ki wajah se Bahria Town ke delivery charges *Rs. 1,500/-* hotay hain.\n\n` +
        `Order book karne ke liye required items, packets ki taadad aur Bahria Town ka Precinct number bhej dein! 🥟✨`,
      suggestions: ["🛒 Order Book Karna Hai", "💳 EasyPaisa Details", "🥟 View Menu"],
      action: null
    };
  }

  // ROUTE 0: KNOWLEDGE BASE DIRECT HIT
  const qaMatch = findQAMatch(normalized);
  if (qaMatch) {
    return {
      reply: qaMatch.answer,
      suggestions: ["🥟 Chicken Samosay", "🌯 Spring Rolls", "💵 Cash on Delivery", "🛒 Order Now"],
      action: null
    };
  }

  // ROUTE B: SPECIFIC PRODUCT OR CATEGORY INQUIRY
  if (matchedCatalog && matchedCatalog.items && matchedCatalog.items.length > 0) {
    const list = matchedCatalog.items.map(p => {
      const statusStr = p.isAvailable === false ? ' [Out of Stock ❌]' : '';
      return `• *${p.name}* (${p.packQuantity}) — *Rs. ${p.price}/-*${statusStr}`;
    }).join('\n');

    return {
      reply: `Ji bilkul bhai! Ye lijiye rate details: 🥟✨\n\n` +
        `${list}\n\n` +
        `✨ *100% Fresh & Frozen:* Temperature-controlled cold box me pack ho kar deliver hota hai.\n` +
        `🛵 *Free Delivery:* Rs. 5,000 par poore Karachi me Delivery FREE!\n\n` +
        `Order book karne ke liye packets ki taadad aur apna delivery address bhej dein!`,
      suggestions: ["🛒 Order Book Karna Hai", "🥟 View Full Menu", "💵 Cash on Delivery"],
      action: 'scroll_menu'
    };
  }

  // ROUTE N: PURE GREETING
  const isPureGreeting = words.length <= 2 && hasAny(['hi', 'hello', 'salam', 'assalam', 'aoa', 'hey', 'adaab']);
  if (isPureGreeting) {
    return {
      reply: `Wa Alaikum Assalam 😊 Hyderi Nimco & Frozen (Since 1970) mein khushamdeed! 🥟✨\n\nBatayein bhai, aap ko kis item ya deal ke bare mein maloomat chahiye? Mai aapki mukammal madad kar sakta hoon!`,
      suggestions: ["🥟 Samosay & Rolls", "🎁 Bulk Discounts", "💵 Cash on Delivery", "🛒 Order Kaise Karein"],
      action: null
    };
  }

  // DEFAULT AGENT RESPONSE
  return {
    reply: `Ji zaroor bhai! Mai aapki poori madad kar sakta hoon 🥟✨\n\nAapko hamare frozen Samosay (Chicken, Malai Boti, Cheese, Qeema, Aaloo), Spring Rolls, Kababs, Mini Pizzas ya Nimco ke hawale se kya jankari chahiye? Mujhe batayein aapko kitne packets chahiye, mai abhi total bill aur delivery details bata deta hoon!`,
    suggestions: ["🛒 Order Book Karna Hai", "💳 Payment Details", "🥟 Full Price List", "🛵 Delivery Areas"],
    action: null
  };
}

function getKnowledgeProducts() {
  try {
    const productsPath = path.join(__dirname, 'data', 'products.json');
    if (fs.existsSync(productsPath)) {
      return JSON.parse(fs.readFileSync(productsPath, 'utf8') || '[]');
    }
  } catch (e) {}
  return [];
}
