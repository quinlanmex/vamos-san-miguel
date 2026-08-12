-- Tag the 4 researched restaurants that had no cuisine (web-verified).
update places set cuisine = '{datenight,mediterranean}' where source_ref = 'https://www.google.com/maps/place/Bocaciega/data=!4m2!3m1!1s0x842b51472b8bc225:0xf1a18dc6b27b13dc';
update places set cuisine = '{datenight,italian}' where source_ref = 'https://www.google.com/maps/place/Casa+Nostra+Restaurant,+Terrace+and+Rooftop/data=!4m2!3m1!1s0x842b51ba8c2d2581:0xebfe42417eb524cf';
update places set cuisine = '{mexican}' where source_ref = 'https://www.google.com/maps/place/Don+Taco+Tequila/data=!4m2!3m1!1s0x842b51b7970a71d1:0xc8cac15e7fce34f8';
update places set cuisine = '{datenight,mediterranean}' where source_ref = 'https://www.google.com/maps/place/Trazo+1810/data=!4m2!3m1!1s0x842b51b74e354c0b:0xcae64b279c984f4';
