# Vamos San Miguel, SEO + GEO Keyword Map

This is the keyword-target layer for the plan in `docs/seo-geo-plan.md`. It maps real search phrasings to the site's page architecture, the searcher's intent, and the on-page headings plus schema that earn both a Google ranking and an AI-assistant citation (GEO).

## How to read this doc

- **Two audiences.** VISITORS (tourists planning a trip) map mostly to `/plan/*`, `/events/*`, and `/picks/*`. MOVERS (relocation and retirement) map to the book-derived `/move/*` pillars.
- **Target page** column uses the URL architecture already decided in `docs/seo-geo-plan.md` (`/plan/[slug]`, `/move/[slug]`, `/events/[slug]`, `/picks/[slug]`), and points at the content files that already exist under `content/plan/` and `content/pillars/`.
- **No volume numbers.** No keyword-volume tool was available for this pass. Phrasings below are taken from the titles and related results of live web searches (sources cited per cluster), so they reflect language real publishers compete on, but the relative priority and monthly volume of each phrase still need validation in Google Search Console, Google Keyword Planner, or an equivalent tool before you commit resources.
- **Intent labels.** I = informational, C = commercial/comparison, N = navigational, T = transactional (booking/contact).

Everything below is a working framework, not a ranking guarantee.

---

## Part 1, VISITOR keyword clusters

### Cluster V1, Things to do / attractions

Head phrasings seen in live results: "things to do in San Miguel de Allende", "best things to do in San Miguel de Allende", "top attractions", plus "san miguel de allende travel guide". Publishers frame these as numbered listicles ("15 best", "25 best", "35 magical things to do"), which signals a listicle answer shape. [1]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| things to do in San Miguel de Allende; top attractions; what to do in SMA | New `/plan/things-to-do-in-san-miguel-de-allende` (hub) | I | H1 "The Best Things to Do in San Miguel de Allende"; question H2s "What are the top things to do in San Miguel?", "What is San Miguel de Allende known for?", "Is San Miguel de Allende worth visiting?"; schema: `Article` + `FAQPage`, plus `ItemList` of linked `/picks/*` and `TouristAttraction` references |
| San Miguel de Allende travel guide; first time visit | `/plan/things-to-do...` or a `/plan/travel-guide` overview | I | H2 "First-timer's guide"; link out to the itinerary, where-to-stay, and getting-around pages; `Article` + `BreadcrumbList` |
| El Charco del Ingenio; Fábrica La Aurora; La Parroquia; El Mirador (individual sights) | `/picks/[slug]` per sight | I/N | Per-place `LocalBusiness`/`TouristAttraction` with `address`, `geo`, `image`; H2 "Where is it and how to visit" |

Note: the site has no things-to-do hub file yet (`content/plan/` currently holds itinerary, where-to-stay, getting-around, and day-trips). This is the single biggest visitor content gap.

### Cluster V2, Restaurants / where to eat

