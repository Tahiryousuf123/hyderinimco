import fs from 'fs';

const productsPath = './server/data/products.json';
let products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

const premiumDeals = [
  {
    id: "deal-prem-1",
    name: "Hyderi Premium Deal 1",
    nameUrdu: "حیدری پریمیم ڈیل ۱",
    category: "deals",
    categoryLabel: "DEALS",
    categoryLabelUrdu: "ڈیلیور ڈیلز",
    packQuantity: "46 pcs Mega Variety",
    packQuantityUrdu: "۴۶ عدد میگا ورائٹی",
    price: 2600,
    rating: 4.9,
    reviewCount: 240,
    image: "/images/premium_deal_1_poster.jpg",
    badge: "⭐ FREE DELIVERY",
    badgeUrdu: "مفت ڈیلیوری",
    description: "BBQ Roll (12 pcs) + Malai Boti Samosa (12 pcs) + Beef Chapli (6 pcs) + Chimmy Changa (6 pcs) + Chicken Finger (10 pcs) — Free Express Delivery All Over Karachi!",
    descriptionUrdu: "بی بی کیو رول (۱۲) + ملائی بوٹی سموسہ (۱۲) + بیف چپلی (۶) + چیمی چانگا (۶) + چکن فنگر (۱۰) — فری ڈیلیوری!",
    itemsList: [
      "BBQ Roll (12 Pcs)",
      "Malai Boti Samosa (12 Pcs)",
      "Beef Chapli (6 Pcs)",
      "Chimmy Changa (6 Pcs)",
      "Chicken Finger (10 Pcs)"
    ],
    isAvailable: true,
    featured: true
  },
  {
    id: "deal-prem-2",
    name: "Hyderi Premium Deal 2",
    nameUrdu: "حیدری پریمیم ڈیل ۲",
    category: "deals",
    categoryLabel: "DEALS",
    categoryLabelUrdu: "ڈیلیور ڈیلز",
    packQuantity: "84 pcs Family Variety",
    packQuantityUrdu: "۸۴ عدد فیملی ورائٹی",
    price: 2550,
    rating: 4.9,
    reviewCount: 310,
    image: "/images/premium_deal_2_poster.jpg",
    badge: "⭐ FREE DELIVERY",
    badgeUrdu: "مفت ڈیلیوری",
    description: "Mint Roll (12 pcs) + Aloo One Bite Samosa (24 pcs) + Cheese Ball (12 pcs) + Wonton (12 pcs) + Chinese Samosa (12 pcs) + Chicken Donuts (12 pcs) — Free Express Delivery All Over Karachi!",
    descriptionUrdu: "منٹ رول (۱۲) + آلو ون بائٹ سموسہ (۲۴) + چیز بال (۱۲) + ونٹون (۱۲) + چائنیز سموسہ (۱۲) + چکن ڈونٹس (۱۲) — فری ڈیلیوری!",
    itemsList: [
      "Mint Roll (12 Pcs)",
      "Aloo One Bite Samosa (24 Pcs)",
      "Cheese Ball (12 Pcs)",
      "Wonton (12 Pcs)",
      "Chinese Samosa (12 Pcs)",
      "Chicken Donuts (12 Pcs)"
    ],
    isAvailable: true,
    featured: true
  },
  {
    id: "deal-prem-3",
    name: "Hyderi Premium Deal 3",
    nameUrdu: "حیدری پریمیم ڈیل ۳",
    category: "deals",
    categoryLabel: "DEALS",
    categoryLabelUrdu: "ڈیلیور ڈیلز",
    packQuantity: "66 pcs Royal Party Pack",
    packQuantityUrdu: "۶۶ عدد رائل پارٹی پیک",
    price: 2800,
    rating: 4.9,
    reviewCount: 285,
    image: "/images/premium_deal_3_poster.jpg",
    badge: "⭐ FREE DELIVERY",
    badgeUrdu: "مفت ڈیلیوری",
    description: "Malai Boti Roll (12 pcs) + Qeema Samosa (12 pcs) + Seekh Kabab (12 pcs) + Chicken Burger Patty (6 pcs) + Chinese Roll (12 pcs) + Nuggets (12 pcs) — Free Express Delivery All Over Karachi!",
    descriptionUrdu: "ملائی بوٹی رول (۱۲) + قیمہ سموسہ (۱۲) + سیخ کباب (۱۲) + چکن برگر پیٹی (۶) + چائنیز رول (۱۲) + نگٹس (۱۲) — فری ڈیلیوری!",
    itemsList: [
      "Malai Boti Roll (12 Pcs)",
      "Qeema Samosa (12 Pcs)",
      "Seekh Kabab (12 Pcs)",
      "Chicken Burger Patty (6 Pcs)",
      "Chinese Roll (12 Pcs)",
      "Nuggets (12 Pcs)"
    ],
    isAvailable: true,
    featured: true
  },
  {
    id: "deal-prem-4",
    name: "Hyderi Premium Deal 4",
    nameUrdu: "حیدری پریمیم ڈیل ۴",
    category: "deals",
    categoryLabel: "DEALS",
    categoryLabelUrdu: "ڈیلیور ڈیلز",
    packQuantity: "78 pcs Bumper Feast",
    packQuantityUrdu: "۷۸ عدد بمپر فیسٹ",
    price: 3100,
    rating: 5.0,
    reviewCount: 420,
    image: "/images/premium_deal_4_poster.jpg",
    badge: "⭐ FREE DELIVERY",
    badgeUrdu: "مفت ڈیلیوری",
    description: "Chinese Roll (12 pcs) + Aloo Samosa (12 pcs) + Cheese Cone (6 pcs) + Wonton (12 pcs) + Small Nuggets (12 pcs) + Chicken Lolli Pop (6 pcs) + Mayo Garlic Roll (12 pcs) + Crispy Samosa (12 pcs) — Free Express Delivery All Over Karachi!",
    descriptionUrdu: "چائنیز رول (۱۲) + آلو سموسہ (۱۲) + چیز کون (۶) + ونٹون (۱۲) + اسمال نگٹس (۱۲) + چکن لالی پاپ (۶) + مائیو گارلک رول (۱۲) + کرسپی سموسہ (۱۲) — فری ڈیلیوری!",
    itemsList: [
      "Chinese Roll (12 Pcs)",
      "Aloo Samosa (12 Pcs)",
      "Cheese Cone (6 Pcs)",
      "Wonton (12 Pcs)",
      "Small Nuggets (12 Pcs)",
      "Chicken Lolli Pop (6 Pcs)",
      "Mayo Garlic Roll (12 Pcs)",
      "Crispy Samosa (12 Pcs)"
    ],
    isAvailable: true,
    featured: true
  },
  {
    id: "deal-prem-5",
    name: "Hyderi Premium Deal 5",
    nameUrdu: "حیدری پریمیم ڈیل ۵",
    category: "deals",
    categoryLabel: "DEALS",
    categoryLabelUrdu: "ڈیلیور ڈیلز",
    packQuantity: "54 pcs Chef Special",
    packQuantityUrdu: "۵۴ عدد چیف اسپیشل",
    price: 2650,
    rating: 4.9,
    reviewCount: 195,
    image: "/images/premium_deal_5_poster.jpg",
    badge: "⭐ FREE DELIVERY",
    badgeUrdu: "مفت ڈیلیوری",
    description: "Malai Boti Samosa (12 pcs) + Crispy Roll (12 pcs) + Chicken Chowmein (12 pcs) + Bread Roll (12 pcs) + Chicken Steak (6 pcs) — Free Express Delivery All Over Karachi!",
    descriptionUrdu: "ملائی بوٹی سموسہ (۱۲) + کرسپی رول (۱۲) + چکن چومین (۱۲) + بریڈ رول (۱۲) + چکن اسٹیک (۶) — فری ڈیلیوری!",
    itemsList: [
      "Malai Boti Samosa (12 Pcs)",
      "Crispy Roll (12 Pcs)",
      "Chicken Chowmein (12 Pcs)",
      "Bread Roll (12 Pcs)",
      "Chicken Steak (6 Pcs)"
    ],
    isAvailable: true,
    featured: true
  }
];

// Replace or add premium deals
premiumDeals.forEach(pd => {
  const idx = products.findIndex(p => p.id === pd.id);
  if (idx >= 0) {
    products[idx] = pd;
  } else {
    products.unshift(pd);
  }
});

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
console.log('SUCCESS: Updated products.json with 5 Premium Deals!');
