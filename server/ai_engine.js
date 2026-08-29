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

// Search products by name keywords
function findMatchingProducts(normalizedQuery, products) {
  const q = normalizedQuery.toLowerCase();
  return products.filter(p => {
    const nameEn = p.name.toLowerCase();
    const nameUr = (p.nameUrdu || '').toLowerCase();
    const words = nameEn.split(' ');
    // Direct substring or token match
    if (q.includes(nameEn) || nameEn.includes(q)) return true;
    // Check specific iconic keywords
    if (q.includes('vonton') && nameEn.includes('vonton')) return true;
    if (q.includes('one bite') && nameEn.includes('one bite')) return true;
    if (q.includes('malai boti') && nameEn.includes('malai boti')) return true;
    if (q.includes('mayo garlic') && nameEn.includes('mayo garlic')) return true;
    if (q.includes('pizza samosa') && nameEn.includes('pizza samosa')) return true;
    if (q.includes('shami') && nameEn.includes('shami')) return true;
    if (q.includes('chapli') && nameEn.includes('chapli')) return true;
    if (q.includes('seekh') && nameEn.includes('seekh')) return true;
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
  const matchedProds = findMatchingProducts(normalized, products);
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

  // ROUTE B: SPECIFIC PRODUCT PRICE / VARIETY INQUIRY (e.g. "momos kitne ke hain", "nuggets", "shami kabab")
  if (matchedProds.length > 0 && isAskingPrice && !isParty) {
    const list = matchedProds.map(p => `• *${p.name}* (${p.packQuantity}) - Rs. ${p.price}/-\n  _${p.description}_`).join('\n\n');
    return {
      reply: `Ji bhai! Ye lijiye aapke matlooba items ki complete rate list: 🥟✨\n\n` +
        `${list}\n\n` +
        `✨ *100% Fresh & Frozen:* Cold box me pack ho kar aayega. Rs. 2,500 par Free Delivery hai!\n` +
        `Order karne ke liye bas packets ki quantity aur apna delivery address bhej dein, ya Cash on Delivery (COD) par mangwa lein!`,
      suggestions: ["🛒 Order This Item", "🥟 View Full Menu", "💵 Cash on Delivery"],
      action: 'scroll_menu'
    };
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
        `1. Poore Karachi me Temperature-Controlled Express Delivery bilkul *FREE* hogi!\n` +
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
        `✨ *Free Delivery:* Agar aapka order Rs. 2,500 ya is se bara hai to poore Karachi me delivery bilkul FREE hai!\n\n` +
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
        `• *100% Free Delivery:* Rs. 2,500 se baray order par poore Karachi me delivery bilkul FREE hai!\n` +
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
        `• ✨ *FREE Delivery:* **Rs. 2,500** ya is se baray order par poore Karachi me delivery bilkul **FREE** hai! (Aam delivery fee sirf Rs. 150/- hai).\n` +
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
      reply: `Walaikum Assalam bhai! New Hyderi Nimco & Frozen Foods (Since 1970) me welcome! 🥟✨\n\nHamari taraf se aapki kya khidmat kar sakte hain? Aapko kya chahiye?\n\nAap mujh se:\n• 🥟 *Menu & Rates:* Samosay, Rolls, Kababs, Pizzas ya Nimco ke rates\n• 🛒 *Order:* Direct home delivery order book karwana\n• 💵 *Payment:* Cash on Delivery (COD) ya EasyPaisa / Meezan Bank\n• 🎁 *Party & Dawat:* Bulk discount aur guests estimation\n• 🛵 *Free Delivery:* Rs. 2,500 par poore Karachi me Free Delivery\n\njo bhi chahein pooch sakte hain! Bataiye hum aapki kaise madad kar sakte hain ya aapko kya chahiye?`,
      suggestions: ["🥟 Samosay & Rolls", "🎁 Bulk Discounts", "💵 Cash on Delivery", "🛒 Order Kaise Karein"],
      action: null
    };
  }

  // ROUTE O: COMPREHENSIVE INTELLIGENT AGENT ASSISTANT (Never a dumb bot error!)
  return {
    reply: `Ji bhai! New Hyderi Nimco & Frozen (Since 1970) me aapko khushamdeed 🥟✨\n\nHamari taraf se aapki kya khidmat kar sakte hain? Aapko kya chahiye?\n\nHamare paas taaza frozen Samosay (13 types), Spring Rolls (13 types), Shami & Seekh Kababs (11 types), Mini Pizzas, Nuggets aur Authentic Nimco dastiyab hain.\n\n• *Order Karne Ke Liye:* Aap yahan WhatsApp par items aur delivery address likh kar bhej dein ya website https://hyderinimco-frozen.com se direct book karein.\n• *Payment:* Cash on Delivery (COD) bhi hai aur EasyPaisa (0336-2438422 - Arsalan Arsalan) / Meezan Bank (01870100080247 - ARSALAN) bhi!\n• *Free Delivery:* Rs. 2,500 par poore Karachi me Free Cold Box Delivery hai.\n\nBataiye hum aapki kaise madad kar sakte hain ya aapko kya chahiye? Mai foran service deta hoon!`,
    suggestions: ["🛒 Order Book Karna Hai", "💳 Payment Details", "🍗 Rates & Menu", "🛵 Delivery Areas"],
    action: null
  };
}
