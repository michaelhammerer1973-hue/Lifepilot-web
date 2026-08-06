-- ============================================
-- SUPABASE RLS (Row-Level Security) Setup
-- LifePilot - KRITISCHER SICHERHEITS-FIX
-- Führe dieses Script im Supabase SQL Editor aus
-- ============================================

-- 1. Enable RLS auf trips Tabelle
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own trips"
  ON public.trips
  FOR SELECT
  USING (user_id = 'user-001');

CREATE POLICY "Users can insert their own trips"
  ON public.trips
  FOR INSERT
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can update their own trips"
  ON public.trips
  FOR UPDATE
  USING (user_id = 'user-001')
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can delete their own trips"
  ON public.trips
  FOR DELETE
  USING (user_id = 'user-001');

-- 2. Enable RLS auf days Tabelle
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own days"
  ON public.days
  FOR SELECT
  USING (user_id = 'user-001');

CREATE POLICY "Users can insert their own days"
  ON public.days
  FOR INSERT
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can update their own days"
  ON public.days
  FOR UPDATE
  USING (user_id = 'user-001')
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can delete their own days"
  ON public.days
  FOR DELETE
  USING (user_id = 'user-001');

-- 3. Enable RLS auf activities Tabelle
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own activities"
  ON public.activities
  FOR SELECT
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can insert their own activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can update their own activities"
  ON public.activities
  FOR UPDATE
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ))
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can delete their own activities"
  ON public.activities
  FOR DELETE
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

-- 4. Enable RLS auf accommodations Tabelle
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own accommodations"
  ON public.accommodations
  FOR SELECT
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can insert their own accommodations"
  ON public.accommodations
  FOR INSERT
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can update their own accommodations"
  ON public.accommodations
  FOR UPDATE
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ))
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

CREATE POLICY "Users can delete their own accommodations"
  ON public.accommodations
  FOR DELETE
  USING (day_id IN (
    SELECT id FROM public.days WHERE user_id = 'user-001'
  ));

-- 5. Enable RLS auf visited_countries Tabelle
ALTER TABLE public.visited_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own visited countries"
  ON public.visited_countries
  FOR SELECT
  USING (user_id = 'user-001');

CREATE POLICY "Users can insert their own visited countries"
  ON public.visited_countries
  FOR INSERT
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can update their own visited countries"
  ON public.visited_countries
  FOR UPDATE
  USING (user_id = 'user-001')
  WITH CHECK (user_id = 'user-001');

CREATE POLICY "Users can delete their own visited countries"
  ON public.visited_countries
  FOR DELETE
  USING (user_id = 'user-001');

-- ============================================
-- FERTIG! RLS ist jetzt aktiviert
-- ============================================
