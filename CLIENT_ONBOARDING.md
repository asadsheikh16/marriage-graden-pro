# CLIENT_ONBOARDING.md — Naya garden 30 minute mein jodne ka checklist

Ye checklist har naye garden client ke liye hai. Ek hi Supabase aur Vercel project par kai gardens chalte hain.
Har box tick karein. Client ke saamne bhi kar sakte hain (unhe screen dikhayein).

## Pehle (5 minute): jaankari lein

- [ ] Garden ka naam (jaise "Shubh Garden, Kota")
- [ ] Owner ka naam, phone, email (login ke liye)
- [ ] Staff kitne log, unke naam aur email
- [ ] Slots: kya Din (8 AM-5 PM), Raat (6 PM-2 AM), Full Day hi? (default yehi hai)
- [ ] Rate card: hall rent, decoration, catering (per plate), DJ, tent/lights, aur koi extra item
- [ ] Peak season: muhurat ki dates (Nov-Feb default, alag ho to date-range)
- [ ] Owner ka WhatsApp number (receipt ke liye)

## Login (5 minute)

- [ ] Supabase > Authentication > Users > Add user: owner ka email, strong password, Auto Confirm ON
- [ ] Password owner ko alag se (phone par nahi, note karke) dein, aur password manager mein Asad ke paas bhi rakhein
- [ ] Sign-up abhi bhi OFF hai (SETUP.md Step 3). Check karein.

## Garden banana (5 minute)

- [ ] Owner login karke "Naya garden banayein" (naam, phone)
- [ ] Garden ka dashboard khula, menu dikh raha hai

## Rate card aur season (10 minute)

- [ ] Rates & Season > har item ka Peak ₹ aur Off ₹ bhara
- [ ] Catering per plate ka rate sahi hai
- [ ] Naya item hai to add kiya
- [ ] Peak season ki date-range add ki (ya khaali chhodi, to Nov-Feb default)

## Staff (3 minute)

- [ ] Staff page: naam, email, password (kam se kam 8) bhara
- [ ] Staff ko email aur password bataya (WhatsApp par nahi, pehle samjhaate hue)
- [ ] Staff login karke check: calendar, booking, checklist dikhte hain; paisa, rates, export, staff nahi

## Test booking (5 minute)

- [ ] Ek test booking (naam: TEST, phone owner ka) banayi, advance daala
- [ ] Calendar par lal dikha
- [ ] Usi slot par dobara booking ki koshish: "Is date par booking already hai" aaya
- [ ] Test booking cancel kar di (ya delete, owner ke roop mein)

## Backup aur payment (2 minute)

- [ ] Owner ko CSV ka button dikhaya, aur bataya ki har hafte download karna hai
- [ ] Supabase Database > Backups dikha (daily backup on)

## Handover (5 minute)

- [ ] Owner ko app ka link (Vercel / custom domain) diya
- [ ] Owner ko DEMO_CHECKLIST.md ka short version diya (HANDOVER.md ke saath)
- [ ] Owner ko kisi bhi problem ke liye kisko batana hai, ye bataya (HANDOVER.md "kis se kya poochhein")
- [ ] Client ka naam aur date CLIENT_ONBOARDING ke end mein likhi (record ke liye)

---

**Record (har client ke liye ek line):** Garden naam: ____ · Owner: ____ · Onboard date: ____ · Staff count: ____ · Backup check: ____
