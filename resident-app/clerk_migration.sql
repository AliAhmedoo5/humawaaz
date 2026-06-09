-- 1. Drop all RLS policies that depend on the UUID columns
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their UC or themselves" ON profiles;

DROP POLICY IF EXISTS "Verified users can create complaints" ON complaints;
DROP POLICY IF EXISTS "Officials can update complaints in their UC" ON complaints;

DROP POLICY IF EXISTS "Officials can insert complaint updates" ON complaint_updates;

DROP POLICY IF EXISTS "Verified users can upvote complaints in their UC" ON complaint_upvotes;
DROP POLICY IF EXISTS "Users can view own upvotes" ON complaint_upvotes;
DROP POLICY IF EXISTS "Users can remove own upvote" ON complaint_upvotes;

DROP POLICY IF EXISTS "Officials can create announcements" ON announcements;
DROP POLICY IF EXISTS "Officials can delete own announcements" ON announcements;


-- 2. Drop Foreign Keys
ALTER TABLE complaint_updates DROP CONSTRAINT IF EXISTS complaint_updates_user_id_fkey;
ALTER TABLE complaint_upvotes DROP CONSTRAINT IF EXISTS complaint_upvotes_user_id_fkey;
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_user_id_fkey;
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Alter Column Types from UUID to TEXT
ALTER TABLE profiles ALTER COLUMN id TYPE text;
ALTER TABLE complaints ALTER COLUMN user_id TYPE text;
ALTER TABLE complaint_updates ALTER COLUMN user_id TYPE text;
ALTER TABLE complaint_upvotes ALTER COLUMN user_id TYPE text;
ALTER TABLE announcements ALTER COLUMN user_id TYPE text;

-- 4. Re-add Foreign Keys
ALTER TABLE complaints ADD CONSTRAINT complaints_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE complaint_updates ADD CONSTRAINT complaint_updates_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE complaint_upvotes ADD CONSTRAINT complaint_upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE announcements ADD CONSTRAINT announcements_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 5. Drop old Supabase Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 6. Helper function to extract Clerk ID from Supabase JWT
CREATE OR REPLACE FUNCTION auth.clerk_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::text;
$$ LANGUAGE SQL STABLE;

-- 7. Recreate RLS Policies using auth.clerk_id() instead of auth.uid()

CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.clerk_id()) WITH CHECK (id = auth.clerk_id());
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.clerk_id());
CREATE POLICY "Users can view profiles in their UC or themselves" ON profiles FOR SELECT USING (id = auth.clerk_id() OR uc_id = get_auth_uc_id());

CREATE POLICY "Verified users can create complaints" ON complaints FOR INSERT WITH CHECK (
  auth.clerk_id() = user_id AND (SELECT is_verified FROM profiles WHERE id = auth.clerk_id()) = true
);
CREATE POLICY "Officials can update complaints in their UC" ON complaints FOR UPDATE USING (
  uc_id = (SELECT uc_id FROM profiles WHERE id = auth.clerk_id()) AND 
  (SELECT role FROM profiles WHERE id = auth.clerk_id()) = 'official'
);

CREATE POLICY "Officials can insert complaint updates" ON complaint_updates FOR INSERT WITH CHECK (
  auth.clerk_id() = user_id AND (SELECT role FROM profiles WHERE id = auth.clerk_id()) = 'official'
);

CREATE POLICY "Verified users can upvote complaints in their UC" ON complaint_upvotes FOR INSERT WITH CHECK (
  auth.clerk_id() = user_id AND 
  (SELECT is_verified FROM profiles WHERE id = auth.clerk_id()) = true AND 
  complaint_id IN (SELECT id FROM complaints WHERE uc_id = (SELECT uc_id FROM profiles WHERE id = auth.clerk_id()))
);
CREATE POLICY "Users can view own upvotes" ON complaint_upvotes FOR SELECT USING (user_id = auth.clerk_id());
CREATE POLICY "Users can remove own upvote" ON complaint_upvotes FOR DELETE USING (user_id = auth.clerk_id());

CREATE POLICY "Officials can create announcements" ON announcements FOR INSERT WITH CHECK (
  auth.clerk_id() = user_id AND (SELECT role FROM profiles WHERE id = auth.clerk_id()) = 'official'
);
CREATE POLICY "Officials can delete own announcements" ON announcements FOR DELETE USING (
  user_id = auth.clerk_id() AND (SELECT role FROM profiles WHERE id = auth.clerk_id()) = 'official'
);
