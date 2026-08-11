# Spanish logo — what to ask ChatGPT

The tagline in the logo is baked into the image (not editable text), so the Spanish
version has to be regenerated. The site is already wired: when someone switches to
Español it looks for `logo-light-es.svg` / `logo-dark-es.svg` and falls back to the
English logo until those exist. So nothing breaks in the meantime.

## Recommended Spanish tagline
**EVENTOS · RECOMENDACIONES · GUÍA LOCAL**

Alternatives if you want it shorter/punchier:
- EVENTOS · RECOMENDADOS · GUÍA LOCAL
- EVENTOS · LO MEJOR · GUÍA LOCAL

(English, for reference: EVENTS · LOCAL PICKS · INSIDER GUIDE)

## Best path — continue the original chat
Open the same ChatGPT conversation where you made the English logo and paste:

> Using the exact same Vamos San Miguel logo you created — same Parroquia spire emblem,
> same "Vamos" script, same "SAN MIGUEL" serif wordmark, same proportions and spacing —
> regenerate it with ONLY the small tagline line changed from English to Spanish. The new
> tagline reads: **EVENTOS · RECOMENDACIONES · GUÍA LOCAL** (same font, size, letter-spacing,
> and centered position as the English tagline). Give me two versions on transparent
> backgrounds: (1) the navy version for light backgrounds, (2) the cream version for dark
> backgrounds. Export each as a high-resolution transparent PNG at the same aspect ratio as
> the original. Change nothing else.

## If starting fresh (standalone prompt)
> Create a horizontal logo for a brand called "Vamos San Miguel." Elements, top to bottom:
> a simple line-art emblem of the Parroquia de San Miguel Arcángel (the pink neo-Gothic
> church spire of San Miguel de Allende); the word "Vamos" in a warm, casual brush-script;
> "SAN MIGUEL" in a clean uppercase serif beneath it; and a small centered tagline in
> uppercase letter-spaced caps reading "EVENTOS · RECOMENDACIONES · GUÍA LOCAL." Palette:
> deep navy #0D1B36 and Parroquia coral #E06A63. Produce two transparent-background PNG
> versions: a navy-ink version for light backgrounds and a cream (#F7F3EC) version for dark
> backgrounds. Clean, editorial, boutique-travel feel.

## When you get the images back
Send me the two transparent PNGs. I'll wrap them into `logo-light-es.svg` and
`logo-dark-es.svg` (same format as the current logos) and drop them in `public/` — the
Spanish site will pick them up automatically, no other change needed.
