// Quick local setup for the emulators: a test admin user + store settings.
// For real catalogue data run the importer afterwards:
//   npm run import:local
process.env.USE_EMULATORS = '1';
const { db, auth } = await import('./lib/admin.mjs');
const { DEFAULT_SETTINGS } = await import('@jae/shared/constants.js');

const email = 'admin@jae.local';
const password = 'admin123';
let user;
try { user = await auth.getUserByEmail(email); } catch { user = await auth.createUser({ email, password, displayName: 'Local Admin' }); }
await auth.setCustomUserClaims(user.uid, { admin: true });

await db.doc('settings/store').set({ ...DEFAULT_SETTINGS, business: { gstin: '', state: 'Maharashtra', invoicePrefix: 'JAE-' }, updatedAt: new Date() }, { merge: true });
await db.doc('coupons/WELCOME5').set({ code: 'WELCOME5', type: 'percent', value: 5, minCart: 0, maxUses: 0, firstOrderOnly: true, active: true, used: 0, createdAt: new Date() });
await db.doc('pincodes/400001').set({ city: 'Mumbai', state: 'Maharashtra', days: '1–2', cod: true });

console.log(`✓ Emulator seeded. Admin login: ${email} / ${password}`);
console.log('  Next: npm run import:local');
process.exit(0);
