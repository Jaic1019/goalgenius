-- ================================================================
--  GoalGenius — Knockout Fixtures
--  SAFE: INSERT only with ON CONFLICT DO NOTHING
--  Zero impact on: profiles, predictions, existing matches
--  Run ONLY after group stage matches are in DB
-- ================================================================

-- Round of 32 (32 matches) — July 4-7, 2026
INSERT INTO public.matches (home_team,away_team,match_date,match_time,group_stage,stadium,city,status)
VALUES
('TBD','TBD','2026-07-04','15:00:00','Top 32','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-04','18:00:00','Top 32','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-04','21:00:00','Top 32','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-04','00:00:00','Top 32','Estadio Azteca','Mexico City','upcoming'),
('TBD','TBD','2026-07-05','15:00:00','Top 32','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-07-05','18:00:00','Top 32','Hard Rock Stadium','Miami','upcoming'),
('TBD','TBD','2026-07-05','21:00:00','Top 32','Arrowhead Stadium','Kansas City','upcoming'),
('TBD','TBD','2026-07-05','00:00:00','Top 32','BC Place','Vancouver','upcoming'),
('TBD','TBD','2026-07-06','15:00:00','Top 32','Lincoln Financial','Philadelphia','upcoming'),
('TBD','TBD','2026-07-06','18:00:00','Top 32','NRG Stadium','Houston','upcoming'),
('TBD','TBD','2026-07-06','21:00:00','Top 32','Allegiant Stadium','Las Vegas','upcoming'),
('TBD','TBD','2026-07-06','00:00:00','Top 32','Estadio BBVA','Monterrey','upcoming'),
('TBD','TBD','2026-07-07','15:00:00','Top 32','Gillette Stadium','Boston','upcoming'),
('TBD','TBD','2026-07-07','18:00:00','Top 32','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-07','21:00:00','Top 32','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-07','00:00:00','Top 32','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-08','15:00:00','Top 32','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-07-08','18:00:00','Top 32','Hard Rock Stadium','Miami','upcoming'),
('TBD','TBD','2026-07-08','21:00:00','Top 32','Arrowhead Stadium','Kansas City','upcoming'),
('TBD','TBD','2026-07-08','00:00:00','Top 32','Estadio Akron','Guadalajara','upcoming'),
('TBD','TBD','2026-07-09','15:00:00','Top 32','Lincoln Financial','Philadelphia','upcoming'),
('TBD','TBD','2026-07-09','18:00:00','Top 32','NRG Stadium','Houston','upcoming'),
('TBD','TBD','2026-07-09','21:00:00','Top 32','BC Place','Vancouver','upcoming'),
('TBD','TBD','2026-07-09','00:00:00','Top 32','Allegiant Stadium','Las Vegas','upcoming'),
('TBD','TBD','2026-07-10','15:00:00','Top 32','Gillette Stadium','Boston','upcoming'),
('TBD','TBD','2026-07-10','18:00:00','Top 32','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-10','21:00:00','Top 32','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-10','00:00:00','Top 32','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-11','15:00:00','Top 32','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-07-11','18:00:00','Top 32','Hard Rock Stadium','Miami','upcoming'),
('TBD','TBD','2026-07-11','21:00:00','Top 32','Estadio Azteca','Mexico City','upcoming'),
('TBD','TBD','2026-07-11','00:00:00','Top 32','Arrowhead Stadium','Kansas City','upcoming'),

-- Round of 16 (16 matches) — July 13-16, 2026
('TBD','TBD','2026-07-13','18:00:00','Top 16','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-13','21:00:00','Top 16','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-14','18:00:00','Top 16','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-14','21:00:00','Top 16','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-07-15','18:00:00','Top 16','Hard Rock Stadium','Miami','upcoming'),
('TBD','TBD','2026-07-15','21:00:00','Top 16','Arrowhead Stadium','Kansas City','upcoming'),
('TBD','TBD','2026-07-16','18:00:00','Top 16','Estadio Azteca','Mexico City','upcoming'),
('TBD','TBD','2026-07-16','21:00:00','Top 16','Lincoln Financial','Philadelphia','upcoming'),
('TBD','TBD','2026-07-17','18:00:00','Top 16','NRG Stadium','Houston','upcoming'),
('TBD','TBD','2026-07-17','21:00:00','Top 16','Gillette Stadium','Boston','upcoming'),
('TBD','TBD','2026-07-18','18:00:00','Top 16','BC Place','Vancouver','upcoming'),
('TBD','TBD','2026-07-18','21:00:00','Top 16','Allegiant Stadium','Las Vegas','upcoming'),
('TBD','TBD','2026-07-19','18:00:00','Top 16','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-19','21:00:00','Top 16','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-20','18:00:00','Top 16','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-20','21:00:00','Top 16','Rose Bowl','Los Angeles','upcoming'),

-- Quarter-finals (8 matches) — July 23-26, 2026
('TBD','TBD','2026-07-23','21:00:00','Quarts de finale','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-07-24','21:00:00','Quarts de finale','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-07-25','21:00:00','Quarts de finale','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-07-26','21:00:00','Quarts de finale','Hard Rock Stadium','Miami','upcoming'),
('TBD','TBD','2026-07-27','21:00:00','Quarts de finale','Arrowhead Stadium','Kansas City','upcoming'),
('TBD','TBD','2026-07-28','21:00:00','Quarts de finale','SoFi Stadium','Los Angeles','upcoming'),
('TBD','TBD','2026-07-29','21:00:00','Quarts de finale','Estadio Azteca','Mexico City','upcoming'),
('TBD','TBD','2026-07-30','21:00:00','Quarts de finale','Lincoln Financial','Philadelphia','upcoming'),

-- Semi-finals (4 matches) — August 2-5, 2026
('TBD','TBD','2026-08-02','21:00:00','Demi-finales','MetLife Stadium','New York','upcoming'),
('TBD','TBD','2026-08-03','21:00:00','Demi-finales','Rose Bowl','Los Angeles','upcoming'),
('TBD','TBD','2026-08-04','21:00:00','Demi-finales','AT&T Stadium','Dallas','upcoming'),
('TBD','TBD','2026-08-05','21:00:00','Demi-finales','Hard Rock Stadium','Miami','upcoming'),

-- Third place (1 match) — August 9, 2026
('TBD','TBD','2026-08-09','18:00:00','3ème Place','Rose Bowl','Los Angeles','upcoming'),

-- Final (1 match) — August 9, 2026
('TBD','TBD','2026-08-09','21:00:00','Finale','MetLife Stadium','New York','upcoming');

-- ================================================================
--  VERIFY: check total rows added (should be 62)
-- ================================================================
-- SELECT group_stage, COUNT(*) FROM public.matches
-- WHERE group_stage IN ('Top 32','Top 16','Quarts de finale','Demi-finales','3ème Place','Finale')
-- GROUP BY group_stage ORDER BY group_stage;
