# Book verification report — The Geography of a Richer Life

**Prepared:** August 11, 2026. **Scope:** every 🔍 "Verify before publishing" item in `docs/book-review-sheet.md`, worked in chapter order.

## Summary

I worked through all **21** flagged 🔍 items across nine chapters plus the Appendix. Of these, I recommend **KEEP AS-IS for 5**, **CORRECT for 5**, **SOFTEN for 3**, and **CANNOT VERIFY for 8**. The eight "cannot verify" items are almost all the author's own frameworks and estimates (arbitrage-savings percentages, cost-of-living rankings, couple budgets, the DCC markup band, solar resale/return figures) or claims with no authoritative primary source (the Amazon-CURP prompt, the resident-license question), and each is already caveated in the manuscript. The most consequential corrections: the mountain-town **elevation range is wrong at its low end** (Xalapa sits ~4,680 ft, below the stated 5,500 ft floor); the **permanent-residency income figure should move to ~$7,400/mo**; the **"40% less likely to quit" should be ~50%**; and two **Appendix housekeeping fixes** (IRM section titles in the body text, and the "Notice 2024-XX" placeholder). Two items the review sheet had marked as unconfirmable I was able to positively confirm: the **peso exchange-rate history** and the **treaty article numbering**.

A note on sourcing: FRED's CSV/data endpoints (`fred.stlouisfed.org`) and Mexperience's residency-criteria page returned HTTP 403 to the fetcher on some attempts. Where that happened I fell back to other retrievable sources and have said so explicitly. I did not fabricate any figure or URL; every source below was actually retrieved.

---

## Chapter 5 — Choosing Your Destination

### 5.1 The ~30-destination climate tables