Live results compete on "best restaurants San Miguel de Allende", "where to eat in San Miguel de Allende", "10 best restaurants", plus long-tail like "best rooftop restaurants", "street tacos", "best coffee". Named venues recur (Quince, Lavanda, Ki'bok), which is exactly the per-place `/picks/*` opportunity. [2]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| best restaurants San Miguel de Allende; where to eat SMA | New `/plan/where-to-eat-in-san-miguel-de-allende` (curated roundup) | C | H1 "Where to Eat in San Miguel de Allende"; question H2s "What are the best restaurants in San Miguel?", "Where do locals eat?", "Best rooftop restaurant?"; `Article` + `FAQPage` + `ItemList` linking to `/picks/*` |
| rooftop restaurants / bars; best coffee; street tacos; brunch (modifiers) | Filtered views + individual `/picks/[slug]` | C | Per-place `Restaurant`/`BarOrPub`/`CafeOrCoffeeShop` subtype with `servesCuisine`, `priceRange`, `geo`, `address` |
| [restaurant name] San Miguel de Allende (e.g. "Quince San Miguel") | `/picks/[slug]` | N | H1 = venue name; H2 "What to order", "Where is it"; `Restaurant` schema; this is the highest-conversion, lowest-competition long tail |

### Cluster V3, Where to stay / hotels / neighborhoods

Results pair "where to stay" with itinerary intent and split by budget tier (luxury Rosewood / Casa de Sierra Nevada, boutique, budget) and by the strong recurring advice to stay in Centro Histórico. [3]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| where to stay in San Miguel de Allende; best area to stay; best neighborhood | `/plan/where-to-stay-in-san-miguel-de-allende` (exists) | C | H1 "Where to Stay in San Miguel de Allende"; question H2s "What is the best area to stay in?", "Is Centro the best neighborhood?", "Where to stay for a first visit?"; `Article` + `FAQPage` |
| best hotels San Miguel de Allende; luxury / boutique / budget hotels | Same page, tiered sections; individual `/picks/*` for hotels we endorse | C | H2 per tier "Luxury", "Boutique", "Budget"; `Hotel`/`LodgingBusiness` schema on any hotel pick |
| Rosewood / Casa de Sierra Nevada / [hotel name] (branded) | `/picks/[slug]` if featured | N | `Hotel` schema; otherwise leave to the hotels' own sites |

### Cluster V4, Itinerary / how many days

Every competing result is a numbered day-plan ("3 days in San Miguel de Allende", "3-day itinerary", "how to spend 3 days"), with related "2 days" and "how many days" variants. [3]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| San Miguel de Allende 3 day itinerary; 3 days in SMA; how to spend 3 days | `/plan/3-days-in-san-miguel-de-allende` (exists) | I | H1 "3 Days in San Miguel de Allende"; question H2s "How many days do you need in San Miguel?", "What to do on day 1 / 2 / 3?"; `Article` + `FAQPage`; consider `ItemList` for the day-by-day steps |
| 2 days / 4 days / weekend in San Miguel de Allende | Sections or sibling pages off the 3-day page | I | Answer-first "Two days is enough for X; three lets you add Y" |
| how many days in San Miguel de Allende | Answer block at top of itinerary page | I | Lead with a one-sentence direct answer for AI lift |

### Cluster V5, Day trips

Results compete on "day trips from San Miguel de Allende" with named destinations (Guanajuato City, Dolores Hidalgo, Atotonilco, Cañada de la Virgen, wine route / Ruta del Vino). [4]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| day trips from San Miguel de Allende; best day trips | `/plan/best-day-trips-from-san-miguel-de-allende` (exists) | I | H1 "Best Day Trips from San Miguel de Allende"; question H2s "What is the best day trip from San Miguel?", "How far is Guanajuato City?"; `Article` + `FAQPage` + `ItemList` |
| Guanajuato City / Dolores Hidalgo / Atotonilco / Cañada de la Virgen day trip; wine route Guanajuato | Sections on the day-trips page; `/picks/*` for specific sites | I | Per-destination H2 with distance/time answer; `TouristAttraction`/`Place` schema where a specific site |

### Cluster V6, Getting there / getting around

Supports the itinerary and where-to-stay pages; lower head volume but high planning intent (airport transfer from Querétaro/León/Mexico City, is San Miguel walkable, do you need a car).

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| how to get to San Miguel de Allende; nearest airport; airport transfer | `/plan/getting-to-and-around-san-miguel-de-allende` (exists) | I | H1 "Getting to and Around San Miguel de Allende"; question H2s "What is the closest airport to San Miguel?", "How do you get from Querétaro/CDMX airport?", "Do you need a car in San Miguel?", "Is San Miguel walkable?"; `Article` + `FAQPage` |

### Cluster V7, Events / festivals / what's on

Results split between evergreen festival calendars (Semana Santa, Día de los Locos, Grito de Dolores / Independence Day, jazz festival) and dated "events this weekend / calendar 2026" queries, exactly the events firehose the app already ingests. [5]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| San Miguel de Allende events; events calendar; things happening this weekend | `/events` index + dynamic `/events/[slug]` | I/T | H1 "San Miguel de Allende Events"; the index is the "what's on now" answer; each event page = one `Event` |
| Semana Santa / Día de los Locos / Grito de Dolores / San Miguel jazz festival (named annual festivals) | New evergreen `/plan/festivals-in-san-miguel-de-allende` guide + linked live `/events/*` | I | H1 "Festivals in San Miguel de Allende"; question H2s "When is Día de los Locos?", "What festivals happen in San Miguel?"; `Article` + `FAQPage`, each dated occurrence as `Event` |
| individual event ("[event name] 2026 San Miguel") | `/events/[slug]` | T | `Event` with `name`, `startDate`, `endDate`, `location` (`Place` + `geo`), `offers`/price, `organizer`, `image` |

---

## Part 2, MOVER keyword clusters (book-derived `/move/*` pillars)

These are the highest-intent, highest-value queries and, per the SEO plan, "exactly what people ask assistants". Each maps to an existing pillar file under `content/pillars/`. Several factual anchors below come from live searches and MUST be re-verified before publishing because immigration and tax figures change yearly (2026 already saw a large residency-fee increase). [6][7][8][9][10]

### Cluster M1, Moving to Mexico (top of funnel)

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| moving to Mexico from the US; how to move to Mexico; relocating to Mexico | `/move/life-in-san-miguel` as the pillar hub, or a new `/move/moving-to-mexico` overview | I | H1 "Moving to Mexico from the US"; question H2s "How hard is it to move to Mexico?", "What do you need to move to Mexico?", "Should you move to San Miguel de Allende?"; `Article` + `FAQPage`; internal links to every M-cluster pillar |
| why move to Mexico; is it worth moving to Mexico | Same hub + `/move/the-money-case` | I | Answer-first summary that links to the financial case |

### Cluster M2, The financial / tax case (FEIE)

Maps directly to `content/pillars/the-money-case.md`. Critical accuracy note from live results: the FEIE excludes foreign-source income and passing the Physical Presence Test (330 days abroad); a widely repeated caveat is that income from a US employer/US source may not qualify as foreign-source, and Mexican tax residency is a separate question. The pillar already carries these caveats; keep them prominent. [10]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| Foreign Earned Income Exclusion; FEIE Mexico; do US citizens pay taxes living in Mexico | `/move/the-money-case` (exists) | I | Existing question H2s already match ("Do I still pay U.S. taxes if I move to Mexico?"); add "Does the FEIE apply to remote work for a US company?"; `Article` + `FAQPage` |
| cost of living arbitrage; save money moving to Mexico; is Mexico cheaper than US | `/move/the-money-case` | I | H2 "How much can you actually save by moving to Mexico?" (exists); `FAQPage` |
| Physical Presence Test; 330 days; Form 2555; self-employment tax abroad | Section on `/move/the-money-case`, cross-link to a tax chapter | I | Question H2 "How do you qualify for the FEIE?"; state the caveats as facts |

### Cluster M3, Visas and residency

Maps to `content/pillars/visas-and-residency.md`. Live-result anchors to verify: temporary residency (Residente Temporal) up to 4 years; a two-stage process (consulate visa sticker, then the canje at INM within 30 days of entry); income/savings financial thresholds; and a 2026 residency-card fee increase. All figures must be re-checked against the consulate before publishing. [7]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| Mexico temporary resident visa requirements; residente temporal; how to apply | `/move/visas-and-residency` (exists) | I | H1 "Visas and Residency for San Miguel de Allende"; question H2s "What are the requirements for a Mexico temporary resident visa?", "How do you apply?", "How much income do you need?"; `Article` + `FAQPage` + `HowTo` for the step-by-step application |
| Mexico permanent resident visa; temporary vs permanent residency | Section / sibling on the same pillar | I | Question H2 "Temporary or permanent residency, which do you need?" |
| canje; INM appointment; 30-day window; residency card cost 2026 | `HowTo` block on the visa pillar | I | `HowTo` steps: consulate application → enter Mexico → file canje at INM within 30 days → collect card. Flag "verify current fees" |
| digital nomad visa Mexico | Same pillar, clarify Mexico uses temporary residency, not a distinct nomad visa | I | Question H2 "Is there a digital nomad visa for Mexico?" |

### Cluster M4, Cost of living / daily life

Maps to `content/pillars/cost-of-living-and-daily-life.md`. Live results frame SMA as one of Mexico's pricier expat towns with rent, groceries, utilities, and healthcare line items; specific dollar figures vary widely by source and must be presented as ranges with citations, not as fixed numbers. [6]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| cost of living San Miguel de Allende; how much to live in SMA; monthly budget | `/move/cost-of-living-and-daily-life` (exists) | I | H1 "Cost of Living in San Miguel de Allende"; question H2s "How much does it cost to live in San Miguel?", "What is a realistic monthly budget?", "How much is rent?"; `Article` + `FAQPage` |
| rent in San Miguel de Allende; groceries / utilities cost; is San Miguel expensive | Sections on the same pillar | I | Per-line-item H2 with cited ranges; a comparison table (rent, utilities, groceries, dining) |

### Cluster M5, Retire in San Miguel de Allende

Strong standalone demand ("retire in San Miguel de Allende", "money needed to retire", "best places to retire in Mexico"). Straddles the money case, cost of living, and healthcare pillars; deserves its own retirement-focused page or a clearly-signposted section. [6]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| retire in San Miguel de Allende; retirement guide; best place to retire in Mexico | New `/move/retire-in-san-miguel-de-allende` (or a section on `life-in-san-miguel`) | I/C | H1 "Retire in San Miguel de Allende"; question H2s "Is San Miguel de Allende a good place to retire?", "How much money do you need to retire there?", "What is retirement life like?"; `Article` + `FAQPage`; internal links to cost-of-living, healthcare, visa pillars |

### Cluster M6, Healthcare for expats

Live-result anchors to verify: a public system (IMSS voluntary enrollment for legal residents) plus a large private-care market with English-speaking doctors and lower out-of-pocket costs than the US; Medicare generally does not cover care in Mexico. No dedicated healthcare pillar file exists yet, so map to a new page or a section on `life-in-san-miguel`. [9]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| healthcare in Mexico for expats; health insurance Mexico retirees; IMSS for foreigners | New `/move/healthcare-in-mexico` (or section on `life-in-san-miguel`) | I | H1 "Healthcare in Mexico for Expats"; question H2s "How good is healthcare in Mexico?", "Can expats use IMSS?", "Does Medicare work in Mexico?", "How much does health insurance cost?"; `Article` + `FAQPage` |
| best hospitals near San Miguel de Allende; English-speaking doctors | Section + `/picks/*` for specific clinics | I/N | `MedicalClinic`/`Hospital` schema where a specific facility |

### Cluster M7, Buying property

Live-result anchors to verify: San Miguel sits outside Mexico's coastal restricted zone, so foreigners can hold direct fee-simple title without a fideicomiso bank trust; closing timelines and costs are quoted as ranges. No dedicated property pillar exists yet. [8]

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| buying property in San Miguel de Allende; can foreigners buy property; real estate for foreigners | New `/move/buying-property-in-san-miguel-de-allende` | I/C | H1 "Buying Property in San Miguel de Allende as a Foreigner"; question H2s "Can foreigners buy property in San Miguel?", "Do you need a fideicomiso?", "What are the closing costs?", "How long does the purchase take?"; `Article` + `FAQPage` + `HowTo` for the buying steps |
| fideicomiso; restricted zone; SRE permit; closing costs Mexico | Sections on the property page | I | Question H2s; clear "San Miguel is outside the restricted zone" answer up top |
| cost to buy a house in San Miguel; home prices | Section, cited ranges only | C | Price ranges by neighborhood, cited, marked "verify current" |

### Cluster M8, Working remotely / preparing to move

Maps to `content/pillars/working-remotely-and-preparing.md`. Supports the money case (purchasing-power math) and the pre-move logistics.

| Keyword cluster | Target page | Intent | Suggested headings / schema |
| --- | --- | --- | --- |
| working remotely from Mexico; remote work Mexico taxes; internet / coworking San Miguel | `/move/working-remotely-and-preparing` (exists) | I | H1 "Working Remotely from San Miguel de Allende"; question H2s "Can you work remotely from Mexico legally?", "What is the internet like?", "Where do you become a tax resident?"; `Article` + `FAQPage` |
| moving checklist; what to bring; shipping / pets / bank accounts | Same pillar, `HowTo`/checklist | I | `HowTo` "How to prepare to move to Mexico"; step list |

---

## Part 3, Bilingual (Mexican Spanish) for the highest-value clusters

Spanish equivalents below are the natural Mexican-Spanish phrasings for the top visitor clusters (confirmed against Mexican publishers such as México Desconocido and Viajeros Callejeros in live results) [11]. These publish under the `/es/` mirror in the URL plan. Volumes and exact phrasing still need validation. Note the audience split from the brand strategy: Spanish content skews toward Mexican domestic travelers, so lifestyle/relocation clusters (M-series) are lower priority in Spanish than the visitor clusters.

| English cluster | Mexican-Spanish target phrasings | `/es/` target page |
| --- | --- | --- |
| things to do in SMA (V1) | qué hacer en San Miguel de Allende; qué ver en San Miguel de Allende; cosas que hacer en San Miguel de Allende; lugares para visitar | `/es/plan/que-hacer-en-san-miguel-de-allende` |
| where to eat / restaurants (V2) | dónde comer en San Miguel de Allende; mejores restaurantes en San Miguel de Allende; dónde comer barato | `/es/plan/donde-comer-en-san-miguel-de-allende` |
| where to stay / hotels (V3) | dónde hospedarse en San Miguel de Allende; mejores hoteles en San Miguel de Allende; dónde quedarse | `/es/plan/donde-hospedarse-en-san-miguel-de-allende` |
| itinerary / how many days (V4) | qué hacer en San Miguel de Allende en 3 días; itinerario San Miguel de Allende; cuántos días para conocer San Miguel | `/es/plan/3-dias-en-san-miguel-de-allende` |
| day trips (V5) | qué hacer cerca de San Miguel de Allende; excursiones desde San Miguel de Allende; pueblos cerca de San Miguel | `/es/plan/excursiones-desde-san-miguel-de-allende` |
| events / festivals (V7) | eventos en San Miguel de Allende; qué hacer este fin de semana en San Miguel; festivales y fiestas de San Miguel de Allende | `/es/eventos` + `/es/plan/festivales-en-san-miguel-de-allende` |

Reminder from the strategy: the top Spanish pages get a native-Spanish reviewer pass, not raw machine translation, and Spanish slugs stay in Spanish.

---

## Part 4, GEO: question headings + schema per pillar (get cited by AI)

The GEO principles are in `docs/seo-geo-plan.md` (answer-first, question-style H2s that mirror real queries, `FAQPage` on every guide, entity clarity, freshness). This section pins the specific question headings and schema types per pillar so the pages are built to be the answer an assistant lifts.

### Visitor pages

| Page | Lead question H2s (mirror real queries) | Schema stack |
| --- | --- | --- |
| Things to do (V1) | "What are the best things to do in San Miguel de Allende?"; "What is San Miguel known for?"; "Is San Miguel de Allende worth visiting?"; "How many days do you need?" | `Article` + `FAQPage` + `ItemList` (linking `TouristAttraction`/`LocalBusiness` picks) + `BreadcrumbList` |
| Where to eat (V2) | "What are the best restaurants in San Miguel de Allende?"; "Where do locals eat?"; "Best rooftop restaurant?"; "Where is the best coffee/tacos?" | `Article` + `FAQPage` + `ItemList`; each pick `Restaurant`/`CafeOrCoffeeShop`/`BarOrPub` |
| Where to stay (V3) | "What is the best area to stay in San Miguel?"; "Should you stay in Centro?"; "Best hotels for luxury / boutique / budget?" | `Article` + `FAQPage`; each featured hotel `Hotel`/`LodgingBusiness` |
| 3-day itinerary (V4) | "How many days do you need in San Miguel de Allende?"; "What should you do on day 1 / 2 / 3?" | `Article` + `FAQPage` (+ optional `ItemList` for the day steps) |
| Day trips (V5) | "What is the best day trip from San Miguel?"; "How far is Guanajuato City / Dolores Hidalgo?" | `Article` + `FAQPage` + `ItemList`; each destination `TouristAttraction`/`Place` |
| Getting around (V6) | "What is the closest airport to San Miguel?"; "Do you need a car?"; "Is San Miguel walkable?" | `Article` + `FAQPage` |
| Events / festivals (V7) | "When is Día de los Locos / Semana Santa / the Grito?"; "What's on in San Miguel this weekend?" | `Event` per occurrence; festival guide `Article` + `FAQPage` |

### Mover pillars

| Pillar | Lead question H2s | Schema stack |
| --- | --- | --- |
| Moving to Mexico hub (M1) | "How do you move to Mexico from the US?"; "What do you need to move to Mexico?"; "Is it worth it?" | `Article` + `FAQPage` + `BreadcrumbList` |
| The money case (M2) | "Do US citizens pay taxes living in Mexico?"; "Does the FEIE apply to remote work?"; "How much can you save?" | `Article` + `FAQPage` |
| Visas and residency (M3) | "What are the requirements for a Mexico temporary resident visa?"; "How do you apply?"; "How much income do you need?"; "Temporary or permanent?" | `Article` + `FAQPage` + `HowTo` (application steps + canje) |
| Cost of living (M4) | "How much does it cost to live in San Miguel de Allende?"; "What is a realistic monthly budget?"; "How much is rent?" | `Article` + `FAQPage` |
| Retire (M5) | "Is San Miguel de Allende a good place to retire?"; "How much money do you need to retire there?" | `Article` + `FAQPage` |
| Healthcare (M6) | "How good is healthcare in Mexico?"; "Can expats use IMSS?"; "Does Medicare work in Mexico?" | `Article` + `FAQPage`; clinics `MedicalClinic`/`Hospital` |
| Buying property (M7) | "Can foreigners buy property in San Miguel?"; "Do you need a fideicomiso?"; "What are the closing costs?" | `Article` + `FAQPage` + `HowTo` (buying steps) |
| Working remotely / preparing (M8) | "Can you work remotely from Mexico legally?"; "Where do you become a tax resident?"; "How do you prepare to move?" | `Article` + `FAQPage` + `HowTo` (moving checklist) |

GEO trust levers to apply on every pillar (from the strategy): a 2-3 sentence answer-first lead, named authorship ("edited by Jeff & family"), the "we never take money for a pick" trust line on picks, original photos, and a visible "Updated {date}" with `dateModified` on every time-sensitive page. Immigration, tax, cost, and property figures are the pages most likely to go stale, so treat their freshness dates as load-bearing.

---

## Content gaps this map surfaces

Pages the keyword demand justifies that do NOT yet exist in `content/`:

1. **Things to do hub** (V1), the biggest visitor head term has no landing page.
2. **Where to eat roundup** (V2), high commercial-intent, pairs with the `/picks/*` restaurant pages.
3. **Festivals evergreen guide** (V7), captures named-festival search year-round, feeds the live events index.
4. **Retire in San Miguel** (M5), strong standalone demand straddling three pillars.
5. **Healthcare in Mexico** (M6), no pillar file exists; high mover intent.
6. **Buying property** (M7), no pillar file exists; high mover intent, strong local publisher competition.

The existing pillars (`the-money-case`, `visas-and-residency`, `cost-of-living-and-daily-life`, `working-remotely-and-preparing`, `life-in-san-miguel`) and plan pages (`3-days...`, `where-to-stay...`, `getting-to-and-around...`, `best-day-trips...`) already cover clusters V3–V6 and M2–M4, M8.

---

## Validation checklist before acting on this map

- Pull real volumes and difficulty for each cluster (Search Console after launch, or Keyword Planner / third-party tool now). Every phrase above is a hypothesis until then.
- Re-verify all immigration, tax, cost-of-living, and property figures against primary sources (Mexican consulate, INM, a cross-border CPA, current listings) before publishing; several 2026 figures already shifted from 2025.
- Confirm Spanish phrasings and slugs with the native-Spanish reviewer.

---

## Sources

Live web searches run 2026-08 for phrasing and related-query discovery (titles and result framing, not volume):

1. Things to do, https://www.tripadvisor.com/Attractions-g151932-Activities-San_Miguel_de_Allende_Central_Mexico_and_Gulf_Coast.html ; https://sandinmysuitcase.com/things-to-do-in-san-miguel-de-allende/ ; https://www.sheroamsabout.com/things-to-do-in-san-miguel-de-allende/
2. Restaurants, https://wanderlog.com/list/geoCategory/75411/where-to-eat-best-restaurants-in-san-miguel-de-allende ; https://www.tripadvisor.com/Restaurants-g151932-San_Miguel_de_Allende_Central_Mexico_and_Gulf_Coast.html ; https://www.afar.com/travel-tips/where-to-eat-and-drink-in-san-miguel-de-allende
3. Itinerary + where to stay, https://www.roadaffair.com/3-days-in-san-miguel-de-allende-itinerary/ ; https://destinationlesstravel.com/three-days-in-san-miguel-de-allende-mexico-itinerary/ ; https://apassionandapassport.com/things-to-do-in-san-miguel-de-allende/
4. Day trips, https://justinpluslauren.com/day-trips-from-san-miguel-de-allende/ ; https://www.tripadvisor.com/Attractions-g151932-Activities-c63-San_Miguel_de_Allende_Central_Mexico_and_Gulf_Coast.html ; https://culturestraveled.com/day-trips-from-san-miguel-de-allende/
5. Events / festivals, https://www.belmond.com/stories/san-miguel-de-allende-celebrations ; https://allevents.in/san%20miguel%20de%20allende/calendar ; https://www.eventbrite.com/d/mexico--san-miguel-de-allende/events/
6. Cost of living / retire, https://www.liveandinvestoverseas.com/country-hub/mexico/san-miguel-de-allende/ ; https://internationalliving.com/countries/mexico/san-miguel-de-allende-mexico/ ; https://thelatinvestor.com/blogs/news/san-miguel-de-allende-money-retire
7. Temporary resident visa, https://www.pacificprime.com/blog/mexico-temporary-residency-requirements.html ; https://relocatenomad.com/country/mexico/application-process ; https://www.borderpilot.com/blog/mexico-temporary-resident-visa-the-complete-2026-guide
8. Buying property, https://thelatinvestor.com/blogs/news/can-foreigners-san-miguel-de-allende ; https://www.colonial-realestate.com/blog/buying-real-estate-in-san-miguel-de-allende-as-a-foreigner/ ; https://bhhscolonialhomessanmiguel.com/san-miguel-de-allende/your-guide-to-buying-a-home-in-san-miguel-de-allende-as-a-foreigner/
9. Healthcare, https://www.expatra.com/health-insurance-for-us-retirees-in-mexico/ ; https://www.travelawaits.com/2697279/retiring-in-mexico-healthcare-for-expats/ ; https://mexpatguide.com/healthcare/
10. Moving / FEIE / remote-work tax, https://brighttax.com/blog/moving-to-mexico-what-to-expect-as-a-us-expat/ ; https://onlinetaxman.com/us-tax-guide-americans-living-in-mexico ; https://www.greenbacktaxservices.com/country-guide/taxes-in-mexico-us-expats/
11. Spanish phrasing, https://www.mexicodesconocido.com.mx/donde-comer-en-san-miguel-de-allende-joyas-gastronomicas-que-los-locales-prefieren.html ; https://www.viajeroscallejeros.com/que-hacer-en-san-miguel-allende/ ; https://www.viajeroscallejeros.com/donde-comer-en-san-miguel-de-allende/
