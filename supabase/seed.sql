-- ============================================================================
-- Vamos San Miguel — seed data (Phase 1)
-- Run AFTER schema.sql. Idempotent: safe to re-run (matches on source_ref).
-- Mirrors the prototype's 12 events + 7 Local Picks so the live site shows the
-- same content you've been previewing.
-- ============================================================================

insert into events
  (source_ref, status, title_en, title_es, blurb_en, blurb_es, price_en, price_es,
   category, audience, start_date, end_date, start_time, recurring,
   venue, area, lat, lng, origin_name, origin_url, discovered_via, photo_url)
values
  ('seed:event:1','published','Ricardo Salinas: The Guitar Goes to the Movies','Ricardo Salinas: La Guitarra va al Cine',
   'Maestro Ricardo Salinas pays tribute to iconic film scores on classical guitar.','El maestro Ricardo Salinas rinde homenaje a bandas sonoras del cine en su guitarra clásica.',
   '$330 MXN','$330 MXN','musica',array['family'],'2026-07-30','2026-07-30','14:00',false,
   'Sala Quetzal · La Biblioteca','Centro',20.9166,-100.7445,'La Biblioteca','https://labibliotecapublica.org','Biblioteca','https://picsum.photos/seed/qp-salinas/640/420'),

  ('seed:event:2','published','Artisan Craft Fair','Feria Artesanal',
   'Craft fair in the heart of the Jardín, with artisans from the region.','Feria de artesanías en el corazón del Jardín, con artesanos de la región.',
   'Free','Gratis','mercados',array['family'],'2026-07-28','2026-08-02','09:00',false,
   'Jardín Principal','Centro',20.9143,-100.7436,null,null,'discoversma','https://picsum.photos/seed/qp-feria/640/420'),

  ('seed:event:3','published','GIFF 2026 · International Film Festival','GIFF 2026 · Festival Internacional de Cine',
   'The Guanajuato International Film Festival comes to San Miguel with open-air screenings.','El Festival Internacional de Cine de Guanajuato llega a San Miguel con funciones al aire libre.',
   'Varies','Varía','cine',array['family','teens'],'2026-07-29','2026-08-02',null,false,
   'Varias sedes','Centro',20.9150,-100.7444,'GIFF','https://giff.mx','discoversma','https://picsum.photos/seed/qp-giff/640/420'),

  ('seed:event:4','published','Can I Use Medicare in Mexico?','¿Puedo usar Medicare en México?',
   'An info talk on using Medicare as a foreign resident.','Charla informativa sobre el uso de Medicare para residentes extranjeros.',
   'Free','Gratis','charlas',array[]::text[],'2026-07-29','2026-07-29','15:00',false,
   'SMA Kindness Collective','Centro',20.9158,-100.7462,null,null,'discoversma',null),

  ('seed:event:5','published','Crossing the Threshold: On Grief','Cruzar el umbral: sobre el duelo',
   'A conversation on grief and why we can''t think our way through it.','Una conversación sobre el duelo y por qué no podemos pensarlo para superarlo.',
   'Free','Gratis','charlas',array[]::text[],'2026-07-29','2026-07-29','16:00',false,
   'Centro','Centro',20.9150,-100.7448,null,null,'discoversma',null),

  ('seed:event:6','published','Historic Walking Tour · Patronato Pro Niños','Recorrido Histórico · Patronato Pro Niños',
   'Historic walking tour; proceeds support Patronato Pro Niños.','Recorrido histórico a pie; lo recaudado apoya a Patronato Pro Niños.',
   'Donation','Donativo','tours',array['family'],'2026-07-31','2026-07-31','09:45',true,
   'El Jardín, frente a la Parroquia','Centro',20.9140,-100.7434,null,null,'discoversma',null),

  ('seed:event:7','published','San Miguel Walking Tour · Follow Me Tours','San Miguel Walking Tour · Follow Me Tours',
   'Small-group walking tour with a certified bilingual guide.','Recorrido a pie en grupo pequeño con guía bilingüe certificado.',
   '$500 MXN','$500 MXN','tours',array['family','teens'],'2026-07-30','2026-07-30','10:00',true,
   'Starbucks del Jardín','Centro',20.9146,-100.7440,null,null,'discoversma','https://picsum.photos/seed/qp-tour/640/420'),

  ('seed:event:8','published','Guided Tour · El Charco del Ingenio','Visita guiada · El Charco del Ingenio',
   'Guided tour of the botanical garden and nature reserve.','Visita guiada por el jardín botánico y reserva natural.',
   '$120 MXN','$120 MXN','tours',array['family','teens'],'2026-07-30','2026-07-30','10:00',true,
   'El Charco del Ingenio','Norte',20.9270,-100.7295,'El Charco del Ingenio','https://elcharco.org.mx','discoversma','https://picsum.photos/seed/qp-charco/640/420'),

  ('seed:event:9','published','Come Walk the Dogs!','¡Ven a pasear a los perritos!',
   'Walk the shelter dogs — free, and everyone''s welcome.','Pasea a los perritos del refugio; sin costo, todos bienvenidos.',
   'Free','Gratis','comunidad',array['family','teens'],'2026-07-30','2026-07-30','10:00',true,
   'Yo ❤ Animalitos SMA','Centro',20.9118,-100.7479,null,null,'discoversma',null),

  ('seed:event:10','published','Aqua Fit','Aqua Fit',
   'Pool fitness class — a great way to start the day.','Clase de acondicionamiento en alberca, ideal para empezar el día.',
   '$150 MXN','$150 MXN','bienestar',array['family'],'2026-07-30','2026-07-30','09:30',true,
   'Astilleros Pool','Centro',20.9105,-100.7395,null,null,'discoversma',null),

  ('seed:event:11','published','FASMA · Ensamble Tlapalli','FASMA · Ensamble Tlapalli',
   'Ensamble Tlapalli in concert as part of the arts festival.','Concierto del Ensamble Tlapalli dentro del festival de arte.',
   '$200 MXN','$200 MXN','musica',array['family'],'2026-08-08','2026-08-08','17:00',false,
   'Bellas Artes','Centro',20.9156,-100.7451,null,null,'discoversma','https://picsum.photos/seed/qp-fasma/640/420'),

  ('seed:event:12','published','Now Showing · Cine Bacco','Cartelera · Cine Bacco',
   'This week''s arthouse lineup at Cine Bacco.','Cartelera semanal de cine de autor en Cine Bacco.',
   'Varies','Varía','cine',array['teens'],'2026-07-28','2026-08-02',null,false,
   'Cine Bacco','Centro',20.9135,-100.7440,null,null,'discoversma',null)
