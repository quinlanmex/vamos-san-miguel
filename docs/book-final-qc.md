# Book Final QC: Copy / House-Voice Pass

Scope: ch1.md through ch23.md plus appendix-legal.md. ch24-closing-draft.md left untouched per instructions. No facts, figures, citations, or `## Sources` / `## To verify` sections were altered. All edits were surgical.

## Headline finding on em-dashes

The manuscript contained **zero em-dashes (U+2014) before this pass** — the #1 rule was already satisfied across every file. I also checked for en-dashes, figure dashes, minus signs, and double-hyphen ("--") em-dash substitutes: none present. A final grep confirms **0 em-dashes across all chapters and the appendix.** So the em-dash work was verification, not removal.

## Calibration note

I fixed all single-sentence antitheses ("it's not X, it's Y" / "not just X but Y" / "not because X but because Y"), false-consensus openers, banned filler phrases, and the one staccato word-repetition triad. I deliberately **left two-sentence emphatic clarifiers** in the author's recurring "That is not a failure. It is information." rhythm (appears in ch2, ch5, ch7, ch10, ch12, ch14, ch15, ch22). These are not the banned comma-form antithesis, they carry real content, and rewriting them would have meant non-surgical paragraph surgery against the "preserve voice / minimal edits" constraint. Flagging so you can decide if you want them hit in a future pass.

## Per-chapter changes

- **Ch1:** Removed "To be fair," filler opener. Rewrote the "Not only... Not only... But as a controlled test case" antithesis triad into plain statements.
- **Ch2:** Clean. (Opening "Not a deduction. / Not a credit. / An exclusion." left as deliberate narrative beat, not word-repetition staccato.)
- **Ch3:** Rewrote "not just California, New York, and New Jersey but also Connecticut..." into a plain list. Rewrote the domicile definition "Not where you are currently living, but where you intend to return."
- **Ch4:** Fixed the exact staccato the house rules flag — "defensible, defensible rather than guaranteed... defensible precisely because" — smoothed to one clean clause. Rewrote "not because the uncertainty vanished, but because..." Trimmed 2 filler adverbs ("not actually choosing", "genuinely have not been audited").
- **Ch5:** Rewrote the "not 'good by local standards' but genuinely trustworthy" antithesis. Trimmed 5 filler adverbs (highest-density chapter for "actually"/"genuinely": "actually function", "actually trust", "actually thrive", "what actually matters", "genuinely pleasant weather").
- **Ch6:** Rewrote "not because I hated the job but because I wanted options."
- **Ch7:** Rewrote the false-consensus opener "Everyone assumes real estate always goes up. Then 2008 happened."
- **Ch8:** Clean.
- **Ch9:** Rewrote "Not confined to museums or tourist shops but part of everything" and "Not because Mexico is unreliable, but because...". Trimmed 2 filler adverbs ("What actually changes", "actually reclaim").
- **Ch10:** Clean.
- **Ch11:** Rewrote "You are not only sending a message, you are absorbing patterns." Trimmed 2 filler adverbs from a high "actually" count (kept the meaningful/contrastive ones).
- **Ch12:** Clean.
- **Ch13:** Clean.
- **Ch14:** Rewrote 4 antitheses — "Not soccer specifically, but the thing underneath it", "Not 'I'm special,' but 'I can handle things.'", "not only for cost and climate but for how children move", and "Not because it is right for everyone, but because it is the least familiar". ("want to be fair to the American approach" left intact — substantive use of "fair", not the banned filler.)
- **Ch15:** Trimmed 5 filler adverbs (14 uses of "actually" was the heaviest in the book; cut the clear fillers, kept the contrastive ones). No banned antitheses.
- **Ch16:** Clean.
- **Ch17:** Clean.
- **Ch18:** Rewrote 2 dramatic antitheses — "Not with a visa rejection or a dramatic culture clash, but with a grown man..." and "not to reconnect us, but to cut the line entirely."
- **Ch19:** Rewrote the tip-table cell "Not generous, but adequate..." Rewrote the false-consensus opener "Most Americans arrive carrying an invisible assumption..." (also dropped its "actual").
- **Ch20:** Clean.
- **Ch21:** Clean.
- **Ch22:** Clean.
- **Ch23:** Clean.
- **appendix-legal.md:** Clean. (No em-dashes, no banned single-sentence antitheses; technical "not X; it is Y" clarifier at the SAT-enforcement section left as precise legal phrasing.)

## Verification

Final grep for "—" (U+2014) across ch1–ch23 + appendix-legal.md returns **0**, confirmed by two independent tools. Final regex sweep for single-sentence "not just/only X but Y" returns **0 matches**. ch24-closing-draft.md was not read or modified.
