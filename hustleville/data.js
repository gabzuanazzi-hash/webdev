/* Hustleville — static game data */

const COUNTRIES = [
  { n: 'United States', f: '🇺🇸', w: 1.0 }, { n: 'Brazil', f: '🇧🇷', w: 0.45 }, { n: 'Japan', f: '🇯🇵', w: 0.9 },
  { n: 'Germany', f: '🇩🇪', w: 0.95 }, { n: 'Nigeria', f: '🇳🇬', w: 0.25 }, { n: 'India', f: '🇮🇳', w: 0.3 },
  { n: 'United Kingdom', f: '🇬🇧', w: 0.95 }, { n: 'Mexico', f: '🇲🇽', w: 0.5 }, { n: 'France', f: '🇫🇷', w: 0.9 },
  { n: 'South Korea', f: '🇰🇷', w: 0.85 }, { n: 'Australia', f: '🇦🇺', w: 1.0 }, { n: 'Canada', f: '🇨🇦', w: 0.95 },
  { n: 'UAE', f: '🇦🇪', w: 1.2 }, { n: 'Italy', f: '🇮🇹', w: 0.8 }, { n: 'Spain', f: '🇪🇸', w: 0.75 },
  { n: 'Argentina', f: '🇦🇷', w: 0.4 }, { n: 'South Africa', f: '🇿🇦', w: 0.35 }, { n: 'Turkey', f: '🇹🇷', w: 0.4 },
  { n: 'Indonesia', f: '🇮🇩', w: 0.3 }, { n: 'Egypt', f: '🇪🇬', w: 0.28 }, { n: 'Sweden', f: '🇸🇪', w: 1.0 },
  { n: 'Portugal', f: '🇵🇹', w: 0.7 }
];

// p = probability, base = family wealth in $ (scaled by country.w)
const FAMILIES = [
  { n: 'struggling', p: 0.25, base: 200 },
  { n: 'working-class', p: 0.35, base: 600 },
  { n: 'middle-class', p: 0.25, base: 1500 },
  { n: 'upper-class', p: 0.12, base: 6000 },
  { n: 'ultra-wealthy', p: 0.03, base: 40000 }
];

const FIRST = ['Alex', 'Maya', 'Jordan', 'Sofia', 'Liam', 'Aisha', 'Noah', 'Camila', 'Kenji', 'Zara', 'Mateus', 'Elena',
  'Omar', 'Chloe', 'Ravi', 'Isabel', 'Tariq', 'Nina', 'Lucas', 'Amara', 'Diego', 'Hana', 'Ethan', 'Priya', 'Felix',
  'Leila', 'Marco', 'Yuki', 'Sam', 'Tessa', 'Andre', 'Mia', 'Caleb', 'Ines', 'Jonas', 'Nia', 'Victor', 'Rosa'];
const LAST = ['Rivera', 'Silva', 'Tanaka', 'Okafor', 'Müller', 'Khan', 'Brooks', 'Santos', 'Lee', 'Rossi', 'Novak', 'Haddad',
  'Cohen', 'Moreau', 'Singh', 'Costa', 'Bennett', 'Ito', 'Mensah', 'Garcia', 'Larsen', 'Petrov', 'Dubois', 'Kim', 'Reyes'];

const COMPANIES = ['Northwind', 'Blue Harbor', 'Apex Dynamics', 'Lumen & Co', 'Ironbridge', 'Solstice Group', 'Vantage Partners',
  'Redwood Holdings', 'Atlas Ventures', 'Kestrel Industries', 'Nova Capital', 'Summit Trading'];
const REPS = ['Dana Whitfield', 'R. Okonkwo', 'Marcus Vale', 'Elena Sørensen', 'Hiro Matsuda', 'Priya Raman', 'Boris Kane', 'Lucia Ferraro'];

