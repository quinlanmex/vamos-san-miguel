-- Vamos San Miguel: run this once in the Supabase SQL Editor.
-- Combines the detail-fields + cuisine-backfill migrations. Safe to run more than once.

-- ========== 1) Pick detail fields ==========
-- Vamos San Miguel: fields for the clickable Local Pick detail view.
-- Run once in the Supabase SQL Editor. Safe to run more than once.

alter table places add column if not exists photos      text[] default '{}';  -- extra gallery photos
alter table places add column if not exists phone       text;                 -- display phone
alter table places add column if not exists hours       text;                 -- e.g. "Tue-Sun 1-10pm"
alter table places add column if not exists price_level int;                  -- 1-4  -> $ to $$$$
alter table places add column if not exists tip         text;                 -- "good to know" line
alter table places add column if not exists featured    boolean default false; -- eligible for the rotating hero
alter table places add column if not exists featured_rank int;                -- manual order of featured picks

-- Website already exists as origin_url. The card thumbnail is photo_url; the
-- gallery (photos) holds any additional images shown in the detail sheet.

-- ========== 2) Cuisine + good-for facets ==========
-- Vamos San Miguel: add + backfill the cuisine facet on Local Picks.
-- Safe to run more than once (overwrites cuisine). Matches rows by Google Maps URL (source_ref).
alter table places add column if not exists cuisine text[] default '{}';

