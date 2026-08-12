-- Vamos San Miguel: feature tags "views" and "vineyard" for existing picks.
-- Idempotent: appends the tag to the cuisine array without clobbering existing tags.
-- Generated 2026-08-12.

-- ===== VIEWS (6) =====
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/Trazo+1810/data=!4m2!3m1!1s0x842b51b74e354c0b:0xcae64b279c984f4';
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/Florios+San+Miguel/data=!4m2!3m1!1s0x842b511b34cc7e19:0x3157a9356fe0cb8d';
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/Casa+Nostra+Restaurant,+Terrace+and+Rooftop/data=!4m2!3m1!1s0x842b51ba8c2d2581:0xebfe42417eb524cf';
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/Inside+Cafe/data=!4m2!3m1!1s0x842b51b9d92ba417:0x43e1a5f895e344aa';
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/Arriba+Abajo/data=!4m2!3m1!1s0x842b51ad5108000d:0x954bf7b7c08a6056';
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{views}')) where source_ref = 'https://www.google.com/maps/place/El+Caf%C3%A9+Instituto+Allende+Casa+Museo/data=!4m2!3m1!1s0x842b51fca2b03c8f:0x9d76d16d48e3ee69';

-- ===== VINEYARD (1) =====
update places set cuisine = array(select distinct unnest(coalesce(cuisine,'{}') || '{vineyard}')) where source_ref = 'https://www.google.com/maps/place/Restaurante+Patria/data=!4m2!3m1!1s0x842b4f9b188914b9:0x56668c2ac19de51e';
