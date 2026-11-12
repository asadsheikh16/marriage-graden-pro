# SETUP.md — Zero se pehla client tak

Ye guide step-by-step hai. Har step ke baad ek baar check karein. Kahin atke to TROUBLESHOOTING.md dekhein.

**Kya chahiye:** Supabase account (Pro plan), Vercel account (Pro plan), GitHub account, Node.js 20 ya usse naya
computer par, aur ek text editor (VS Code).

---

## Step 1 — Computer par code chalana (local test, optional but achha hai)

1. Node.js 20 install karein (nodejs.org se LTS).
2. Terminal mein project folder kholein.
3. `npm install` chalayein (pehli baar 2-3 minute lagte hain).
4. `npm test` chalayein. Last line mein "82 passed" aana chahiye.
5. `npm run build` chalayein. "Compiled successfully" aana chahiye.

---

## Step 2 — Supabase project banana (Pro plan)

1. https://supabase.com par login karein. "New project" dabayein.
2. Organization chuniye (Asad ke naam ka). Pro plan ke liye billing set karein:
   Organization Settings > Billing > Upgrade to Pro. Ye Asad ka kaam hai (card bharna).
3. Project ka naam: `marriage-garden-pro` (ya client ka naam). Database password banayein aur **password manager
   mein save karein** (kahin copy-paste mein na chhodein). Region: Mumbai (ap-south-1) chuniye, taaki speed achhi ho.
4. "Create new project" dabayein. 2-3 minute lagte hain.

---

## Step 3 — Sign-up band karein (zaroori)

Ye step security ke liye hai. Band na karein to koi bhi login karke apna garden bana sakta hai.

1. Supabase dashboard > **Authentication** > **Sign In / Providers** (ya Providers) > **Email**.
2. "Allow new users to sign up" ko **OFF** karein. Save karein.

---

## Step 4 — Schema run karna (tables, guard, RLS)

1. Supabase dashboard > **SQL Editor** > **New query**.
2. Project ke folder mein `schema.sql` file kholein. Poori file copy karein (shuru se aakhir tak).
3. SQL Editor mein paste karein. **Run** dabayein.
4. "Success. No rows returned" jaisa message aana chahiye. Koi red error na ho.
5. Left menu > **Table Editor**: `gardens`, `bookings`, `booking_money`, `rate_items` etc. dikhne chahiye.

> Note: ye schema fresh project ke liye hai. Dobara chalane se tables pe asar ho sakta hai, isliye ek hi baar chalayein.

---

## Step 5 — API keys aur env values

1. Supabase > **Project Settings** > **API**.
2. Ye teen values copy karein (password manager mein save karein):
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (ye secret hai, kisi ko na dikhayein)
3. Computer par project folder mein `.env.local` naam ki file banayein (`.env.example` ko copy karke).
   Teeno values usme daalein. Ye file GitHub par nahi jaati (`.gitignore` mein hai).
4. `npm run dev` chalayein. Browser mein http://localhost:3000 kholein. Login page aana chahiye.

---

## Step 6 — Owner user banana

1. Supabase > **Authentication** > **Users** > **Add user** > **Create new user**.
2. Owner ka email aur strong password dein. **"Auto Confirm User"** tick karein. Create karein.
3. Ye owner ka login hai. Password owner ko dene ke baad password manager mein rakhein.

---

## Step 7 — Garden banana (pehla client)

1. App kholein (local ya live), owner email aur password se login karein.
2. "Mere gardens" page par neeche "Naya garden banayein" form mein garden ka naam (jaise "Shubh Garden Kota")
   aur owner ka phone bharein. "Garden banayein" dabayein.
3. App aapko us garden ke dashboard par le jaayega. Is garden ka login user **owner** ban gaya.
4. Rate card apne aap 5 items ke saath bhar jaata hai (Hall rent, Decoration, Catering per plate, DJ, Tent/lights).
   Rates 0 hain. Ye **Rates & Season** page par bharein.

---

## Step 8 — Rate card aur season set karna

1. Menu > **Rates & Season**.
2. Har item ka **Peak ₹** aur **Off ₹** bharein. Catering "per plate" hai, plate ka rate dein.
3. Peak season ki date-range add karein (jaise muhurat ke dates). Khaali chhodne par Nov-Feb peak maana jaata hai.
4. Naya item chahiye (jaise Mehndi stage) to neeche "Naya item jodein".

---

## Step 9 — Staff jodna

1. Menu > **Staff**.
2. Naam, staff ka email aur password (kam se kam 8 character) bharein. "Staff jodein" dabayein.
3. Staff ko email aur password **khud** bata dein. Staff login karke sirf calendar, booking, enquiry aur
   checklist dekh sakta hai. Paisa, rate, season aur export nahi dikhte.
4. Staff hatana: Staff page par "Hatao".

---

## Step 10 — Pehli booking (test)

1. Menu > **Bookings** > **+ Naya** (ya dashboard par "+ Naya booking").
2. Naam, phone, event, date, slot (Din/Raat/Full Day), guests bharein.
3. Owner ko rate card ke neeche quantity dikhegi: Hall 1, Catering plates = guests (ya khaali chhodein).
4. Advance bharein. "Booking save karein" dabayein.
5. Calendar par us date par lal dikhna chahiye. Usi din dobara same slot ki booking karein: "Is date par booking
   already hai" aana chahiye (ye double-booking rule hai).

---

## Step 11 — Enquiry aur receipt (test)

1. Menu > **Enquiries** > "+ Nayi enquiry". Naam, date, guests, call-back date aur time bharein.
2. Call-back aaj ka ho to upar "Aaj ke call-backs" mein dikhega.
3. Booking kholiye > "Receipt WhatsApp par" dabayein. WhatsApp khulega, message pehle se bhara hoga.

---

## Step 12 — GitHub par private repo mein code rakhna (steps only, koi key nahi)

1. https://github.com par Asad ke account se login karein.
2. "New repository" > naam: `marriage-garden-pro` > **Private** chuniye > "Create repository".
3. Computer par project folder mein terminal kholein. Ye commands ek-ek karke chalayein (apna username
   aur repo naam badal kar):
   ```
   git init
   git add .
   git commit -m "Marriage Garden Pro - first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/marriage-garden-pro.git
   git push -u origin main
   ```
   (Agar `git` nahi hai to pehle git install karein. `.gitignore` ki wajah se `.env.local` aur `node_modules` upload nahi honge.)
4. GitHub par repo kholein, check karein ki `.env.local` file dikh na rahi ho.
5. Backup ke liye: Repo > Settings > Secrets and variables > Actions > **New repository secret**. Naam
   `SUPABASE_DB_URL`, value Supabase ka database connection string (BACKUP_RESTORE.md dekhein). Ye value
   kisi ko na dikhayein.
6. Repo mein collaborator sirf Asad ya bharosemand developer ho. Public repo na banayein.

---

## Step 13 — Vercel par deploy

DEPLOY.md mein poori steps hain. Ye setup ke baad ek client ke liye live link tayyar ho jaata hai.

---

## Pehle client ke liye checklist

CLIENT_ONBOARDING.md (30 minute) aur DEMO_CHECKLIST.md dono chalayein.

---

**Agar kuch na chale:** TROUBLESHOOTING.md mein 15 common problems hain. Phir bhi na ho to HANDOVER.md mein
dekhein ki kis se kya poochhna hai.
