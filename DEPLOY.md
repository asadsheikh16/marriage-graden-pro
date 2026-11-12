# DEPLOY.md — Supabase + Vercel par deploy, env, custom domain

Pehle SETUP.md ke step 1 se 9 tak ho chuke hon. Ye file live (internet par) karne ke liye hai.

## Plans ka saaf hisaab (ye zaroor padhein)

- **Supabase Pro** (Asad ka plan): project pause nahi hota, daily backup milta hai (dashboard mein dikhta hai).
  Point-in-time recovery (PITR) Pro ka add-on hai: Asad dashboard mein **Database > Backups** kholke check kare
  ki on hai ya nahi, aur uska extra charge pricing page par dekhe.
- **Vercel Pro** (Asad ka plan): commercial use ke liye. Hobby (free) plan sirf personal, non-commercial hai.
  Garden owners ko bechne ke liye Pro chahiye. Vercel ki terms ek baar khud padh lein. Har extra team member
  par seat ka charge lagta hai (pricing page par check karein).
- **Row Level Security (RLS)** Pro plan se nahi, `schema.sql` se chalti hai. Har table par on hai.
- Kanooni baat: ye sirf plan ki jaankari hai, legal salah nahi. Terms check karein.

## Part A — Supabase (pehle se SETUP.md Step 2-4 mein)

Check list:
- [ ] Project Pro plan par hai (Organization > Billing)
- [ ] `schema.sql` run ho chuki hai, koi error nahi
- [ ] Authentication > Providers > Email: "Allow new users to sign up" OFF
- [ ] Database > Backups: daily backup dikh raha hai (aur PITR on hai, agar Asad ne lena chuna)

## Part B — Vercel par project banana

1. https://vercel.com par Asad ke account se login (Pro plan par).
2. "Add New..." > **Project** > GitHub se `marriage-garden-pro` repo import karein.
   (Pehli baar GitHub ko Vercel ke saath connect karna padega. Sirf is repo ko allow karein.)
3. **Framework Preset**: Next.js (apne aap pehchaan leta hai). Root directory: `./`.
4. Build command aur output default rakhein: `next build`.
5. Abhi **Deploy** na dabayein. Pehle env variables daalein (Part C).

## Part C — Environment variables Vercel par

Project > **Settings** > **Environment Variables**. Ye teen add karein (Environment: Production, Preview, Development sab):

| Name | Value kahan se | Sensitive? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API > Project URL | Nahi |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > API > anon public | Nahi |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > API > service_role | **Haan** (Sensitive ON karein) |

Rules:
- Value copy-paste karte waqt space ya new line na aaye.
- Value badalne ke baad **Redeploy** karein (Deployments > ... > Redeploy). Purana build naye values nahi leta.
- Ye values kisi chat, email ya GitHub par na bhejein.

Ab **Deploy** dabayein. 1-3 minute mein link aayega (jaise `marriage-garden-pro.vercel.app`).

## Part D — Live check (5 minute)

1. Link kholein. Login page aana chahiye.
2. Owner se login karein. "Mere gardens" mein garden dikhna chahiye.
3. Ek test booking save karein, calendar par dikhe.
4. Staff account se login karke dekhein: paisa, rates, export, staff page nahi dikhne chahiye.
5. `/g/<garden-id>/export` par staff login mein "Export sirf owner kar sakta hai" aana chahiye.

Kuch na chale to TROUBLESHOOTING.md.

## Part E — Custom domain (jaise `garden.example.in`)

1. Vercel > Project > **Settings** > **Domains** > naam likhein > Add.
2. Vercel ek DNS record batayega (CNAME ya A). Domain jahan se kharida hai (GoDaddy, Namecheap, etc.) wahan
   DNS settings mein wahi record daalein.
3. 10 minute se 24 ghante tak lag sakte hain. Vercel par "Valid Configuration" green aane tak wait karein.
4. Domain ko https par chalne dein (Vercel apne aap certificate deta hai).
5. Client ko sirf ye link dein. Kisi bhi garden ke liye alag link nahi, ek hi app, garden login se alag hota hai.

## Part F — Redeploy aur updates

- Code badalne ke baad GitHub par push karein. Vercel apne aap naya deploy karta hai.
- Database badalne ke liye (naya column etc.) Supabase SQL Editor mein naya SQL chalayein. Vercel par
  kuch karne ki zaroorat nahi, sirf code ka version match hona chahiye.
- Rollback: Vercel > Deployments > purane deploy par "Promote to Production".

## Part G — Logs aur errors

- Vercel > Project > **Logs** (ya Runtime Logs): page ke error yahan dikhte hain.
- Supabase > **Logs**: database aur auth ke errors.
- Client ko kabhi raw error na dikhayein; TROUBLESHOOTING.md mein Hinglish fix hai.
