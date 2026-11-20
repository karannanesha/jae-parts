export const STORE = {
  name: 'Jay Ambe Enterprises',
  shortName: 'JAE Printer Parts',
  domain: 'jaepart.com',
};

// Fallback contact details used until settings/store is loaded or if it is missing.
export const DEFAULT_SETTINGS = {
  contact: {
    phones: ['+91 93245 68457', '+91 98332 94477'],
    whatsapp: '919324568457',
    emails: ['info@jaepart.com'],
    storeAddress: 'Ground Floor, Dwarkadas Building, 25/27 Modi Street, Fort, Mumbai, Maharashtra 400001',
    registeredAddress: 'Plot 143A, Sector 19, Kharghar, Navi Mumbai 410210',
    hours: '',
  },
  social: {
    facebook: 'https://www.facebook.com/people/JAE-Printer-parts/100066889362437/',
    instagram: 'https://www.instagram.com/jae_printer_parts/',
    youtube: 'https://www.youtube.com/@jaeprinterparts',
    linkedin: 'https://www.linkedin.com/company/jae-printer-parts',
  },
  shipping: {
    flatRate: 0,
    freeAbove: 0,
    estimateText: 'Metro 1–2 days · Rest of India 3–6 days',
  },
  payments: { razorpay: true, cod: true, codMaxOrder: 10000 },
  features: { reviews: false, cookieBanner: true },
  analytics: { gtmId: '' },
  home: {
    sections: [
      { id: 'hero', enabled: true },
      { id: 'trust', enabled: true },
      { id: 'categories', enabled: true },
      { id: 'types', enabled: true },
      { id: 'brands', enabled: true },
      { id: 'rail-laser', enabled: true, categorySlug: 'laserjet-printer-parts', title: 'Bestsellers for laser printers', eyebrow: 'Laser printer parts' },
      { id: 'rail-inkjet', enabled: true, categorySlug: 'inkjet-printer-parts', title: 'For EcoTank, PIXMA & Smart Tank', eyebrow: 'Inkjet printer parts' },
      { id: 'rail-dmp', enabled: true, categorySlug: 'dot-matrix-printer-parts', title: 'Keep billing printers running', eyebrow: 'Dot matrix printer parts' },
      { id: 'cta', enabled: true },
    ],
    heroTileSlugs: ['logic-card', 'fuser-assembly', 'pickup-roller', 'power-supply-board'],
    popularSearches: ['HP M1005 logic card', 'Canon LBP2900 fuser', 'Epson L3110 CCD', 'Epson LX-310 head'],
  },
};

export const ORDER_STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'muted' },
  new: { label: 'New', tone: 'red' },
  processing: { label: 'Processing', tone: 'amber' },
  shipped: { label: 'Shipped', tone: 'blue' },
  delivered: { label: 'Delivered', tone: 'green' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
  claim: { label: 'Replacement claim', tone: 'purple' },
};

export const ENQUIRY_STATUS = {
  new: { label: 'New', tone: 'red' },
  quoted: { label: 'Quoted', tone: 'blue' },
  converted: { label: 'Converted', tone: 'green' },
  closed: { label: 'Closed', tone: 'muted' },
};

export const GST_RATES = [18, 12, 5, 28, 0];

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh',
  'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];