on conflict (source_ref) where source_ref is not null do nothing;

insert into places
  (source_ref, status, editorial, list_key, name, desc_en, desc_es,
   category, audience, diet, area, photo_url)
values
  ('seed:place:la-parada','published',true,'rest','La Parada','Peruvian, lovely courtyard','Peruano, patio encantador',
   'mercados',array['family'],array['vegetarian'],'Centro','https://picsum.photos/seed/qp-parada/400/400'),
  ('seed:place:lavanda','published',true,'rest','Lavanda Café','Breakfast & specialty coffee','Desayunos y café de especialidad',
   'mercados',array['family','teens'],array['vegetarian','vegan'],'Centro','https://picsum.photos/seed/qp-lavanda/400/400'),
  ('seed:place:cafe-rama','published',true,'rest','Café Rama','Creative brunch','Brunch creativo',
   'mercados',array['family','teens'],array['vegetarian','vegan'],'Centro',null),
  ('seed:place:mezcaleria','published',true,'bar','La Mezcalería','Mezcal & cocktails','Mezcales y coctelería',
   'musica',array[]::text[],array[]::text[],'Centro',null),
  ('seed:place:manantial','published',true,'bar','El Manantial','Historic cantina, seafood tostadas','Cantina histórica, tostadas de mariscos',
   'musica',array[]::text[],array[]::text[],'Centro',null),
  ('seed:place:mama-mia','published',true,'live','Mama Mía','Live music on the rooftop','Música en vivo en la terraza',
   'musica',array['teens'],array[]::text[],'Centro','https://picsum.photos/seed/qp-mamamia/400/400'),
  ('seed:place:teatro-santa-ana','published',true,'live','Teatro Santa Ana','Concerts & cultural events','Conciertos y eventos culturales',
   'musica',array['family','teens'],array[]::text[],'Centro',null)
on conflict (source_ref) where source_ref is not null do nothing;
