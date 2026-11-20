// Grant (or revoke) admin access to the admin panel.
//   node scripts/set-admin.mjs owner@example.com            → admin
//   node scripts/set-admin.mjs owner@example.com --revoke   → remove admin
// The user must already exist (create them in Firebase console › Authentication › Add user).
import { auth } from './lib/admin.mjs';

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('Usage: node scripts/set-admin.mjs <email> [--revoke]');
  process.exit(1);
}
const user = await auth.getUserByEmail(email);
const admin = flag !== '--revoke';
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin });
console.log(`${admin ? '✓ Granted' : '✓ Revoked'} admin for ${email} (uid ${user.uid}). They must sign out and back in.`);
process.exit(0);