/* ---------------- Jobs ---------------- */
// ladder multipliers kick in at 0 / 2 / 5 / 9 years
const LADDER_YEARS = [0, 2, 5, 9];
const JOBS = [
  { id: 'dish', icon: '🍽️', minAge: 14, pay: 9000, smarts: 0, deg: false, online: false, ladder: ['Dishwasher', 'Line Prep', 'Kitchen Lead', 'Kitchen Manager'], mult: [1, 1.3, 1.7, 2.3] },
  { id: 'cashier', icon: '🛒', minAge: 16, pay: 14000, smarts: 0, deg: false, online: false, ladder: ['Cashier', 'Senior Cashier', 'Shift Supervisor', 'Store Manager'], mult: [1, 1.3, 1.8, 2.6] },
  { id: 'barista', icon: '☕', minAge: 16, pay: 16000, smarts: 0, deg: false, online: false, ladder: ['Barista', 'Head Barista', 'Cafe Supervisor', 'Cafe Manager'], mult: [1, 1.25, 1.7, 2.4] },
  { id: 'dataentry', icon: '⌨️', minAge: 16, pay: 12000, smarts: 25, deg: false, online: true, ladder: ['Data Entry Freelancer', 'Virtual Assistant', 'Ops Specialist', 'Remote Ops Lead'], mult: [1, 1.4, 2, 2.9] },
  { id: 'warehouse', icon: '📦', minAge: 18, pay: 24000, smarts: 0, deg: false, online: false, ladder: ['Packer', 'Forklift Operator', 'Team Lead', 'Warehouse Manager'], mult: [1, 1.25, 1.7, 2.4] },
  { id: 'delivery', icon: '🚚', minAge: 18, pay: 28000, smarts: 0, deg: false, online: false, ladder: ['Delivery Driver', 'Route Lead', 'Fleet Coordinator', 'Logistics Manager'], mult: [1, 1.2, 1.7, 2.5] },
  { id: 'callcenter', icon: '🎧', minAge: 18, pay: 30000, smarts: 30, deg: false, online: true, ladder: ['Call Center Rep', 'Senior Rep', 'Team Lead', 'Support Director'], mult: [1, 1.3, 1.9, 3] },
  { id: 'social', icon: '📱', minAge: 18, pay: 26000, smarts: 40, deg: false, online: true, ladder: ['Social Media Assistant', 'Content Creator', 'Social Lead', 'Head of Social'], mult: [1, 1.5, 2.2, 3.4] },
  { id: 'jrsales', icon: '📞', minAge: 18, pay: 34000, smarts: 40, deg: false, online: false, ladder: ['Junior Sales Rep', 'Sales Rep', 'Account Executive', 'Sales Director'], mult: [1, 1.6, 2.6, 4.5] },
  { id: 'realtor', icon: '🏠', minAge: 20, pay: 38000, smarts: 45, deg: false, online: false, ladder: ['Real Estate Assistant', 'Agent', 'Top Agent', 'Broker-Owner'], mult: [1, 1.5, 2.6, 4.8] },
  { id: 'marketing', icon: '📣', minAge: 22, pay: 52000, smarts: 50, deg: true, online: true, ladder: ['Marketing Coordinator', 'Marketing Manager', 'Marketing Director', 'CMO'], mult: [1, 1.5, 2.4, 4] },
  { id: 'analyst', icon: '📊', minAge: 22, pay: 70000, smarts: 60, deg: true, online: false, ladder: ['Financial Analyst', 'Senior Analyst', 'Portfolio Manager', 'Managing Director'], mult: [1, 1.5, 2.6, 5] },
  { id: 'dev', icon: '💻', minAge: 22, pay: 85000, smarts: 65, deg: true, online: true, ladder: ['Junior Developer', 'Software Engineer', 'Staff Engineer', 'CTO'], mult: [1, 1.5, 2.4, 4.2] },
  { id: 'pm', icon: '🗂️', minAge: 24, pay: 65000, smarts: 55, deg: true, online: false, ladder: ['Project Coordinator', 'Project Manager', 'Program Director', 'COO'], mult: [1, 1.5, 2.4, 4] }
];

/* ---------------- Businesses: 10 niches x 3 models ---------------- */
const MODELS = {
  agency: { n: 'Marketing Agency', online: true, base: 4000, roi: 1.0, risk: 0.8, kind: 'Client Service Agreement', partner: 'Client' },
  sales: { n: 'Sales', online: false, base: 12000, roi: 0.9, risk: 1.0, kind: 'Distribution & Commission Agreement', partner: 'Principal' },
  product: { n: 'Product Sales', online: true, base: 25000, roi: 0.85, risk: 1.2, kind: 'Supplier Agreement', partner: 'Supplier' }
};

