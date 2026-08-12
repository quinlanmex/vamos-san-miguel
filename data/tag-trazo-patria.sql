-- Corrected tags for Trazo 1810 and Restaurante Patria (per owner). Run anytime.
update places set cuisine = '{international,breakfast,datenight,views}' where source_ref = 'https://www.google.com/maps/place/Trazo+1810/data=!4m2!3m1!1s0x842b51b74e354c0b:0xcae64b279c984f4';
update places set cuisine = '{mexican,mediterranean,breakfast}' where source_ref = 'https://www.google.com/maps/place/Restaurante+Patria/data=!4m2!3m1!1s0x842b4f9b188914b9:0x56668c2ac19de51e';
