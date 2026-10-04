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
// up = yearly upkeep % of price, dep = yearly value change, vol = random value swing,
// sh/sp = sprite sheet + cell (optional), acts = things you can do with it once owned
const I = (n, icon, price, o) => Object.assign({ n, icon, price, up: 0, dep: 0, happy: 0, fame: 0 }, o);
const ASSETS = {
  home: { label: 'Homes', icon: '🏠', acts: ['renovate', 'furnish', 'party', 'rent'], items: [
    I('Cabin in the Woods', '🛖', 90000, { up: 0.014, dep: 0.03, happy: 3 }),
    I('Studio Flat', '🏢', 120000, { up: 0.015, dep: 0.03, happy: 3, sp: 0 }),
    I('City Apartment', '🏙️', 280000, { up: 0.015, dep: 0.03, happy: 4, sp: 1 }),
    I('Townhouse', '🏘️', 520000, { up: 0.015, dep: 0.03, happy: 5, sp: 2 }),
    I('Suburban House', '🏡', 850000, { up: 0.016, dep: 0.03, happy: 6, sp: 3 }),
    I('Beach House', '🏖️', 1800000, { up: 0.017, dep: 0.035, happy: 8, fame: 1 }),
    I('Ski Chalet', '🏔️', 3200000, { up: 0.017, dep: 0.03, happy: 8, fame: 1 }),
    I('Skyline Penthouse', '🌆', 4500000, { up: 0.017, dep: 0.035, happy: 8, fame: 2, sp: 4 }),
    I('Riviera Villa', '🏛️', 12000000, { up: 0.018, dep: 0.035, happy: 10, fame: 3 }),
    I('Hilltop Mansion', '🏰', 18000000, { up: 0.018, dep: 0.035, happy: 10, fame: 4, sp: 5 }),
    I('Private Island', '🏝️', 95000000, { up: 0.02, dep: 0.03, happy: 15, fame: 10, sp: 6 }),
    I('Fairytale Castle', '🏯', 300000000, { up: 0.02, dep: 0.03, happy: 20, fame: 15, sp: 7 })
  ] },
  car: { label: 'Cars', icon: '🚗', acts: ['service', 'roadtrip', 'race'], items: [
    I('Used Hatchback', '🚗', 9000, { up: 0.08, dep: -0.12, happy: 2, sp: 0 }),
    I('Motorbike', '🏍️', 12000, { up: 0.07, dep: -0.1, happy: 3 }),
    I('Family Sedan', '🚙', 32000, { up: 0.07, dep: -0.12, happy: 3, sp: 1 }),
    I('Pickup Truck', '🛻', 45000, { up: 0.07, dep: -0.1, happy: 3 }),
    I('Luxury SUV', '🚘', 85000, { up: 0.06, dep: -0.14, happy: 4, fame: 1, sp: 2 }),
    I('Sports Coupe', '🏎️', 160000, { up: 0.05, dep: -0.1, happy: 6, fame: 2, sp: 3 }),
    I('Classic Muscle Car', '🚓', 180000, { up: 0.05, dep: 0.03, vol: 0.05, happy: 6, fame: 1 }),
    I('Lamborghini', '🏎️', 420000, { up: 0.04, dep: -0.06, happy: 8, fame: 4, sp: 4, acts: ['drive3d', 'service', 'roadtrip', 'race'] }),
    I('Rolls-Royce', '🚘', 450000, { up: 0.04, dep: -0.05, happy: 8, fame: 4 }),
    I('Bugatti Chiron', '🏁', 3400000, { up: 0.03, dep: 0, happy: 12, fame: 8, sp: 5 })
  ] },
  boat: { label: 'Boats', icon: '🛥️', acts: ['sail', 'party', 'service', 'rent'], items: [
    I('Jet Ski', '🚤', 15000, { up: 0.08, dep: -0.1, happy: 4 }),
    I('Fishing Boat', '🎣', 60000, { up: 0.08, dep: -0.08, happy: 5 }),
    I('Speedboat', '🚤', 140000, { up: 0.07, dep: -0.07, happy: 7, fame: 1, sh: 'extra', sp: 0 }),
    I('Sailing Yacht', '⛵', 900000, { up: 0.07, dep: -0.05, happy: 9, fame: 3, sh: 'extra', sp: 1 }),
    I('Motor Yacht', '🛥️', 6000000, { up: 0.06, dep: -0.05, happy: 12, fame: 5 }),
    I('Superyacht', '🚢', 60000000, { up: 0.06, dep: -0.04, happy: 16, fame: 10, sh: 'extra', sp: 2 }),
    I('Mega-yacht', '🛳️', 350000000, { up: 0.05, dep: -0.04, happy: 22, fame: 18 })
  ] },
  plane: { label: 'Aircraft', icon: '✈️', acts: ['fly', 'party', 'service', 'rent'], items: [
    I('Cessna 172', '🛩️', 450000, { up: 0.1, dep: -0.05, happy: 5, fame: 2, sp: 0 }),
    I('Helicopter', '🚁', 3000000, { up: 0.09, dep: -0.05, happy: 8, fame: 4, sp: 5 }),
    I('Pilatus PC-12', '🛩️', 5000000, { up: 0.08, dep: -0.05, happy: 8, fame: 4, sp: 1 }),
    I('Embraer Phenom 300', '✈️', 9500000, { up: 0.07, dep: -0.06, happy: 10, fame: 6, sp: 2 }),
    I('Gulfstream G650', '🛫', 70000000, { up: 0.05, dep: -0.05, happy: 14, fame: 10, sp: 3 }),
    I('Boeing Business Jet', '🛬', 100000000, { up: 0.05, dep: -0.04, happy: 18, fame: 14, sp: 4 })
  ] },
  watch: { label: 'Watches', icon: '⌚', acts: ['flex', 'appraise', 'auction'], items: [
    I('Casio Digital', '⌚', 50, { dep: -0.1, sp: 0 }),
    I('Seiko Automatic', '⌚', 400, { dep: -0.05, happy: 1, sp: 1 }),
    I('Smartwatch', '⌚', 450, { dep: -0.25, happy: 1, fx: { smarts: 0.3 }, perk: '+0.3 Smarts a year' }),
    I('Omega Seamaster', '⌚', 6500, { dep: 0.04, vol: 0.02, happy: 2, fame: 0.5 }),
    I('Rolex Submariner', '⌚', 14000, { dep: 0.05, vol: 0.03, happy: 3, fame: 1, sp: 2 }),
    I('Audemars Piguet Royal Oak', '⌚', 85000, { dep: 0.06, vol: 0.04, happy: 5, fame: 2, sp: 3 }),
    I('Richard Mille RM 27', '💎', 1900000, { dep: 0.05, vol: 0.05, happy: 8, fame: 5, sp: 4 }),
    I('Patek Philippe Grandmaster Chime', '👑', 31000000, { dep: 0.04, vol: 0.05, happy: 12, fame: 10, sp: 5 })
  ] },
  jewel: { label: 'Jewelry', icon: '💎', acts: ['flex', 'appraise', 'auction'], items: [
    I('Gold Chain', '⛓️', 2500, { dep: 0.03, vol: 0.02, happy: 2, looks: 1 }),
    I('Diamond Ring', '💍', 18000, { dep: 0.03, vol: 0.03, happy: 4, looks: 2, sh: 'extra', sp: 9 }),
    I('Pearl Necklace', '📿', 60000, { dep: 0.03, vol: 0.03, happy: 5, looks: 3, sh: 'extra', sp: 10 }),
    I('Emerald Set', '💚', 400000, { dep: 0.03, vol: 0.04, happy: 7, looks: 4, fame: 2 }),
    I('Pink Diamond', '🩷', 8000000, { dep: 0.04, vol: 0.05, happy: 12, looks: 6, fame: 6, sh: 'extra', sp: 11 })
  ] },
  clothes: { label: 'Fashion', icon: '👔', acts: ['wear', 'flex', 'donate'], items: [
    I('Hoodie & Jeans', '👕', 80, { dep: -0.5, looks: 1, happy: 1, sp: 0 }),
    I('Smart Casual', '👔', 400, { dep: -0.4, looks: 3, happy: 1, sp: 1 }),
    I('Sneaker Collection', '👟', 1200, { dep: -0.15, vol: 0.06, looks: 2, happy: 2, sp: 5 }),
    I('Tailored Suit', '🤵', 2500, { dep: -0.25, looks: 6, happy: 2, sp: 2 }),
    I('Leather Jacket', '🧥', 4000, { dep: -0.2, looks: 5, happy: 2, fame: 0.5 }),
    I('Designer Wardrobe', '🧥', 25000, { dep: -0.2, looks: 10, happy: 3, fame: 2, sp: 3 }),
    I('Bespoke Couture', '🥻', 150000, { dep: -0.15, looks: 15, happy: 4, fame: 4, sp: 4 })
  ] },
  art: { label: 'Art', icon: '🖼️', acts: ['display', 'appraise', 'auction'], items: [
    I('Limited Print', '🖼️', 800, { dep: 0.02, vol: 0.08, happy: 1 }),
    I('Marble Sculpture', '🗿', 25000, { dep: 0.02, vol: 0.08, happy: 3, fame: 0.5, sh: 'extra', sp: 7 }),
    I('Vintage Wine Collection', '🍷', 40000, { dep: 0.04, vol: 0.07, happy: 3, sh: 'extra', sp: 8 }),
    I('Rare Comic Book', '📕', 90000, { dep: 0.03, vol: 0.14, happy: 3 }),
    I('Oil Painting', '🎨', 200000, { dep: 0.03, vol: 0.1, happy: 5, fame: 1, sh: 'extra', sp: 6 }),
    I('Dinosaur Fossil', '🦖', 3000000, { dep: 0.03, vol: 0.09, happy: 8, fame: 3 }),
    I('Old Master Painting', '🖼️', 45000000, { dep: 0.03, vol: 0.1, happy: 12, fame: 8, sh: 'extra', sp: 6 })
  ] },
  tech: { label: 'Home & Tech', icon: '🛋️', items: [
    I('Gaming PC', '🖥️', 2500, { up: 0.04, dep: -0.2, happy: 3, sh: 'extra', sp: 12, acts: ['game', 'stream'] }),
    I('Home Gym', '🏋️', 8000, { up: 0.03, dep: -0.1, happy: 2, sh: 'extra', sp: 13, acts: ['workout'] }),
    I('Hot Tub', '🛁', 12000, { up: 0.04, dep: -0.08, happy: 4, acts: ['relax', 'party'] }),
    I('Smart-Home System', '🏠', 35000, { up: 0.02, dep: -0.1, happy: 3, acts: ['showoff'], perk: 'Saves 1% of living costs', fx: { living: 0.01 } }),
    I('Home Theater', '🎬', 40000, { up: 0.03, dep: -0.1, happy: 5, sh: 'extra', sp: 14, acts: ['movie', 'party'] }),
    I('Swimming Pool', '🏊', 90000, { up: 0.04, dep: -0.04, happy: 7, fame: 1, acts: ['swim', 'party'] })
  ] },
  gear: { label: 'Gear', icon: '🎥', items: [
    I('Ring Light', '💡', 120, { dep: -0.2, perk: '+5% social reach', fx: { reach: 1.05 } }),
    I('Standing Desk', '🪑', 900, { dep: -0.1, perk: '+1 Health a year', fx: { health: 1 } }),
    I('Premium Phone', '📱', 1100, { dep: -0.3, perk: '+5% social reach', fx: { reach: 1.05 }, acts: ['stream'] }),
    I('Laptop', '💻', 2000, { dep: -0.25, perk: '+1 Smarts a year', fx: { smarts: 1 } }),
    I('Pro Camera', '📷', 3500, { dep: -0.2, perk: '+12% social reach', fx: { reach: 1.12 }, acts: ['stream'] }),
    I('Editing Workstation', '🖥️', 8000, { dep: -0.2, perk: '+8% social reach', fx: { reach: 1.08 } }),
    I('Podcast Studio', '🎙️', 12000, { dep: -0.15, perk: '+10% social reach', fx: { reach: 1.10 }, acts: ['stream'] }),
    I('Analytics Suite', '📊', 15000, { dep: -0.15, perk: '+0.4% store conversion', fx: { conv: 0.4 } })
  ] },
  pet: { label: 'Pets', icon: '🐾', acts: ['play', 'train', 'vet'], items: [
    I('Fish Tank', '🐠', 400, { up: 0.5, dep: -0.5, happy: 2, life: 8 }),
    I('Cat', '🐈', 300, { up: 0.7, dep: -0.5, happy: 4, life: 15, sh: 'extra', sp: 4 }),
    I('Dog', '🐕', 800, { up: 0.6, dep: -0.5, happy: 6, life: 13, sh: 'extra', sp: 3 }),
    I('Parrot', '🦜', 1500, { up: 0.3, dep: -0.5, happy: 4, life: 30 }),
    I('Racehorse', '🐎', 18000, { up: 0.14, dep: -0.1, happy: 8, fame: 2, life: 25, sh: 'extra', sp: 5 })
  ] },
  exp: { label: 'Experiences', icon: '🎟️', items: [
    I('Michelin Dinner', '🍽️', 400, { e: { happy: 4, msg: 'An unforgettable tasting menu.' }, partner: 10 }),
    I('Concert VIP Night', '🎤', 800, { e: { happy: 8, fame: 0.3, msg: 'You sang along from the front row.' }, partner: 6 }),
    I('Online Course', '💻', 500, { e: { smarts: 4, msg: 'You finished a course and learned a lot.' } }),
    I('Track Day', '🏁', 3000, { e: { happy: 8, fame: 0.5, msg: 'You drove a supercar flat out on a track.' }, risk: { p: 0.05, cost: 8000, msg: 'You crashed a rental supercar. Insurance bill!' } }),
    I('Language Immersion', '🗣️', 4000, { e: { smarts: 4, happy: 3, trips: 1, msg: 'You spent a month abroad learning a language.' } }),
    I('Business Seminar', '💼', 5000, { e: { smarts: 3, fame: 0.3, msg: 'You made useful contacts at a seminar.' } }),
    I('Wellness Retreat', '🧘', 6000, { e: { health: 10, happy: 8, msg: 'You came back rested and clear-headed.' } }),
    I('Safari Adventure', '🦁', 9000, { e: { happy: 10, health: 3, trips: 1, msg: 'You saw lions at sunrise.' } }),
    I('Luxury Resort Week', '🏝️', 12000, { e: { happy: 12, trips: 1, msg: 'A week of pure relaxation.' }, partner: 12 }),
    I('High-Roller Weekend', '🎰', 50000, { gamble: true, msg: 'You played the high-roller tables.' }),
    I('MBA Program', '🎓', 60000, { e: { smarts: 10, deg: true, msg: 'You earned an MBA and a degree.' } }),
    I('Space Flight', '🚀', 250000, { e: { happy: 25, fame: 5, trips: 1, msg: 'You saw the Earth from space.' }, risk: { p: 0.03, health: -30, msg: 'The flight went badly. You were hurt.' } })
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