const NICHES = [
  { id: 'fashion', icon: '👗', n: 'Fashion & Apparel', c: 1.0, roi: 0.42, names: { agency: 'Fashion Marketing Agency', sales: 'Wholesale Apparel Sales Team', product: 'Streetwear Brand' } },
  { id: 'tech', icon: '💻', n: 'Tech & SaaS', c: 1.8, roi: 0.55, names: { agency: 'Growth Agency for Startups', sales: 'B2B Software Sales Team', product: 'Productivity App' } },
  { id: 'realestate', icon: '🏘️', n: 'Real Estate', c: 3.0, roi: 0.3, names: { agency: 'Property Marketing Agency', sales: 'Home Sales Brokerage', product: 'Vacation Rental Portfolio' } },
  { id: 'food', icon: '🍔', n: 'Food & Beverage', c: 1.2, roi: 0.38, names: { agency: 'Restaurant Marketing Agency', sales: 'Food Distribution Sales', product: 'Hot Sauce Brand' } },
  { id: 'fitness', icon: '🏋️', n: 'Health & Fitness', c: 1.1, roi: 0.4, names: { agency: 'Gym Marketing Agency', sales: 'Gym Membership Sales', product: 'Supplement Line' } },
  { id: 'beauty', icon: '💄', n: 'Beauty & Skincare', c: 1.3, roi: 0.45, names: { agency: 'Beauty Influencer Agency', sales: 'Salon Supply Sales', product: 'Skincare Brand' } },
  { id: 'gaming', icon: '🎮', n: 'Gaming & Esports', c: 1.5, roi: 0.5, names: { agency: 'Esports Marketing Agency', sales: 'Sponsorship Sales Team', product: 'Gaming Gear Store' } },
  { id: 'travel', icon: '✈️', n: 'Travel & Hospitality', c: 1.6, roi: 0.36, names: { agency: 'Travel Marketing Agency', sales: 'Corporate Travel Sales', product: 'Boutique Tour Packages' } },
  { id: 'education', icon: '🎓', n: 'Education & Coaching', c: 0.9, roi: 0.5, names: { agency: 'Course Launch Agency', sales: 'Enrollment Sales Team', product: 'Online Course Platform' } },
  { id: 'nightlife', icon: '🎉', n: 'Events & Nightlife', c: 1.4, roi: 0.44, names: { agency: 'Event Promotion Agency', sales: 'Venue Booking Sales', product: 'Craft Cocktail Brand' } }
];

const bizDefs = [];
NICHES.forEach(n => Object.keys(MODELS).forEach(m => {
  const mod = MODELS[m];
  const cost = Math.round(mod.base * n.c / 100) * 100;
  bizDefs.push({
    id: n.id + ':' + m, niche: n.id, model: m, icon: n.icon, name: n.names[m],
    nicheName: n.n, modelName: mod.n, online: mod.online, cost,
    baseProfit: cost * n.roi * mod.roi, risk: mod.risk
  });
}));
const BIZ = Object.fromEntries(bizDefs.map(b => [b.id, b]));

/* Contract trap clauses (hidden in the fine print) */
const TRAPS = [
  { id: 'autorenew', text: 'Section 14(c): This agreement auto-renews for 3 years on Partner\'s standard terms unless cancelled in writing 90 days prior.', mult: 0.92 },
  { id: 'minpurchase', text: 'Section 9(b): Operator guarantees a minimum annual purchase volume, payable regardless of actual sales.', mult: 0.88 },
  { id: 'ipshare', text: 'Section 11(a): Partner is assigned 10% of all intellectual-property revenue generated by Operator, in perpetuity.', mult: 0.9 },
  { id: 'latepenalty', text: 'Section 7(d): Late-delivery penalties accrue at 5% per month, assessed at Partner\'s sole discretion.', mult: 0.97, fine: true }
];

