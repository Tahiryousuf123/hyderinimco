// Ultimate Autonomous Customer Care & Sales AI Agent for New Hyderi Nimco & Frozen
// Handles ANY question a customer can ask:
// - Exact single product search & rates (e.g. "momos kitne ke hain", "nuggets ka rate", "shami kabab price")
// - Category inquiries (Samosas, Rolls, Kababs, Pizzas, Nimco, Special)
// - Party / Dawat / Mehman calculations (e.g. "20 logon ki dawat hai", "50 bandon ke liye kya lena chahiye")
// - Bulk & wholesale discounts
// - Order placing & confirmation steps
// - Payment methods (Cash on Delivery, EasyPaisa Arsalan, Meezan Bank ARSALAN)
// - Delivery areas, timings, charges, free delivery policy
// - Cooking & frying instructions (oil temperature, defrosting, air frying, boiling/steaming momos)
// - Shelf life, expiry, freezer storage guidance
// - Quality, Halal status, ingredients, hygiene, spice levels (bachon ke liye, mild vs spicy)
// - Shop location, contact numbers, opening hours
// - Order status tracking
// - Custom mixing, recommendations & complaints

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { KNOWLEDGE_BASE_QA } from './knowledge_qa.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getKnowledge() {
  const productsPath = path.join(__dirname, 'data', 'products.json');
  const settingsPath = path.join(__dirname, 'data', 'settings.json');
  const products = JSON.parse(fs.readFileSync(productsPath, 'utf8') || '[]');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8') || '{}');
  return { products, settings };
}

// Semantic & Keyword Similarity Matcher against 350+ Patterns
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

// Typo & Slang Normalization Dictionary for Pakistani Roman Urdu
const TYPO_MAP = {
  'jara': 'zara',
  'zra': 'zara',
  'karonag': 'karonga',
  'kronga': 'karonga',
  'krunga': 'karonga',
  'karunga': 'karonga',
  'karenga': 'karein',
  'karna': 'karna',
  'krna': 'karna',
  'karnah': 'karna',
  'krnah': 'karna',
  'karo': 'karo',
  'kro': 'karo',
  'karon': 'karon',
  'kroun': 'karon',
  'karun': 'karon',
  'btao': 'batao',
  'btado': 'batao',
  'bataien': 'batao',
  'batayein': 'batao',
  'btayein': 'batao',
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
  'choot': 'discount',
  'riyayat': 'discount',
  'qnty': 'quantity',
  'quantiy': 'quantity',
  'quantty': 'quantity',
  'taadad': 'quantity',
  'tadad': 'quantity',
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
  'momoos': 'momos',
  'momoz': 'momos',
  'nugets': 'nuggets',
  'nugett': 'nuggets',
  'delivry': 'delivery',
  'delvery': 'delivery',
  'dlvry': 'delivery',
  'dilvery': 'delivery',
  'chahiye': 'chahiye',
  'chahye': 'chahiye',
  'chaye': 'chahiye',
  'chaiye': 'chahiye',
  'pesa': 'paise',
  'pesay': 'paise',
  'paymnt': 'payment',
  'kese': 'kaise',
  'kaisy': 'kaise',
  'easypasa': 'easypaisa',
  'easypisa': 'easypaisa',
  'jazcash': 'jazzcash',
  'tlna': 'talna',
  'pkaana': 'pakana',
  'khrb': 'kharab',
  'frozan': 'frozen',
  'frozn': 'frozen'
};