- **Claim as written:** Detailed highs/lows, humidity, and rain-season months for roughly 30 destinations (Ch. 5, lines 85–147).
- **What sources say:** Spot-checking Mérida (the book's own footnoted example) against Climates to Travel: hottest month **May**, average high **~99°F**, average low **~74°F**, humidity **~63%**. The book's table lists Mérida at **96°F high / 75°F low / 75% humidity** — the high is understated by ~3°F and humidity is ~12 points higher than that source's monthly figure, though both are "hot." This is consistent with the book's own warning that station-to-station and source-to-source values vary by a few degrees, and with footnote [3], which already cites ~99°F. I did not re-check all ~30 tables cell by cell; the point sample confirms the tables are directionally right but carry a few degrees / few points of drift per cell.
- **Recommended action:** **SOFTEN / keep with caveat.** The existing "read for the peak, not the average" framing and footnote [3] already cover this. If precise figures matter, align each cell to one reference (e.g., Climates to Travel) on final pass; at minimum nudge the Mérida high from 96 toward ~99 to match the book's own footnote.
- **Source retrieved:** https://www.climatestotravel.com/climate/mexico/merida

### 5.2 The "5,500 to 8,000 ft" mountain-town elevation range

- **Claim as written:** "Altitude runs from 5,500 to 8,000 feet" for the mountain-cool towns, i.e., San Cristóbal de las Casas, Tlaxcala, and Xalapa (Ch. 5, line 139).
- **What sources say:** San Cristóbal de las Casas ≈ **7,200 ft** (2,200 m) and Tlaxcala City ≈ **7,346 ft** (2,239 m) both sit inside the range. But **Xalapa ≈ 4,680 ft** (1,427 m), which is **below the stated 5,500 ft floor**. No town in the group reaches 8,000 ft; the true span across the three is roughly **4,680 to 7,350 ft**.
- **Recommended action:** **CORRECT.** Either restate the range as approximately **"4,700 to 7,400 feet"**, or keep 5,500–8,000 and drop Xalapa from that elevation sentence (Xalapa is the outlier). The current low and high endpoints are both off.
- **Sources retrieved (search):** whatismyelevation.com / weatherandclimate.com (Xalapa ~1,425–1,427 m); en-us.topographic-map.com and Wikipedia "Tlaxcala (city)" (Tlaxcala ~2,239 m). Cross-referenced multiple results for each.

### 5.3 The "Savings vs. U.S." percentages and arbitrage tiers

- **Claim as written:** Frontier-town and tier savings bands (e.g., "65 to 75%," "50 to 60%," "25 to 40%"), presented uncited (Ch. 5, lines 52–79).
- **What sources say:** These are presented as the author's framework, not researched statistics, and there is no single authoritative source that publishes destination-level "savings vs. U.S." percentages this way. Cost-of-living aggregators (e.g., Numbeo) exist but use different baskets and would not reproduce these exact bands.
- **Recommended action:** **CANNOT VERIFY** (by design). Keep as an explicitly labeled framework/estimate, as the manuscript already does. No change required unless any band is meant to read as a sourced figure, in which case it needs a citation.
- **Source:** none applicable (author framework).

---

## Chapter 6 — Working Remotely

### 6.1 "Remote workers report higher job satisfaction (83% versus 64%)"

- **Claim as written:** Ch. 6, line 39.
- **What sources say:** No authoritative source pairs **83% and 64%**. The closest real pairing is the World Economic Forum's **83% (remote) vs. 72% (in-office)** satisfaction; Owl Labs' widely quoted 83% figure is a *preference for hybrid work*, not a satisfaction rate. The Bloom/Ctrip RCT does report home workers had "substantially higher work satisfaction," but attaches no 83/64 numbers. I could not locate the 64% figure in any credible source.
- **Recommended action:** **SOFTEN / supply source.** Either restate to the sourced WEF pairing (83% vs 72%) with a citation, or generalize to "report meaningfully higher job satisfaction" and drop the unverifiable second number.
- **Sources retrieved (search):** search corroborated the WEF 83/72 and Owl Labs "preference" framing consistent with the review sheet; no source produced 83/64.

### 6.2 "[Remote workers] are 40% less likely to quit"

- **Claim as written:** Ch. 6, line 39.
- **What sources say:** The Bloom/Ctrip study behind the book's 13% productivity figure found attrition **fell by ~50%** among home workers — a **17% attrition rate vs. 35%** in the control group (NBER working paper w18871). "40%" is not the figure from that study; Owl Labs' separate "40%" refers to workers who would start job-hunting if remote flexibility were removed, a different claim.
- **Recommended action:** **CORRECT TO ~50%** ("about half as likely to quit"), tied to the Bloom study the chapter already cites, or cite the specific survey the 40% came from.
- **Source retrieved:** NBER, "Does Working From Home Work? Evidence from a Chinese Experiment," https://www.nber.org/system/files/working_papers/w18871/w18871.pdf (attrition 17% vs 35%).

---

## Chapter 8 — Immigration & Visas

### 8.1 Consulate application fees ("typically $50 to $200 depending on visa type")

- **Claim as written:** Ch. 8, line 94.
- **What sources say:** The **consular visa application fee is a roughly flat ~$54 USD** (Mexican consular fee schedule, 2025), largely the same across temporary/permanent resident visa types. The larger, tiered charges are the *in-Mexico INM government fees* paid after entry (e.g., temporary-resident cards ranging ~$11,140–$25,058 MXN for 1–4 years as of 2026), which the chapter handles separately. So the "$50" low end matches the ~$54 consular fee, but "up to $200, depending on visa type" is not well supported for the consular fee itself.
- **Recommended action:** **SOFTEN.** Consider stating the consular application fee as "about $50" (roughly flat by visa type) and keep the separate INM government-fee discussion for the in-country step. Consistent with the chapter's own "confirm current figures with your consulate" caveat.
- **Sources retrieved (search):** consulmex.sre.gob.mx (Washington) 2025 temporary-resident visa sheet ($54 consular fee); Clark Hill PLC, "Mexico Increases Government Fees ... Jan. 1, 2026" (INM card fees). https://www.clarkhill.com/news-events/news/mexico-increases-government-fees-for-immigration-procedures-effective-january-1-2026/

### 8.2 The property-based path threshold (tens of thousands of UMA; high six-figure USD property)

- **Claim as written:** Ch. 8, line 23.
- **What sources say:** Consistent with current practice. Under the July 2025 UMA-based guidance, the property route runs on the order of **~91,600 × UMA** (≈ MXN 10.7M ≈ **$557,000–$597,000 USD** per applicant) — a high six-figure USD, debt-free property, exactly as the book characterizes. "Tens of thousands of UMA" is technically accurate (it is ~90k UMA, at the top of that band). Note: property ownership qualifies only via this high valuation floor; simply owning a modest home does not, which the book already states.
- **Recommended action:** **KEEP AS-IS.** Magnitude (high six-figure USD, UMA-based) confirmed. Optionally sharpen "tens of thousands" to "on the order of ~90,000 UMA" if precision is wanted.
- **Sources retrieved (search):** Mexperience "Mexico's UMA & Residency Qualification Criteria 2026" and TheLatinvestor "Buying a Property for Residency in Mexico (2026)"; both indicate the ~91,600-UMA / ~$557k property basis.

### 8.3 Permanent-residency income "US$7,000 to $7,300/mo"

- **Claim as written:** Ch. 8, line 21.
- **What sources say:** The current published figure is **~$7,400/month** (Mexperience, 2026 financial criteria — retrieved successfully). Temporary residency ~$4,400/mo and ~$74,000 savings; permanent ~$7,400/mo and ~$298,000 savings. The book's $7,000–$7,300 sits just below the current published number.
- **Recommended action:** **CORRECT TO ~$7,400/mo** (or state "roughly $7,300–$7,400"). Small, but it aligns the book with the current UMA-based figure and with the chapter's own footnote [3].
- **Source retrieved:** Mexperience, "Financial Criteria for Legal Residency in Mexico," https://www.mexperience.com/financial-criteria-for-residency-in-mexico/ (confirmed: temporary ~$4,400/mo & ~$74k; permanent ~$7,400/mo & ~$298k; UMA basis, 2026 UMA MXN 117.31, ~18 MXN/USD).

---

## Chapter 16 — Money & Payments

### 16.1 Peso exchange-rate history (above 25 in 2020, ~16–17 in 2023)

- **Claim as written:** Ch. 16, lines 31–33 ("crisis peaks above 25," "strengthening periods near 16 to 17").
- **What sources say:** **Confirmed.** The peso hit **25.34 per USD on March 24, 2020** (COVID peak) and reached a 2023 low of **16.6263 on July 28, 2023**. Both bracket the book's "above 25" and "16 to 17" exactly.
- **Recommended action:** **KEEP AS-IS.** Figures are accurate.
- **Sourcing note:** FRED's DEXMXUS CSV endpoint returned HTTP 403 to the fetcher, so I could not open the primary Banxico/FRED export directly. The specific values above were corroborated through multiple retrieved aggregator summaries (Statista's USD-MXN series note for the 3/24/2020 = 25.34 peak; exchangerates.org.uk 2023 history for the 7/28/2023 = 16.6263 low). For a print-grade citation, export DEXMXUS from FRED or the series from Banxico on final pass; the numbers themselves check out.