/* ---------------- Assets ---------------- */
// up = yearly upkeep % of price, dep = yearly value change
const ASSETS = {
  home: { label: 'Homes', icon: '🏠', items: [
    { n: 'Studio Flat', icon: '🏢', price: 120000, up: 0.015, dep: 0.03, happy: 3, fame: 0 },
    { n: 'City Apartment', icon: '🏙️', price: 280000, up: 0.015, dep: 0.03, happy: 4, fame: 0 },
    { n: 'Townhouse', icon: '🏘️', price: 520000, up: 0.015, dep: 0.03, happy: 5, fame: 0 },
    { n: 'Suburban House', icon: '🏡', price: 850000, up: 0.016, dep: 0.03, happy: 6, fame: 0 },
    { n: 'Skyline Penthouse', icon: '🌆', price: 4500000, up: 0.017, dep: 0.035, happy: 8, fame: 2 },
    { n: 'Hilltop Mansion', icon: '🏰', price: 18000000, up: 0.018, dep: 0.035, happy: 10, fame: 4 },
    { n: 'Private Island', icon: '🏝️', price: 95000000, up: 0.02, dep: 0.03, happy: 15, fame: 10 }
  ] },
  car: { label: 'Cars', icon: '🚗', items: [
    { n: 'Used Hatchback', icon: '🚗', price: 9000, up: 0.08, dep: -0.12, happy: 2, fame: 0 },
    { n: 'Family Sedan', icon: '🚙', price: 32000, up: 0.07, dep: -0.12, happy: 3, fame: 0 },
    { n: 'Luxury SUV', icon: '🚘', price: 85000, up: 0.06, dep: -0.14, happy: 4, fame: 1 },
    { n: 'Sports Coupe', icon: '🏎️', price: 160000, up: 0.05, dep: -0.1, happy: 6, fame: 2 },
    { n: 'Lamborghini', icon: '🏎️', price: 420000, up: 0.04, dep: -0.06, happy: 8, fame: 4 },
    { n: 'Bugatti Chiron', icon: '🏁', price: 3400000, up: 0.03, dep: 0.0, happy: 12, fame: 8 }
  ] },
  clothes: { label: 'Clothes', icon: '👔', items: [
    { n: 'Hoodie & Jeans', icon: '👕', price: 80, up: 0, dep: -0.5, looks: 1, happy: 1, fame: 0 },
    { n: 'Smart Casual', icon: '👔', price: 400, up: 0, dep: -0.4, looks: 3, happy: 1, fame: 0 },
    { n: 'Tailored Suit', icon: '🤵', price: 2500, up: 0, dep: -0.25, looks: 6, happy: 2, fame: 0 },
    { n: 'Designer Wardrobe', icon: '🧥', price: 25000, up: 0, dep: -0.2, looks: 10, happy: 3, fame: 2 },
    { n: 'Bespoke Couture', icon: '🥻', price: 150000, up: 0, dep: -0.15, looks: 15, happy: 4, fame: 4 }
  ] },
  watch: { label: 'Watches', icon: '⌚', items: [
    { n: 'Casio Digital', icon: '⌚', price: 50, up: 0, dep: -0.1, happy: 0, fame: 0 },
    { n: 'Seiko Automatic', icon: '⌚', price: 400, up: 0, dep: -0.05, happy: 1, fame: 0 },
    { n: 'Rolex Submariner', icon: '⌚', price: 14000, up: 0, dep: 0.05, happy: 3, fame: 1 },
    { n: 'Audemars Piguet Royal Oak', icon: '⌚', price: 85000, up: 0, dep: 0.06, happy: 5, fame: 2 },
    { n: 'Richard Mille RM 27', icon: '💎', price: 1900000, up: 0, dep: 0.05, happy: 8, fame: 5 },
    { n: 'Patek Philippe Grandmaster Chime', icon: '👑', price: 31000000, up: 0, dep: 0.04, happy: 12, fame: 10 }
  ] },
  plane: { label: 'Private Jets', icon: '✈️', items: [
    { n: 'Cessna 172', icon: '🛩️', price: 450000, up: 0.1, dep: -0.05, happy: 5, fame: 2 },
    { n: 'Pilatus PC-12', icon: '🛩️', price: 5000000, up: 0.08, dep: -0.05, happy: 8, fame: 4 },
    { n: 'Embraer Phenom 300', icon: '✈️', price: 9500000, up: 0.07, dep: -0.06, happy: 10, fame: 6 },
    { n: 'Gulfstream G650', icon: '🛫', price: 70000000, up: 0.05, dep: -0.05, happy: 14, fame: 10 },
    { n: 'Boeing Business Jet', icon: '🛬', price: 100000000, up: 0.05, dep: -0.04, happy: 18, fame: 14 }
  ] }
};

