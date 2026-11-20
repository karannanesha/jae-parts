# JAE Printer Parts — jaepart.com rebuild

React + Vite storefront and admin panel on Firebase, rebuilt from the WooCommerce site.
Design: the "JAE Printer Parts — Website & Admin Redesign" canvas.

```
apps/store        Customer website (jaepart.com)            → Hosting target "store"  → jae-parts-dev.web.app
apps/admin        Admin panel                                → Hosting target "admin"  → jae-parts-dev-admin.web.app
packages/shared   Design tokens (CSS), icons, formatting, constants, Firebase init
functions         Cloud Functions: createOrder, verifyPayment, razorpayWebhook, trackOrder, syncCounts
scripts           WooCommerce import, set-admin, recount, emulator seed
firestore.rules   Security rules (admins = custom claim admin:true; orders only written by Functions)
storage.rules     Product/category images public, admin-only upload
```

## 1. One-time setup (your Windows machine)

1. Install **Node.js 20 LTS or newer**, **Git**, and **Java 21** (the Firebase emulators need Java).
2. In a terminal at the repo root:
   ```bash
   npm install -g firebase-tools
   firebase login
   npm install          # installs all apps + functions
   firebase use jae-parts-dev
   ```
3. In the Firebase console for **jae-parts-dev**, check:
   - Authentication → Sign-in method: **Phone** and **Email/Password** enabled.
     Under Phone, add a test number, e.g. `+91 99999 00001` → code `123456` (no real SMS, no cost).
   - Firestore and Storage created (location **asia-south1**).

## 2. Run everything locally (free, no Blaze plan needed)

Uses the Firebase Emulator Suite, so nothing touches the real project.

```bash
copy apps\store\.env.example apps\store\.env.local     # VITE_USE_EMULATORS=true
copy apps\admin\.env.example apps\admin\.env.local
copy functions\.secret.local.example functions\.secret.local   # put your Razorpay TEST keys in it

npm run emulators        # terminal 1 — keep running (Emulator UI: http://localhost:4000)
npm run seed             # terminal 2 — admin user + settings + a test coupon/PIN
npm run import:local     # first 80 products + categories + pages from jaepart.com
npm run dev:store        # http://localhost:5173
npm run dev:admin        # http://localhost:5174  → admin@jae.local / admin123
```

Phone OTP in the emulator: use any number; the code is printed in the emulator terminal / Emulator UI.
Emulator data is saved to `.emulator-data/` when you stop it with Ctrl+C.

## 3. Use the real dev project (jae-parts-dev)

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

**Admin user:** Firebase console → Authentication → Add user (email + password), then give it admin rights.
The scripts need credentials — either `gcloud auth application-default login`, or a service-account key
(Project settings → Service accounts → Generate new private key; save it **outside** the repo):

```bash
set GOOGLE_APPLICATION_CREDENTIALS=C:\keys\jae-parts-dev.json
npm run set-admin -- you@example.com
npm run import:dev        # full catalogue (655 products), copies photos into Firebase Storage
```

Set `VITE_USE_EMULATORS=false` in both `.env.local` files to point the local apps at the real project.

**Deploy the sites:**
```bash
npm run deploy:hosting    # builds both apps → jae-parts-dev.web.app and jae-parts-dev-admin.web.app
```

**Cloud Functions (checkout, payment, tracking) need the Blaze plan.** Until then the store browses,
searches and takes enquiries on the cloud, and you test checkout on the emulators. When ready:
```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
firebase functions:secrets:set RAZORPAY_KEY_SECRET
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET
npm run deploy:functions
```
Then in Razorpay Dashboard → Webhooks add
`https://asia-south1-jae-parts-dev.cloudfunctions.net/razorpayWebhook` with event `payment.captured`.

## Data model (Firestore)

| Collection | Key fields |
|---|---|
| `products/{id}` | name, slug, brand, partNo, sku, price, mrp, gstRate, hsn, stock (null = not tracked), inStock, status (published/draft/hidden), categoryIds[], primaryCategoryId, compatibleModels[], specs[{k,v}], images[{url,path,alt}], description (HTML), seo, searchTokens[] |
| `categories/{slug}` | name, parentId, description, image, order, showOnHome, showInMenu, productCount (Functions) |
| `brands/{slug}` | name, productCount |
| `orders/{id}` | number (JAE-10001…), userId, customer, address, gst, items[], coupon, totals{subtotal,discount,gst,shipping,total}, payment{method,status,razorpayOrderId…}, status, tracking, timeline |
| `users/{uid}` | name, phone, email, address, gst, orderCount, totalSpent, lastOrderAt |
| `enquiries/{id}` | uid, phone (OTP-verified), name, email, subject, message, photo, source (contact/bulk), status, note |
| `coupons/{CODE}` | type (percent/flat), value, minCart, maxUses, used, firstOrderOnly, expiresAt, active |
| `pages/{slug}` | title, summary, html, published, seo |
| `pincodes/{pin}` | city, state, days, cod |
| `settings/store` | contact, social, shipping, payments, features, analytics, business, home (sections, hero tiles, popular searches) |

## URLs (kept the same as WordPress for SEO)

`/product/<slug>/`, `/product-category/<slug>/`, `/product-category/<parent>/<child>/`, `/shop/`, `/cart/`,
`/checkout/`, `/my-account/`, `/track-order/`, `/contact-us/`, `/<page-slug>/` (about-us, return-policy …).

## Not done yet (next steps)
- Prerendering / SSR for product pages (better Google indexing than a client-rendered SPA)
- SMS/WhatsApp/email order notifications (e.g. MSG91 or WhatsApp Cloud API from a Function)
- Product reviews, App Check on the OTP and enquiry forms, automated backups