### 16.2 DCC markup band "roughly 3% to 7%"

- **Claim as written:** Ch. 16, lines 15–16.
- **What sources say:** The retrieved Wikipedia "Dynamic currency conversion" article confirms DCC adds a margin over the interbank rate (a disclosed example of **+2.95%**, with markups "as much as **18%**" in the worst cases), which *brackets* the book's 3–7% band but does not state that specific range verbatim. No authoritative source publishes "3% to 7%" as a defined band.
- **Recommended action:** **CANNOT VERIFY the exact band** (author estimate; directionally sound). Keep as an estimate, or reframe as "a markup that commonly runs a few percent and can reach ~18% in the worst cases," which is fully supported.
- **Source retrieved:** https://en.wikipedia.org/wiki/Dynamic_currency_conversion

---

## Chapter 18 — Utilities

### 18.1 Solar resale lift (2–5%) and long-run return (150–250%)

- **Claim as written:** Ch. 18, lines 113 and 119.
- **What sources say:** The **payback period of ~3.5–5 years** is supported (Mexico News Daily, source [3]). The **2–5% resale lift** and **150–250% cumulative 20–25-year return** are not traceable to a primary source; they are consistent with the general case for Mexican residential solar (especially for households in DAC pricing) but are author estimates.
- **Recommended action:** **CANNOT VERIFY** the resale-lift and long-run-return percentages. Keep them labeled as estimates (as the manuscript already does), or attribute to a named installer/market study before printing as fact. The payback figure can stand on source [3].
- **Source:** Mexico News Daily, "Save on your energy bills with solar panels," https://mexiconewsdaily.com/real-estate/save-on-your-energy-bills-with-solar-panels/ (payback only).

