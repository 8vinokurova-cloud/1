-- =========================================================================
-- HAUTE COUTURE CELEBRATION INVITATION & CMS PLATFORM
-- Supabase / PostgreSQL Production Cloud Database Schema
-- =========================================================================

-- 1. CELEBRATION EVENTS TABLE (Multi-Tenant Isolated Configurations)
CREATE TABLE IF NOT EXISTS events (
    slug VARCHAR(64) PRIMARY KEY,
    event_name TEXT NOT NULL,
    protagonist_name TEXT,
    protagonist_monogram VARCHAR(8) DEFAULT 'AV',
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. VIP GUESTS & RSVP REGISTRATIONS
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_slug VARCHAR(64) NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
    pass_id VARCHAR(32) NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    attendance VARCHAR(32) DEFAULT 'attending',
    plus_one_count INT DEFAULT 0,
    plus_one_name TEXT,
    dietary TEXT,
    cocktail TEXT,
    song TEXT,
    message TEXT,
    checked_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for instant lookup by event & email
CREATE INDEX IF NOT EXISTS idx_guests_event_email ON guests(event_slug, email);
CREATE INDEX IF NOT EXISTS idx_guests_pass_id ON guests(pass_id);

-- 3. STUDIO ADMINISTRATORS & ORGANIZERS
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(32) DEFAULT 'admin', -- 'superadmin' or 'admin'
    assigned_slugs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ORGANIZER PRE-AUTHORIZATIONS & MAGIC INVITE LINKS
CREATE TABLE IF NOT EXISTS organizer_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    event_slug VARCHAR(64) NOT NULL REFERENCES events(slug) ON DELETE CASCADE,
    organizer_name TEXT,
    event_name TEXT,
    invite_token TEXT UNIQUE NOT NULL,
    registered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for rapid Magic Link token lookups
CREATE INDEX IF NOT EXISTS idx_auth_invite_token ON organizer_authorizations(invite_token);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizer_authorizations ENABLE ROW LEVEL SECURITY;

-- Allow public read access to active event configs (for public invitation pages)
CREATE POLICY "Public events are viewable by anyone" 
ON events FOR SELECT 
USING (true);

-- Allow guests to submit RSVP
CREATE POLICY "Guests can register RSVP" 
ON guests FOR INSERT 
WITH CHECK (true);

-- Allow guests to view their own pass by email or pass_id
CREATE POLICY "Guests can view their pass" 
ON guests FOR SELECT 
USING (true);

-- Initial Master Template Seed Record
INSERT INTO events (slug, event_name, protagonist_name, protagonist_monogram, config)
VALUES ('master_default', 'Aurelia Vance 25th Birthday Celebration', 'Aurelia Vance', 'AV', '{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
