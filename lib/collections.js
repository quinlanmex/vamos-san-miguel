// Programmatic "best of" landing pages, generated from the Local Picks data.
//
// Each entry targets a real long-tail search ("best rooftop bars in san miguel de allende")
// and renders a ranked list of our actual picks with their hand-written local_take — content
// that is specific, named and opinionated, i.e. exactly what Google and the AI answer engines
// reward and what a generic model cannot reproduce. Add a topic here and a new page ships.
//
// `match` filters the picks: every provided key must pass (AND); within a key, any value hits
// (OR). Facets and cuisines both live in a pick's `cuisine` array; `listKeyAny` checks list_key;
// `areaAny` is a case-insensitive substring match on the neighborhood.

const CITY = "San Miguel de Allende";

export const COLLECTIONS = [
  {
    slug: "best-rooftop-bars-in-san-miguel-de-allende",
    h1: `The Best Rooftop Bars in ${CITY}`,
    title: `The Best Rooftop Bars in ${CITY} (Locals' Picks)`,
    desc: `Where locals actually go for a terrace drink and a view of the domes in ${CITY} — ranked, with the honest take on each.`,
    intro: `San Miguel is a town of rooftops, and the difference between a great one and a tourist trap is entirely in the details — which terrace catches the sunset behind the Parroquia, where the mezcal list is real, and which one is worth the wait. Here are the ones we send friends to.`,
    match: { facetAny: ["rooftop"] },
    faqs: [
      { q: `Which rooftop has the best view of the Parroquia?`, a: `The terraces along and just off the Jardín look straight at the Parroquia's spires; our top pick above names the one we rate highest for the sunset view.` },
      { q: `Do you need a reservation for rooftop bars in ${CITY}?`, a: `For sunset on a weekend, yes — the best terraces fill up fast. Arrive 45 minutes before sundown or book ahead.` },
    ],
  },
  {
    slug: "best-coffee-shops-in-san-miguel-de-allende",
    h1: `The Best Coffee Shops in ${CITY}`,
    title: `The Best Coffee Shops & Cafés in ${CITY}`,
    desc: `The cafés locals actually return to in ${CITY} — proper espresso, good pastries, and a seat worth lingering in.`,
    intro: `Mexico grows extraordinary coffee, and San Miguel has finally caught up to it. Skip the chains — these are the independent roasters and cafés where the espresso is dialed in and the room is worth staying in.`,
    match: { cuisineAny: ["cafe"] },
    faqs: [
      { q: `Where do locals get coffee in ${CITY}?`, a: `At the independent cafés and roasters listed above, not the chains — each of ours is chosen for the actual cup, not just the setting.` },
      { q: `Are there good cafés to work from in ${CITY}?`, a: `Yes — see our guide to the best cafés for remote work for the ones with reliable wifi and space to sit.` },
    ],
  },
  {
    slug: "best-cafes-to-work-remotely-in-san-miguel-de-allende",
    h1: `The Best Cafés to Work Remotely in ${CITY}`,
    title: `Best Cafés & Coworking to Work From in ${CITY}`,
    desc: `Reliable wifi, real coffee and a seat you can keep for a few hours — the ${CITY} spots that actually work for remote work.`,
    intro: `San Miguel has become a genuine hub for remote workers and it shows: a handful of cafés and spaces have the trifecta of strong wifi, good coffee, and staff who won't rush you. These are the ones that hold up for a full working session.`,
    match: { facetAny: ["coworking"] },
    faqs: [
      { q: `Is ${CITY} good for digital nomads?`, a: `Very — it has a large remote-work community, plenty of cafés set up for laptops, and dedicated coworking. The spots above are our tested picks.` },
      { q: `Is the wifi reliable in ${CITY} cafés?`, a: `At the places on this list, yes — that's the main reason they made it. Elsewhere it can be spotty, so stick to the vetted ones for anything important.` },
    ],
  },
  {
    slug: "best-date-night-restaurants-in-san-miguel-de-allende",
    h1: `The Best Date-Night Restaurants in ${CITY}`,
    title: `The Most Romantic Restaurants in ${CITY}`,
    desc: `Candlelit courtyards, great wine and a view worth dressing up for — the ${CITY} restaurants we pick for a special night.`,
    intro: `Few towns do romance like San Miguel — walled courtyards, candlelight, and a golden hour that does half the work for you. These are the tables we book when the night matters.`,
    match: { facetAny: ["datenight"] },
    faqs: [
      { q: `What's the most romantic restaurant in ${CITY}?`, a: `Our top pick above; every restaurant on this list is chosen specifically for atmosphere as much as the food.` },
      { q: `Should you book ahead for a special dinner in ${CITY}?`, a: `Always, especially for a courtyard or terrace table at sunset. The best rooms are small and fill days ahead on weekends.` },
    ],
  },
  {
    slug: "best-restaurants-in-san-miguel-de-allende",
    h1: `The Best Restaurants in ${CITY}`,
    title: `The Best Restaurants in ${CITY}, Chosen by Locals`,
    desc: `Not a sponsored list — the ${CITY} restaurants locals genuinely rate, from street-level tacos to the special-occasion tables.`,
    intro: `San Miguel punches far above its size on food. This is our working shortlist across the board — the places we vouch for and the reason we do, without a single paid placement.`,
    match: { listKeyAny: ["rest"] },
    limit: 15,
    faqs: [
      { q: `What food is ${CITY} known for?`, a: `Central Mexican cooking — moles, carnitas, street tacos and regional specialties — alongside an outsized fine-dining and international scene for a town its size.` },
      { q: `Is ${CITY} expensive to eat in?`, a: `It spans the full range: excellent street food and market meals for a few dollars, up to destination tasting menus. This list covers both ends.` },
    ],
  },
  {
    slug: "best-mexican-restaurants-in-san-miguel-de-allende",
    h1: `The Best Mexican Restaurants in ${CITY}`,
    title: `The Best Traditional Mexican Restaurants in ${CITY}`,
    desc: `Where to eat real regional Mexican cooking in ${CITY} — moles, antojitos and market food locals actually recommend.`,
    intro: `Amid all the international restaurants, the reason to come to San Miguel is still the Mexican cooking. These are the spots doing it with real regional depth — not a tourist's idea of it.`,
    match: { listKeyAny: ["rest"], cuisineAny: ["mexican"] },
    faqs: [
      { q: `Where do you find authentic Mexican food in ${CITY}?`, a: `At the places above and in the town's markets — we've picked the ones with genuine regional cooking over crowd-pleasing versions.` },
      { q: `What Mexican dish should you try in ${CITY}?`, a: `Regional moles, carnitas, and whatever's fresh at the market fondas. Several picks here are known for one signature dish worth ordering.` },
    ],
  },
  {
    slug: "best-wellness-and-spas-in-san-miguel-de-allende",
    h1: `The Best Wellness & Spas in ${CITY}`,
    title: `The Best Spas, Hot Springs & Wellness in ${CITY}`,
    desc: `Thermal springs, massage and yoga near ${CITY} — the wellness spots locals rate for a genuine reset.`,
    intro: `The valley around San Miguel sits on natural hot springs, and the town has grown a serious wellness scene on top of it. These are the spas, studios and thermal spots worth your time.`,
    match: { listKeyAny: ["wellness"], facetAny: ["wellness"], any: true },
    faqs: [
      { q: `Are the hot springs near ${CITY} worth it?`, a: `Yes — the thermal springs a short drive out of town are a local ritual, best on a weekday morning to beat the crowds.` },
      { q: `Where can you do yoga in ${CITY}?`, a: `Several studios and wellness centers run drop-in classes; the ones we rate are on the list above.` },
    ],
  },
  {
    slug: "family-friendly-things-to-do-in-san-miguel-de-allende",
    h1: `The Best Family-Friendly Spots in ${CITY}`,
    title: `Family-Friendly Restaurants & Things to Do in ${CITY}`,
    desc: `Where to go with kids in ${CITY} — places with room to run, easy food, and a welcome for families.`,
    intro: `San Miguel is more kid-friendly than it first looks once you know where to go. These are the restaurants and spots with space for children, relaxed staff, and something to keep little ones happy.`,
    match: { facetAny: ["family", "playground"], any: true },
    faqs: [
      { q: `Is ${CITY} good for families with kids?`, a: `Yes, with the right choices — the cobblestones and traffic mean you'll want stroller-friendly, open venues like the ones above.` },
      { q: `What can kids do in ${CITY}?`, a: `El Jardín for people-watching and balloons, El Charco del Ingenio's trails, and the family-welcoming spots on this list.` },
    ],
  },
  {
    // Hyperlocal / by-colonia — a strong, un-fakeable SEO play. Filters on the `area` field, so
    // it fills automatically as picks are geocoded into San Antonio. Clone this per colonia.
    slug: "best-restaurants-in-colonia-san-antonio-san-miguel-de-allende",
    h1: `The Best Restaurants in Colonia San Antonio, ${CITY}`,
    title: `Where to Eat in Colonia San Antonio, ${CITY}`,
    desc: `The best restaurants and cafés in San Antonio — the walkable, local-favorite neighborhood just south of Centro in ${CITY}.`,
    intro: `San Antonio is where a lot of locals actually eat — a walkable neighborhood just south of Centro with none of the Jardín markup. These are the spots worth the short stroll.`,
    match: { listKeyAny: ["rest", "bar"], areaAny: ["san antonio"] },
    faqs: [
      { q: `Is Colonia San Antonio a good area to eat in ${CITY}?`, a: `Yes — it's a favorite local neighborhood a few minutes' walk south of Centro, with excellent independent restaurants and cafés at friendlier prices than the tourist core.` },
      { q: `Is San Antonio walkable from Centro?`, a: `Very — it's roughly a 10–15 minute walk south of El Jardín, and easy by taxi or Uber if you'd rather ride.` },
    ],
  },
];

export function allCollections() {
  return COLLECTIONS;
}
export function getCollection(slug) {
  return COLLECTIONS.find((c) => c.slug === slug) || null;
}

// True if a pick satisfies a collection's match spec. `any:true` loosens the AND across the
// facet/cuisine/list_key groups to an OR (used for topics like wellness where the concept lives
// in either the list_key or the facet).
export function matchesCollection(p, m) {
  const cz = Array.isArray(p.cuisine) ? p.cuisine : [];
  const checks = [];
  if (m.listKeyAny) checks.push(m.listKeyAny.includes(p.list_key));
  if (m.facetAny) checks.push(m.facetAny.some((f) => cz.includes(f)));
  if (m.cuisineAny) checks.push(m.cuisineAny.some((c) => cz.includes(c)));
  if (m.areaAny) checks.push(m.areaAny.some((a) => (p.area || "").toLowerCase().includes(a.toLowerCase())));
  if (!checks.length) return false;
  return m.any ? checks.some(Boolean) : checks.every(Boolean);
}
