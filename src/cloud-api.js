/**
 * HAUTE COUTURE PLATFORM — CLOUD DATABASE ADAPTER
 * Connects directly to Supabase Cloud API when configured, with transparent local fallback.
 */

(function(window) {
  'use strict';

  // Read Supabase config from window or localStorage if configured
  const SUPABASE_URL = window.__SUPABASE_URL || localStorage.getItem('supabase_cloud_url') || '';
  const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY || localStorage.getItem('supabase_cloud_key') || '';

  const isCloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  async function supabaseQuery(endpoint, options = {}) {
    if (!isCloudEnabled) return null;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
        ...options,
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': options.prefer || 'return=representation',
          ...(options.headers || {})
        }
      });
      if (!res.ok) throw new Error(`Cloud DB HTTP ${res.status}: ${await res.text()}`);
      return await res.json();
    } catch (err) {
      console.warn('[CloudAPI] Request failed, falling back to local engine:', err.message);
      return null;
    }
  }

  window.cloudAPI = {
    isCloudActive: () => isCloudEnabled,

    async getEventConfig(slug) {
      if (!isCloudEnabled) return null;
      const data = await supabaseQuery(`events?slug=eq.${encodeURIComponent(slug)}&select=*`);
      return (data && data.length > 0) ? data[0].config : null;
    },

    async saveEventConfig(slug, config) {
      if (!isCloudEnabled) return false;
      const payload = {
        slug,
        event_name: config.eventName || 'Celebration',
        protagonist_name: config.protagonistName || '',
        protagonist_monogram: config.protagonistMonogram || 'AV',
        config,
        updated_at: new Date().toISOString()
      };
      const data = await supabaseQuery('events', {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=representation',
        body: JSON.stringify(payload)
      });
      return Boolean(data);
    },

    async getGuests(slug) {
      if (!isCloudEnabled) return null;
      const data = await supabaseQuery(`guests?event_slug=eq.${encodeURIComponent(slug)}&select=*&order=created_at.desc`);
      if (!data) return null;
      return data.map(g => ({
        id: g.id,
        passId: g.pass_id,
        name: g.name,
        email: g.email,
        attendance: g.attendance,
        plusOneCount: String(g.plus_one_count || 0),
        plusOneName: g.plus_one_name,
        dietary: g.dietary,
        cocktail: g.cocktail,
        song: g.song,
        message: g.message,
        checkedIn: g.checked_in,
        createdAt: g.created_at
      }));
    },

    async addGuest(slug, guest) {
      if (!isCloudEnabled) return null;
      const payload = {
        event_slug: slug,
        pass_id: guest.passId,
        name: guest.name,
        email: guest.email,
        attendance: guest.attendance || 'attending',
        plus_one_count: parseInt(guest.plusOneCount || '0', 10),
        plus_one_name: guest.plusOneName || '',
        dietary: guest.dietary || '',
        cocktail: guest.cocktail || '',
        song: guest.song || '',
        message: guest.message || '',
        checked_in: Boolean(guest.doorCheckIn || guest.checkedIn)
      };
      const data = await supabaseQuery('guests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      return data ? data[0] : null;
    }
  };

})(window);
