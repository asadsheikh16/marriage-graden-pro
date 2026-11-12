# HANDOVER.md — Agar koi AI ya developer na ho to kaise sambhalein

Ye file Asad ke liye hai, aur kisi bhi naye developer ke liye. Ise padh kar koi bhi project chala sakta hai.
Asli kaam: sab access aapke paas rakhein, keys password manager mein, aur har mahine ka kharcha check karein.

## 1. Kya-kya safe rakhna hai (ye aapke haath mein hona chahiye)

| Cheez | Kahan hai | Kaise rakhein |
|---|---|---|
| Supabase account | supabase.com | Asad ke email se. 2-step login (2FA) ON. Recovery codes safe jagah |
| Supabase project + DB password | Supabase project | DB password password manager mein |
| Vercel account / team | vercel.com | Asad ke email se. 2FA ON. Team mein sirf zaroori log |
| GitHub private repo | github.com | Asad ke account mein. Repo PRIVATE. Collaborator kam rakhein |
| Env values (URL, anon key, service role key) | Vercel Environment Variables + `.env.local` | Password manager mein copy. Kisi chat mein nahi |
| Owner logins (har client ka) | Supabase Authentication | Har owner ka password client ke saath alag, aur password manager mein record |
| Domain login (agar custom domain hai) | Domain registrar | Asad ke email se, 2FA ON |
| Backup files | Google Drive / encrypted drive | Private folder, ek se zyada jagah |
| GitHub secret `SUPABASE_DB_URL` | GitHub repo secrets | Sirf repo owner dekh sakta hai |

**Kabhi na karein:** keys ko WhatsApp par bhejna, public GitHub par daalna, screenshot mein `.env` dikhna.

## 2. Monthly kharcha (plain rupees, approx)

| Cheez | Kitna (approx) | Note |
|---|---|---|
| Supabase Pro | lagbhag $25 (≈ Rs 2,100) | Daily backup, project pause nahi. Current price pricing page par |
| Vercel Pro | lagbhag $20 (≈ Rs 1,700) | Ek seat. Extra team member = extra seat charge |
| Domain | saal mein ek baar (≈ Rs 800-1,000 / saal) | Mahine ka ≈ Rs 80 |
| GitHub | free (private repo, basic) | Actions minutes free limit mein |
| **Kul (ek mahina)** | **≈ Rs 4,000** | Asad ka budget isi ke aas-paas. Dollar rate aur tax se thoda upar-neeche |

Kharche ka note: ye approx hai. Exact price har provider ke pricing page par dekhein. Tax (GST) alag lag sakta hai.

### Aur gardens jodne par kya extra lagega

- **Supabase**: database ka size aur bandwidth badhta hai. Dashboard mein Usage page dekhein. Limit ke paas
  pahunchne par Pro ke upar add-on ya bada compute lagta hai. Har client ke liye lagbhag database kitna badha, ye
  mahine mein ek baar dekhein. Jab Usage 70% se upar jaaye, tab plan upgrade ki baat karein.
- **Vercel**: traffic badhne par Pro ki limits dekhein (bandwidth, function run). Naye team members ke seats ka charge.
- **Support kharcha**: agar developer ko ghante ke hisaab se rakhna ho to ye alag kharcha hai.
- **Backup storage**: GitHub artifacts 30 din tak; purane dump delete karte rahein.

## 3. Kis se kya poochhein

| Problem / kaam | Kis se | Kaise |
|---|---|---|
| Database, backup, restore, billing, project pause | Supabase support | Dashboard ka support chat, ya support@supabase.com |
| Deploy, domain, build, env variables, billing | Vercel support | Dashboard > Help, ya support chat |
| Domain DNS (A / CNAME record) | Jahan se domain kharida | Registrar ka support |
| Code mein badlaav, naya feature, bug fix | Developer (ya AI) | Repo ka link + TROUBLESHOOTING.md ka problem number + error text |
| Client ko kya batana hai, rate, fees | Asad | Ye business hai |
| Login aur passwords reset | Asad (owner ke saath) | Supabase > Users > reset |
| GitHub repo access | GitHub | Settings > Collaborators |

## 4. Koi AI ya developer na ho to takeover kaise karein (steps)

1. **Access check**: Supabase, Vercel, GitHub, domain mein login ho raha hai? (Upar wali table ke hisaab se.)
2. **Code**: GitHub se repo clone karein (`git clone`). `npm install` chalayein.
3. **Local test**: `.env.local` banayein (`.env.example` se, values password manager se). `npm test` aur `npm run build` chalayein.
   Dono pass hone chahiye.
4. **Database check**: Supabase SQL Editor mein `tests/schema-check.sql` ka idea samjhein. Naya test database
   local PostgreSQL 15 par `tests/run-schema-check.sh` se chala sakte hain.
5. **Deploy check**: Vercel par Production link khulta hai? Login hota hai?
6. **Backup check**: GitHub Actions mein `weekly-db-backup` ek baar chalaya, artifact aaya?
7. **Docs padhein**: README.md (structure), DATABASE.md (tables), DEPLOY.md, BACKUP_RESTORE.md, TROUBLESHOOTING.md.
8. **Kaam ki list**: DEMO_CHECKLIST.md se ek baar poora test karein. Jo fail ho, use note karein.

## 5. Ye code kya nahi karta (honest list)

- Online payment gateway nahi hai. Advance aur balance haath se (cash, UPI, bank) entry hote hain.
- Customer ka apna login ya online booking nahi hai.
- Owner / manager / customer ke alawa koi role nahi.
- WhatsApp reminder automatic nahi hai. Sirf link banta hai, owner khud bhejta hai. Automatic scheduled
  reminder ke liye server job chahiye (ye abhi nahi bana).
- Supabase ka automatic backup Pro plan par hai; free plan par nahi (free plan par sirf weekly GitHub dump + CSV).
- Legal: privacy policy, terms aur data-protection (client ka data) ke liye vakil se baat karein. Ye code kanooni salah nahi hai.

## 6. Aakhri baat

Ye system ek hi jagah (Supabase + Vercel) par chalta hai. Jo bhi sambhale, uske paas ye teen cheezein honi chahiye:
**Supabase access, Vercel access, aur GitHub repo.** Inhe Asad ke paas hi rakhein; developer ko access dena ho to
time-limited, aur baad mein wapas le lein.