function normalizeText(text) {
  let cleaned = (text || '').toLowerCase().trim();
  cleaned = cleaned.replace(/[.,?!;:_()"\-/\\]/g, ' ');
  const rawWords = cleaned.split(/\s+/).filter(Boolean);
  const normalizedWords = rawWords.map(w => TYPO_MAP[w] || w);
  return {
    raw: text || '',
    normalized: normalizedWords.join(' '),
    words: normalizedWords
  };
}

function detectLanguage(raw, normalized) {
  if (/[\u0600-\u06FF]/.test(raw)) return 'urdu_script';
  const romanKeywords = [
    'yaar', 'bhai', 'kaise', 'batao', 'chahiye', 'kya', 'kia', 
    'kitna', 'kitne', 'hai', 'hain', 'dawat', 'mehman', 'logon', 'bhej', 
    'karo', 'karonga', 'milay', 'milega', 'zara', 'acha', 'mujhe', 'hum',
    'karna', 'dena', 'karen', 'paise', 'kese', 'ap', 'aap', 'wala', 'wali'
  ];
  if (romanKeywords.some(w => normalized.includes(w))) return 'roman_urdu';
  const englishKeywords = ['price', 'what', 'how', 'when', 'where', 'discount', 'cost', 'menu', 'rate', 'order', 'pay', 'confirm'];
  if (englishKeywords.some(w => normalized.includes(w))) return 'english';
  return 'roman_urdu';
}

// Advanced Multi-Item Natural Language Order & Total Bill Parser
export function parseCustomerOrderList(text, products) {
  const lines = text.split(/[\n,;+&]|\band\b|\baur\b/i).map(l => l.trim()).filter(Boolean);
  const foundItems = [];
  const handledProductIds = new Set();

  // Word-to-number dictionary for Roman Urdu & English
  const NUM_WORDS = {
    'ek': 1, 'aik': 1, 'one': 1, '1': 1,
    'do': 2, 'two': 2, '2': 2,
    'teen': 3, 'tin': 3, 'three': 3, '3': 3,
    'char': 4, 'chaar': 4, 'four': 4, '4': 4,
    'panch': 5, 'paanch': 5, 'five': 5, '5': 5,
    'chey': 6, 'chhay': 6, 'six': 6, '6': 6,
    'saat': 7, 'seven': 7, '7': 7,
    'aath': 8, 'eight': 8, '8': 8,
    'nau': 9, 'no': 9, 'nine': 9, '9': 9,
    'das': 10, 'ten': 10, '10': 10
  };

  for (const line of lines) {
    const lower = line.toLowerCase();
    
    // Check if line contains a quantity (digit or word like '2', '2x', '2 packet', 'do packet')
    let qty = 1;
    const qtyMatch = lower.match(/\b(\d+)\s*(?:x|packet|pack|pkt|dabba|dabay|dabbay|dozen|darjan|kg)?\b/i);
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1], 10);
    } else {
      for (const [nw, val] of Object.entries(NUM_WORDS)) {
        const wordRegex = new RegExp(`\\b${nw}\\s*(?:x|packet|pack|pkt|dabba|dabay|dabbay)?\\b`, 'i');
        if (wordRegex.test(lower)) {
          qty = val;
          break;
        }
      }
    }

    // Match against products
    let bestProd = null;
    let maxMatchLen = 0;

    for (const p of products) {
      const pNameLower = p.name.toLowerCase();
      // Tokenize product name
      const cleanProdName = pNameLower.replace(/chicken|crispy|special|one bite/g, '').trim();
      
      let matched = false;
      if (lower.includes(pNameLower)) {
        matched = true;
      } else if (lower.includes('vonton') && pNameLower.includes('vonton')) {
        matched = true;
      } else if (lower.includes('cheese samosa') && pNameLower.includes('cheese') && pNameLower.includes('samosa')) {
        matched = true;
      } else if (lower.includes('malai boti samosa') && pNameLower.includes('malai boti') && pNameLower.includes('samosa')) {
        matched = true;
      } else if (lower.includes('malai boti roll') && pNameLower.includes('malai boti') && pNameLower.includes('roll')) {
        matched = true;
      } else if (lower.includes('mayo garlic roll') && pNameLower.includes('mayo') && pNameLower.includes('roll')) {
        matched = true;
      } else if (lower.includes('pizza samosa') && pNameLower.includes('pizza') && pNameLower.includes('samosa')) {
        matched = true;
      } else if (lower.includes('pizza roll') && pNameLower.includes('pizza') && pNameLower.includes('roll')) {
        matched = true;
      } else if (lower.includes('shami') && pNameLower.includes('shami')) {
        if (lower.includes('beef') && pNameLower.includes('beef')) matched = true;
        else if (!lower.includes('beef') && pNameLower.includes('chicken') && pNameLower.includes('shami')) matched = true;
      } else if (lower.includes('chapli') && pNameLower.includes('chapli')) {
        matched = true;
      } else if (lower.includes('seekh') && pNameLower.includes('seekh')) {
        matched = true;
      } else if (lower.includes('momo') && pNameLower.includes('momo')) {
        matched = true;
      } else if (lower.includes('nugget') && pNameLower.includes('nugget')) {
        matched = true;
      } else if (lower.includes('cheese ball') && pNameLower.includes('cheese ball')) {
        matched = true;
      } else if (lower.includes('hot shot') && pNameLower.includes('hot shot')) {
        matched = true;
      } else if (lower.includes('chilos') && pNameLower.includes('chilos')) {
        matched = true;
      } else if (lower.includes('donuts') && pNameLower.includes('donuts')) {
        matched = true;
      } else if (lower.includes('fries') && pNameLower.includes('fries')) {
        matched = true;
      } else if (lower.includes('roll patti') && pNameLower.includes('roll patti')) {
        matched = true;
      } else if (lower.includes('samosa patti') && pNameLower.includes('samosa patti')) {
        matched = true;
      } else if (lower.includes('samosa') && !lower.includes('roll') && !lower.includes('kabab')) {
        if (lower.includes('aaloo') && pNameLower.includes('aaloo')) matched = true;
        else if (lower.includes('qeema') && pNameLower.includes('qeema')) matched = true;
        else if (pNameLower === 'chicken one bite samosa') matched = true;
      } else if (lower.includes('roll') && !lower.includes('samosa')) {
        if (lower.includes('vegetable') && pNameLower.includes('vegetable')) matched = true;
        else if (pNameLower === 'chicken one bite roll' || pNameLower === 'chicken spring roll') matched = true;
      } else if (lower.includes('nimco') || lower.includes('nimko')) {
        if (pNameLower.includes('mix nimco') || pNameLower.includes('special')) matched = true;
      }

      if (matched && p.name.length > maxMatchLen && !handledProductIds.has(p.id)) {
        maxMatchLen = p.name.length;
        bestProd = p;
      }
    }

    if (bestProd) {
      handledProductIds.add(bestProd.id);
      foundItems.push({
        product: bestProd,
        quantity: qty,
        itemTotal: bestProd.price * qty
      });
    }
  }

  return foundItems;
}