/* ---------------- Crime ---------------- */
const CRIMES = [
  { id: 'shoplift', icon: '🛍️', n: 'Shoplift', reward: [50, 300], risk: 0.25, jail: [0, 1], minAge: 12 },
  { id: 'pickpocket', icon: '👛', n: 'Pickpocket tourists', reward: [200, 1200], risk: 0.3, jail: [0, 1], minAge: 14 },
  { id: 'hack', icon: '🖥️', n: 'Hack accounts', reward: [5000, 60000], risk: 0.35, jail: [1, 3], minAge: 16, smarts: 50 },
  { id: 'scam', icon: '📞', n: 'Run a phone scam', reward: [10000, 200000], risk: 0.4, jail: [2, 5], minAge: 18 },
  { id: 'books', icon: '📚', n: 'Cook the books', reward: [50000, 1000000], risk: 0.35, jail: [2, 6], minAge: 22, biz: true },
  { id: 'insider', icon: '📈', n: 'Insider trading', reward: [100000, 2000000], risk: 0.3, jail: [2, 6], minAge: 24, smarts: 60, cash: 50000 },
  { id: 'smuggle', icon: '📦', n: 'Smuggle luxury goods', reward: [200000, 3000000], risk: 0.4, jail: [3, 8], minAge: 22, biz: true },
  { id: 'heist', icon: '💎', n: 'Jewelry store heist', reward: [500000, 2500000], risk: 0.55, jail: [5, 12], minAge: 20 }
];

/* ---------------- Fun / crazy stuff ---------------- */
const ACTIVITIES = [
  { id: 'gym', icon: '🏋️', n: 'Hit the gym', cost: 600, minAge: 14, run: s => ({ health: 6, looks: 3, happy: 2, msg: 'You got a solid workout routine going.' }) },
  { id: 'study', icon: '📖', n: 'Study hard', cost: 0, minAge: 6, run: s => ({ smarts: 6, happy: -1, msg: 'You hit the books.' }) },
  { id: 'therapy', icon: '🛋️', n: 'See a therapist', cost: 3000, minAge: 14, run: s => ({ happy: 10, msg: 'Therapy helped you clear your head.' }) },
  { id: 'travel', icon: '🧳', n: 'Backpack across the world', cost: 4000, minAge: 18, run: s => ({ happy: 12, smarts: 3, msg: 'You came back with stories and a tan.' }) },
  { id: 'skydive', icon: '🪂', n: 'Skydive', cost: 400, minAge: 18, run: s => Math.random() < 0.03 ? { health: -50, msg: 'The chute failed. Ouch.' } : { happy: 10, fame: 1, msg: 'Best rush of your life.' } },
  { id: 'surgery', icon: '💉', n: 'Plastic surgery', cost: 15000, minAge: 18, run: s => Math.random() < 0.12 ? { looks: -12, happy: -8, msg: 'The surgery went badly.' } : { looks: 15, happy: 4, msg: 'You look fresh.' } },
  { id: 'casino', icon: '🎰', n: 'Gamble $1,000 at the casino', cost: 1000, minAge: 21, run: s => { const r = Math.random(); if (r < 0.04) return { cash: 25000, happy: 10, msg: 'JACKPOT! +$25,000' }; if (r < 0.4) return { cash: 2000, happy: 4, msg: 'You doubled up. +$2,000' }; return { happy: -3, msg: 'The house wins.' }; } },
  { id: 'podcast', icon: '🎙️', n: 'Start a podcast', cost: 1500, minAge: 16, run: s => ({ fame: 3, smarts: 1, happy: 3, msg: 'Your podcast found a small audience.' }) },
  { id: 'viral', icon: '🔥', n: 'Post something outrageous', cost: 0, minAge: 13, run: s => Math.random() < 0.3 ? { fame: 8, happy: 5, msg: 'It went VIRAL.' } : { fame: -1, happy: -4, msg: 'Nobody cared. Cringe.' } },
  { id: 'pr', icon: '📰', n: 'Hire a PR agency', cost: 50000, minAge: 18, run: s => ({ fame: 10, msg: 'Your name is in all the right magazines.' }) },
  { id: 'charity', icon: '🎗️', n: 'Host a charity gala', cost: 100000, minAge: 21, run: s => ({ fame: 8, happy: 8, msg: 'You raised millions and looked great doing it.' }) }
];
