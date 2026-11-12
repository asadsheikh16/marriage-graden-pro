# DEMO_CHECKLIST.md — Client ko garden dene se pehle ka test

Ye checklist har baar chalayein jab naya garden ya bada update client ko dena ho.
Har line ke aage ✅ ya ❌ likhein. Koi ❌ ho to client ko na dein, pehle theek karein.

## A. Login aur rights

- [ ] Owner login hota hai, garden list dikhti hai
- [ ] Sign-up page ya "Register" link kahin nahi (Supabase sign-up OFF)
- [ ] Logout button kaam karta hai, uske baad koi page nahi khulta (/gardens bhi login maangta hai)
- [ ] Staff login: Rates & Season, Staff menu nahi dikhte
- [ ] Staff browser mein seedha `/g/<garden>/rates` kholta hai: "Ye page sirf owner ke liye hai"
- [ ] Staff `/g/<garden>/export` kholta hai: 403 "Export sirf owner kar sakta hai"
- [ ] Staff dashboard par paisa, "Pending payment" aur Season hisaab nahi dikhte

## B. Garden ka data alag

- [ ] Garden A ka owner, garden B ka URL kholta hai: "/gardens" par wapas (koi data nahi)
- [ ] Garden A ki booking ka ID lekar garden B ke URL par: nahi khulti

## C. Calendar aur double-booking

- [ ] Din ki booking: us date par lal
- [ ] Usi date par Raat booking: save ho jaati hai (lal hi rehta hai)
- [ ] Usi date par Din dobara: "Is date par booking already hai" warning, save nahi
- [ ] Full Day us date par (din aur raat booked): warning
- [ ] Khaali date par Full Day: save ho jaata hai
- [ ] Hold (status Hold): amber dikhta hai, confirmed ko nahi rokta
- [ ] Hold ko confirm karne par, us slot par confirmed booking ho to error
- [ ] Booking cancel: calendar par se hat jaati hai, uska slot phir khaali

## D. Paisa (owner)

- [ ] Rate lines ke saath booking: total sahi (quantity x rate; plate = guests)
- [ ] Peak date par peak rate lagta hai, off-season date par off rate
- [ ] Discount: total ghatta hai
- [ ] Advance: baaki (balance) sahi
- [ ] Poora paisa jama: status "Paid"
- [ ] Zyada jama (overpay): error aata hai
- [ ] Receipt WhatsApp link: naam, date, total, mila, baaki sahi (WhatsApp khulta hai aur message bhara hota hai)

## E. Enquiry

- [ ] Nayi enquiry save hoti hai, list mein dikhti hai
- [ ] Call-back aaj ka hai to upar "Aaj ke call-backs" mein dikhti hai
- [ ] Status badalne par list update
- [ ] Staff ko rate quote ka field nahi dikhta

## F. Checklist

- [ ] Naye booking par 6 tick boxes hain
- [ ] Staff tick karta hai, owner ko dikhta hai (save ke baad)

## G. Season aur dashboard

- [ ] Dashboard par "Aaj ki booking" sahi
- [ ] "Is mahine ki bookings" sahi
- [ ] Owner: Pending payment aur Season hisaab (peak / off) sahi aate hain

## H. CSV aur backup

- [ ] Owner CSV download karta hai, file Excel mein khulti hai, Hindi naam sahi
- [ ] CSV mein total, balance, status columns hain
- [ ] Supabase Backups mein daily backup dikh raha hai

## I. Pagination aur search

- [ ] Bookings list 20 per page, "Agla" button kaam karta hai
- [ ] Naam se search, phone ke last digits se search, date (2027-01-10) se search: sab kaam karte hain
- [ ] Filter (Aane wale / Pichle / Pending payment) kaam karte hain

## J. Mobile aur errors

- [ ] Phone (Chrome ya Safari) par calendar, booking form sab readable hain
- [ ] Galat data (jaise naam 1 letter) par error hindi mein, technical code nahi dikhta
- [ ] Internet band karke save karne par "Kuch gadbad hui" jaisa message (app crash nahi)

## K. Client ko dene se pehle last check

- [ ] Vercel par Production link kaam karta hai (custom domain agar hai to wo bhi)
- [ ] `.env` ya keys kisi screen par nahi dikh rahi
- [ ] Owner ko login, password, backup aur support ke baare mein bataya (HANDOVER.md)

**Tested by:** ____  **Date:** ____  **Garden:** ____  **Result:** ✅ / ❌