update places set cuisine = '{burgers}' where source_ref = 'https://www.google.com/maps/place/La+Burger/data=!4m2!3m1!1s0x842b4f767091217f:0x7e937ee5436e1db9';
update places set cuisine = '{italian}' where source_ref = 'https://www.google.com/maps/place/Lanzafuegos/data=!4m2!3m1!1s0x842b4f7e44b4d495:0x2f8c12e87c76c37f';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Restaurante+Patria/data=!4m2!3m1!1s0x842b4f9b188914b9:0x56668c2ac19de51e';
update places set cuisine = '{dessert}' where source_ref = 'https://www.google.com/maps/place/Amorino/data=!4m2!3m1!1s0x842b51facad4148b:0x20266e658fd38b0c';
update places set cuisine = '{mexican}' where source_ref = 'https://www.google.com/maps/place/Anta%C3%B1o+Cuatro/data=!4m2!3m1!1s0x842b515cd6d23587:0x9f3d23d49822484f';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Arriba+Abajo/data=!4m2!3m1!1s0x842b51ad5108000d:0x954bf7b7c08a6056';
update places set cuisine = '{cafe,coworking,breakfast}' where source_ref = 'https://www.google.com/maps/place/Art+Garden+Cafe/data=!4m2!3m1!1s0x842b51304c6774af:0x79153f81de9c2f4d';
update places set cuisine = '{dessert,bakery,cafe,coworking,breakfast}' where source_ref = 'https://www.google.com/maps/place/Bakery+Sucr%C3%A9,+SMA./data=!4m2!3m1!1s0x842b517f9b654abd:0x44b06f9836864de7';
update places set cuisine = '{datenight,mediterranean}' where source_ref = 'https://www.google.com/maps/place/Bocaciega/data=!4m2!3m1!1s0x842b51472b8bc225:0xf1a18dc6b27b13dc';
update places set cuisine = '{mexican,cafe,coworking,breakfast}' where source_ref = 'https://www.google.com/maps/place/Caf%C3%A9+1910/data=!4m2!3m1!1s0x842b51b332774101:0x4d177224222f57ca';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/Caf%C3%A9+Murmullo/data=!4m2!3m1!1s0x842b51a43eb4057f:0xf5da16f054687e96';
update places set cuisine = '{datenight,italian}' where source_ref = 'https://www.google.com/maps/place/Casa+Nostra+Restaurant,+Terrace+and+Rooftop/data=!4m2!3m1!1s0x842b51ba8c2d2581:0xebfe42417eb524cf';
update places set cuisine = '{dessert}' where source_ref = 'https://www.google.com/maps/place/CHURRER%C3%8DA+PORFIRIO+SAN+MIGUEL+DE+ALLENDE/data=!4m2!3m1!1s0x842b510057a24817:0x176c88fab623ad1b';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Comunidad+by+Our+Habitas/data=!4m2!3m1!1s0x842b51ce28886fa1:0xdcfc5ab6964a1e11';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/CORTADO/data=!4m2!3m1!1s0x842b51819f781aaf:0x8cdd7634652a952f';
update places set cuisine = '{mexican,breakfast}' where source_ref = 'https://www.google.com/maps/place/Cumpanio/data=!4m2!3m1!1s0x842b51ba18053ffd:0xae74efe326bbfa8b';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/Divino+Cielo+Caf%C3%A9/data=!4m2!3m1!1s0x842b51a925c1b391:0x10a18688099555c8';
update places set cuisine = '{mexican}' where source_ref = 'https://www.google.com/maps/place/Don+Taco+Tequila/data=!4m2!3m1!1s0x842b51b7970a71d1:0xc8cac15e7fce34f8';
update places set cuisine = '{mexican,datenight}' where source_ref = 'https://www.google.com/maps/place/D%C3%B4ce+18+Concept+House/data=!4m2!3m1!1s0x842b51b9febb1f15:0x58c9a31bef506707';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/El+Caf%C3%A9+Instituto+Allende+Casa+Museo/data=!4m2!3m1!1s0x842b51fca2b03c8f:0x9d76d16d48e3ee69';
update places set cuisine = '{datenight,italian}' where source_ref = 'https://www.google.com/maps/place/Fari+Trattoria/data=!4m2!3m1!1s0x842b5138a8c49afb:0x22a7d01dfb490f96';
update places set cuisine = '{datenight,italian}' where source_ref = 'https://www.google.com/maps/place/Firenze+Restaurant+-+San+Miguel+de+Allende/data=!4m2!3m1!1s0x842b51ba41cada87:0x4bdaaa3f90b2b6a9';
update places set cuisine = '{argentinian,datenight}' where source_ref = 'https://www.google.com/maps/place/Florios+San+Miguel/data=!4m2!3m1!1s0x842b511b34cc7e19:0x3157a9356fe0cb8d';
update places set cuisine = '{mexican}' where source_ref = 'https://www.google.com/maps/place/Hecho+en+M%C3%A9xico/data=!4m2!3m1!1s0x842b51b1d00f418d:0x55bc02b3c5b505c6';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Inside+Cafe/data=!4m2!3m1!1s0x842b51b9d92ba417:0x43e1a5f895e344aa';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/KAFFI/data=!4m2!3m1!1s0x842b51ad09750e47:0x3bd64872ec181741';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/La+Cabra+Iluminada/data=!4m2!3m1!1s0x842b5123082609db:0x7fabb38637369ebb';
update places set cuisine = '{mexican}' where source_ref = 'https://www.google.com/maps/place/La+Frontera+Restaurant/data=!4m2!3m1!1s0x842b51ad0a403a01:0x98db4cf64c5276fa';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/La+Sacrist%C3%ADa/data=!4m2!3m1!1s0x842b51b0d2a42dbd:0x76a54a6b3b3ecbc6';
update places set cuisine = '{cafe,breakfast}' where source_ref = 'https://www.google.com/maps/place/Lavanda+Caf%C3%A9+de+Especialidad/data=!4m2!3m1!1s0x842b51b0c0fc145b:0x67a0ffb654013b97';
update places set cuisine = '{peruvian}' where source_ref = 'https://www.google.com/maps/place/Lima+-+Cocina+Realmente+Peruana/data=!4m2!3m1!1s0x842b518bd5e78527:0xf0b532af97e5023b';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Lukrezia+Breakfast+and+Brunch/data=!4m2!3m1!1s0x842b515e82b73e27:0x14f56c912e008c1';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/Mam%C3%A1+M%C3%ADa/data=!4m2!3m1!1s0x842b51b0b009254b:0x7f73204dcb2ba260';
update places set cuisine = '{cafe,coworking,breakfast}' where source_ref = 'https://www.google.com/maps/place/Mi+Bistro+300/data=!4m2!3m1!1s0x842b51b71e2e0b99:0x828c168e958dd6f9';
update places set cuisine = '{burgers}' where source_ref = 'https://www.google.com/maps/place/NY+Style+Deli+-+District/data=!4m2!3m1!1s0x842b515b0c43432d:0x1f8e0e4ddc78f9e2';
update places set cuisine = '{bakery,breakfast}' where source_ref = 'https://www.google.com/maps/place/Panina/data=!4m2!3m1!1s0x842b514f206e652d:0x7c9097686cc707f1';
update places set cuisine = '{bakery,breakfast,burgers}' where source_ref = 'https://www.google.com/maps/place/PANIO+Luciernaga/data=!4m2!3m1!1s0x842b51cc0cda78bf:0xc4f13945e2629824';
update places set cuisine = '{cafe,coworking,breakfast}' where source_ref = 'https://www.google.com/maps/place/Petit+Four/data=!4m2!3m1!1s0x842b51b7412b1dc7:0xf9c753590aa4d5b7';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/Posada+Coraz%C3%B3n/data=!4m2!3m1!1s0x842b51b081d85775:0xefd7f7b29d38253d';
update places set cuisine = '{mexican,breakfast}' where source_ref = 'https://www.google.com/maps/place/Ra%C3%ADces+Restaurante+SMA/data=!4m2!3m1!1s0x842b51f3cf0a85f5:0xd1ff3fc95c0563f';
update places set cuisine = '{breakfast}' where source_ref = 'https://www.google.com/maps/place/R%C3%BAstica/data=!4m2!3m1!1s0x842b51d60c8b0181:0x6432092e36691ebd';
update places set cuisine = '{asian}' where source_ref = 'https://www.google.com/maps/place/Thai+Kitchen/data=!4m2!3m1!1s0x842b51adc322dd51:0xc7713793ec5be44a';
update places set cuisine = '{datenight,mediterranean}' where source_ref = 'https://www.google.com/maps/place/Trazo+1810/data=!4m2!3m1!1s0x842b51b74e354c0b:0xcae64b279c984f4';
update places set cuisine = '{cafe,coworking}' where source_ref = 'https://www.google.com/maps/place/Zibu+Allende/data=!4m2!3m1!1s0x842b517780690f77:0x986d088ad8081e73';
