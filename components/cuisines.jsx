import { Pizza, Coffee, Croissant, IceCreamCone, Sandwich, Beef, Fish, EggFried, Soup, Laptop } from "lucide-react";

// Lucide has no chili/pepper, so this is a hand-drawn one for the Mexican facet.
// Horizontal crescent body tapering to a point on the left, stem curling up-right.
export function Chili({ size = 24, color = "currentColor", ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3.6 13.4c-.6 4 2.4 7.2 6.6 7.2 5 0 8.2-3.9 8.2-8 0-2.2-1.4-3.4-3.2-3-4.8 1-8 1.3-11.6 3.8Z" />
      <path d="M15.2 9.6c.6-3 2-4 4.2-3.5" />
    </svg>
  );
}

// Cuisine facet: shared by the site cards, the filter chips, the detail sheet, and the admin.
export const CUISINES = {
  mexican:     { en: "Mexican",              es: "Mexicana",                  Icon: Chili },
  italian:     { en: "Italian & Pizza",      es: "Italiana y pizza",          Icon: Pizza },
  asian:       { en: "Asian",                es: "Asiática",                  Icon: Soup },
  peruvian:    { en: "Peruvian",             es: "Peruana",                   Icon: Fish },
  argentinian: { en: "Argentinian",          es: "Argentina",                 Icon: Beef },
  burgers:     { en: "Burgers & Sandwiches", es: "Hamburguesas y sándwiches", Icon: Sandwich },
  breakfast:   { en: "Breakfast",            es: "Desayuno",                  Icon: EggFried },
  cafe:        { en: "Café & Coffee",        es: "Café",                      Icon: Coffee },
  coworking:   { en: "Coworking",            es: "Coworking",                 Icon: Laptop },
  bakery:      { en: "Bakery",               es: "Panadería",                 Icon: Croissant },
  dessert:     { en: "Dessert",              es: "Postres",                   Icon: IceCreamCone },
};