### 18.2 Net-metering one-to-one crediting under Medición Neta

- **Claim as written:** Ch. 18, line 113 (and caveat at line 169).
- **What sources say:** **Net metering (Medición Neta) is the current residential distributed-generation scheme**, crediting surplus against consumption (with a 12-month credit window). However, **CRE updated the DG compensation regulations (net metering / net billing / total sale) in April 2026**, and regulators have signaled movement toward net billing for new interconnections (surplus credited below retail). So the one-to-one scheme is correct today but genuinely in flux.
- **Recommended action:** **KEEP with caveat** — the manuscript's existing "verify the scheme in force at install time" note is exactly right and is now reinforced by the April 2026 CRE update. No change needed beyond keeping that caveat prominent.
- **Sources retrieved (search):** Reslink Energy, "Mexico Solar Compensation Schemes 2026" (net metering vs net billing vs total sale; April 2026 CRE update); Cabo Solar Experts (current Medición Neta crediting).

---

## Chapter 20 — Shopping & Delivery

### 20.1 Amazon Mexico CURP/residency requirement

- **Claim as written:** Ch. 20, line 102 (already softened to "some newcomers report ... treat as something to test").
- **What sources say:** I could not confirm, against any authoritative Amazon or news source, that Amazon Mexico requires a CURP (and therefore residency) to create or use an account. Amazon.com.mx account creation generally requires an email/phone and a Mexican payment method for some purchases, but a CURP mandate is not documented in a primary source. The manuscript already presents this as anecdotal and as a step to test.
- **Recommended action:** **CANNOT VERIFY.** The current softened phrasing ("some newcomers report," "test with your own account") is the correct posture; keep it.
- **Source:** none authoritative found.

---

## Chapter 21 — Transportation & Storage

### 21.1 Whether residents must eventually carry a Mexican driver's license

