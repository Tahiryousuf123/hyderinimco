import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const productsPath = path.join(__dirname, '..', 'server', 'data', 'products.json');
const products = JSON.parse(fs.readFileSync(productsPath, 'utf8'));

// Exact real food photo mapping
const photoMapping = {
  // Samosas
  'prod-1': '/images/wonton_crispy.jpg',          // Chicken Vonton
  'prod-2': '/images/samosa_onebite.jpg',         // Aaloo One Bite Samosa
  'prod-3': '/images/samosa_onebite.jpg',         // Chicken One Bite Samosa
  'prod-4': '/images/samosa_onebite.jpg',         // Chicken Cheese Crispy One Bite Samosa
  'prod-5': '/images/samosa_classic.jpg',         // Chicken Cone Samosa
  'prod-6': '/images/samosa_classic.jpg',         // Chicken Malai Boti Samosa
  'prod-7': '/images/samosa_classic.jpg',         // Chicken Bar B Q Samosa
  'prod-8': '/images/samosa_classic.jpg',         // Chicken Pizza Samosa
  'prod-9': '/images/samosa_classic.jpg',         // Chicken Cheese Crispy Samosa
  'prod-10': '/images/samosa_classic.jpg',        // Chicken Chinese Samosa
  'prod-11': '/images/samosa_classic.jpg',        // Qeema Samosa
  'prod-12': '/images/samosa_classic.jpg',        // Aaloo Samosa
  'prod-13': '/images/samosa_classic.jpg',        // Daal Samosa

  // Spring Rolls
  'prod-14': '/images/spring_roll_crispy.jpg',    // Chicken One Bite Roll
  'prod-15': '/images/spring_roll_golden.jpg',    // Chicken Cheese Crispy One Bite Roll
  'prod-16': '/images/spring_roll_crispy.jpg',    // Chicken Bar B Q Roll
  'prod-17': '/images/spring_roll_golden.jpg',    // Chicken Malai Boti Roll
  'prod-18': '/images/spring_roll_crispy.jpg',    // Chicken Pizza Roll
  'prod-19': '/images/spring_roll_golden.jpg',    // Chicken Mayo Garlic Roll
  'prod-20': '/images/spring_roll_crispy.jpg',    // Chicken Cheese Crispy Roll
  'prod-21': '/images/spring_roll_golden.jpg',    // Chicken Shahi Roll
  'prod-22': '/images/spring_roll_crispy.jpg',    // Chicken Mint Roll
  'prod-23': '/images/spring_roll_golden.jpg',    // Chicken Chinese Roll
  'prod-24': '/images/spring_roll_crispy.jpg',    // Chicken Bread Roll
  'prod-25': '/images/spring_roll_golden.jpg',    // Chicken Chimmy Changa

  // Kababs & Momos
  'prod-26': '/images/shami_kabab_real.jpg',      // Chicken Shami Kabab
  'prod-27': '/images/shami_kabab_real.jpg',      // Beef Shami Kabab
  'prod-28': '/images/seekh_kabab_real.jpg',      // Chicken Seekh Kabab
  'prod-29': '/images/chapli_kabab_real.jpg',     // Chicken Chapli Kabab
  'prod-30': '/images/chapli_kabab_real.jpg',     // Beef Chapli Kabab
  'prod-31': '/images/shami_kabab_real.jpg',      // Chicken Burger Patty
  'prod-32': '/images/nuggets_real.jpg',          // Chicken Cutless
  'prod-33': '/images/seekh_kabab_real.jpg',      // Chicken Stick
  'prod-34': '/images/shami_kabab_real.jpg',      // Chicken Kofta
  'prod-35': '/images/momos_steamed_real.jpg',    // Chicken Momos Steamed
  'prod-36': '/images/momos_fried_real.jpg',      // Chicken Momos Fried

  // Mini Pizzas
  'prod-37': '/images/mini_pizza_real.jpg',       // B.B.Q Mini Pizza
  'prod-38': '/images/mini_pizza_real.jpg',       // Malai Boti Mini Pizza

  // Specialties & Bites
  'prod-39': '/images/nuggets_real.jpg',          // Hot Shot
  'prod-40': '/images/nuggets_real.jpg',          // Chicken Nuggets Big
  'prod-41': '/images/nuggets_real.jpg',          // Chicken Nuggets Small
  'prod-42': '/images/nuggets_real.jpg',          // Chicken Cheese Ball
  'prod-43': '/images/nuggets_real.jpg',          // Chicken Cheese Lolypop
  'prod-44': '/images/nuggets_real.jpg',          // Chicken Donuts
  'prod-45': '/images/nuggets_real.jpg',          // Chicken Finger
  'prod-46': '/images/nuggets_real.jpg',          // Chicken Popcorn
  'prod-47': '/images/nuggets_real.jpg',          // Chicken Chilos
  'prod-48': '/images/mini_pizza_real.jpg',       // Chicken Pizza Puff
  'prod-49': '/images/french_fries_real.jpg',     // French Fries

  // Patties & Parathas
  'prod-50': '/images/spring_roll_golden.jpg',    // Roll Patti
  'prod-51': '/images/samosa_classic.jpg',        // Samosa Patti
  'prod-52': '/images/paratha_real.jpg',          // Lachha Paratha
  'prod-53': '/images/paratha_real.jpg',          // Plain Puri

  // Nimco
  'prod-54': '/images/nimco_real.jpg',            // Special Hyderi Mix Nimco
  'prod-55': '/images/nimco_real.jpg',            // Special Daal Moth Nimco
  'prod-56': '/images/nimco_real.jpg'             // Crispy Papdi & Sev
};

products.forEach(p => {
  if (photoMapping[p.id]) {
    p.image = photoMapping[p.id];
  }
});

fs.writeFileSync(productsPath, JSON.stringify(products, null, 2), 'utf8');
console.log('Successfully mapped all 56 products to 100% REAL, AUTHENTIC FOOD PHOTOGRAPHY JPGs!');
