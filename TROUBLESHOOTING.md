# TROUBLESHOOTING.md — 15 common problems aur fix

Har problem: kya dikhta hai, kyon hota hai, kaise theek karein.

---

**1. Login par "Email ya password galat hai" aata hai.**
Kyon: email ya password galat, ya user Supabase mein "Auto Confirm" ke bina bana.
Fix: Supabase > Authentication > Users mein user dhoondhein. Email sahi hai? Password reset karein (user ki
ellipsis menu > Send password recovery, ya seedha naya password set karein). Auto Confirm tick karke user dubara banayein.

**2. App khulte hi "Supabase ki settings nahi mili" error aata hai.**
Kyon: `NEXT_PUBLIC_SUPABASE_URL` ya `NEXT_PUBLIC_SUPABASE_ANON_KEY` set nahi.
Fix: computer par `.env.local` check karein (SETUP.md Step 5). Vercel par Environment Variables check karein, phir
Redeploy. Ye NEXT_PUBLIC wali values hain, inke naam spelling ke saath bilkul same hone chahiye.

**3. Login ho jaata hai, par "Mere gardens" khaali hai.**
Kyon: user kisi garden ka member nahi hai.
Fix: Owner hai to "Naya garden banayein" se garden banayein. Staff hai to owner se Staff page par add karwayein.

**4. Garden kholne par seedha /gardens par wapas aa jaata hai.**
Kyon: login user us garden ka member nahi (ya garden ID galat hai).
Fix: /gardens se garden dobara chuniye. Ye security ka kaam hai: dusre garden ka data nahi khulta.

**5. Staff ko paisa, rate ya "Rates & Season" menu nahi dikhta (ye sahi hai).**
Kyon: staff ka role yahi kehta hai. Ye design hai.
Fix: kuch nahi. Agar owner ko bhi nahi dikh raha to owner ka role check karein: Staff page par owner ka role "OWNER" hona chahiye.

**6. "Is date par booking already hai" aata hai, par calendar par wahan kuch khaali dikhta hai.**
Kyon: us din ka confirmed booking hai, ya us din ka full day hai (din aur raat dono block), ya ek cancelled
booking ka hold. Cancelled aur hold clash nahi karte, confirmed karte hain.
Fix: us date par click karke list dekhein. Pehle wali booking cancel karein, ya slot badlein.

**7. Full Day save nahi ho raha.**
Kyon: din ya raat mein se koi bhi confirmed booking hai. Full Day dono ko block karta hai.
Fix: Din ya Raat wali booking dekhein. Dusri date chuniye, ya un bookings ko hold/cancel karein.

**8. Hold ko "Confirmed" karne par error aata hai.**
Kyon: us slot par pehle se confirmed booking hai (double-booking guard).
Fix: Hold wala slot ya date badlein. Hold ko confirm karne ke liye confirmed wali booking pehle cancel karein.

**9. Booking poori paid ho gayi par status "Pending" dikh raha hai.**
Kyon: jama (advance + balance jama) total se kam hai. Ya total 0 hai (khaali booking pending hi rehti hai).
Fix: booking kholiye, "Balance jama" mein baaki rakam daalein, Save karein. Rate lines bhi check karein.

**10. "Jama ki rakam total se zyada hai" error.**
Kyon: advance + balance jama, discount ke baad total se zyada hai. Ye overpay rokne ke liye hai.
Fix: rakam check karein. Galti se zyada likha ho to sahi rakam daalein. Discount badhane se total ghatta hai.

**11. Rate card badla par purani booking ka amount nahi badla.**
Kyon: ye design hai. Booking ke time ka rate (snapshot) save hota hai, taaki purane contract na badle.
Fix: agar purani booking ka rate badalna hai to booking kholkar rate lines (quantity) dobara bharein aur Save karein.
Naye rate us time ke season se lagte hain.

**12. Staff add karte waqt "Ye email pehle se login mein hai" aata hai.**
Kyon: ye email Supabase mein pehle se user hai (kisi aur garden ke liye bhi).
Fix: dusra email use karein. Agar wahi user is garden mein chahiye, to Asad / developer se Supabase mein membership add karwayein
(ye ek SQL insert hai, DATABASE.md dekhein).

**13. CSV button par "Export sirf owner kar sakta hai" (403) ya login error.**
Kyon: staff login hai (ye sahi hai), ya session khatam ho gaya.
Fix: owner se login karein. Session khatam ho to phir se login karein.

**14. Calendar par booking nahi dikh rahi.**
Kyon: booking cancelled hai (cancelled calendar par nahi dikhti), ya calendar dusre mahine par hai.
Fix: upar mahine ka tir (‹ / ›) dabayein. Bookings list mein "Sab" filter se booking dhoondhein, status dekhein.

**15. Vercel par build fail ho raha hai ("Module not found", ya "Type error").**
Kyon: zyadatar `npm install` ke bina ya Node version purana hone se. Ya env variables galat.
Fix: local par `npm install`, `npm run build` chalayein; error message Vercel ke build log se copy karke developer ko dikhayein.
Node 20 use karein (Vercel > Settings > General > Node.js Version = 20.x).

**Bonus (agar time ho):** WhatsApp receipt link khulta hai par message nahi bharta: phone number galat hai
(10 digit, ya 91 se shuru). Booking mein phone check karke fir se save karein.
Bonus 2: Supabase project "paused" dikhe: Pro plan par ye nahi hona chahiye. Free plan par ho to Pro par upgrade karein
aur project Restore karein (dashboard par button).
