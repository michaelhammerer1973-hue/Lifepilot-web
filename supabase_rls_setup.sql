-- ============================================
-- SUPABASE RLS (Row-Level Security) Setup
-- LifePilot - User Isolation über Fremdschlüssel
-- ============================================

-- 1. RLS für trips (direkt user_id)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own trips"
  ON public.trips
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own trips"
  ON public.trips
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own trips"
  ON public.trips
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own trips"
  ON public.trips
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- 2. RLS für days (über trip_id → trips.user_id)
ALTER TABLE public.days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own days"
  ON public.days
  FOR SELECT
  USING (trip_id IN (
    SELECT id FROM public.trips WHERE user_id = auth.uid()::text
  ));

CREATE POLICY "Users can insert their own days"
  ON public.days
  FOR INSERT
  WITH CHECK (trip_id IN (
    SELECT id FROM public.trips WHERE user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update their own days"
  ON public.days
  FOR UPDATE
  USING (trip_id IN (
    SELECT id FROM public.trips WHERE user_id = auth.uid()::text
  ))
  WITH CHECK (trip_id IN (
    SELECT id FROM public.trips WHERE user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete their own days"
  ON public.days
  FOR DELETE
  USING (trip_id IN (
    SELECT id FROM public.trips WHERE user_id = auth.uid()::text
  ));

-- 3. RLS für activities (über day_id → days.trip_id → trips.user_id)
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own activities"
  ON public.activities
  FOR SELECT
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can insert their own activities"
  ON public.activities
  FOR INSERT
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can update their own activities"
  ON public.activities
  FOR UPDATE
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ))
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can delete their own activities"
  ON public.activities
  FOR DELETE
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

-- 4. RLS für accommodations (über day_id → days.trip_id → trips.user_id)
ALTER TABLE public.accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own accommodations"
  ON public.accommodations
  FOR SELECT
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can insert their own accommodations"
  ON public.accommodations
  FOR INSERT
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can update their own accommodations"
  ON public.accommodations
  FOR UPDATE
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ))
  WITH CHECK (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

CREATE POLICY "Users can delete their own accommodations"
  ON public.accommodations
  FOR DELETE
  USING (day_id IN (
    SELECT id FROM public.days WHERE trip_id IN (
      SELECT id FROM public.trips WHERE user_id = auth.uid()::text
    )
  ));

-- 5. RLS für visited_countries (direkt user_id)
ALTER TABLE public.visited_countries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own visited countries"
  ON public.visited_countries
  FOR SELECT
  USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert their own visited countries"
  ON public.visited_countries
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update their own visited countries"
  ON public.visited_countries
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete their own visited countries"
  ON public.visited_countries
  FOR DELETE
  USING (user_id = auth.uid()::text);

-- ============================================
-- FERTIG! RLS ist aktiviert mit:
-- - trips (user_id direkt)
-- - days (über trip_id)
-- - activities (über day_id → trip_id)
-- - accommodations (über day_id → trip_id)
-- - visited_countries (user_id direkt)
-- ============================================