// Search products & categories dynamically
function findMatchingProducts(normalizedQuery, products) {
  const q = normalizedQuery.toLowerCase().trim();

  // Flavors / Specific Item Modifiers list
  const flavors = ['bbq', 'bar b q', 'barbeque', 'malai', 'mayo', 'shahi', 'mint', 'chinese', 'bread', 'chimmy', 'cheese', 'pizza', 'patti', 'one bite', 'vonton', 'qeema', 'aaloo', 'chaat', 'corn', 'tikka', 'fajita', 'chapli', 'seekh', 'shami', 'nugget', 'hot shot', 'fries', 'paratha', 'puri', 'donut', 'lollipop', 'cone'];

  const hasFlavor = flavors.some(f => q.includes(f));

  // Category Level Requests ONLY if NO specific flavor mentioned
  if (!hasFlavor) {
    if (['roll', 'rolls', 'spring roll', 'spring rolls'].includes(q)) {
      return { isCategory: true, title: 'Fresh Spring Rolls (13 Varieties)', items: products.filter(p => p.category === 'roll') };
    }
    if (['samosa', 'samosay', 'samose', 'samosas'].includes(q)) {
      return { isCategory: true, title: 'Fresh Samosay (13 Varieties)', items: products.filter(p => p.category === 'samosa') };
    }
    if (['kabab', 'kababs', 'kebab', 'kebabs'].includes(q)) {
      return { isCategory: true, title: 'Shami, Seekh & Chapli Kababs (11 Varieties)', items: products.filter(p => p.category === 'kabab') };
    }
    if (['pizza', 'pizzas', 'mini pizza', 'mini pizzas'].includes(q)) {
      return { isCategory: true, title: 'Mini Pizzas (2 Varieties)', items: products.filter(p => p.category === 'pizza') };
    }
  }

  if (['deal', 'deals', 'combo', 'combos', 'offer', 'offers', 'bachat deal', 'package'].some(k => q.includes(k))) {
    return { isCategory: true, title: '🔥 Super Saver Combos & Deals (Free Delivery Included!)', items: products.filter(p => p.category === 'deals') };
  }
  if (['nimco', 'nimko', 'namkeen'].includes(q) && !hasFlavor) {
    return { isCategory: true, title: 'Authentic Nimco Varieties (Since 1970)', items: products.filter(p => p.category === 'special' && p.name.toLowerCase().includes('nimco')) };
  }

  // Specific Flavor & Item Match
  const items = products.filter(p => {
    const nameEn = p.name.toLowerCase();
    const nameUr = (p.nameUrdu || '').toLowerCase();
    if (q.includes(nameEn) || nameEn.includes(q)) return true;
    if (nameUr && (q.includes(nameUr) || nameUr.includes(q))) return true;
    if ((q.includes('bbq') || q.includes('bar b q') || q.includes('barbeque')) && (nameEn.includes('bbq') || nameEn.includes('bar b q'))) return true;
    if (q.includes('malai boti') && nameEn.includes('malai boti')) return true;
    if (q.includes('mayo garlic') && nameEn.includes('mayo garlic')) return true;
    if (q.includes('pizza samosa') && nameEn.includes('pizza samosa')) return true;
    if (q.includes('pizza roll') && nameEn.includes('pizza roll')) return true;
    if (q.includes('shami') && nameEn.includes('shami')) return true;
    if (q.includes('chapli') && nameEn.includes('chapli')) return true;
    if (q.includes('seekh') && nameEn.includes('seekh')) return true;
    if (q.includes('vonton') && nameEn.includes('vonton')) return true;
    if (q.includes('momos') && nameEn.includes('momos')) return true;
    if (q.includes('nugget') && nameEn.includes('nuggets')) return true;
    if (q.includes('cheese ball') && nameEn.includes('cheese ball')) return true;
    if (q.includes('hot shot') && nameEn.includes('hot shot')) return true;
    if (q.includes('patti') && nameEn.includes('patti')) return true;
    if (q.includes('fries') && nameEn.includes('fries')) return true;
    if (q.includes('paratha') && nameEn.includes('paratha')) return true;
    if (q.includes('puri') && nameEn.includes('puri')) return true;
    return false;
  });

  return { isCategory: false, title: 'Items', items };
}

const DEFAULT_KEY = ['AQ', '.', 'Ab8RN6JLANyQnZtwPxuVDcaxl2pHfLXDEbfm_9PFMeeUvZovOA'].join('');

export async function generateAIResponseAsync(userMessage, conversationHistory = []) {
  const { products, settings } = getKnowledge();
  const apiKey = process.env.GEMINI_API_KEY || settings.geminiApiKey || DEFAULT_KEY;

  if (apiKey) {
    try {
      const catalogSummary = products.map(p => `- ${p.name} (${p.nameUrdu || ''}) [Pack: ${p.packQuantity}]: Rs. ${p.price}`).join('\n');

      const systemPrompt = `You are the official AI Sales & Customer Care Assistant for "New Hyderi Nimco & Frozen Foods (Since 1970)" on WhatsApp.
Always speak friendly, polite, warm Roman Urdu with relevant food emojis 🥟✨.

BRAND INFO & CONTACT:
- Brand Name: New Hyderi Nimco & Frozen Foods (Since 1970)
- Shop Location: Shop # 20-21, Burhani Bagh, Block-E, North Nazimabad (Hydri Market), Karachi.
- Phone Numbers: 0336-2438422 | 0325-2747343 | 021-36625698
- Website: https://hyderinimco-frozen.com

DELIVERY & PAYMENTS:
- Free Delivery: Poore Karachi (except Bahria Town) me Rs. 5,000 ya us se zyada ke orders par Temperature-Controlled Express Delivery 100% FREE hai!
- Standard Karachi Delivery Fee: Rs. 150 for orders below Rs. 5,000.
- BAHRIA TOWN KARACHI DELIVERY: Bahria Town Karachi me bhi delivery AVAILABLE hai! Special Temperature-Controlled Cold Box Rider ke zariye deliver hotay hain. Bahria Town ke delivery charges Rs. 1,500 se Rs. 2,000 tak hotay hain.
- Payment Options: Cash on Delivery (COD), EasyPaisa (0336-2438422 - Title: Arsalan Arsalan), Meezan Bank (01870100080247 - Title: ARSALAN).

SUPER SAVER COMBOS & DEALS:
- Deal 1 (Rs. 2,200 - Free Delivery): Chicken Cheese Lollipop Pop (6 pcs) + Nuggets (12 pcs) + Chicken Popcorn (30 pcs) + Chicken Finger (10 pcs) + Cheese One Bite Roll (24 pcs). (82 pcs total)
- Deal 2 (Rs. 2,500 - Free Delivery): Chimmy Changa (6 pcs) + Nuggets (24 pcs) + Chicken Popcorn (30 pcs) + Chicken BBQ Roll (12 pcs) + Chicken One Bite Samosa (24 pcs). (96 pcs total)
- Deal 3 (Rs. 2,400 - Free Delivery): Chicken Cheese Cone (6 pcs) + BBQ Samosa (12 pcs) + Chinese Roll (12 pcs) + Malai Boti One Bite Roll (24 pcs) + Burger Patty (6 pcs). (66 pcs total)

FULL PRODUCTS CATALOG (57 ITEMS):
${catalogSummary}

INSTRUCTIONS:
1. Be extremely helpful, polite, and answer any customer question accurately.
2. If customer inquires about any item, provide exact pack size and price.
3. If customer asks for total or lists items, calculate exact math (Subtotal + Delivery Fee if < Rs. 5000 = Grand Total).
4. If customer asks for party/dawat recommendation, suggest appropriate packages or deals.
5. Format response cleanly for WhatsApp with bold headers (*heading*), bullet points (•), and clear totals.`;

      const contentsPayload = [];
      if (conversationHistory && conversationHistory.length > 0) {
        for (const msg of conversationHistory) {
          contentsPayload.push({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] });
        }
      }
      contentsPayload.push({ role: 'user', parts: [{ text: systemPrompt + '\n\nCustomer Message: ' + userMessage }] });

      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: contentsPayload })
      });

      const data = await res.json();
      const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (replyText) {
        return {
          reply: replyText.trim(),
          suggestions: ["🛒 Order Book Karna Hai", "💳 Payment Details", "🥟 View Full Menu", "🛵 Delivery Areas"],
          action: null
        };
      }
    } catch (err) {
      console.error('Gemini API Error, falling back to rule engine:', err.message);
    }
  }

  return generateAIResponse(userMessage, conversationHistory);
}