- **Claim as written:** Ch. 21, line 78 and the "To verify" note at line 146.
- **What sources say:** A U.S. license is clearly valid for tourist/short-term driving (Sanborn's, source [3]). For temporary/permanent residents the sources genuinely conflict, and — critically — **driver licensing in Mexico is regulated at the state level**, so there is no single national rule to verify. Some sources say a foreign license may be used only ~3 months after establishing residency; many long-term expats report driving indefinitely on a U.S. license. There is no authoritative federal source that resolves this uniformly.
- **Recommended action:** **CANNOT VERIFY** (irreducibly state-dependent). Keep the existing caveat directing readers to confirm the rule for their specific state; that is the accurate answer.
- **Source:** Sanborn's Mexico Insurance (U.S. license valid for tourists) — https://www.sanborns.com/blog/is-a-us-drivers-license-valid-in-mexico/ ; the residency-threshold question has no single authoritative source.

---

## Chapter 22 — Expat Infrastructure

### 22.1 Named institutions (Hospital Ángeles, Christus Muguerza, ABC, Hospiten, AmCham)

- **Claim as written:** Ch. 22, lines 87 and 111, presented as orientation.
- **What sources say:** These are real, widely known institutions whose reputations match the book's descriptions (Hospital Ángeles and ABC Medical Center are large private hospital networks; Christus Muguerza and Hospiten operate multi-city; American Chamber of Commerce chapters exist in major Mexican cities). I did not verify each specific characterization (e.g., "English-speaking staff across several cities") against each institution's own primary materials.
- **Recommended action:** **KEEP AS-IS** as general orientation. The institutions and their broad reputations are accurate; the manuscript already frames them as orientation rather than sourced clinical claims. Individual, specific claims should not be upgraded to "verified facts" without each institution's primary source.
- **Source:** widely reported reputations; not individually primary-verified (consistent with the review sheet's own framing).

---

## Chapter 23 — Other Countries to Consider

### 23.1 Per-country cost-of-living percentages

- **Claim as written:** "roughly X% below U.S. levels" for each of 10 countries (Ch. 23, lines 15–57 and the table).
- **What sources say:** Presented as ranking approximations, not budgets. No single authoritative source publishes these exact "% below U.S." bands; aggregators (Numbeo, etc.) use varying baskets and would not reproduce them precisely.
- **Recommended action:** **CANNOT VERIFY** (by design). Keep labeled as ranking approximations; the chapter already tells readers to price their own six-month stay.
- **Source:** none applicable (author ranking framework).

### 23.2 Per-country U.S. expat headcounts

- **Claim as written:** The table's "U.S. expats" column (e.g., Vietnam 25–30k, Panama 50k, Costa Rica 70k, Mexico 1.5–2M).
- **What sources say:** These come from mixed methodologies (State Department estimates, census counts, embassy estimates) that vary widely by source. The Mexico figure is well-supported as the largest (State Dept ~1.6M; Mexico's 2020 census ~797k U.S.-born), but the smaller-country counts are order-of-magnitude at best.
- **Recommended action:** **CANNOT VERIFY** precisely; treat as orders of magnitude, as the manuscript already instructs. Only the Mexico figure is firmly sourced.
- **Source:** Remitly / State Dept & census figures (used in Ch. 8 and Ch. 22) support the Mexico number; other countries not authoritatively sourced.

### 23.3 Monthly couple-budget figures (Thailand ~$2,000, Ecuador $1,600–$2,200, Costa Rica $2,800–$3,500, Vietnam ~$1,800)

- **Claim as written:** Ch. 23, lines 17–45.
- **What sources say:** These are commonly reported expat budgets (International Living and similar outlets publish figures in these ranges), but they are not independently sourced here and vary widely by city and lifestyle.
- **Recommended action:** **CANNOT VERIFY.** Keep as commonly reported ballparks with the existing "price it yourself" exercise. If any is to read as a sourced figure, attribute it (e.g., International Living country pages).
- **Source:** none independently retrieved for these specific figures.

---

## Appendix — The Legal Framework in Detail

### A.1 IRM section titles

- **Claim as written:** Appendix body (lines 329–330) cites **IRM 4.60.1 as "International Examinations"** and **IRM 4.60.2 as "Foreign Earned Income Exclusion."**
- **What sources say:** **Both body-text titles are outdated.** The current published titles are **IRM 4.60.1 "Exchange of Information"** (effective Feb 23, 2023) and **IRM 4.60.2 "Mutual Agreement Procedures and Report Guidelines"** (updated Dec 16, 2025). Note the Appendix's own *Sources* section (lines 427–428) and its *To verify* note already list the correct current titles — only the body citation is stale.
- **Recommended action:** **CORRECT** the body-text titles to match the current IRM (and the Appendix's own Sources list). Separately, confirm with counsel which current IRM section actually carries the international-examination / FEIE-examination procedures the author intended to reference, since the reorganization moved that content.
- **Sources retrieved:** https://www.irs.gov/irm/part4/irm_04-060-001r (4.60.1 = "Exchange of Information") and https://www.irs.gov/irm/part4/irm_04-060-002 (4.60.2 = "Mutual Agreement Procedures and Report Guidelines").

### A.2 Treaty article numbering (Articles 4 / 7 / 14 / 15)

- **Claim as written:** Appendix cites Art. 4 Residence, Art. 7 Business Profits, Art. 14 Independent Personal Services, Art. 15 Dependent Personal Services.
- **What sources say:** **Confirmed accurate** for the 1992 U.S.-Mexico income tax treaty. The Joint Committee on Taxation's official explanation and cross-border tax practitioner sources confirm: **Article 7 = Business Profits** (taxable only via a permanent establishment), **Article 14 = Independent Personal Services** (fixed base OR 183+ days), **Article 15 = Dependent Personal Services** (employment; source-country primary rights), and **Article 4 = Residence** (tie-breaker). The 1992 treaty retains Article 14, which the later OECD model deleted — so the numbering is correct precisely because this is the 1992 treaty.
- **Recommended action:** **KEEP AS-IS.** The review sheet's inability to machine-read the scanned IRS PDF is confirmed (WebFetch also could not extract the PDF text), but the article numbering is independently verified through the JCT explanation and multiple tax authorities.
- **Sources retrieved (search):** JCT "Explanation of the 1992 United States-Mexico Income Tax Treaty and Protocol" (via Tax Notes) and sftaxcounsel.com / taxesforexpats.com overviews confirming Articles 7, 14, 15; Article 4 is the standard residence/tie-breaker article. (The IRS PDF at irs.gov/pub/irs-trty/mexico.pdf opens but is a scanned image not machine-readable by the fetcher.)

### A.3 Placeholder "IRS Notice 2024-XX" (foreign housing amounts)

- **Claim as written:** Item 14 of the citation list (line 342): "IRS Notice 2024-XX (annual updates): base housing amounts by location."
- **What sources say:** The placeholder must be replaced with a real notice number. The annual Section 911 housing-cost notices are: **Notice 2024-31** (for tax year 2024; base limit $37,950), **Notice 2025-16** (for tax year 2025; base limit $39,000), and **Notice 2026-25** (for tax year 2026, released April 7, 2026). Since the book elsewhere uses 2025 tax-year amounts (Rev. Proc. 2024-40), **Notice 2025-16 is the most consistent choice**; if the citation is meant to be the 2024 notice as the "2024-XX" placeholder implies, it is **Notice 2024-31**.
- **Recommended action:** **CORRECT** — replace "Notice 2024-XX" with the intended year's actual number (Notice 2025-16 for 2025 amounts, or Notice 2024-31 for 2024).
- **Sources retrieved (search):** KPMG GMS Flash Alerts 2024-073 (Notice 2024-31), 2025-057 (Notice 2025-16), and 2026-090 (Notice 2026-25); Tax Notes.

---

## Recommended-action tally

| Action | Count | Items |
| --- | --- | --- |
| KEEP AS-IS | 5 | 8.2 property threshold; 16.1 exchange rate; 18.2 net metering; 22.1 named institutions; A.2 treaty numbering |
| CORRECT | 5 | 5.2 elevation range; 6.2 "40%" → ~50%; 8.3 perm-residency income → ~$7,400; A.1 IRM titles; A.3 Notice number |
| SOFTEN | 3 | 5.1 climate tables; 6.1 "83% vs 64%"; 8.1 consulate fees |
| CANNOT VERIFY | 8 | 5.3 savings %; 16.2 DCC band; 18.1 solar resale/return; 20.1 Amazon CURP; 21.1 resident license; 23.1 cost-of-living %; 23.2 expat headcounts; 23.3 couple budgets |
| **Total** | **21** | |
