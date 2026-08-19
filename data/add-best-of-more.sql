-- More big, obvious "best of" categories people arrive wanting. Skips any that already
-- exist (safe to run anytime). Crown winners for these at /admin/best-of.
insert into public.best_of_categories (slug, label_en, label_es, sort) values
  ('best_cocktails',      'Best cocktail bar',         'Mejor bar de cocteles',       90),
  ('best_mezcal',         'Best mezcal and agave bar', 'Mejor mezcaleria',            100),
  ('best_weekend_brunch', 'Best weekend brunch',       'Mejor brunch de fin de semana',110),
  ('best_pizza',          'Best pizza',                'Mejor pizza',                 120),
  ('best_fine_dining',    'Best splurge dinner',       'Mejor cena de lujo',          130),
  ('best_cheap_eats',     'Best cheap eats',           'Mejor comida economica',      140),
  ('best_street_tacos',   'Best street tacos',         'Mejores tacos de la calle',   145),
  ('best_countryside',    'Best countryside restaurant','Mejor restaurante campestre',148),
  ('best_work_cafe',      'Best cafe to work from',    'Mejor cafe para trabajar',    150),
  ('best_live_music',     'Best live music',           'Mejor musica en vivo',        160),
  ('best_spa',            'Best spa and massage',      'Mejor spa y masaje',          170),
  ('best_shopping',       'Best boutique shopping',    'Mejores boutiques',           180),
  ('best_hot_springs',    'Best hot springs',          'Mejores aguas termales',      190),
  ('best_family',         'Best spot with kids',       'Mejor lugar con ninos',       200)
on conflict (slug) do nothing;

-- If you already ran the old "best_brunch" row, retire it in favor of weekend brunch:
update public.best_of_categories set status = 'hidden' where slug = 'best_brunch';