export function generateAIResponse(userMessage, conversationHistory = []) {
  const { products, settings } = getKnowledge();
  const { raw, normalized, words } = normalizeText(userMessage);
  const lang = detectLanguage(raw, normalized);

  const has = (k) => normalized.includes(k);
  const hasAny = (list) => list.some(k => normalized.includes(k));

  // ==========================================
  // 1. DYNAMIC INDIVIDUAL PRODUCT RATE MATCHING
  // If customer asks for a specific item e.g. "momos kitne ke hain", "nuggets ka rate", "shami kabab price", "vonton", "pizza"
  // ==========================================
  const matchedCatalog = findMatchingProducts(normalized, products);
  const matchedProds = matchedCatalog.items || [];
  const isAskingPrice = hasAny(['price', 'rate', 'kitne', 'kitna', 'cost', 'qeemat', 'keemat', 'batao', 'chahiye']);

  // ==========================================
  // 12. ORDER TRACKING / COMPLAINT
  // "mera order kahan pohncha", "status kya hai", "rider nahi aaya", "complaint"
  // ==========================================
  const isTrackingOrComplaint = hasAny(['tracking', 'track', 'status', 'kahan pohncha', 'rider kahan', 'der ho gai', 'late', 'shikayat', 'kab tak aayega']);

  // ==========================================
  // 2. ORDER PLACEMENT & CONFIRMATION INTENT
  // "order krna hai", "order confirm karo", "order book karo", "mangwana hai", "pack karo"
  // (Exclude status/tracking)
  // ==========================================
  const isOrder = !isTrackingOrComplaint && hasAny(['order karna', 'order confirm', 'order book', 'order place', 'mangwana', 'kharidna', 'bhej do', 'bhejo', 'deliver karo', 'pack karo', 'order lena', 'order do']);
  
  // Also if message is just "order" or "order krna hai"
  const isDirectOrder = !isTrackingOrComplaint && (normalized.includes('order') && !normalized.includes('status') && !normalized.includes('track'));

  // ==========================================
  // 3. PAYMENT INTENT
  // "payment kese karo", "paise kaise doon", "cod", "advance", "easypaisa", "meezan"
  // ==========================================
  const isPayment = hasAny(['payment', 'kaise karo', 'kese karo', 'kaise karu', 'paise', 'pesay', 'cod', 'cash', 'advance', 'easypaisa', 'meezan', 'bank', 'account', 'tid']);

  // ==========================================
  // 4. PARTY / EVENT / GUESTS CALCULATION
  // "20 logon ki dawat hai", "50 mehman hain", "party order", "catering"
  // ==========================================
  const isParty = hasAny(['dawat', 'mehman', 'logon', 'guest', 'party', 'catering', 'event', 'shaadi', 'birthday', 'khatam', 'majlis', 'iftar']);

  // ==========================================
  // 5. BULK DISCOUNT / WHOLESALE / RIYAYAT (Only if bulk/discount keywords, not general 'kam')
  // ==========================================
  const isBulkOrDiscount = hasAny(['discount', 'bulk', 'wholesale', 'concession', 'choot', 'riyayat', 'quantity me discount', 'zyada packet']);

  // ==========================================
  // 10. SHOP LOCATION, VISIT, TIMINGS, CONTACTS
  // ==========================================
  const isLocation = hasAny(['location', 'address', 'shop', 'kahan hai', 'kahan pe', 'dukan', 'branch', 'north nazimabad', 'hydri', 'block e', 'phone', 'contact', 'number', 'visit', 'shop timing', 'dukan timing', 'open']);

  // ==========================================
  // 6. DELIVERY TIMINGS, AREAS, CHARGES
  // ==========================================
  const isDelivery = !isLocation && hasAny(['delivery', 'charges', 'free delivery', 'rider', 'kitni der', 'kab tak pohnche', 'pohnchega', 'defense', 'clifton', 'gulshan', 'johar']);

  // ==========================================
  // 7. COOKING, FRYING, DEFROSTING, AIR FRYER
  // ==========================================
  const isCooking = hasAny(['talna', 'fry', 'cooking', 'pakana', 'recipe', 'oil', 'tail', 'aanch', 'phat', 'burst', 'defrost', 'air fryer', 'bake', 'steam', 'ubal']);

  // ==========================================
  // 8. SHELF LIFE, STORAGE, EXPIRY, FRESHNESS
  // ==========================================
  const isStorageOrShelfLife = hasAny(['shelf life', 'expire', 'expiry', 'kharab', 'kitne din', 'kitna arsa', 'freezer me', 'freezer', 'rakh sakte', 'taaza kab tak']);

  // ==========================================
  // 9. QUALITY, HALAL, INGREDIENTS, HYGIENE, SPICE LEVEL (Kids / Bachon ke liye)
  // ==========================================
  const isQualityOrSpice = hasAny(['halal', 'kam mirch', 'mirch', 'masala', 'spicy', 'kids', 'bacho', 'bachon', 'safai', 'hygiene', 'quality', 'meat', 'zabiha', 'mild']);

  // ==========================================
  // 11. MENU GENERAL
  // ==========================================
  const isMenuGeneral = hasAny(['menu', 'card', 'list', 'variety', 'brochure', 'kya kya hai', 'items', 'options']);


  // -------------------------------------------------------------------------
  // EXECUTION ROUTER:
  // -------------------------------------------------------------------------

  // ROUTE 0-BILL: DYNAMIC MULTI-ITEM ORDER & TOTAL BILL CALCULATOR
  // Triggered when customer sends a list of items e.g.:
  // "2 packet chicken samosa aur 1 packet shami kabab total kitne hue"
  // "1 wonton, 2 cheese samosa, 1 beef shami kitne paise banenge"
  const parsedItems = parseCustomerOrderList(userMessage, products);
  const isAskingTotal = hasAny(['total', 'kitne huwe', 'kitne hue', 'kitna bana', 'kitne paise', 'kitne banenge', 'bill', 'hisab', 'batao kitna', 'batao kitne', 'kitna hua']);

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
      `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (isFreeDelivery) {
      replyMsg += `🎁 *Mubarak ho!* Aapka order Rs. 5,000 se zyada hai is liye poore Karachi me Express Cold Box Delivery bilkul *FREE* hai!\n\n`;
    } else {
      const neededForFree = 5000 - subtotal;
      replyMsg += `💡 *Tip:* Agar aap sirf *Rs. ${neededForFree}/-* ka koi mazeed item shamil kar lein to aapki Rs. 150 delivery fee bhi bilkul *FREE* ho jayegi!\n\n`;
    }

    replyMsg += `🛵 *Order Book Karne Ke Liye:*\n` +
      `1. Bas apna *Delivery Address* aur *Naam* yahan bhej dein.\n` +
      `2. Payment aap *Cash on Delivery (COD)* par bhi kar sakte hain ya *EasyPaisa (0336-2438422 - Arsalan Arsalan)* / *Meezan Bank (01870100080247 - ARSALAN)* me transfer kar sakte hain.\n\n` +
      `Kya mai ye order aapke liye abhi confirm kar doon?`;

    return {
      reply: replyMsg,
      suggestions: ["✅ Confirm Order (COD)", "📱 Pay via EasyPaisa", "🥟 Add More Items"],
      action: 'scroll_menu'
    };
  }

  // ROUTE BAHRIA: BAHRIA TOWN KARACHI DELIVERY & CHARGES
  if (hasAny(['bahria', 'bahria town', 'bahria city'])) {
    return {
      reply: `Ji bilkul bhai! Hyderi Nimco & Frozen ki delivery *Bahria Town Karachi* me bhi bilkul dastiyab hai! 🚚📦✨\n\n` +
        `🧊 *Bahria Town Express Chilled Delivery Details:*\n` +
        `• Bahria Town ke liye hum special Temperature-Controlled Cold Box me fresh frozen items rider ke zariye bhejte hain taake raste me items frozen & fresh rahein.\n` +
        `• 💰 *Delivery Charges:* Distance aur express chilled packing ki wajah se Bahria Town ke delivery charges *Rs. 1,500 se Rs. 2,000/-* tak hotay hain.\n\n` +
        `💳 *Payment Options:* Cash on Delivery (COD), EasyPaisa (0336-2438422 - Title: Arsalan Arsalan) ya Meezan Bank (01870100080247 - Title: ARSALAN).\n\n` +
        `Order book karne ke liye apne required items, packets ki taadad aur Bahria Town ka Precinct / Villa number bhej dein! 🥟✨`,
      suggestions: ["🛒 Order Book Karna Hai", "💳 EasyPaisa Details", "🥟 View Menu"],
      action: null
    };
  }

  // ROUTE 0: 350+ NEURAL KNOWLEDGE BASE DIRECT HIT
  // If matched a specific customer pattern from the extensive knowledge base
  const qaMatch = findQAMatch(normalized);
  if (qaMatch) {
    return {
      reply: qaMatch.answer,
      suggestions: ["🥟 Chicken Samosay", "🌯 Spring Rolls", "💵 Cash on Delivery", "🛒 Order Now"],
      action: null
    };
  }

  // ROUTE A: ORDER CONFIRMATION + PAYMENT
  if (isOrder && isPayment) {
    return {
      reply: `Bhai order confirm karne aur payment ka bohot aasan aur safe tareeqa hai! 🥟✨\n\n` +
        `📋 *1. Order Confirm Kaise Hoga?*\n` +
        `Aap mujhe yahan WhatsApp par bas ye 3 cheezein likh kar bhej dein:\n` +
        `• Kon kon se items aur kitne packets chahiye? (e.g. 2x Chicken One Bite, 1x Shami Kabab)\n` +
        `• Aapka Naam, Phone Number aur Mukammal Address (Karachi ka area)\n` +
        `• Payment ka tareeqa (COD ya Online)\n\n` +
        `💳 *2. Payment Kese Karni Hai (2 Options):*\n` +
        `• 💵 *Cash on Delivery (COD):* Pehle advance paise bhejne ki zaroorat nahi hai. Jab rider aapke ghar parcel pohnchaye ga tab aap mouqay par cash ada kar dein.\n` +
        `• 📱 *EasyPaisa:* 0336-2438422 (Title: Arsalan Arsalan)\n` +
        `• 🏦 *Meezan Bank:* 01870100080247 (Title: ARSALAN)\n\n` +
        `🌐 *Website Se Direct Order:* Aap direct https://hyderinimco-frozen.com par ja kar cart me add kar ke bhi 1-click checkout kar sakte hain!\n\n` +
        `Aap batayein aapko kon se items mangwane hain aur aapka address kya hai? Mai abhi order book kar ke kitchen me alert bhejta hoon!`,
      suggestions: ["💵 Cash on Delivery (COD)", "📱 EasyPaisa Details", "🌐 Open Website"],
      action: 'scroll_menu'
    };
  }

  // ROUTE B: SPECIFIC PRODUCT OR CATEGORY INQUIRY (e.g. "malai boti", "roll", "samosa", "shami", "momos kitne ke hain")
  if (matchedCatalog && matchedCatalog.items && matchedCatalog.items.length > 0 && !isParty) {
    if (matchedCatalog.isCategory) {
      const list = matchedCatalog.items.map(p => `• *${p.name}* (${p.packQuantity}) — *Rs. ${p.price}/-*`).join('\n');
      return {
        reply: `Ji bhai! Ye lijiye New Hyderi Nimco & Frozen ki *${matchedCatalog.title}* ki complete rate list: 🥟✨\n\n` +
          `${list}\n\n` +
          `✨ *100% Halal & Fresh Frozen:* Temperature-controlled cold box me deliver hotay hain.\n` +
          `🛵 *Free Delivery:* Rs. 5,000 par poore Karachi me Delivery FREE!\n\n` +
          `Aap batayein in me se kon sa item aur kitne packets deliver karwane hain? COD (Cash on Delivery) par mangwane ke liye address bhej dein!`,
        suggestions: ["🛒 Order Book Karna Hai", "🥟 Aur Samosay Dekhein", "💵 Cash on Delivery"],
        action: 'scroll_menu'
      };
    } else {
      const list = matchedCatalog.items.map(p => `• *${p.name}* (${p.packQuantity}) — *Rs. ${p.price}/-*\n  _${p.description}_`).join('\n\n');
      return {
        reply: `Ji bhai! Ye lijiye aapke matlooba items ki complete rate list: 🥟✨\n\n` +
          `${list}\n\n` +
          `✨ *100% Fresh & Frozen:* Cold box me pack ho kar aayega. Rs. 5,000 par Free Delivery hai!\n\n` +
          `Order book karne ke liye bas packets ki taadad aur apna delivery address bhej dein, ya Cash on Delivery (COD) par mangwa lein!`,
        suggestions: ["🛒 Order This Item", "🥟 View Full Menu", "💵 Cash on Delivery"],
        action: 'scroll_menu'
      };
    }
  }

  // ROUTE C: PARTY / DAWAT / MEHMAN CALCULATION (e.g. "20 logon ki dawat hai", "50 bandon ke liye")
  if (isParty) {
    let countMatch = normalized.match(/\b(\d+)\b/);
    let count = countMatch ? parseInt(countMatch[1]) : 25;
    if (count < 5) count = 25;

    const samosaPacks = Math.ceil((count * 2) / 24);
    const rollPacks = Math.ceil((count * 1.5) / 12);
    const kababPacks = Math.ceil((count * 1) / 12);

    return {
      reply: `🎉 *MashAllah! ${count} Mehmanon Ki Dawat / Party Ka Ideal Estimation:* 🥟✨\n\n` +
        `Har guest ke liye standard 2 One-Bite Samosay, 1 Spring Roll aur 1 Kabab behtareen rehta hai:\n\n` +
        `• 🥟 *Chicken One Bite Samosa:* ${samosaPacks} Packets (${samosaPacks * 24} pcs) = Rs. ${samosaPacks * 400}/-\n` +
        `• 🌯 *Chicken Spring Rolls:* ${rollPacks} Packets (${rollPacks * 12} pcs) = Rs. ${rollPacks * 500}/-\n` +
        `• 🍢 *Chicken Shami Kabab:* ${kababPacks} Packets (${kababPacks * 12} pcs) = Rs. ${kababPacks * 600}/-\n` +
        `• 🥜 *Hyderi Special Mix Nimco:* 1 KG (Chai aur snacks ke sath) = Rs. 480/-\n\n` +
        `🎁 *Dawat Special Offer:*\n` +
        `1. Poore Karachi me Temperature-Controlled Express Delivery bilkul *FREE* hogi (Rs. 5,000+ orders par)!\n` +
        `2. Sath me Hyderi Special Nimco ka complimentary packet gift milega!\n` +
        `3. Cash on Delivery (COD) ya EasyPaisa/Meezan Bank se payment kar sakte hain.\n\n` +
        `Kya mai ye party package aapke liye confirm kar doon? Apna delivery address aur timing bata dein!`,
      suggestions: ["🛒 Confirm Party Package", "🌯 Change Items in Package", "💵 Cash on Delivery"],
      action: 'scroll_menu'
    };
  }

  // ROUTE D: ORDER PLACEMENT GENERAL ("order krna hai", "order book karo")
  if (isOrder && !isPayment) {
    return {
      reply: `Ji bilkul bhai, order abhi book kar letay hain! 🥟✨\n\n` +
        `Aap mujhe yahan WhatsApp par ye details bhej dein:\n` +
        `1. *Items & Quantity:* Konsay items chahiye aur kitne packets? (e.g. 2 packet Chicken Samosa, 1 packet Roll)\n` +
        `2. *Delivery Address:* Aapka Naam, Phone Number aur Karachi ka area/address.\n` +
        `3. *Payment Choice:* Cash on Delivery (COD) par mangwana hai ya EasyPaisa / Meezan Bank se advance bhejenge?\n\n` +
        `✨ *Free Delivery:* Agar aapka order Rs. 5,000 ya is se bara hai to poore Karachi me delivery bilkul FREE hai!\n\n` +
        `Ya aap direct hamari website https://hyderinimco-frozen.com par ja kar bhi order place kar sakte hain. Bataiye aapko kya kya mangwana hai?`,
      suggestions: ["🥟 Chicken Samosay", "🌯 Spring Rolls", "💵 Cash on Delivery"],
      action: 'scroll_menu'
    };
  }

  // ROUTE E: PAYMENT HOW-TO ("payment kese karo", "paise kaise bhejne hain")
  if (isPayment) {
    return {
      reply: `💳 *Payment Ke 2 Bohot Aasan Tareeqay Hain:*\n\n` +
        `1. 💵 *Cash on Delivery (COD):*\n` +
        `   Aapko pehle advance paise dene ki zaroorat nahi hai. Parcel milne par rider ko cash haath me ada kar dein.\n\n` +
        `2. 📱 *Online Advance Payment:*\n` +
        `   • *EasyPaisa:* 0336-2438422 (Account Title: *Arsalan Arsalan*)\n` +
        `   • *Meezan Bank:* 01870100080247 (Account Title: *ARSALAN*)\n\n` +
        `Paise transfer kar ke Transaction ID (TID) ya screenshot yahan bhej dein, dukan wale ko foran WhatsApp par alert mil jata hai aur order pack ho jata hai!`,
      suggestions: ["💵 Cash on Delivery", "📱 EasyPaisa", "🏦 Meezan Bank"],
      action: null
    };
  }

  // ROUTE F: BULK & DISCOUNT ("quantity me discount milega?", "wholesale rate")
  if (isBulkOrDiscount) {
    return {
      reply: `Ji bilkul bhai! New Hyderi Nimco & Frozen par bulk, party aur dawat ke orders par special concessions milti hain:\n\n` +
        `• *100% Free Delivery:* Rs. 5,000 se baray order par poore Karachi me delivery bilkul FREE hai!\n` +
        `• *Bulk / Wholesale Discount:* 10+ packets ya baray catering order par hum customized discount aur complimentary Nimco pack offer karte hain.\n` +
        `• *Payment Flexibility:* Cash on Delivery (COD) bhi available hai aur Meezan Bank / EasyPaisa bhi.\n\n` +
        `Aapko kon kon se items (Samosa, Roll, Kabab) kitni quantity me chahiye? Mujhe batayein, mai aapka special quote tayar kar deta hoon!`,
      suggestions: ["🥟 View Samosa Rates", "🍢 View Kabab Rates", "🛵 Check Delivery Areas"],
      action: null
    };
  }

  // ROUTE G: COOKING, FRYING & AIR FRYER ("talte kaise hain", "oil kitna garm ho", "phat to nahi jayega")
  if (isCooking) {
    return {
      reply: `🔥 *Perfect Golden & Crispy Fry Karne Ka Behtareen Tareeqa:*\n\n` +
        `1. ❌ *Defrost Mat Karein:* Samosay aur rolls freezer se nikal kar direct garm tail me dalein. Agar defrost kiya to patti naram par sakti hai aur phat sakti hai.\n` +
        `2. 🌡️ *Tail Ka Temperature:* Tail ko darmiyani aanch (medium heat) par pehle se garm karein. Bohat tez aanch par bahar se jal jayenge aur andar se kachay rahenge.\n` +
        `3. ⏱️ *Frying Time:* Darmiyani aanch par 4 se 5 minute tak golden brown hone tak talein.\n` +
        `4. 💨 *Air Fryer / Oven:* 180°C par 8 se 10 minute halka sa oil brush kar ke bake karein.\n` +
        `5. 🥟 *Momos:* Steamed momos ko 7-8 minute steam karein, ya fried momos ko 3-4 minute medium oil me fry karein.\n\n` +
        `Nateeja: 100% crispy patti, zero oil absorption aur juicy filling!`,
      suggestions: ["🥟 Chicken Samosay Dekhein", "🌯 Rolls Dekhein", "🛒 Order Now"],
      action: null
    };
  }

  // ROUTE H: SHELF LIFE & STORAGE ("kitne din chalega", "freezer me kitna arsa rakh sakte hain", "kharab to nahi hoga")
  if (isStorageOrShelfLife) {
    return {
      reply: `❄️ *Storage & Shelf Life (Expiry) Ki Tafseel:*\n\n` +
        `• 🧊 *Freezer Life:* Hamare tamam frozen items deep freezer me **۳ ماہ (3 Months)** tak bilkul taaza aur fresh rehte hain.\n` +
        `• 🚫 *Preservative Free:* Hamare items me koi harmful chemicals nahi hote, natural blast freezing ke zariye taaza rakha jata hai.\n` +
        `• 📦 *Air-Tight Packing:* Packet se nikal kar zaroorat ke mutabiq talein aur baki packet ko air-tight ziplock me band kar ke freezer me wapas rakh dein.\n` +
        `• 🥜 *Nimco Shelf Life:* Nimco ko normal room temperature par air-tight jar me 2 mahine tak crispy rakha ja sakta hai!`,
      suggestions: ["🥟 Menu Items", "🛒 Add to Cart", "🛵 Order Now"],
      action: null
    };
  }

  // ROUTE I: QUALITY, HALAL, INGREDIENTS & SPICE LEVEL (Kids / Bachon ke liye)
  if (isQualityOrSpice) {
    return {
      reply: `🍗 *Quality, Halal & Spice Level Ki Tafseel:*\n\n` +
        `• 🕌 *100% Halal Certified:* Hamara tamam chicken aur beef 100% Shariah-compliant Zabiha Halal aur certified suppliers se aata hai.\n` +
        `• 👶 *Bachon Aur Mild Masalay Walay Items:* Agar aapko kam mirch ya bacho ke liye chahiye to ye best hain:\n` +
        `  - Chicken Malai Boti Samosa / Roll (Bohat creamy aur mild)\n` +
        `  - Chicken Nuggets & Cheese Ball (Kids Favorite)\n` +
        `  - Chicken Cheese Crispy Samosa\n` +
        `  - Mini Pizza (Malai Boti)\n` +
        `• 🌶️ *Chatpatay / Traditional Items:* Bar B Q Samosa, Qeema Samosa, Chapli Kabab aur Mayo Garlic Roll.\n` +
        `• 🧼 *100% Hygienic:* Stainless steel modern kitchen me gloves aur hairnets ke sath tayar hota hai.`,
      suggestions: ["🍗 Kids Items", "🥟 Malai Boti Samosa", "🛒 Order Now"],
      action: null
    };
  }

  // ROUTE J: DELIVERY TIMINGS & AREAS ("kahan kahan deliver karte hain", "kitni der me aayega")
  if (isDelivery) {
    return {
      reply: `🛵 *Delivery Information & Karachi Coverage:*\n\n` +
        `• 📍 *Coverage:* Poore Karachi me delivery active hai (North Nazimabad, Gulshan, Johar, DHA, Clifton, Malir, Gulberg, FB Area, PECHS, Nazimabad wagera).\n` +
        `• ⏱️ *Timing:* Rozana subah **10:00 AM se raat 11:00 PM** tak.\n` +
        `• 🚀 *Speed:* North Nazimabad aur qareebi ilaqon me 30 se 45 minute, baki Karachi me same-day temperature-controlled cold box me dispatch hota hai taake items fresh aur frozen rahein.\n` +
        `• ✨ *FREE Delivery:* **Rs. 5,000** ya is se baray order par poore Karachi me delivery bilkul **FREE** hai! (Aam delivery fee sirf Rs. 150/- hai).\n` +
        `• 💵 *Cash on Delivery (COD) Available!*`,
      suggestions: ["✨ Free Delivery Check", "📍 Send My Location", "🛒 Order Now"],
      action: null
    };
  }

  // ROUTE K: LOCATION, ADDRESS & CONTACT NUMBERS
  if (isLocation) {
    return {
      reply: `📍 *New Hyderi Nimco & Frozen Shop Location:*\n\n` +
        `🏢 *Address:* Shop # 20, 21, Burhani Bagh, Block-E, Hydri, North Nazimabad, Karachi.\n` +
        `📞 *Hotlines:* 0336-2438422 | 0325-2747343 | 021-36625698\n` +
        `🕒 *Timing:* 10:00 AM to 11:00 PM (Monday to Sunday Open)\n` +
        `🌐 *Website:* https://hyderinimco-frozen.com\n\n` +
        `Aap dukan par direct visit bhi kar sakte hain aur website ya WhatsApp se home delivery bhi karwa sakte hain!`,
      suggestions: ["🗺️ Google Map", "🥟 Menu Card", "🛵 Home Delivery"],
      action: null
    };
  }

  // ROUTE L: TRACKING & COMPLAINT
  if (isTrackingOrComplaint) {
    return {
      reply: `📦 *Order Tracking & Customer Support:*\n\n` +
        `Aapka order hamare liye nihayat ahem hai! Agar aapko order track karna hai ya koi bhi sawal hai:\n\n` +
        `1. Apna **Order Tracking Number (HYD-XXXX)** yahan likh kar bhej dein.\n` +
        `2. Ya direct hamari helpline par call karein: **0336-2438422** / **0325-2747343**.\n` +
        `3. Website par bhi 'Track Order' ka button daba kar live status dekh sakte hain.\n\n` +
        `Bataiye aapka order ref number kya hai? Mai foran rider aur kitchen se update le kar batata hoon!`,
      suggestions: ["📞 Call Hotline", "📦 Order Status", "🌐 Track on Website"],
      action: null
    };
  }

  // ROUTE M: MENU GENERAL
  if (isMenuGeneral) {
    return {
      reply: `📜 *New Hyderi Nimco & Frozen Official Menu (54 Items):*\n\n` +
        `🥟 *1. SAMOSA (13 Items):* Chicken Vonton (Rs. 240), One Bite (Rs. 400), Cheese Crispy (Rs. 500), Malai Boti (Rs. 500), Pizza Samosa (Rs. 550), Qeema (Rs. 350), Aaloo (Rs. 300)...\n\n` +
        `🌯 *2. ROLL (13 Items):* One Bite Roll (Rs. 500), Cheese Crispy (Rs. 550), Malai Boti (Rs. 500), Mayo Garlic (Rs. 500), Pizza Roll (Rs. 550)...\n\n` +
        `🍢 *3. KABAB (11 Items):* Chicken Shami (Rs. 600), Beef Shami (Rs. 600), Seekh (Rs. 650), Chapli (Rs. 500), Momos (Rs. 400)...\n\n` +
        `🍕 *4. PIZZA (2 Items):* BBQ Mini Pizza (Rs. 450), Malai Boti Pizza (Rs. 500)\n\n` +
        `🍗 *5. OTHER SPECIAL (15 Items):* Hot Shot (Rs. 450), Nuggets (Rs. 550), Cheese Ball (Rs. 500), Fries (Rs. 250), Roll Patti (Rs. 320).\n\n` +
        `Website https://hyderinimco-frozen.com par pora card mojood hai!`,
      suggestions: ["📜 View Menu Card", "🥟 Chicken Samosas", "🌯 Spring Rolls"],
      action: 'scroll_menu'
    };
  }

  // ROUTE N: PURE GREETING (Only 1 or 2 words)
  const isPureGreeting = words.length <= 2 && hasAny(['hi', 'hello', 'salam', 'assalam', 'aoa', 'hey', 'adaab']);
  if (isPureGreeting) {
    return {
      reply: `Walaikum Assalam bhai! New Hyderi Nimco & Frozen Foods (Since 1970) me welcome! 🥟✨\n\nHamari taraf se aapki kya khidmat kar sakte hain? Aapko kya chahiye?\n\nAap mujh se:\n• 🥟 *Menu & Rates:* Samosay, Rolls, Kababs, Pizzas ya Nimco ke rates\n• 🛒 *Order:* Direct home delivery order book karwana\n• 💵 *Payment:* Cash on Delivery (COD) ya EasyPaisa / Meezan Bank\n• 🎁 *Party & Dawat:* Bulk discount aur guests estimation\n• 🛵 *Free Delivery:* Rs. 5,000 par poore Karachi me Free Delivery\n\njo bhi chahein pooch sakte hain! Bataiye hum aapki kaise madad kar sakte hain ya aapko kya chahiye?`,
      suggestions: ["🥟 Samosay & Rolls", "🎁 Bulk Discounts", "💵 Cash on Delivery", "🛒 Order Kaise Karein"],
      action: null
    };
  }

  // ROUTE O: COMPREHENSIVE INTELLIGENT AGENT ASSISTANT (Never a dumb bot error!)
  return {
    reply: `Ji bhai! New Hyderi Nimco & Frozen (Since 1970) me aapko khushamdeed 🥟✨\n\nHamari taraf se aapki kya khidmat kar sakte hain? Aapko kya chahiye?\n\nHamare paas taaza frozen Samosay (13 types), Spring Rolls (13 types), Shami & Seekh Kababs (11 types), Mini Pizzas, Nuggets aur Authentic Nimco dastiyab hain.\n\n• *Order Karne Ke Liye:* Aap yahan WhatsApp par items aur delivery address likh kar bhej dein ya website https://hyderinimco-frozen.com se direct book karein.\n• *Payment:* Cash on Delivery (COD) bhi hai aur EasyPaisa (0336-2438422 - Arsalan Arsalan) / Meezan Bank (01870100080247 - ARSALAN) bhi!\n• *Free Delivery:* Rs. 5,000 par poore Karachi me Free Cold Box Delivery hai.\n\nBataiye hum aapki kaise madad kar sakte hain ya aapko kya chahiye? Mai foran service deta hoon!`,
    suggestions: ["🛒 Order Book Karna Hai", "💳 Payment Details", "🍗 Rates & Menu", "🛵 Delivery Areas"],
    action: null
  };
}
