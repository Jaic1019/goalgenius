-- ============================================================
--  World Cup 2026 — Full Group Stage Schedule
--  Times converted to CET (Central European Time = ET + 6h)
--  Run in Supabase SQL Editor
-- ============================================================

-- First, delete the sample matches we added earlier
delete from public.matches;

-- Insert all 48 group stage matches
insert into public.matches (home_team, away_team, home_flag, away_flag, match_date, match_time, group_stage, status) values

-- June 11
('Mexico', 'South Africa', '🇲🇽', '🇿🇦', '2026-06-11', '21:00:00', 'Group A', 'upcoming'),
('South Korea', 'Czechia', '🇰🇷', '🇨🇿', '2026-06-12', '04:00:00', 'Group A', 'upcoming'),

-- June 12
('Canada', 'Bosnia and Herzegovina', '🇨🇦', '🇧🇦', '2026-06-12', '21:00:00', 'Group B', 'upcoming'),
('USA', 'Paraguay', '🇺🇸', '🇵🇾', '2026-06-13', '03:00:00', 'Group D', 'upcoming'),

-- June 13
('Qatar', 'Switzerland', '🇶🇦', '🇨🇭', '2026-06-13', '21:00:00', 'Group B', 'upcoming'),
('Brazil', 'Morocco', '🇧🇷', '🇲🇦', '2026-06-14', '00:00:00', 'Group C', 'upcoming'),
('Haiti', 'Scotland', '🇭🇹', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-14', '03:00:00', 'Group C', 'upcoming'),
('Australia', 'Türkiye', '🇦🇺', '🇹🇷', '2026-06-14', '06:00:00', 'Group D', 'upcoming'),

-- June 14
('Germany', 'Curaçao', '🇩🇪', '🇨🇼', '2026-06-14', '19:00:00', 'Group E', 'upcoming'),
('Netherlands', 'Japan', '🇳🇱', '🇯🇵', '2026-06-14', '22:00:00', 'Group F', 'upcoming'),
('Ivory Coast', 'Ecuador', '🇨🇮', '🇪🇨', '2026-06-15', '01:00:00', 'Group E', 'upcoming'),
('Tunisia', 'Sweden', '🇹🇳', '🇸🇪', '2026-06-15', '04:00:00', 'Group F', 'upcoming'),

-- June 15
('Spain', 'Cape Verde', '🇪🇸', '🇨🇻', '2026-06-15', '18:00:00', 'Group H', 'upcoming'),
('Belgium', 'Egypt', '🇧🇪', '🇪🇬', '2026-06-15', '21:00:00', 'Group G', 'upcoming'),
('Saudi Arabia', 'Uruguay', '🇸🇦', '🇺🇾', '2026-06-16', '00:00:00', 'Group H', 'upcoming'),
('Iran', 'New Zealand', '🇮🇷', '🇳🇿', '2026-06-16', '03:00:00', 'Group G', 'upcoming'),

-- June 16
('France', 'Senegal', '🇫🇷', '🇸🇳', '2026-06-16', '21:00:00', 'Group I', 'upcoming'),
('Iraq', 'Norway', '🇮🇶', '🇳🇴', '2026-06-17', '00:00:00', 'Group I', 'upcoming'),
('Argentina', 'Algeria', '🇦🇷', '🇩🇿', '2026-06-17', '03:00:00', 'Group J', 'upcoming'),
('Austria', 'Jordan', '🇦🇹', '🇯🇴', '2026-06-17', '06:00:00', 'Group J', 'upcoming'),

-- June 17
('Portugal', 'Congo DR', '🇵🇹', '🇨🇩', '2026-06-17', '19:00:00', 'Group K', 'upcoming'),
('England', 'Croatia', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇭🇷', '2026-06-17', '22:00:00', 'Group L', 'upcoming'),
('Ghana', 'Panama', '🇬🇭', '🇵🇦', '2026-06-18', '01:00:00', 'Group L', 'upcoming'),
('Uzbekistan', 'Colombia', '🇺🇿', '🇨🇴', '2026-06-18', '04:00:00', 'Group K', 'upcoming'),

-- June 18
('Czechia', 'South Africa', '🇨🇿', '🇿🇦', '2026-06-18', '18:00:00', 'Group A', 'upcoming'),
('Mexico', 'South Korea', '🇲🇽', '🇰🇷', '2026-06-18', '21:00:00', 'Group A', 'upcoming'),
('Switzerland', 'Bosnia and Herzegovina', '🇨🇭', '🇧🇦', '2026-06-19', '00:00:00', 'Group B', 'upcoming'),
('Canada', 'Qatar', '🇨🇦', '🇶🇦', '2026-06-19', '03:00:00', 'Group B', 'upcoming'),

-- June 19
('Morocco', 'Haiti', '🇲🇦', '🇭🇹', '2026-06-19', '19:00:00', 'Group C', 'upcoming'),
('Scotland', 'Brazil', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🇧🇷', '2026-06-19', '22:00:00', 'Group C', 'upcoming'),
('Türkiye', 'Paraguay', '🇹🇷', '🇵🇾', '2026-06-20', '01:00:00', 'Group D', 'upcoming'),
('Australia', 'USA', '🇦🇺', '🇺🇸', '2026-06-20', '04:00:00', 'Group D', 'upcoming'),

-- June 20
('Ecuador', 'Germany', '🇪🇨', '🇩🇪', '2026-06-20', '19:00:00', 'Group E', 'upcoming'),
('Ivory Coast', 'Curaçao', '🇨🇮', '🇨🇼', '2026-06-20', '22:00:00', 'Group E', 'upcoming'),
('Japan', 'Tunisia', '🇯🇵', '🇹🇳', '2026-06-21', '01:00:00', 'Group F', 'upcoming'),
('Sweden', 'Netherlands', '🇸🇪', '🇳🇱', '2026-06-21', '04:00:00', 'Group F', 'upcoming'),

-- June 21
('Egypt', 'Iran', '🇪🇬', '🇮🇷', '2026-06-21', '18:00:00', 'Group G', 'upcoming'),
('New Zealand', 'Belgium', '🇳🇿', '🇧🇪', '2026-06-21', '21:00:00', 'Group G', 'upcoming'),
('Cape Verde', 'Saudi Arabia', '🇨🇻', '🇸🇦', '2026-06-22', '00:00:00', 'Group H', 'upcoming'),
('Uruguay', 'Spain', '🇺🇾', '🇪🇸', '2026-06-22', '03:00:00', 'Group H', 'upcoming'),

-- June 22
('Norway', 'France', '🇳🇴', '🇫🇷', '2026-06-22', '21:00:00', 'Group I', 'upcoming'),
('Senegal', 'Iraq', '🇸🇳', '🇮🇶', '2026-06-23', '00:00:00', 'Group I', 'upcoming'),
('Jordan', 'Argentina', '🇯🇴', '🇦🇷', '2026-06-23', '03:00:00', 'Group J', 'upcoming'),
('Algeria', 'Austria', '🇩🇿', '🇦🇹', '2026-06-23', '06:00:00', 'Group J', 'upcoming'),

-- June 23
('Colombia', 'Portugal', '🇨🇴', '🇵🇹', '2026-06-23', '19:00:00', 'Group K', 'upcoming'),
('Congo DR', 'Uzbekistan', '🇨🇩', '🇺🇿', '2026-06-23', '22:00:00', 'Group K', 'upcoming'),
('Croatia', 'Ghana', '🇭🇷', '🇬🇭', '2026-06-24', '01:00:00', 'Group L', 'upcoming'),
('Panama', 'England', '🇵🇦', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '2026-06-24', '04:00:00', 'Group L', 'upcoming'),

-- June 24 (final group stage matchday 3 - simultaneous)
('South Africa', 'South Korea', '🇿🇦', '🇰🇷', '2026-06-25', '00:00:00', 'Group A', 'upcoming'),
('Mexico', 'Czechia', '🇲🇽', '🇨🇿', '2026-06-25', '00:00:00', 'Group A', 'upcoming'),

-- June 25
('Bosnia and Herzegovina', 'Canada', '🇧🇦', '🇨🇦', '2026-06-26', '00:00:00', 'Group B', 'upcoming'),
('Qatar', 'Switzerland', '🇶🇦', '🇨🇭', '2026-06-26', '00:00:00', 'Group B', 'upcoming'),

('Brazil', 'Haiti', '🇧🇷', '🇭🇹', '2026-06-26', '21:00:00', 'Group C', 'upcoming'),
('Morocco', 'Scotland', '🇲🇦', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '2026-06-26', '21:00:00', 'Group C', 'upcoming'),

('USA', 'Türkiye', '🇺🇸', '🇹🇷', '2026-06-27', '00:00:00', 'Group D', 'upcoming'),
('Paraguay', 'Australia', '🇵🇾', '🇦🇺', '2026-06-27', '00:00:00', 'Group D', 'upcoming'),

('Germany', 'Ivory Coast', '🇩🇪', '🇨🇮', '2026-06-27', '21:00:00', 'Group E', 'upcoming'),
('Ecuador', 'Curaçao', '🇪🇨', '🇨🇼', '2026-06-27', '21:00:00', 'Group E', 'upcoming'),

('Netherlands', 'Tunisia', '🇳🇱', '🇹🇳', '2026-06-28', '00:00:00', 'Group F', 'upcoming'),
('Japan', 'Sweden', '🇯🇵', '🇸🇪', '2026-06-28', '00:00:00', 'Group F', 'upcoming'),

('Belgium', 'Iran', '🇧🇪', '🇮🇷', '2026-06-28', '21:00:00', 'Group G', 'upcoming'),
('Egypt', 'New Zealand', '🇪🇬', '🇳🇿', '2026-06-28', '21:00:00', 'Group G', 'upcoming'),

('Spain', 'Saudi Arabia', '🇪🇸', '🇸🇦', '2026-06-29', '00:00:00', 'Group H', 'upcoming'),
('Uruguay', 'Cape Verde', '🇺🇾', '🇨🇻', '2026-06-29', '00:00:00', 'Group H', 'upcoming'),

('France', 'Iraq', '🇫🇷', '🇮🇶', '2026-06-29', '21:00:00', 'Group I', 'upcoming'),
('Senegal', 'Norway', '🇸🇳', '🇳🇴', '2026-06-29', '21:00:00', 'Group I', 'upcoming'),

('Argentina', 'Austria', '🇦🇷', '🇦🇹', '2026-06-30', '00:00:00', 'Group J', 'upcoming'),
('Algeria', 'Jordan', '🇩🇿', '🇯🇴', '2026-06-30', '00:00:00', 'Group J', 'upcoming'),

('Portugal', 'Uzbekistan', '🇵🇹', '🇺🇿', '2026-06-30', '21:00:00', 'Group K', 'upcoming'),
('Colombia', 'Congo DR', '🇨🇴', '🇨🇩', '2026-06-30', '21:00:00', 'Group K', 'upcoming'),

('England', 'Ghana', '🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇬🇭', '2026-07-01', '00:00:00', 'Group L', 'upcoming'),
('Croatia', 'Panama', '🇭🇷', '🇵🇦', '2026-07-01', '00:00:00', 'Group L', 'upcoming');
