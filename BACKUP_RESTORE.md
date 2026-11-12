# BACKUP_RESTORE.md — Backup aur restore

Teen tarah ke backup hain. Teeno ka kaam alag hai, teeno rakhein.

## 1. Garden-wise CSV (owner, har hafte, client ko bhi de sakte hain)

- Kaun: sirf owner (staff ko ye button nahi dikhta, aur server par 403 milta hai).
- Kaise: app mein login karein > garden kholein > top bar mein **CSV** link dabayein. CSV file download hogi.
- Kya hai: sab bookings, customer details, paisa (total, advance, balance, status). Excel mein Hindi sahi dikhta hai (BOM).
- Schedule: har hafte (jaise Sunday) owner khud download karke apne Google Drive / computer mein rakhe.
- Ye sirf ek garden ka data hai. Client ko alag garden ka data nahi milta.

## 2. Full database backup — Supabase daily backup (Pro plan)

- Pro plan par Supabase daily backup apne aap leta hai (dashboard mein dikhta hai).
- Dekhna: Supabase > project > **Database** > **Backups**. Date-wise list.
- Restore (dashboard se): Backups list mein wo date chuniye > Restore. Ye poore project ko us point par le jaata
  hai. Restore ke dauran app kuch minute down reh sakta hai. Restore karne se pehle Asad client ko batayein.
- **Point-in-time recovery (PITR)**: Pro ka add-on hai. Asad check kare ki on hai ya nahi (Database > Backups mein),
  aur extra charge pricing page par dekhe. Bina PITR ke sirf daily point milta hai.

## 3. Weekly full dump on GitHub (free, extra copy)

Ye `.github/workflows/weekly-db-backup.yml` se chalta hai. Har Sunday 08:00 IST par.

Setup (ek baar):
1. Supabase > Project Settings > **Database** > Connection string > **Session pooler** > URI.
   Ye copy karein. Password ki jagah apna database password likhein (password manager se).
2. GitHub repo > Settings > Secrets and variables > Actions > **New repository secret**.
   Name: `SUPABASE_DB_URL`. Value: wo URI. Save.
3. Actions tab > `weekly-db-backup` > **Run workflow** (test ke liye ek baar chalayein).
4. Run khatam hone par summary mein **Artifacts** mein `db-backup-...` file dikhegi. Download karein.
5. Artifact 30 din tak rahega. Jaroori file ko apne Drive mein bhi rakhein.

## 4. Manual full dump (computer se, kabhi bhi)

Terminal mein (PostgreSQL client install ho):
```
pg_dump "<wahi Session pooler URI>" --no-owner --no-privileges -Fc -f backup-YYYY-MM-DD.dump
```
Ye ek file banati hai. Is file ko kahin safe rakhein (encrypted drive ya password-protected folder).

## Restore kaise karein

### Sirf ek garden ka data wapas (CSV se)
CSV ko Supabase ke Table Editor mein import karna mushkil hai, isliye CSV ko sirf dekhne aur hisaab ke liye use karein.
Agar asli data wapas chahiye to Supabase daily backup (point 2) ya full dump restore (point 5) use karein, aur
Asad ya developer se poochhein.

### Full dump wapas (naya ya khaali project mein)
1. Naya Supabase project banayein (ya khaali project), `schema.sql` NAHI chalayein (dump mein sab hai).
2. Terminal mein:
   ```
   pg_restore --no-owner --no-privileges -d "<naye project ka Session pooler URI>" backup-YYYY-MM-DD.dump
   ```
3. Restore ke baad Authentication > Users check karein. Users alag system mein hain, dump mein auth user ka
   password ho sakta hai ya nahi, ye Supabase ki limits par depend karta hai. Har user ka login check karein.
4. App ke env values naye project ke daalein (Vercel par) aur Redeploy karein.
5. Ek garden kholkar calendar, booking, paisa check karein (DEMO_CHECKLIST.md).

## Har mahine ek baar restore test karein

Backup ka matlab tab hai jab wo restore ho sake. Mahine mein ek baar naye (test) project par restore karke dekhein.
Ye 30 minute ka kaam hai. Result ek line mein note karein: "Restore test ok, date".

## Yaad rakhne ki baat

- Backup mein password aur keys nahi hote (sirf data). Keys password manager mein rakhein.
- Client ka data client ka hai. Backup file bhi private rakhein; kisi third party ko na dein.
