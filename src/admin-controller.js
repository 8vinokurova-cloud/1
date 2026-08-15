// ==========================================================================
// CHAPTER 25 • EXACT 1:1 VISUAL STUDIO CONTROLLER WITH [✖] BLOCK HIDING
// Hydrates and saves ALL section titles, subtitles, calendar datepicker with live countdown
// ==========================================================================

const cmsStorage = window.cmsStorage || (window.CMSStorageEngine ? new window.CMSStorageEngine() : null);

const adminUrlParams = new URLSearchParams(window.location.search);
let currentSession = null;
let activeEventSlug = adminUrlParams.get('event') || localStorage.getItem('cms_last_active_slug') || 'master_default';
let activeConfig = null;
let testAudioInstance = null;
let isSwitchingEvents = false;
let autoSaveTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdminAuthFlow();
  bindAdminEvents();
});

/* ==========================================================================
   1. AUTHENTICATION & MULTI-TENANT SESSION HANDLING
   ========================================================================== */
window.switchAuthTab = function(tab) {
  const tabLogin = document.getElementById('tab-auth-login');
  const tabActivate = document.getElementById('tab-auth-activate');
  const formLogin = document.getElementById('admin-login-form');
  const containerActivate = document.getElementById('admin-activate-container');

  if (tab === 'activate') {
    tabActivate?.classList.add('active');
    tabLogin?.classList.remove('active');
    if (formLogin) formLogin.style.display = 'none';
    if (containerActivate) containerActivate.style.display = 'block';
  } else {
    tabLogin?.classList.add('active');
    tabActivate?.classList.remove('active');
    if (formLogin) formLogin.style.display = 'flex';
    if (containerActivate) containerActivate.style.display = 'none';
  }
};

function initAdminAuthFlow() {
  currentSession = cmsStorage ? cmsStorage.getCurrentSession() : null;

  const authOverlay = document.getElementById('auth-modal-overlay');
  const loginForm = document.getElementById('admin-login-form');
  const loginError = document.getElementById('login-error-msg');
  const magicContainer = document.getElementById('magic-invite-container');
  const magicForm = document.getElementById('magic-invite-form');
  const magicError = document.getElementById('magic-invite-error');

  // Check if opening via Magic Invite Link (?invite=TOKEN)
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('invite');

  if (inviteToken && cmsStorage) {
    const authRecord = cmsStorage.findOrganizerAuthorizationByInviteToken(inviteToken);
    if (authRecord) {
      if (loginForm) loginForm.style.display = 'none';
      if (magicContainer) {
        magicContainer.style.display = 'block';
        const evTitle = document.getElementById('magic-event-title');
        const admEmail = document.getElementById('magic-admin-email');
        const admName = document.getElementById('magic-admin-name');
        if (evTitle) evTitle.textContent = authRecord.eventName || authRecord.slug;
        if (admEmail) admEmail.value = authRecord.email;
        if (admName) admName.value = authRecord.organizerName || '';
      }
      if (authOverlay) authOverlay.classList.add('active');

      magicForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = getVal('magic-admin-name').trim();
        const password = getVal('magic-admin-password').trim();

        try {
          const newAdmin = cmsStorage.activateAdminWithPassword({
            token: inviteToken,
            name,
            password
          });

          if (authOverlay) authOverlay.classList.remove('active');
          window.history.replaceState({}, document.title, window.location.pathname);

          currentSession = newAdmin;
          activeEventSlug = newAdmin.assignedSlugs[0] || 'master_default';
          loadAdminPortal();
          window.showAdminToast(`👑 Welcome to your Visual Studio, ${newAdmin.name}!`);
        } catch (err) {
          if (magicError) {
            magicError.style.display = 'block';
            magicError.textContent = err.message || 'Invalid or expired Magic Link.';
          }
        }
      });
      return;
    }
  }

  // Prefill saved credentials if "Remember Me" was previously enabled
  try {
    const savedCreds = localStorage.getItem('cms_saved_creds');
    if (savedCreds) {
      const parsed = JSON.parse(savedCreds);
      const inEmail = document.getElementById('login-email');
      const inPass = document.getElementById('login-password');
      const inRem = document.getElementById('login-remember-me');
      if (inEmail && parsed.email) inEmail.value = parsed.email;
      if (inPass && parsed.password) inPass.value = parsed.password;
      if (inRem) inRem.checked = true;
    }
  } catch (e) {}

  // Direct Login (Super Admin or Registered Sub-Admins)
  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = getVal('login-email');
    const password = getVal('login-password');
    const rememberMe = document.getElementById('login-remember-me')?.checked;

    try {
      currentSession = cmsStorage.login(email, password);

      if (rememberMe) {
        localStorage.setItem('cms_saved_creds', JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem('cms_saved_creds');
      }

      if (authOverlay) authOverlay.classList.remove('active');
      loadAdminPortal();
    } catch (err) {
      if (loginError) {
        loginError.style.display = 'block';
        loginError.textContent = err.message || 'Invalid email or password.';
      }
    }
  });

  // Create New Site Form (Super Admin)
  const createSiteForm = document.getElementById('create-site-form');
  createSiteForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const eventName = getVal('new-site-event-name').trim();
    const protagonistName = getVal('new-site-proto-name').trim();
    const slug = getVal('new-site-slug').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const organizerEmail = getVal('new-site-organizer-email').trim().toLowerCase();
    const organizerPassword = getVal('new-site-organizer-password').trim() || 'VIP2026!';

    try {
      const created = cmsStorage.createEventWithOrganizer({
        slug,
        eventName,
        organizerEmail,
        protagonistName,
        organizerName: protagonistName,
        organizerPassword
      });

      const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
      const magicUrl = `${window.location.origin}${window.location.pathname}?invite=${created.inviteToken}`;
      const publicUrl = `${baseUrl}/index.html?event=${slug}`;

      const magicBox = document.getElementById('created-magic-link-box');
      const createForm = document.getElementById('create-site-form');
      const introP = document.getElementById('new-site-intro-p');
      const dispEmail = document.getElementById('disp-created-email');
      const dispPass = document.getElementById('disp-created-pass');
      const dispMagicLink = document.getElementById('disp-created-magic-link');
      const dispPublicLink = document.getElementById('disp-created-public-link');
      const copyCardBtn = document.getElementById('btn-copy-full-access-card');

      if (magicBox) {
        if (createForm) createForm.style.display = 'none';
        if (introP) introP.style.display = 'none';
        magicBox.style.display = 'block';
        if (dispEmail) dispEmail.textContent = organizerEmail;
        if (dispPass) dispPass.textContent = organizerPassword;
        if (dispMagicLink) dispMagicLink.value = magicUrl;
        if (dispPublicLink) dispPublicLink.value = publicUrl;

        if (copyCardBtn) {
          copyCardBtn.onclick = () => {
            const msg = `✨ VIP Studio Access for "${eventName}":\n\n` +
              `👑 Studio Login: ${window.location.origin}${window.location.pathname}\n` +
              `✉️ Email: ${organizerEmail}\n` +
              `🔑 Password: ${organizerPassword}\n\n` +
              `🔗 1-Click Magic Link (No password required):\n${magicUrl}\n\n` +
              `🌐 Public Guest Invitation Link:\n${publicUrl}`;
            navigator.clipboard.writeText(msg);
            window.showAdminToast('📋 Access credentials message copied to clipboard!');
          };
        }
      }

      activeEventSlug = slug;
      loadAdminPortal();

      // Sync new event to server for cross-device availability
      try {
        fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug,
            eventName,
            protagonistName,
            organizerEmail,
            organizerPassword
          })
        }).catch(() => {});
      } catch (ePost) {}

      // Broadcast to other open admin tabs
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('cms_live_sync');
          bc.postMessage({ type: 'new_site_created', slug });
        }
      } catch (eBc) {}

      window.showAdminToast(`✨ Created site "${slug}"! Copy access credentials below.`);
    } catch (err) {
      alert(err.message || 'Error creating new site.');
    }
  });

  // Top Bar: Open Organizer Access Modal for Super Admin
  document.getElementById('btn-open-organizer-access-modal')?.addEventListener('click', () => {
    window.openOrganizerAccessModal();
  });

  // Organizer Access Modal Controls
  document.getElementById('btn-save-new-organizer-pass')?.addEventListener('click', () => {
    const newPass = document.getElementById('access-modal-password')?.value.trim();
    if (!newPass) return alert('Please enter a new password.');
    try {
      cmsStorage.resetAdminPassword(activeEventSlug, newPass);
      window.showAdminToast(`🔑 New password saved successfully!`);
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('btn-copy-access-magic-link')?.addEventListener('click', () => {
    const link = document.getElementById('access-modal-magic-link')?.value;
    if (link) {
      navigator.clipboard.writeText(link);
      window.showAdminToast('📋 Magic Link copied to clipboard!');
    }
  });

  document.getElementById('btn-copy-access-public-link')?.addEventListener('click', () => {
    const link = document.getElementById('access-modal-public-link')?.value;
    if (link) {
      navigator.clipboard.writeText(link);
      window.showAdminToast('📋 Public guest link copied to clipboard!');
    }
  });

  document.getElementById('btn-copy-modal-access-card')?.addEventListener('click', () => {
    const email = document.getElementById('access-modal-email')?.value;
    const pass = document.getElementById('access-modal-password')?.value;
    const magicLink = document.getElementById('access-modal-magic-link')?.value;
    const publicLink = document.getElementById('access-modal-public-link')?.value;

    const msg = `✨ VIP Studio Access for (${activeEventSlug}):\n\n` +
      `👑 Studio Login: ${window.location.origin}${window.location.pathname}\n` +
      `✉️ Email: ${email}\n` +
      `🔑 Password: ${pass}\n\n` +
      `🔗 1-Click Magic Link (No password required):\n${magicLink}\n\n` +
      `🌐 Public Guest Invitation Link:\n${publicLink}`;

    navigator.clipboard.writeText(msg);
    window.showAdminToast('📋 Access credentials message copied to clipboard!');
  });

  // Ensure mobile drawer tabs auto-close drawer smoothly
  document.querySelectorAll('.studio-tab-btn, #btn-open-live-site').forEach(el => {
    el.addEventListener('click', () => {
      if (window.innerWidth <= 1280 && window.toggleStudioNavDrawer) {
        setTimeout(() => window.toggleStudioNavDrawer(null, false), 150);
      }
    });
  });

  // Global Real-Time Auto-Save and Master Sync on any input
  document.addEventListener('input', (e) => {
    if (e.target && (e.target.classList.contains('edit-in-place') || e.target.closest('.studio-tab-panel'))) {
      window.triggerLiveAutoSave();
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target && (e.target.classList.contains('edit-in-place') || e.target.closest('.studio-tab-panel'))) {
      window.triggerLiveAutoSave();
    }
  });

  // Ensure immediate synchronous save when mobile keyboard closes or input loses focus
  document.addEventListener('focusout', (e) => {
    if (e.target && (e.target.classList.contains('edit-in-place') || e.target.closest('.studio-tab-panel'))) {
      window.saveCurrentConfigQuietly();
    }
  });

  // Real-time broadcast sync across admin windows
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cms_live_sync');
      bc.onmessage = (msg) => {
        if (msg && msg.data) {
          if (msg.data.type === 'new_site_created' || msg.data.type === 'site_deleted') {
            if (msg.data.type === 'site_deleted' && activeEventSlug === msg.data.slug) {
              activeEventSlug = 'master_default';
              localStorage.setItem('cms_last_active_slug', 'master_default');
            }
            if (currentSession && currentSession.role === 'superadmin') {
              loadAdminPortal();
            }
          }
        }
      };
    }
  } catch (eBc) {}

  if (!currentSession) {
    if (authOverlay) authOverlay.classList.add('active');
  } else {
    loadAdminPortal();
  }

  // Cross-device sync on focus / tab activation
  const syncAdminOnFocus = async () => {
    if (currentSession && currentSession.role === 'superadmin') {
      try {
        if (cmsStorage && typeof cmsStorage.syncAllEventsFromServer === 'function') {
          await cmsStorage.syncAllEventsFromServer();
          loadAdminPortal();
        }
      } catch (e) {}
    } else if (currentSession && activeEventSlug) {
      try {
        if (cmsStorage && typeof cmsStorage.syncWithServer === 'function') {
          const updated = await cmsStorage.syncWithServer(activeEventSlug);
          if (updated) hydrateCurrentEvent();
        }
      } catch (e) {}
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncAdminOnFocus();
  });
  window.addEventListener('focus', syncAdminOnFocus);
}

window.openCreateSiteModal = function() {
  if (window.innerWidth <= 1280 && window.toggleStudioNavDrawer) {
    window.toggleStudioNavDrawer(null, false);
  }
  const modal = document.getElementById('modal-create-site');
  const createForm = document.getElementById('create-site-form');
  const introP = document.getElementById('new-site-intro-p');
  const magicBox = document.getElementById('created-magic-link-box');

  if (createForm) {
    createForm.reset();
    createForm.style.display = 'flex';
  }
  if (introP) introP.style.display = 'block';
  if (magicBox) magicBox.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.visibility = 'visible';
    modal.style.pointerEvents = 'auto';
  }
};

window.closeCreateSiteModal = function() {
  const modal = document.getElementById('modal-create-site');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
  }
};

window.openOrganizerAccessModal = function() {
  if (window.innerWidth <= 1280 && window.toggleStudioNavDrawer) {
    window.toggleStudioNavDrawer(null, false);
  }
  const modal = document.getElementById('modal-organizer-access');
  if (!modal || !cmsStorage) return;

  const info = cmsStorage.getEventOrganizerAccess(activeEventSlug);
  const baseUrl = window.location.origin + window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/'));
  const magicUrl = `${window.location.origin}${window.location.pathname}?invite=${info?.inviteToken || activeEventSlug}`;
  const publicUrl = `${baseUrl}/index.html?event=${activeEventSlug}`;

  const evTitle = document.getElementById('access-modal-event-name');
  const evEmail = document.getElementById('access-modal-email');
  const evPass = document.getElementById('access-modal-password');
  const evMagic = document.getElementById('access-modal-magic-link');
  const evPub = document.getElementById('access-modal-public-link');

  if (evTitle) evTitle.textContent = `${info?.eventName || activeEventSlug} (${activeEventSlug})`;
  if (evEmail) evEmail.value = info?.email || '';
  if (evPass) evPass.value = info?.password || 'VIP2026!';
  if (evMagic) evMagic.value = magicUrl;
  if (evPub) evPub.value = publicUrl;

  modal.classList.add('active');
  modal.style.display = 'flex';
  modal.style.opacity = '1';
  modal.style.visibility = 'visible';
  modal.style.pointerEvents = 'auto';
};

window.closeOrganizerAccessModal = function() {
  const modal = document.getElementById('modal-organizer-access');
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none';
    modal.style.opacity = '0';
    modal.style.visibility = 'hidden';
    modal.style.pointerEvents = 'none';
  }
};

window.adminLogout = function() {
  if (window.innerWidth <= 1280 && window.toggleStudioNavDrawer) {
    window.toggleStudioNavDrawer(null, false);
  }
  if (confirm('Are you sure you want to sign out of the Admin Studio?')) {
    if (cmsStorage) cmsStorage.logout();
    currentSession = null;
    const authOverlay = document.getElementById('auth-modal-overlay');
    if (authOverlay) {
      authOverlay.classList.add('active');
      authOverlay.style.display = 'flex';
      authOverlay.style.opacity = '1';
      authOverlay.style.visibility = 'visible';
    }
    window.showAdminToast('👋 Successfully signed out.');
  }
};

/* ==========================================================================
   2. LOAD & HYDRATE CURRENT EVENT
   ========================================================================== */
function loadAdminPortal() {
  if (!currentSession) {
    currentSession = cmsStorage ? cmsStorage.getCurrentSession() : null;
  }
  if (!currentSession) {
    const authOverlay = document.getElementById('auth-modal-overlay');
    if (authOverlay) authOverlay.classList.add('active');
    return;
  }

  const isSuperAdmin = currentSession.role === 'superadmin';
  const roleBadge = document.getElementById('current-user-role-badge');
  const eventSelector = document.getElementById('active-event-selector');
  const btnNewSite = document.getElementById('btn-open-create-site-modal');

  if (roleBadge) {
    roleBadge.textContent = isSuperAdmin
      ? `👑 Super Admin (${currentSession.email})`
      : `👤 Event Organizer (${currentSession.email})`;
  }

  if (btnNewSite) {
    btnNewSite.style.display = isSuperAdmin ? 'inline-flex' : 'none';
  }

  const btnDeleteSite = document.getElementById('btn-delete-active-site');
  if (btnDeleteSite) {
    btnDeleteSite.style.display = (isSuperAdmin && activeEventSlug !== 'master_default') ? 'inline-flex' : 'none';
  }

  if (eventSelector) {
    eventSelector.innerHTML = '';
    if (isSuperAdmin) {
      // Super Admin sees and can switch to ALL celebration sites
      const allSlugs = cmsStorage.getAllEventSlugs();
      const uniqueSlugs = Array.from(new Set(['master_default', ...allSlugs]));
      
      if (!activeEventSlug || !uniqueSlugs.includes(activeEventSlug)) {
        activeEventSlug = adminUrlParams.get('event') || localStorage.getItem('cms_last_active_slug') || 'master_default';
      }

      uniqueSlugs.forEach(slug => {
        const opt = document.createElement('option');
        opt.value = slug;
        if (slug === 'master_default') {
          opt.textContent = '★ Master Default Template (Super Base)';
        } else {
          const cfg = cmsStorage.getEventConfig(slug);
          const nameDisp = (cfg && cfg.eventName) ? cfg.eventName : slug;
          opt.textContent = `🎉 ${nameDisp} (${slug})`;
        }
        if (slug === activeEventSlug) opt.selected = true;
        eventSelector.appendChild(opt);
      });
      eventSelector.value = activeEventSlug;
      eventSelector.disabled = false;

      // Background server sync to discover any new sites created on other devices
      if (cmsStorage && typeof cmsStorage.syncAllEventsFromServer === 'function') {
        cmsStorage.syncAllEventsFromServer().then(allSlugs => {
          if (Array.isArray(allSlugs)) {
            const currentOptions = Array.from(eventSelector.options).map(o => o.value);
            let hasNew = false;
            allSlugs.forEach(slug => {
              if (!currentOptions.includes(slug)) {
                hasNew = true;
                const opt = document.createElement('option');
                opt.value = slug;
                const cfg = cmsStorage.getEventConfig(slug);
                const nameDisp = (cfg && cfg.eventName) ? cfg.eventName : slug;
                opt.textContent = `🎉 ${nameDisp} (${slug})`;
                eventSelector.appendChild(opt);
              }
            });
            if (hasNew) eventSelector.value = activeEventSlug;
          }
        }).catch(() => {});
      }
    } else {
      // Regular Sub-Admin sees ONLY their assigned celebration site
      const assigned = (currentSession.assignedSlugs && currentSession.assignedSlugs[0]) ? currentSession.assignedSlugs[0] : 'victoria-25';
      const opt = document.createElement('option');
      opt.value = assigned;
      opt.textContent = `My Website: ${assigned} (${currentSession.name})`;
      eventSelector.appendChild(opt);
      activeEventSlug = assigned;
      eventSelector.disabled = true;
    }

    eventSelector.onchange = (e) => {
      clearTimeout(autoSaveTimer);
      isSwitchingEvents = true;
      activeEventSlug = e.target.value;
      localStorage.setItem('cms_last_active_slug', activeEventSlug);
      hydrateCurrentEvent();
      isSwitchingEvents = false;
      window.showAdminToast(`✨ Loaded: ${activeEventSlug === 'master_default' ? '★ Master Default Template' : activeEventSlug}`);
      if (window.innerWidth <= 1280 && window.toggleStudioNavDrawer) {
        setTimeout(() => window.toggleStudioNavDrawer(null, false), 200);
      }
    };
  }

  hydrateCurrentEvent();
}

function hydrateCurrentEvent() {
  if (!cmsStorage) return;
  activeConfig = cmsStorage.getEventConfig(activeEventSlug);

  // Update public URL banner
  const targetHref = activeEventSlug === 'master_default' ? 'index.html' : `index.html?event=${activeEventSlug}`;
  const openLiveBtn = document.getElementById('btn-open-live-site');
  if (openLiveBtn) openLiveBtn.href = targetHref;
  const mobileQuickBtn = document.getElementById('mobile-quick-view-live');
  if (mobileQuickBtn) mobileQuickBtn.href = targetHref;

  const btnDeleteSite = document.getElementById('btn-delete-active-site');
  if (btnDeleteSite) {
    const isSuperAdmin = currentSession && currentSession.role === 'superadmin';
    btnDeleteSite.style.display = (isSuperAdmin && activeEventSlug !== 'master_default') ? 'inline-flex' : 'none';
  }

  // 0. Top Navbar & Brand Header
  setVal('cms-nav-brand-title', activeConfig.navBrandTitle || activeConfig.protagonistName || (activeEventSlug === 'master_default' ? 'AURELIA VANCE' : 'VICTORIA STERLING'));
  setVal('cms-nav-brand-sub', (activeConfig.navBrandSub !== undefined && activeConfig.navBrandSub !== null) ? activeConfig.navBrandSub : (activeConfig.milestoneSubtitle || activeConfig.eventName || 'CHAPTER 25 • GALA'));
  setTxt('nav-preview-mono', activeConfig.protagonistMonogram || 'AV');
  setVal('cms-nav-link-about', activeConfig.navLinkAbout || 'The Soirée');
  setVal('cms-nav-link-vippass', activeConfig.navLinkVipPass || 'VIP Pass');
  setVal('cms-nav-link-itinerary', activeConfig.navLinkItinerary || 'Itinerary');
  setVal('cms-nav-link-dresscode', activeConfig.navLinkDressCode || 'Dress Code');
  setVal('cms-nav-link-venue', activeConfig.navLinkVenue || 'Venue');
  setVal('cms-nav-link-toastwall', activeConfig.navLinkToastWall || 'Toast Wall');
  setVal('cms-nav-audio-label', activeConfig.navAudioLabel || 'Lounge Music');
  setVal('cms-nav-rsvp-btn', activeConfig.navLinkRsvpBtn || 'VIP RSVP');

  // 1. Hero
  setVal('cms-hero-badge-tag', activeConfig.heroBadgeSparkle || 'EXCLUSIVE 25TH MILESTONE CELEBRATION');
  setVal('cms-milestone-title', activeConfig.milestoneTitle || 'CHAPTER TWENTY-FIVE');
  setVal('cms-milestone-subtitle', activeConfig.milestoneSubtitle || 'A Quarter Century in Haute Couture');
  setVal('cms-protagonist-name', activeConfig.protagonistName || (activeEventSlug === 'master_default' ? 'Aurelia Vance' : 'Victoria Sterling'));
  setVal('cms-milestone-age', activeConfig.milestoneAge || '25');
  setVal('cms-hero-desc', activeConfig.heroDescription || 'An evening of effortless glamour, vintage champagne, gourmet gastronomy, and midnight revelry celebrating the 25th birthday.');
  
  // Date Picker & Date Text
  const defaultIsoDate = activeConfig.eventDatePicker || '2026-09-26';
  setVal('cms-event-date-picker', defaultIsoDate);
  setVal('cms-event-date-text', activeConfig.eventDateText || formatReadableDate(defaultIsoDate));
  updateLiveCountdownFromDate(defaultIsoDate);

  setVal('cms-reception-time', activeConfig.receptionTime || '19:00 Till Late');
  setVal('cms-venue-name', activeConfig.venueName || 'Villa Solaria Penthouse, Milan');
  setVal('cms-hero-map-url', activeConfig.venueMapUrl || 'https://maps.google.com');
  setVal('cms-hero-quote', activeConfig.heroQuote || 'Pour the champagne, turn up the music, and let\'s toast to the most glamorous chapter yet.');
  const defaultAuthor = activeConfig.heroQuoteAuthor || (activeConfig.protagonistName ? (activeConfig.protagonistName.trim().split(/\s+/)[0] || activeConfig.protagonistName) : 'Aurelia');
  setVal('cms-hero-quote-author', defaultAuthor.replace(/^—\s*/, ''));

  // Countdown
  setVal('cms-countdown-eyebrow', activeConfig.countdownEyebrow || 'COUNTDOWN TO THE GRAND GALA');
  setVal('cms-countdown-title', activeConfig.countdownTitle || 'The Celebration Begins In');

  // Music status
  const uploadLabel = document.getElementById('upload-music-btn-label');
  const musicStatus = document.getElementById('current-music-status');
  if (musicStatus) {
    cmsStorage.getAudioTrack(activeEventSlug).then(rec => {
      if (rec && rec.data) {
        if (uploadLabel) uploadLabel.textContent = 'Change Audio File';
        musicStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#55EFC4;"></i> "${(rec.name || 'Custom Audio').substring(0, 18)}"`;
      } else {
        if (uploadLabel) uploadLabel.textContent = 'Choose Audio File';
        musicStatus.innerHTML = '<i class="fa-solid fa-music"></i> Ambient Lounge Chords';
      }
    });
  }

  // Photos
  setVal('url-hero-portrait', activeConfig.heroPortraitImg || '');
  setSrc('preview-hero-portrait', activeConfig.heroPortraitImg || './assets/hero_portrait.jpg');
  setVal('url-venue-img', activeConfig.venueImg || '');
  setSrc('preview-venue-img', activeConfig.venueImg || './assets/venue_soirée.jpg');
  setVal('url-dresscode-img', activeConfig.dressCodeImg || '');
  setSrc('preview-dresscode-img', activeConfig.dressCodeImg || './assets/dress_code.jpg');

  // 2. About
  setVal('cms-sec-about-sub', activeConfig.aboutSectionSub || 'AN INTIMATE MESSAGE');
  setVal('cms-sec-about-title', activeConfig.aboutSectionTitle || 'A Quarter Century of Memories');
  setVal('cms-about-card1-title', activeConfig.aboutCard1Title || 'The Vision');
  setVal('cms-about-card1-desc', activeConfig.aboutCard1Desc || 'Twenty-five is a milestone of ambition, elegance, and unforgettable connections...');
  setVal('cms-about-card2-title', activeConfig.aboutCard2Title || 'The Experience');
  setVal('cms-about-card2-desc', activeConfig.aboutCard2Desc || 'From sunset caviar & Bellini receptions on the sky terrace to a bespoke candlelight banquet...');
  setVal('cms-about-card3-title', activeConfig.aboutCard3Title || 'The Atmosphere');
  setVal('cms-about-card3-desc', activeConfig.aboutCard3Desc || 'Haute Glamour & Black Tie. Let\'s make every photo look like a runway spread...');

  // 3. VIP Holographic Pass (Auto-synced from Master inputs)
  setVal('cms-sec-vippass-sub', activeConfig.vipPassSectionSub || 'YOUR ALL-ACCESS PASS');
  setVal('cms-sec-vippass-title', activeConfig.vipPassSectionTitle || 'The Holographic VIP Invitation');
  setVal('cms-sec-vippass-desc', activeConfig.vipPassSectionDesc || 'Hover and move your mouse to admire the 3D foil shine and holographic luster.');
  setVal('cms-vippass-code-badge', activeConfig.vipPassCodeBadge || 'VIP • ALL ACCESS');
  setVal('cms-vippass-tier-badge', activeConfig.vipPassTierBadge || '✦ HAUTE GALA');
  setVal('cms-vippass-presents', activeConfig.vipPassPresents || 'CORDIALLY INVITES');
  setVal('cms-vippass-guest-sample', activeConfig.vipPassGuestSample || 'Lady Genevieve Sterling');
  setVal('cms-vippass-occasion', activeConfig.vipPassOccasion || 'TO CELEBRATE THE 25TH BIRTHDAY OF');
  
  const curName = activeConfig.protagonistName || 'Victoria Sterling';
  const curMono = activeConfig.protagonistMonogram || 'VS';
  const curAge = activeConfig.milestoneAge || '25';
  const curDate = activeConfig.eventDateText || formatReadableDate(defaultIsoDate);
  const curShortDate = activeConfig.vipPassDate || formatShortDate(defaultIsoDate);
  const curTime = activeConfig.receptionTime || '19:00 Till Late';
  const curVenue = activeConfig.venueName || 'Penthouse Villa';

  setTxt('cms-nav-brand-title-disp', curName.toUpperCase());
  setTxt('cms-hero-quote-author-disp', curName.trim().split(/\s+/)[0] || curName);
  setTxt('cms-vippass-protagonist-disp', curName);
  setTxt('cms-vippass-date-disp', curShortDate);
  setTxt('cms-vippass-time-disp', curTime);
  setTxt('cms-vippass-venue-disp', curVenue);
  setTxt('cms-vippass-barcode-disp', activeConfig.vipPassBarcode || `#${curMono}-${curAge}-EXCLUSIVE`);

  setTxt('preview-auto-monogram-txt', curMono);
  setTxt('header-studio-monogram', curMono);
  setTxt('nav-preview-mono', curMono);
  setTxt('admin-preview-crest-monogram', curMono);
  setTxt('env-preview-monogram', curMono);

  // 4. Timeline
  setVal('cms-sec-timeline-sub', activeConfig.timelineSectionSub || 'AN UNFORGETTABLE EVENING');
  setVal('cms-sec-timeline-title', activeConfig.timelineSectionTitle || 'The Soirée Itinerary');
  setVal('cms-sec-timeline-desc', activeConfig.timelineSectionDesc || 'A seamless orchestration of haute cuisine, sparkling toasts, and vibrant rhythms.');
  const it = activeConfig.itinerary || [];
  for (let i = 1; i <= 5; i++) {
    const item = it[i - 1] || {};
    setVal(`cms-timeline-time${i}`, item.time || (i === 1 ? '19:00' : (i === 2 ? '20:15' : (i === 3 ? '21:45' : (i === 4 ? '22:30' : '01:30')))));
    setVal(`cms-timeline-lbl${i}`, item.label || (i === 1 ? 'TWILIGHT' : (i === 2 ? 'BANQUET' : (i === 3 ? 'CEREMONY' : (i === 4 ? 'NIGHTFALL' : 'AFTER HOURS')))));
    setVal(`cms-timeline-t${i}`, item.title || (i === 1 ? 'Red Carpet & Champagne Welcome' : (i === 2 ? 'Haute Gastronomy Dinner' : (i === 3 ? 'The 25th Champagne Fountain & Cake' : (i === 4 ? 'DJ Set, Cocktails & Starlight Dancing' : 'Midnight Truffles & Secret Afterglow')))));
    setVal(`cms-timeline-d${i}`, item.desc || (i === 1 ? 'Vintage Dom Pérignon, French 75 cocktails, fresh oysters & caviar canapés...' : (i === 2 ? 'Four-course candlelit dinner orchestrated by Michelin culinary artists...' : (i === 3 ? '7-tier crystal champagne coupe tower and edible gold cake toast...' : (i === 4 ? 'World-class house anthems, illuminated dance floor, signature espresso martini bar...' : 'Late-night gourmet sliders, Belgian dark chocolate truffles, and rooftop conversation...')))));
    setVal(`cms-timeline-tag${i}`, item.tag || (i === 1 ? 'Acoustic Saxophone & Chilled Jazz' : (i === 2 ? 'Bespoke Tasting Menu' : (i === 3 ? 'Milestone Moment & Sparklers' : (i === 4 ? 'High Fashion & Euphoria' : 'Till the early dawn')))));
  }

  // 5. Dress Code
  setVal('cms-sec-dresscode-sub', activeConfig.dressCodeSectionSub || 'SARTORIAL ELEGANCE');
  setVal('cms-dc-title', activeConfig.dressCodeTitle || 'The Dress Code: Haute Glamour');
  setVal('cms-dc-lead', activeConfig.dressCodeLead || 'Dress to enchant. Think Black Tie, Red Carpet Luxury, Liquid Metals & Midnight Velvet.');
  setVal('cms-dc-ladies-title', activeConfig.dressCodeLadiesTitle || 'For the Ladies');
  setVal('cms-dc-ladies-1', activeConfig.dressCodeLadiesList?.[0] || 'Floor-length silk, satin or metallic evening gowns.');
  setVal('cms-dc-ladies-2', activeConfig.dressCodeLadiesList?.[1] || 'Sparkling cocktail dresses with dramatic silhouettes.');
  setVal('cms-dc-ladies-3', activeConfig.dressCodeLadiesList?.[2] || 'Statement diamond jewelry & chic clutches.');
  setVal('cms-dc-gents-title', activeConfig.dressCodeGentsTitle || 'For the Gentlemen');
  setVal('cms-dc-gents-1', activeConfig.dressCodeGentsList?.[0] || 'Classic Black Tie tuxedos or midnight navy velvet jackets.');
  setVal('cms-dc-gents-2', activeConfig.dressCodeGentsList?.[1] || 'Crisp white dress shirts with black or gold cufflinks.');
  setVal('cms-dc-gents-3', activeConfig.dressCodeGentsList?.[2] || 'Polished Oxford patent leather shoes or loafers.');
  setVal('cms-dc-alert-title', activeConfig.dressCodeAlertTitle || 'Fashion Note:');
  setVal('cms-dc-alert-desc', activeConfig.dressCodeAlertDesc || 'Casual wear, sneakers, and distressed denim are kindly not permitted. When in doubt, lean towards the most glamorous option!');

  // Curated Palette Builder
  initPaletteBuilder(activeConfig.dressCodePalette);

  // 6. Venue & Amenities
  setVal('cms-sec-venue-sub', activeConfig.venueSectionSub || 'THE DESTINATION');
  setVal('cms-sec-venue-title', activeConfig.venueSectionTitle || 'The Penthouse & Sky Terrace');
  setVal('cms-sec-venue-lead', activeConfig.venueSectionLead || 'Villa Solaria Estate • Milan, Italy');
  setVal('cms-venue-badge', activeConfig.venueBadge || 'PRIVATE ESTATE ACCESS');
  setVal('cms-venue-name-det', activeConfig.venueName || 'Villa Solaria Penthouse');
  setVal('cms-venue-desc', activeConfig.venueDesc || 'Perched atop the historic hills, offering panoramic 360-degree views of the illuminated city...');
  setVal('cms-venue-map-url', activeConfig.venueMapUrl || 'https://maps.google.com');
  setVal('cms-venue-map-btn-text', activeConfig.venueMapBtnText || 'Open in Google Maps');
  setVal('cms-amenity1-title', activeConfig.venueAmenity1Title || 'Complimentary Valet Parking');
  setVal('cms-amenity1-badge', activeConfig.venueAmenity1Badge || 'VIP Service');
  setVal('cms-amenity1-desc', activeConfig.venueAmenity1Desc || 'White-glove private valet at the grand gates upon arrival.');
  setVal('url-valet-img', activeConfig.valetParkingImg || '');
  setSrc('preview-valet-img', activeConfig.valetParkingImg || './assets/valet_parking.jpg');
  setVal('cms-valet-caption', activeConfig.valetParkingCaption || 'Private Valet Parking Pavilion');
  setVal('cms-amenity2-title', activeConfig.venueAmenity2Title || 'Strict Guestlist Check-in');
  setVal('cms-amenity2-desc', activeConfig.venueAmenity2Desc || 'Digital VIP boarding pass or RSVP name required for estate entry.');
  setVal('cms-amenity3-title', activeConfig.venueAmenity3Title || 'Preferred Accommodation');
  setVal('cms-amenity3-desc', activeConfig.venueAmenity3Desc || 'Private luxury suite discount at Grand Hotel Milano (Code: AURELIA25).');

  // 7. RSVP
  setVal('cms-sec-rsvp-sub', activeConfig.rsvpSectionSub || 'EXCLUSIVE REGISTRATION');
  setVal('cms-rsvp-sec-title', activeConfig.rsvpSectionTitle || 'VIP Concierge & RSVP');
  setVal('cms-sec-rsvp-lead', activeConfig.rsvpSectionLead || 'Please confirm your attendance by September 10th, 2026 to ensure personalized seating.');
  setVal('cms-dining-title', activeConfig.rsvpDiningTitle || 'Dinner Courses:');
  setVal('cms-cocktail-title', activeConfig.rsvpCocktailTitle || 'Signature Cocktails:');

  // Hydrate Dynamic Dining Options
  if (activeConfig.rsvpDiningOptions && Array.isArray(activeConfig.rsvpDiningOptions) && activeConfig.rsvpDiningOptions.length > 0) {
    currentAdminDiningOptions = JSON.parse(JSON.stringify(activeConfig.rsvpDiningOptions));
  } else {
    currentAdminDiningOptions = [
      { id: "wagyu", label: activeConfig.diningCourse1 || 'Imperial Wagyu Beef Fillet & Truffle Jus' },
      { id: "seabass", label: activeConfig.diningCourse2 || 'Pan-Seared Chilean Seabass & Saffron' },
      { id: "truffle", label: activeConfig.diningCourse3 || 'Truffle Wild Mushroom & Porcini Risotto (Veg)' }
    ].filter(d => d.label && d.label.trim() !== '');
  }
  renderAdminDiningOptionsBuilder();

  // Hydrate Dynamic Cocktail Options
  if (activeConfig.rsvpCocktailOptions && Array.isArray(activeConfig.rsvpCocktailOptions) && activeConfig.rsvpCocktailOptions.length > 0) {
    currentAdminCocktailOptions = JSON.parse(JSON.stringify(activeConfig.rsvpCocktailOptions));
  } else {
    currentAdminCocktailOptions = [
      { id: "c1", label: activeConfig.cocktail1 || 'Dom Pérignon Vintage Champagne' },
      { id: "c2", label: activeConfig.cocktail2 || 'French 75 (Gin, Champagne, Lemon)' },
      { id: "c3", label: activeConfig.cocktail3 || 'Smoked Velvet Espresso Martini' }
    ].filter(c => c.label && c.label.trim() !== '');
  }
  renderAdminCocktailOptionsBuilder();

  setVal('cms-rsvp-lbl-name', activeConfig.rsvpNameLabel || 'Your Full Name *');
  setVal('cms-rsvp-name-ph', activeConfig.rsvpNamePlaceholder || 'e.g. Lady Genevieve Sterling');
  setVal('cms-rsvp-lbl-email', activeConfig.rsvpEmailLabel || 'Email for VIP Confirmation *');
  setVal('cms-rsvp-email-ph', activeConfig.rsvpEmailPlaceholder || 'genevieve@luxury.com');
  setVal('cms-rsvp-lbl-attending', activeConfig.rsvpAttendingLabel || 'Will You Grace Us With Your Presence? *');
  setVal('cms-rsvp-btn-attending-lbl', activeConfig.rsvpAttendYesLabel || 'Delighted to Attend');
  setVal('cms-rsvp-btn-attending-sub', activeConfig.rsvpAttendYesSub || 'I will be there in high glamour');
  setVal('cms-rsvp-btn-decline-lbl', activeConfig.rsvpAttendNoLabel || 'Regretfully Decline');
  setVal('cms-rsvp-btn-decline-sub', activeConfig.rsvpAttendNoSub || 'Sending all my love from afar');
  setVal('cms-rsvp-lbl-plusone', activeConfig.rsvpPlusOneCountLabel || 'Bringing a Companion?');
  setVal('cms-rsvp-opt-solo', activeConfig.rsvpOptSolo || 'Solo (VIP Pass x1)');
  setVal('cms-rsvp-opt-plusone', activeConfig.rsvpOptPlusOne || 'With 1 Distinguished Plus-One (VIP Pass x2)');
  setVal('cms-rsvp-lbl-plusone-name', activeConfig.rsvpPlusOneNameLabel || 'Plus-One Full Name');
  setVal('cms-rsvp-plusone-name-ph', activeConfig.rsvpPlusOneNamePlaceholder || "Companion's Full Name");
  setVal('cms-rsvp-lbl-dietary', activeConfig.rsvpDietaryLabel || 'Gourmet Dinner Course Preference');
  setVal('cms-rsvp-lbl-cocktail', activeConfig.rsvpCocktailLabel || 'Favorite Signature Libation');
  setVal('cms-rsvp-lbl-song', activeConfig.rsvpSongLabel || 'Song That Will Keep You on the Dance Floor');
  setVal('cms-rsvp-song-ph', activeConfig.rsvpSongPlaceholder || 'Artist - Track Title');
  setVal('cms-rsvp-lbl-message', activeConfig.rsvpMessageLabel || 'Personal Note or Birthday Toast');
  setVal('cms-rsvp-message-ph', activeConfig.rsvpMessagePlaceholder || 'A sparkling wish for Aurelia...');
  setVal('cms-rsvp-btn-submit', activeConfig.rsvpSubmitBtnText || 'Submit VIP RSVP & Generate Digital Pass');
  setVal('cms-rsvp-privacy-note', activeConfig.rsvpPrivacyNote || 'Your information is strictly confidential for private guestlist verification.');

  // 8. Toasts
  setVal('cms-sec-toasts-sub', activeConfig.toastsSectionSub || 'RAISE A GLASS');
  setVal('cms-sec-toasts-title', activeConfig.toastsSectionTitle || 'The Golden Toast Wall');
  setVal('cms-sec-toasts-lead', activeConfig.toastsSectionLead || 'Leave your sparkling birthday wishes for Aurelia or click to clink champagne glasses!');
  setVal('cms-clink-title', activeConfig.clinkCounterTitle || 'Champagne Glasses Raised for Aurelia:');
  setVal('cms-clink-btn-text', activeConfig.clinkBtnText || 'Raise a Toast! 🥂');
  setVal('cms-toast-box-title', activeConfig.toastBoxTitle || 'Leave a Sparkling Toast');
  setVal('cms-toast-name-ph', activeConfig.toastAuthorPlaceholder || 'Your Name');
  setVal('cms-toast-msg-ph', activeConfig.toastMsgPlaceholder || 'Write your celebratory wish...');
  setVal('cms-toast-submit-text', activeConfig.toastSubmitText || 'Post Toast');

  // 9. Registry & Wishlist
  setVal('cms-sec-registry-sub', activeConfig.registrySectionSub || 'GIFTS & CONTRIBUTIONS');
  setVal('cms-sec-registry-title', activeConfig.registrySectionTitle || 'The 25th Milestone Registry');
  setVal('cms-sec-registry-lead', activeConfig.registrySectionLead || 'Your presence and warmth are the greatest gift. Curated avenues for gifts:');
  setVal('cms-reg1-title', activeConfig.registryCard1Title || 'Amalfi & French Riviera Fund');
  setVal('cms-reg1-desc', activeConfig.registryCard1Desc || 'Contributions towards creating unforgettable travel memories...');
  setVal('cms-reg2-title', activeConfig.registryCard2Title || 'Fine Vintage Wine Cellar');
  setVal('cms-reg2-desc', activeConfig.registryCard2Desc || 'For wine and champagne connoisseurs wishing to gift Grand Cru...');
  setVal('cms-reg3-title', activeConfig.registryCard3Title || 'Ocean & Youth Arts Philanthropy');
  setVal('cms-reg3-desc', activeConfig.registryCard3Desc || 'A portion of gifts dedicated to ocean preservation...');

  // 10. Social Banner
  setVal('cms-social-hashtags', activeConfig.socialHashtags || '#CHAPTER25AURELIA • #VANCE25GALA');
  setVal('cms-social-title', activeConfig.socialTitle || 'Capture The Starlight');
  setVal('cms-social-desc', activeConfig.socialDesc || 'Tag your gala photos and stories with our official celebration tags to be featured on the live gallery display.');

  // 11. Footer Studio
  setVal('cms-footer-monogram', activeConfig.footerMonogram || 'AV');
  setVal('cms-footer-title', activeConfig.footerTitle || 'CHAPTER TWENTY-FIVE');
  setVal('cms-footer-quote', activeConfig.footerQuote || '“To the golden hours behind us, and the brilliant years ahead.”');
  setVal('cms-footer-link-1', activeConfig.footerLink1 || 'Back to Top');
  setVal('cms-footer-link-2', activeConfig.footerLink2 || 'Schedule');
  setVal('cms-footer-link-3', activeConfig.footerLink3 || 'Dress Code');
  setVal('cms-footer-link-4', activeConfig.footerLink4 || 'RSVP');
  setVal('cms-footer-copyright', activeConfig.footerCopyright || '© 2026 Aurelia Vance 25th Birthday Celebration. All Rights Reserved.');
  setVal('cms-footer-subtext', activeConfig.footerSubtext || 'Bespoke Haute Couture Invitation Experience');

  // Envelope Gateway Studio (Tab 2)
  setVal('cms-envelope-monogram', activeConfig.envelopeMonogram || activeConfig.protagonistMonogram || 'AV');
  setVal('cms-envelope-subtitle', activeConfig.envelopeSubtitle || 'PRIVATE INVITATION • NO. XXV');
  setVal('cms-envelope-seal', activeConfig.envelopeSealNumeral || activeConfig.milestoneAge || 'XXV');
  setVal('cms-envelope-tooltip', activeConfig.envelopeSealTooltip || 'Click to Break Seal');
  setVal('cms-envelope-hint', activeConfig.envelopeHint || 'Touch the gold wax seal to enter the private soirée');
  setVal('cms-envelope-enter-btn', activeConfig.envelopeDirectEnterBtn || 'Enter Directly');

  // Sync Envelope Preview Mockup in Tab 2
  setTxt('env-preview-monogram', activeConfig.envelopeMonogram || activeConfig.protagonistMonogram || 'AV');
  setTxt('env-preview-sub', activeConfig.envelopeSubtitle || 'PRIVATE INVITATION • NO. XXV');
  setTxt('env-preview-seal-num', activeConfig.envelopeSealNumeral || 'XXV');
  setTxt('env-preview-tooltip', (activeConfig.envelopeSealTooltip || 'CLICK TO BREAK SEAL').toUpperCase());
  setTxt('env-preview-hint', activeConfig.envelopeHint || 'Touch the gold wax seal to enter the private soirée');
  setTxt('env-preview-enter-btn', activeConfig.envelopeDirectEnterBtn || 'Enter Directly');

  // Sync block visual hide states
  const sec = activeConfig.visibleSections || {};
  syncBlockVisualState('hero', sec.hero !== false);
  syncBlockVisualState('about', sec.about !== false);
  syncBlockVisualState('vipCard', sec.vipCard !== false);
  syncBlockVisualState('timeline', sec.timeline !== false);
  syncBlockVisualState('dressCode', sec.dressCode !== false);
  syncBlockVisualState('venue', sec.venue !== false);
  syncBlockVisualState('rsvp', sec.rsvp !== false);
  syncBlockVisualState('toasts', sec.toasts !== false);
  syncBlockVisualState('registry', sec.registry !== false);
  syncBlockVisualState('social', sec.social !== false);
  syncBlockVisualState('footer', sec.footer !== false);

  // Initialize interactive dynamic builders
  initPaletteBuilder(activeConfig.dressCodePalette);
  initAdminToastsBuilder(activeConfig.toastsList);

  renderGuestTable();
}

/* ==========================================================================
   DATEPICKER & LIVE COUNTDOWN AUTO-CALCULATION
   ========================================================================== */
function formatReadableDate(isoDateStr) {
  if (!isoDateStr) return 'Saturday, Sept 26, 2026';
  try {
    const parts = isoDateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  } catch (e) {
    return isoDateStr;
  }
}

function formatShortDate(isoDateStr) {
  if (!isoDateStr) return '26.09.2026';
  const parts = isoDateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return isoDateStr;
}

function updateLiveCountdownFromDate(isoDateStr) {
  if (!isoDateStr) return;
  try {
    const parts = isoDateStr.split('-');
    const target = new Date(parts[0], parts[1] - 1, parts[2], 19, 0, 0);
    const now = new Date();
    let diff = target.getTime() - now.getTime();

    if (diff < 0) {
      diff = 0;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    setTxt('cd-days', days);
    setTxt('cd-hours', hours);
    setTxt('cd-minutes', minutes);
  } catch (e) {
    console.error('Countdown calc error:', e);
  }
}

/* ==========================================================================
   3. [✖] BLOCK HIDING & TOGGLING LOGIC
   ========================================================================== */
window.toggleAdminBlock = function(secKey) {
  if (!activeConfig) activeConfig = {};
  if (!activeConfig.visibleSections) activeConfig.visibleSections = {};

  const currentVisible = activeConfig.visibleSections[secKey] !== false;
  const newVisible = !currentVisible;
  activeConfig.visibleSections[secKey] = newVisible;

  syncBlockVisualState(secKey, newVisible);

  cmsStorage.saveEventConfig(activeEventSlug, activeConfig);
  localStorage.setItem('cms_last_active_slug', activeEventSlug);

  window.showAdminToast(newVisible
    ? `👁️ Section "${secKey}" is now VISIBLE on website!`
    : `✖ Section "${secKey}" is now HIDDEN on website and navigation menu!`
  );
};

function syncBlockVisualState(secKey, isVisible) {
  const wrapper = document.getElementById(`admin-sec-${secKey}`);
  if (!wrapper) return;

  const btn = wrapper.querySelector('.btn-block-hide');
  if (isVisible) {
    wrapper.classList.remove('hidden-block');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-xmark"></i> <span>Hide Section</span>';
  } else {
    wrapper.classList.add('hidden-block');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-eye"></i> <span>Show Section</span>';
  }
}

/* ==========================================================================
   4. CURATED PALETTE BUILDER (ADD, PICK COLOR, EDIT NAME, DELETE)
   ========================================================================== */
let currentPaletteSwatches = [];

function initPaletteBuilder(palette) {
  if (Array.isArray(palette) && palette.length > 0) {
    currentPaletteSwatches = JSON.parse(JSON.stringify(palette));
  } else {
    currentPaletteSwatches = [
      { name: "Obsidian", color: "#0a0a0c" },
      { name: "Champagne", color: "#D4AF37" },
      { name: "Bronze", color: "#9b7b3e" },
      { name: "Emerald", color: "#0D3B2E" },
      { name: "Pearl", color: "#F9F6F0" }
    ];
  }
  renderPaletteBuilder();
}

function renderPaletteBuilder() {
  const container = document.getElementById('cms-palette-builder');
  if (!container) return;
  container.innerHTML = '';

  currentPaletteSwatches.forEach((swatch, idx) => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      background: rgba(10, 10, 15, 0.95);
      border: 1px solid rgba(212, 175, 55, 0.35);
      padding: 10px 8px;
      border-radius: 12px;
      position: relative;
      min-width: 90px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.6);
      transition: all 0.2s;
    `;

    item.innerHTML = `
      <div style="position: relative; width: 44px; height: 44px; margin-bottom: 6px;">
        <input type="color" class="swatch-color-input" data-idx="${idx}" value="${swatch.color || '#D4AF37'}" style="width: 44px; height: 44px; border-radius: 50%; border: 2.5px solid #D4AF37; cursor: pointer; background: transparent; padding: 0; outline: none; display: block; box-shadow: 0 0 12px rgba(212, 175, 55, 0.4);">
      </div>
      <input type="text" class="edit-in-place swatch-name-input" data-idx="${idx}" value="${escapeHtml(swatch.name || 'Color')}" style="font-size: 0.72rem; text-align: center; width: 80px; padding: 3px 4px; color: #FFF; font-weight: 600;" placeholder="Color name">
      <button type="button" class="btn-del-swatch" data-idx="${idx}" title="Delete this color" style="position: absolute; top: -6px; right: -6px; background: #FF5A5F; border: none; color: #FFF; border-radius: 50%; width: 20px; height: 20px; font-size: 0.65rem; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;

    container.appendChild(item);
  });

  // Bind color input change
  container.querySelectorAll('.swatch-color-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      currentPaletteSwatches[idx].color = e.target.value;
    });
  });

  // Bind name input change
  container.querySelectorAll('.swatch-name-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      currentPaletteSwatches[idx].name = e.target.value.trim();
    });
  });

  // Bind delete button
  container.querySelectorAll('.btn-del-swatch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      currentPaletteSwatches.splice(idx, 1);
      renderPaletteBuilder();
      window.showAdminToast('Color removed from palette.');
    });
  });
}

function addNewPaletteColor() {
  const defaultColors = ['#D4AF37', '#FFDF73', '#0D3B2E', '#9B7B3E', '#FAF6EE', '#8A2BE2', '#C0C0C0', '#B76E79'];
  const nextColor = defaultColors[currentPaletteSwatches.length % defaultColors.length];
  currentPaletteSwatches.push({
    name: 'Gold Accent',
    color: nextColor
  });
  renderPaletteBuilder();
  window.showAdminToast('✨ New color added to palette! Pick your color with the color circle.');
}

window.applyDressCodePreset = function(key) {
  const presets = {
    black_tie: {
      sub: "SARTORIAL ELEGANCE",
      title: "The Dress Code: Parisian Black Tie",
      lead: "Impeccable evening glamour. Obsidian silks, crisp black tuxedos, liquid golds and midnight velvet.",
      palette: [
        { name: "Obsidian", color: "#0a0a0c" },
        { name: "Champagne", color: "#D4AF37" },
        { name: "Bronze", color: "#9b7b3e" },
        { name: "Emerald", color: "#0D3B2E" },
        { name: "Pearl", color: "#F9F6F0" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "Floor-length silk, satin or metallic evening gowns.",
        "Sparkling cocktail dresses with dramatic silhouettes.",
        "Statement diamond jewelry, delicate heels & chic clutches."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "Classic Black Tie tuxedos or midnight navy velvet jackets.",
        "Crisp white dress shirts with black or gold cufflinks.",
        "Polished Oxford patent leather shoes or designer loafers."
      ],
      alertTitle: "Fashion Note:",
      alertDesc: "Casual wear, sneakers, and distressed denim are kindly not permitted. When in doubt, lean towards the most glamorous option!"
    },
    all_white: {
      sub: "LUMINOUS SOIRÉE",
      title: "The Dress Code: All-White Starlight Gala",
      lead: "Immaculate ivory, pearl, and starlight white couture beneath illuminated crystal chandeliers.",
      palette: [
        { name: "Pure White", color: "#FFFFFF" },
        { name: "Oyster Pearl", color: "#F4F1EA" },
        { name: "Warm Ivory", color: "#FFFFF0" },
        { name: "Soft Gold", color: "#E6CA65" },
        { name: "Champagne", color: "#D4AF37" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "Floor-length white silk or shimmering pearl evening gowns.",
        "Dramatic off-shoulder cocktail dresses with feather or jewel trims.",
        "Gold or diamond accessories with satin evening mules."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "White tuxedo dinner jackets with black or cream trousers.",
        "Pristine white poplin dress shirts with Mother-of-Pearl studs.",
        "White or polished patent Oxford shoes."
      ],
      alertTitle: "Color Note:",
      alertDesc: "Kindly adhere to the all-white & pearl color palette. Contrast with gold jewelry is warmly welcomed."
    },
    old_money: {
      sub: "QUIET LUXURY",
      title: "The Dress Code: Quiet Luxury & Italian Silk",
      lead: "Understated elegance and archival tailoring. Cashmere, raw silk, deep espresso and brushed bronze tones.",
      palette: [
        { name: "Espresso", color: "#2B1A12" },
        { name: "Camel Silk", color: "#C19A6B" },
        { name: "Champagne", color: "#D4AF37" },
        { name: "Forest", color: "#1B3B2B" },
        { name: "Cream", color: "#FFFDD0" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "Tailored bias-cut silk slip dresses or minimalist column gowns.",
        "Heritage gold heirloom jewels and sleek geometric clutches.",
        "Subtle editorial glowing makeup and timeless waves."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "Bespoke Italian tailored suits in espresso, midnight, or dark camel.",
        "Silk-cashmere rollneck or crisp open-collar spread shirt.",
        "Brushed leather monk straps or Belgian velvet loafers."
      ],
      alertTitle: "Styling Note:",
      alertDesc: "Emphasize clean architectural silhouettes and fine natural fabrics over loud logomania."
    },
    casino_royale: {
      sub: "MONTE CARLO GLAMOUR",
      title: "The Dress Code: Casino Royale Velvet",
      lead: "High-stakes drama and cinematic intrigue. Deep ruby, midnight velvet, gold leaf and black satin lapels.",
      palette: [
        { name: "Midnight", color: "#060608" },
        { name: "Ruby Velvet", color: "#7A0016" },
        { name: "Gold Leaf", color: "#D4AF37" },
        { name: "Brushed Steel", color: "#68737D" },
        { name: "Ivory", color: "#FFF8E7" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "Deep ruby, emerald or black plunging velvet evening gowns.",
        "Dramatic cape sleeves, high slits, and diamond backdrops.",
        "Bold red lips, smokey feline liner, and crystal stilettos."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "Classic 007 peak-lapel tuxedo or rich ruby velvet dinner jacket.",
        "Pleated tuxedo shirt with onyx stud closures and silk bowtie.",
        "Patent leather shoes and vintage gold timepiece."
      ],
      alertTitle: "Red Carpet Note:",
      alertDesc: "Dress like the protagonist of a classic espionage film premiering in Monte Carlo."
    },
    met_gala: {
      sub: "AVANT-GARDE COUTURE",
      title: "The Dress Code: Met Gala Avant-Garde",
      lead: "Push the boundaries of haute couture. Structural capes, liquid metallics, crystals and runway drama.",
      palette: [
        { name: "Liquid Gold", color: "#D4AF37" },
        { name: "Chrome Silver", color: "#C0C0C0" },
        { name: "Cosmic Noir", color: "#050508" },
        { name: "Royal Amethyst", color: "#4B0082" },
        { name: "Iridescent", color: "#E0FFFF" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "High-fashion couture dresses with architectural volume or metallic sheen.",
        "Statement headpieces, sculpted gold corsets, or floor-trailing capes.",
        "Futuristic runway makeup with metallic leaf accents."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "Embroidered silk brocade jackets, metallic lapels, or asymmetric suits.",
        "Statement jewelry: gold ear cuffs, chain brooches, and signet rings.",
        "Designer platform dress shoes or custom Chelsea boots."
      ],
      alertTitle: "Fashion Note:",
      alertDesc: "More is more! Channel your favorite iconic runway moment and wear something showstopping."
    },
    cocktail_chic: {
      sub: "ROOFTOP REVELRY",
      title: "The Dress Code: Sunset Cocktail Chic",
      lead: "Effortless, sophisticated, and dance-floor ready. Luminous satins, vibrant jewel tones and sharp tailoring.",
      palette: [
        { name: "Sunset Gold", color: "#F39C12" },
        { name: "Rose Gold", color: "#B76E79" },
        { name: "Obsidian", color: "#111116" },
        { name: "Prosecco", color: "#FDFD96" },
        { name: "Warm Bronze", color: "#8E5B23" }
      ],
      ladiesTitle: "For the Ladies",
      ladies: [
        "Chic midi cocktail dresses in silk, satin, or sequin finishes.",
        "Two-piece tailored satin pant-suits with bralette tops.",
        "Strappy metallic heels and playful party mini-bags."
      ],
      gentsTitle: "For the Gentlemen",
      gents: [
        "Sharp tailored blazer with crisp trousers (tie optional).",
        "Patterned silk pocket square and suede or leather loafers.",
        "Smart monochrome evening styling."
      ],
      alertTitle: "Note:",
      alertDesc: "Cocktail elegance designed for effortless movement from sunset dinner to late-night dancing."
    }
  };

  const p = presets[key];
  if (!p) return;

  setVal('cms-sec-dresscode-sub', p.sub);
  setVal('cms-dc-title', p.title);
  setVal('cms-dc-lead', p.lead);
  setVal('cms-dc-ladies-title', p.ladiesTitle);
  setVal('cms-dc-ladies-1', p.ladies[0]);
  setVal('cms-dc-ladies-2', p.ladies[1]);
  setVal('cms-dc-ladies-3', p.ladies[2]);
  setVal('cms-dc-gents-title', p.gentsTitle);
  setVal('cms-dc-gents-1', p.gents[0]);
  setVal('cms-dc-gents-2', p.gents[1]);
  setVal('cms-dc-gents-3', p.gents[2]);
  setVal('cms-dc-alert-title', p.alertTitle);
  setVal('cms-dc-alert-desc', p.alertDesc);

  currentPaletteSwatches = JSON.parse(JSON.stringify(p.palette));
  renderPaletteBuilder();

  window.saveCurrentConfigQuietly();
  window.showAdminToast(`✨ Applied "${p.title}" style preset!`);
};

/* ==========================================================================
   4B. TOAST WALL CARDS BUILDER (EDIT IN-PLACE, ADD, DELETE, RESET)
   ========================================================================== */
let currentAdminToasts = [];

function initAdminToastsBuilder(toasts) {
  if (Array.isArray(toasts) && toasts.length > 0) {
    currentAdminToasts = JSON.parse(JSON.stringify(toasts));
  } else {
    currentAdminToasts = [
      {
        author: "Camille Duprès",
        time: "Just now",
        message: "Happy 25th birthday, my queen! To a woman who redefines elegance, kindness, and beauty every single day. Can't wait to dance all night in Milan! 🥂✨",
        signature: "❤️ With endless love"
      },
      {
        author: "Alexander & Sophie",
        time: "1 hour ago",
        message: "May Chapter 25 be filled with grand adventures, timeless memories, and the finest champagne. You deserve the world, Aurelia! 🍾💫",
        signature: "🥂 See you on the red carpet!"
      },
      {
        author: "Lord Julian Vance",
        time: "3 hours ago",
        message: "Twenty-five years of pure brilliance. Proud of everything you've accomplished and the incredible grace you bring to every room. 👑",
        signature: "✨ Happy 25th!"
      }
    ];
  }
  renderAdminToastsBuilder();
}

function renderAdminToastsBuilder() {
  const container = document.getElementById('cms-toasts-builder');
  if (!container) return;
  container.innerHTML = '';

  if (currentAdminToasts.length === 0) {
    container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #888; padding: 20px; font-size: 0.82rem;">No wishes on the wall yet. Click "+ Add New Toast" to create one!</div>';
    return;
  }

  currentAdminToasts.forEach((t, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-card';
    card.style.cssText = 'padding: 16px; border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 12px; background: rgba(10, 10, 15, 0.9); display: flex; flex-direction: column; justify-content: space-between; gap: 10px; position: relative;';
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <input type="text" class="edit-in-place toast-edit-author" data-idx="${idx}" value="${escapeHtml(t.author || 'Guest')}" placeholder="Author Name" style="font-weight: bold; color: #FFDF73; font-size: 0.88rem; flex: 1;">
        <input type="text" class="edit-in-place toast-edit-time" data-idx="${idx}" value="${escapeHtml(t.time || 'Just now')}" placeholder="Time / Tag" style="width: 90px; font-size: 0.72rem; color: #888; text-align: right;">
        <button type="button" class="btn-del-toast btn-delete-row" data-idx="${idx}" title="Delete this toast" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px;">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>

      <textarea class="edit-in-place toast-edit-message" data-idx="${idx}" rows="3" placeholder="Wish or toast message..." style="font-size: 0.85rem; font-style: italic; color: #FAF6EE; line-height: 1.5;">${escapeHtml(t.message || '')}</textarea>

      <div style="border-top: 1px solid rgba(212, 175, 55, 0.15); padding-top: 6px;">
        <input type="text" class="edit-in-place toast-edit-signature" data-idx="${idx}" value="${escapeHtml(t.signature || '✨ Happy 25th!')}" placeholder="Signature / Note" style="font-size: 0.75rem; color: #FFDF73;">
      </div>
    `;
    container.appendChild(card);
  });

  // Bind author input
  container.querySelectorAll('.toast-edit-author').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminToasts[idx]) currentAdminToasts[idx].author = e.target.value;
    });
  });

  // Bind time input
  container.querySelectorAll('.toast-edit-time').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminToasts[idx]) currentAdminToasts[idx].time = e.target.value;
    });
  });

  // Bind message input
  container.querySelectorAll('.toast-edit-message').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminToasts[idx]) currentAdminToasts[idx].message = e.target.value;
    });
  });

  // Bind signature input
  container.querySelectorAll('.toast-edit-signature').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminToasts[idx]) currentAdminToasts[idx].signature = e.target.value;
    });
  });

  // Bind delete button
  container.querySelectorAll('.btn-del-toast').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      currentAdminToasts.splice(idx, 1);
      renderAdminToastsBuilder();
      window.showAdminToast('🗑 Toast removed.');
    });
  });
}

function addNewAdminToast() {
  currentAdminToasts.push({
    author: "VIP Guest",
    time: "Just now",
    message: "Wishing you a sparkling and magnificent 25th chapter filled with happiness and endless champagne! 🥂✨",
    signature: "✨ With warmest wishes"
  });
  renderAdminToastsBuilder();
  window.showAdminToast('✨ New toast card added! You can edit its text directly.');
}

function resetAdminToastsToCurated() {
  currentAdminToasts = [
    {
      author: "Camille Duprès",
      time: "Just now",
      message: "Happy 25th birthday, my queen! To a woman who redefines elegance, kindness, and beauty every single day. Can't wait to dance all night in Milan! 🥂✨",
      signature: "❤️ With endless love"
    },
    {
      author: "Alexander & Sophie",
      time: "1 hour ago",
      message: "May Chapter 25 be filled with grand adventures, timeless memories, and the finest champagne. You deserve the world, Aurelia! 🍾💫",
      signature: "🥂 See you on the red carpet!"
    },
    {
      author: "Lord Julian Vance",
      time: "3 hours ago",
      message: "Twenty-five years of pure brilliance. Proud of everything you've accomplished and the incredible grace you bring to every room. 👑",
      signature: "✨ Happy 25th!"
    }
  ];
  renderAdminToastsBuilder();
  window.showAdminToast('✨ Reset toast wall to curated editorial wishes.');
}

/* ==========================================================================
   4.5. DYNAMIC DINING & COCKTAIL OPTIONS BUILDERS
   ========================================================================== */
let currentAdminDiningOptions = [];
let currentAdminCocktailOptions = [];

function renderAdminDiningOptionsBuilder() {
  const container = document.getElementById('admin-dining-options-container');
  if (!container) return;
  container.innerHTML = '';

  if (!currentAdminDiningOptions || currentAdminDiningOptions.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem; color:#888; padding:8px 0;">No dinner courses configured. Click "+ Add Course" to create choices.</div>';
    return;
  }

  currentAdminDiningOptions.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.2);';
    row.innerHTML = `
      <span style="font-size: 0.75rem; color: #FFDF73; font-weight: bold; width: 22px;">${idx + 1}.</span>
      <input type="text" class="edit-in-place dining-opt-input" data-idx="${idx}" value="${escapeHtml(opt.label || '')}" placeholder="Gourmet dinner course description..." style="flex: 1; padding: 6px 10px; background: #0b0b0f; border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; color: #FFF; font-size: 0.82rem;">
      <button type="button" class="btn-del-dining-opt" data-idx="${idx}" style="background: rgba(255,118,117,0.15); border: 1px solid #FF7675; color: #FF7675; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 0.78rem;" title="Delete this option">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(row);
  });

  // Bind input changes
  container.querySelectorAll('.dining-opt-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminDiningOptions[idx]) {
        currentAdminDiningOptions[idx].label = e.target.value;
      }
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => { window.saveCurrentConfigQuietly(); }, 400);
    });
  });

  // Bind delete button
  container.querySelectorAll('.btn-del-dining-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      currentAdminDiningOptions.splice(idx, 1);
      renderAdminDiningOptionsBuilder();
      window.saveCurrentConfigQuietly();
      window.showAdminToast('🗑 Dinner course option removed.');
    });
  });
}

function addNewDiningOption() {
  currentAdminDiningOptions.push({
    id: 'd_' + Date.now(),
    label: 'New Gourmet Dinner Course'
  });
  renderAdminDiningOptionsBuilder();
  window.saveCurrentConfigQuietly();
  window.showAdminToast('✨ New dinner course added! Edit its name directly.');
}

function renderAdminCocktailOptionsBuilder() {
  const container = document.getElementById('admin-cocktail-options-container');
  if (!container) return;
  container.innerHTML = '';

  if (!currentAdminCocktailOptions || currentAdminCocktailOptions.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem; color:#888; padding:8px 0;">No cocktails configured. Click "+ Add Cocktail" to create choices.</div>';
    return;
  }

  currentAdminCocktailOptions.forEach((opt, idx) => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.4); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.2);';
    row.innerHTML = `
      <span style="font-size: 0.75rem; color: #FFDF73; font-weight: bold; width: 22px;">${idx + 1}.</span>
      <input type="text" class="edit-in-place cocktail-opt-input" data-idx="${idx}" value="${escapeHtml(opt.label || '')}" placeholder="Signature cocktail description..." style="flex: 1; padding: 6px 10px; background: #0b0b0f; border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; color: #FFF; font-size: 0.82rem;">
      <button type="button" class="btn-del-cocktail-opt" data-idx="${idx}" style="background: rgba(255,118,117,0.15); border: 1px solid #FF7675; color: #FF7675; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 0.78rem;" title="Delete this option">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(row);
  });

  // Bind input changes
  container.querySelectorAll('.cocktail-opt-input').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (currentAdminCocktailOptions[idx]) {
        currentAdminCocktailOptions[idx].label = e.target.value;
      }
      clearTimeout(autoSaveTimer);
      autoSaveTimer = setTimeout(() => { window.saveCurrentConfigQuietly(); }, 400);
    });
  });

  // Bind delete button
  container.querySelectorAll('.btn-del-cocktail-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      currentAdminCocktailOptions.splice(idx, 1);
      renderAdminCocktailOptionsBuilder();
      window.saveCurrentConfigQuietly();
      window.showAdminToast('🗑 Cocktail option removed.');
    });
  });
}

function addNewCocktailOption() {
  currentAdminCocktailOptions.push({
    id: 'c_' + Date.now(),
    label: 'New Signature Cocktail'
  });
  renderAdminCocktailOptionsBuilder();
  window.saveCurrentConfigQuietly();
  window.showAdminToast('✨ New cocktail added! Edit its name directly.');
}

/* ==========================================================================
   5. 1-CLICK DRESS CODE & THEME PRESETS
   ========================================================================== */
window.applyDressCodePreset = function(presetKey) {
  const presets = {
    black_tie: {
      title: "The Dress Code: Haute Black Tie & Gold",
      lead: "Classic Black Tie with gold and velvet accents. Dress to enchant.",
      ladiesTitle: "For the Ladies",
      ladies1: "Floor-length silk, satin or metallic evening gowns.",
      gentsTitle: "For the Gentlemen",
      gents1: "Classic Black Tie tuxedos or velvet jackets.",
      palette: [
        { name: "Obsidian", color: "#0a0a0c" },
        { name: "Champagne", color: "#D4AF37" },
        { name: "Bronze", color: "#9b7b3e" },
        { name: "Emerald", color: "#0D3B2E" },
        { name: "Pearl", color: "#F9F6F0" }
      ]
    },
    all_white: {
      title: "The Dress Code: All-White Starlight Gala",
      lead: "Immaculate ivory, pearl, and starlight white couture under the skyline.",
      ladiesTitle: "For the Ladies",
      ladies1: "Flowing white silk or chiffon evening gowns.",
      gentsTitle: "For the Gentlemen",
      gents1: "White dinner jackets or all-white tailored suits.",
      palette: [
        { name: "Ivory", color: "#FFFFF0" },
        { name: "Starlight", color: "#F0F8FF" },
        { name: "Silver", color: "#E0E0E0" },
        { name: "Platinum", color: "#E5E4E2" },
        { name: "Gold Glint", color: "#F3E5AB" }
      ]
    },
    old_money: {
      title: "The Dress Code: Quiet Luxury & Silk",
      lead: "Understated elegance, cashmere, fine tailoring, and bespoke heirloom jewelry.",
      ladiesTitle: "For the Ladies",
      ladies1: "Minimalist silk slip dresses & structured blazers.",
      gentsTitle: "For the Gentlemen",
      gents1: "Savile Row style midnight navy tuxedos.",
      palette: [
        { name: "Midnight", color: "#0B132B" },
        { name: "Cashmere", color: "#E6D7C3" },
        { name: "Cognac", color: "#9A3821" },
        { name: "Silk Ivory", color: "#FAF0E6" },
        { name: "Navy", color: "#1C2541" }
      ]
    },
    casino_royale: {
      title: "The Dress Code: Casino Royale Velvet & Glamour",
      lead: "High-stakes glamour, dramatic silhouettes, and bold midnight velvet.",
      ladiesTitle: "For the Ladies",
      ladies1: "Backless satin gowns with dramatic silhouettes.",
      gentsTitle: "For the Gentlemen",
      gents1: "Peak lapel black or midnight velvet tuxedos.",
      palette: [
        { name: "Obsidian", color: "#000000" },
        { name: "Crimson", color: "#780000" },
        { name: "Gold Leaf", color: "#C59B27" },
        { name: "Velvet Red", color: "#660708" },
        { name: "Diamond", color: "#FFFFFF" }
      ]
    },
    met_gala: {
      title: "The Dress Code: Met Gala Avant-Garde Extravaganza",
      lead: "Expressive haute couture, sculptural gowns, and high-fashion red carpet drama.",
      ladiesTitle: "For the Ladies",
      ladies1: "Dramatic train gowns & architectural silhouettes.",
      gentsTitle: "For the Gentlemen",
      gents1: "Brocade embroidered jackets or tailored capes.",
      palette: [
        { name: "Liquid Gold", color: "#FFD700" },
        { name: "Royal Purple", color: "#4B0082" },
        { name: "Deep Ruby", color: "#8B0000" },
        { name: "Obsidian", color: "#111111" },
        { name: "Bronze", color: "#CD7F32" }
      ]
    },
    cocktail_chic: {
      title: "The Dress Code: Sunset Cocktail & Sequins",
      lead: "Vibrant luxury cocktail glamour under the twilight skyline.",
      ladiesTitle: "For the Ladies",
      ladies1: "Shimmering sequin cocktail dresses.",
      gentsTitle: "For the Gentlemen",
      gents1: "Sharp slim-fit modern cocktail suits.",
      palette: [
        { name: "Sunset Gold", color: "#FFA500" },
        { name: "Rose Gold", color: "#B76E79" },
        { name: "Champagne", color: "#F7E7CE" },
        { name: "Burgundy", color: "#800020" },
        { name: "Onyx", color: "#1E1E1E" }
      ]
    }
  };

  const p = presets[presetKey];
  if (!p) return;

  setVal('cms-dc-title', p.title);
  setVal('cms-dc-lead', p.lead);
  setVal('cms-dc-ladies-title', p.ladiesTitle);
  setVal('cms-dc-ladies-1', p.ladies1);
  setVal('cms-dc-gents-title', p.gentsTitle);
  setVal('cms-dc-gents-1', p.gents1);

  if (p.palette) {
    currentPaletteSwatches = JSON.parse(JSON.stringify(p.palette));
    renderPaletteBuilder();
  }

  window.saveCurrentConfig();
  window.showAdminToast(`✨ Applied theme: "${p.title}"!`);
};

/* ==========================================================================
   5. VIP EMAIL INVITATION DISPATCHER & REAL DOMAIN VALIDATOR
   ========================================================================== */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  email = email.trim().toLowerCase();
  
  if (email.length < 6 || email.length > 254) return false;
  
  const structureRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+([a-z]{2,24})$/;
  if (!structureRegex.test(email)) return false;
  
  const parts = email.split('@');
  const userPart = parts[0];
  const domainPart = parts[1];
  
  if (!userPart || !domainPart) return false;
  if (userPart.length < 2 || userPart.includes('..')) return false;
  
  const domainSegments = domainPart.split('.');
  if (domainSegments.length < 2) return false;
  
  const tld = domainSegments[domainSegments.length - 1];
  const sld = domainSegments[domainSegments.length - 2];
  
  if (sld.length < 2) return false;
  
  const validCommonTLDs = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int', 'info', 'biz', 'pro', 'name', 
    'io', 'co', 'app', 'ai', 'me', 'dev', 'tech', 'cloud', 'vip', 'store', 'online', 
    'site', 'club', 'space', 'life', 'world', 'live', 'agency', 'design', 'art', 
    'events', 'luxury', 'fashion', 'media', 'press', 'global', 'group', 'ltd', 'inc',
    'uk', 'us', 'de', 'fr', 'it', 'es', 'ca', 'au', 'nl', 'ch', 'se', 'no', 'dk', 
    'fi', 'be', 'at', 'ie', 'nz', 'jp', 'cn', 'kr', 'in', 'br', 'mx', 'ru', 'ua', 
    'kz', 'by', 'ge', 'am', 'az', 'uz', 'eu', 'pl', 'cz', 'pt', 'gr', 'ro', 'hu', 
    'bg', 'hr', 'rs', 'si', 'sk', 'ee', 'lv', 'lt', 'cy', 'mt', 'lu', 'is', 'sg', 
    'hk', 'ae', 'sa', 'za', 'tr', 'il', 'th', 'vn', 'my', 'ph', 'id', 'ar', 'cl', 
    'pe'
  ]);
  
  if (!validCommonTLDs.has(tld)) {
    if (/^(.)\1+$/.test(tld)) return false;
    if (tld.length < 2 || tld.length > 18) return false;
  }
  
  if (/^(.)\1+$/.test(sld)) return false;
  
  return true;
}

function updateInviteLinkPreview() {
  const nameInput = document.getElementById('invite-guest-name');
  const emailInput = document.getElementById('invite-guest-email');
  const plusOneInput = document.getElementById('invite-plusone-opt');
  const previewSpan = document.getElementById('preview-invite-link-url');
  const feedback = document.getElementById('email-validation-feedback');
  const badge = document.getElementById('invite-email-status-badge');

  const name = nameInput ? nameInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const plusOne = plusOneInput ? plusOneInput.value : '1';

  // Live Email Validation
  if (email.length > 0) {
    if (isValidEmail(email)) {
      if (feedback) {
        feedback.innerHTML = '<span style="color: #55EFC4;"><i class="fa-solid fa-circle-check"></i> Valid Email Format</span>';
      }
      if (badge) {
        badge.innerHTML = '✅ Email Verified';
        badge.style.color = '#55EFC4';
        badge.style.borderColor = '#55EFC4';
      }
    } else {
      if (feedback) {
        feedback.innerHTML = '<span style="color: #FF7675;"><i class="fa-solid fa-triangle-exclamation"></i> Invalid email format</span>';
      }
      if (badge) {
        badge.innerHTML = '⚠️ Invalid Email';
        badge.style.color = '#FF7675';
        badge.style.borderColor = '#FF7675';
      }
    }
  } else {
    if (feedback) feedback.innerHTML = '';
    if (badge) {
      badge.innerHTML = 'Ready to Dispatch';
      badge.style.color = '#FFDF73';
      badge.style.borderColor = 'rgba(212, 175, 55, 0.4)';
    }
  }

  // Build Personalized URL
  const baseUrl = window.location.href.replace(/admin\.html.*$/, 'index.html');
  const params = new URLSearchParams();
  if (activeEventSlug && activeEventSlug !== 'master_default') {
    params.set('event', activeEventSlug);
  }
  if (name) {
    params.set('guest', name);
    params.set('plus', plusOne);
  }
  const fullUrl = `${baseUrl}${params.toString() ? '?' + params.toString() : ''}`;
  if (previewSpan) {
    previewSpan.textContent = fullUrl;
  }
  return { fullUrl, name, email, plusOne };
}

function sendPersonalizedEmailInvite(guestName, guestEmail, plusOneAllowed = '1') {
  if (!isValidEmail(guestEmail)) {
    alert('Please enter a valid email address before sending.');
    return false;
  }

  const protagonist = activeConfig?.protagonistName || 'Event Celebrant';
  const eventTitle = activeConfig?.eventName || 'Exclusive Celebration Gala';
  const dateText = `${activeConfig?.eventDateText || 'Saturday, September 26, 2026'} • ${activeConfig?.eventTimeText || '19:00 CEST'}`;
  const venueText = `${activeConfig?.venueName || 'Penthouse'}, ${activeConfig?.venueCity || 'City'}`;
  const dressCode = activeConfig?.dressCodeTitle || 'Haute Glamour & Black Tie';

  const baseUrl = window.location.href.replace(/admin\.html.*$/, 'index.html');
  const params = new URLSearchParams();
  if (activeEventSlug && activeEventSlug !== 'master_default') {
    params.set('event', activeEventSlug);
  }
  params.set('guest', guestName || 'VIP Guest');
  params.set('email', guestEmail);
  const personalizedUrl = `${baseUrl}?${params.toString()}`;

  const subject = encodeURIComponent(`Exclusive VIP Invitation: ${eventTitle}`);
  const body = encodeURIComponent(
`Dearest ${guestName || 'VIP Guest'},

You are cordially invited to celebrate ${eventTitle} with ${protagonist}.

✨ EVENT DETAILS:
• Event: ${eventTitle}
• Date & Time: ${dateText}
• Venue: ${venueText}
• Dress Code: ${dressCode}

👑 YOUR INTERACTIVE VIP INVITATION & RSVP:
Please click your personalized link below to experience the 3D holographic invitation, view the soirée details, and confirm your attendance:

${personalizedUrl}

We eagerly look forward to celebrating with you!

With warmest regards,
${protagonist} & The Host Committee`
  );

  // Open default mail client
  const mailtoLink = `mailto:${encodeURIComponent(guestEmail)}?subject=${subject}&body=${body}`;
  window.open(mailtoLink, '_blank');

  // Copy personalized link to clipboard
  try {
    navigator.clipboard.writeText(personalizedUrl);
  } catch (e) {}

  // Add or update guest in CRM with custom prefix
  const monoPrefix = (activeConfig?.protagonistMonogram || 'VIP').toUpperCase().slice(0, 3);
  const passId = `${monoPrefix}-${Math.floor(1000 + Math.random() * 9000)}-VIP`;
  const guestEntry = {
    passId: passId,
    name: guestName || 'VIP Guest',
    email: guestEmail,
    attendance: 'invited',
    plusOneName: plusOneAllowed === '1' ? 'Plus-One Included' : 'Solo',
    dietary: 'Pending RSVP',
    cocktail: 'Pending RSVP',
    song: '',
    checkedIn: false,
    invitedAt: new Date().toISOString()
  };

  const guests = cmsStorage.getGuests(activeEventSlug);
  const existingIdx = guests.findIndex(g => g.email && g.email.toLowerCase() === guestEmail.toLowerCase());
  if (existingIdx >= 0) {
    guests[existingIdx].attendance = guests[existingIdx].attendance || 'invited';
  } else {
    guests.unshift(guestEntry);
  }
  cmsStorage.saveGuests(activeEventSlug, guests);
  renderGuestTable();

  window.showAdminToast(`✉️ Invitation email prepared for ${guestName || guestEmail}! Link copied to clipboard.`);
  return true;
}

/* ==========================================================================
   6. GUEST CRM TABLE & STATS (Tab 3 Only)
   ========================================================================== */
function renderGuestTable() {
  if (!cmsStorage) return;
  const guests = cmsStorage.getGuests(activeEventSlug);
  const tbody = document.getElementById('crm-guests-tbody');
  const countSpan = document.getElementById('tab-guest-count');

  if (countSpan) countSpan.textContent = guests.length;

  let confirmed = 0;
  let declined = 0;
  let plusOnes = 0;
  let checkedIn = 0;

  guests.forEach(g => {
    if (g.attendance === 'attending') confirmed++;
    else if (g.attendance === 'declined') declined++;
    if (g.plusOneCount && g.plusOneCount !== '0') plusOnes += parseInt(g.plusOneCount, 10);
    if (g.checkedIn) checkedIn++;
  });

  setTxt('stat-confirmed', confirmed);
  setTxt('stat-declined', declined);
  setTxt('stat-plusones', plusOnes);
  setTxt('stat-checkedin', checkedIn);

  if (!tbody) return;
  tbody.innerHTML = '';

  if (guests.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: #B3B0A6; padding: 25px;">No guests in database yet. Dispatch an invitation above to start!</td></tr>`;
    return;
  }

  guests.forEach((g, idx) => {
    const tr = document.createElement('tr');
    const statusLabel = g.attendance === 'attending' ? 'Confirmed' : (g.attendance === 'invited' ? 'Invited ✉️' : 'Declined');
    const statusClass = g.attendance === 'attending' ? 'attending' : (g.attendance === 'invited' ? 'invited' : 'declined');

    tr.innerHTML = `
      <td><strong style="color: #FFDF73; font-family: monospace;">${g.passId || 'VIP'}</strong></td>
      <td><strong>${escapeHtml(g.name || 'Guest')}</strong><br><small style="color: #888;">${g.email || ''}</small></td>
      <td><span class="badge-status ${statusClass}">${statusLabel}</span></td>
      <td>${g.plusOneName ? `${escapeHtml(g.plusOneName)}` : 'Solo'}</td>
      <td>${escapeHtml(g.dietary || 'Standard')}</td>
      <td>${escapeHtml(g.cocktail || 'Champagne')}</td>
      <td style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(g.song || 'None')}</td>
      <td>
        <button class="btn-checkin ${g.checkedIn ? 'checked' : ''}" data-idx="${idx}">
          ${g.checkedIn ? '<i class="fa-solid fa-circle-check"></i> In Room' : 'Check-in'}
        </button>
      </td>
      <td>
        <div style="display: flex; gap: 4px;">
          ${g.email ? `<button class="btn-text-gold btn-resend-invite" data-idx="${idx}" title="Resend VIP Email Invitation & Link" style="padding: 4px 8px; font-size: 0.72rem;"><i class="fa-solid fa-paper-plane"></i></button>` : ''}
          <button class="btn-delete-row" data-idx="${idx}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-resend-invite').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      const g = guests[idx];
      if (g && g.email) {
        sendPersonalizedEmailInvite(g.name, g.email, g.plusOneName?.includes('+1') ? '1' : '0');
      }
    });
  });

  tbody.querySelectorAll('.btn-checkin').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      cmsStorage.toggleGuestCheckIn(activeEventSlug, idx);
      renderGuestTable();
    });
  });

  tbody.querySelectorAll('.btn-delete-row').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
      if (confirm('Remove this guest?')) {
        cmsStorage.deleteGuest(activeEventSlug, idx);
        renderGuestTable();
      }
    });
  });
}

/* ==========================================================================
   6. BIND EVENTS & SAVE & AUDIO
   ========================================================================== */
function bindAdminEvents() {
  bindPhotoUpload('upload-hero-portrait', 'url-hero-portrait', 'preview-hero-portrait');
  bindPhotoUpload('upload-venue-img', 'url-venue-img', 'preview-venue-img');
  bindPhotoUpload('upload-dresscode-img', 'url-dresscode-img', 'preview-dresscode-img');
  bindPhotoUpload('upload-valet-img', 'url-valet-img', 'preview-valet-img');

  // Synchronize Location Name and Google Maps URL fields
  const heroVenueInput = document.getElementById('cms-venue-name');
  const detVenueInput = document.getElementById('cms-venue-name-det');
  const heroMapInput = document.getElementById('cms-hero-map-url');
  const detMapInput = document.getElementById('cms-venue-map-url');

  if (heroVenueInput && detVenueInput) {
    heroVenueInput.addEventListener('input', (e) => { detVenueInput.value = e.target.value; });
    detVenueInput.addEventListener('input', (e) => { heroVenueInput.value = e.target.value; });
  }
  if (heroMapInput && detMapInput) {
    heroMapInput.addEventListener('input', (e) => { detMapInput.value = e.target.value; });
    detMapInput.addEventListener('input', (e) => { heroMapInput.value = e.target.value; });
  }

  // Add color to palette button
  document.getElementById('btn-add-palette-color')?.addEventListener('click', () => {
    addNewPaletteColor();
  });

  // Date picker listener
  const datePicker = document.getElementById('cms-event-date-picker');
  if (datePicker) {
    datePicker.addEventListener('change', (e) => {
      const picked = e.target.value;
      const formatted = formatReadableDate(picked);
      setVal('cms-event-date-text', formatted);
      setVal('cms-vippass-date', formatShortDate(picked));
      updateLiveCountdownFromDate(picked);
      window.showAdminToast(`📅 Date updated to ${formatted} (Countdown recalculated!)`);
    });
  }

  // Music upload (IndexedDB persistent across tabs)
  const musicFileInput = document.getElementById('upload-music-file');
  if (musicFileInput) {
    musicFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const status = document.getElementById('current-music-status');
      if (status) status.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:#FFDF73;"></i> Saving "${file.name.substring(0, 16)}"...`;

      try {
        await cmsStorage.saveAudioTrack(activeEventSlug, file, file.name);

        if (testAudioInstance) {
          testAudioInstance.pause();
          testAudioInstance = null;
        }
        if (!activeConfig) activeConfig = {};
        activeConfig.hasCustomAudio = true;
        activeConfig.customAudioName = file.name;

        if (status) {
          status.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#55EFC4;"></i> "${file.name.substring(0, 18)}"`;
        }
        const btnLbl = document.getElementById('upload-music-btn-label');
        if (btnLbl) btnLbl.textContent = 'Change Audio File';
        window.showAdminToast(`🎵 Audio "${file.name}" uploaded and active on website!`);
      } catch (err) {
        console.error('Audio upload error:', err);
        window.showAdminToast('❌ Error saving audio file.');
      }
    });
  }

  // Clear Audio button
  document.getElementById('btn-clear-audio')?.addEventListener('click', async () => {
    await cmsStorage.deleteAudioTrack(activeEventSlug);
    const fileInput = document.getElementById('upload-music-file');
    if (fileInput) fileInput.value = '';
    const btnLbl = document.getElementById('upload-music-btn-label');
    if (btnLbl) btnLbl.textContent = 'Choose Audio File';
    const status = document.getElementById('current-music-status');
    if (status) status.innerHTML = '<i class="fa-solid fa-music"></i> Ambient Lounge Chords';
    if (testAudioInstance) {
      testAudioInstance.pause();
      testAudioInstance = null;
    }
    const testBtn = document.getElementById('btn-test-audio-play');
    if (testBtn) testBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Test Sound</span>';
    isTestPlaying = false;
    window.showAdminToast('🎵 Audio reset to default Ambient Lounge Chords.');
  });

  // Test sound button
  let isTestPlaying = false;
  let testAudioInstance = null;
  const testBtn = document.getElementById('btn-test-audio-play');
  testBtn?.addEventListener('click', async () => {
    if (isTestPlaying) {
      isTestPlaying = false;
      if (testBtn) testBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Test Sound</span>';
      if (testAudioInstance) {
        try { testAudioInstance.pause(); } catch (e) {}
        testAudioInstance = null;
      }
      window.showAdminToast('Audio preview stopped.');
      return;
    }

    const rec = await cmsStorage.getAudioTrack(activeEventSlug);
    if (rec && rec.data) {
      try {
        const audioSrc = (typeof rec.data === 'string') ? rec.data : URL.createObjectURL(rec.data);
        testAudioInstance = new Audio(audioSrc);
        testAudioInstance.play();
        isTestPlaying = true;
        if (testBtn) testBtn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Stop Test</span>';
        window.showAdminToast(`🎵 Playing "${rec.name || 'custom track'}" preview...`);
        testAudioInstance.onended = () => {
          isTestPlaying = false;
          if (testBtn) testBtn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Test Sound</span>';
        };
      } catch (err) {
        alert('Audio playback error: ' + err.message);
      }
    } else {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const synthCtx = new AudioCtx();
          const freqs = [174.61, 220.00, 261.63, 329.63, 392.00];
          const now = synthCtx.currentTime;
          freqs.forEach(f => {
            const osc = synthCtx.createOscillator();
            const g = synthCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f, now);
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(0.04, now + 0.4);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);
            osc.connect(g);
            g.connect(synthCtx.destination);
            osc.start(now);
            osc.stop(now + 2.9);
          });
        }
      } catch (e) {}
      window.showAdminToast('✨ Playing default synthesized lounge chords preview...');
    }
  });

  document.getElementById('btn-add-palette-color')?.addEventListener('click', () => {
    addNewPaletteColor();
  });

  document.getElementById('btn-add-dining-option')?.addEventListener('click', () => {
    addNewDiningOption();
  });

  document.getElementById('btn-add-cocktail-option')?.addEventListener('click', () => {
    addNewCocktailOption();
  });

  document.getElementById('btn-open-create-site-modal')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.openCreateSiteModal();
  });

  document.getElementById('btn-add-admin-toast')?.addEventListener('click', () => {
    addNewAdminToast();
  });

  document.getElementById('btn-clear-admin-toasts')?.addEventListener('click', () => {
    resetAdminToastsToCurated();
  });

  // VIP Email Invitation Form Listeners
  const invName = document.getElementById('invite-guest-name');
  const invEmail = document.getElementById('invite-guest-email');
  const invPlus = document.getElementById('invite-plusone-opt');

  if (invName) invName.addEventListener('input', updateInviteLinkPreview);
  if (invEmail) invEmail.addEventListener('input', updateInviteLinkPreview);
  if (invPlus) invPlus.addEventListener('change', updateInviteLinkPreview);

  document.getElementById('btn-copy-invite-link')?.addEventListener('click', () => {
    const { fullUrl, name } = updateInviteLinkPreview();
    try {
      navigator.clipboard.writeText(fullUrl);
      window.showAdminToast(`📋 Copied personalized VIP link for ${name || 'guest'} to clipboard!`);
    } catch (e) {
      prompt('Personalized Invitation Link:', fullUrl);
    }
  });

  document.getElementById('dispatch-invite-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const { name, email, plusOne } = updateInviteLinkPreview();
    sendPersonalizedEmailInvite(name, email, plusOne);
  });

  // Initial link preview update
  updateInviteLinkPreview();

  document.getElementById('btn-export-csv')?.addEventListener('click', () => {
    cmsStorage.exportGuestsCSV(activeEventSlug);
  });

  document.getElementById('btn-print-guests')?.addEventListener('click', () => {
    window.print();
  });

  document.getElementById('btn-admin-logout')?.addEventListener('click', () => {
    cmsStorage.logout();
    window.location.reload();
  });

  // Live auto-save on all edit-in-place inputs with debounce (strictly isolated per activeEventSlug)
  const excludedInputIds = [
    'active-event-selector', 'search-guests-input', 'new-event-slug-input',
    'invite-admin-name', 'invite-admin-email', 'invite-guest-name',
    'invite-guest-email', 'invite-plusone-opt', 'generated-invite-url',
    'login-email', 'login-password', 'reg-name', 'reg-email', 'reg-password', 'reg-slug', 'reg-token',
    'new-site-event-name', 'new-site-proto-name', 'new-site-slug', 'new-site-organizer-email',
    'activate-email', 'activate-code', 'activate-name', 'activate-password'
  ];

  document.querySelectorAll('.edit-in-place, input, textarea, select').forEach(input => {
    if (input.id && !input.id.startsWith('reg-') && !input.id.startsWith('login-') && !excludedInputIds.includes(input.id)) {
      input.addEventListener('input', () => {
        if (isSwitchingEvents) return;
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
          if (!isSwitchingEvents) {
            window.saveCurrentConfigQuietly();
          }
        }, 400);
      });
      input.addEventListener('change', () => {
        if (isSwitchingEvents) return;
        clearTimeout(autoSaveTimer);
        window.saveCurrentConfigQuietly();
      });
    }
  });
}

function collectAdminConfig(config) {
  // 0. Top Navbar & Brand Header
  if (hasEl('cms-nav-brand-title')) config.navBrandTitle = getVal('cms-nav-brand-title');
  if (hasEl('cms-nav-brand-sub')) config.navBrandSub = getVal('cms-nav-brand-sub');
  if (hasEl('cms-nav-link-about')) config.navLinkAbout = getVal('cms-nav-link-about');
  if (hasEl('cms-nav-link-vippass')) config.navLinkVipPass = getVal('cms-nav-link-vippass');
  if (hasEl('cms-nav-link-itinerary')) config.navLinkItinerary = getVal('cms-nav-link-itinerary');
  if (hasEl('cms-nav-link-dresscode')) config.navLinkDressCode = getVal('cms-nav-link-dresscode');
  if (hasEl('cms-nav-link-venue')) config.navLinkVenue = getVal('cms-nav-link-venue');
  if (hasEl('cms-nav-link-toastwall')) config.navLinkToastWall = getVal('cms-nav-link-toastwall');
  if (hasEl('cms-nav-audio-label')) config.navAudioLabel = getVal('cms-nav-audio-label');
  if (hasEl('cms-nav-rsvp-btn')) config.navLinkRsvpBtn = getVal('cms-nav-rsvp-btn');

  // Background Celebration Audio state
  if (activeConfig) {
    if (activeConfig.hasCustomAudio !== undefined) config.hasCustomAudio = activeConfig.hasCustomAudio;
    if (activeConfig.customAudioName !== undefined) config.customAudioName = activeConfig.customAudioName;
  }

  // 1. Hero & Core Celebration Identity
  if (hasEl('cms-hero-badge-tag')) config.heroBadgeSparkle = getVal('cms-hero-badge-tag');

  if (hasEl('cms-milestone-title')) {
    const mTitle = getVal('cms-milestone-title');
    config.milestoneTitle = mTitle;
    if (mTitle && activeEventSlug !== 'master_default') {
      config.eventName = mTitle;
      config.heroTitleMain = mTitle.toUpperCase();
      config.vipPassOccasion = mTitle;
      config.footerTitle = mTitle.toUpperCase();
    }
  }

  if (hasEl('cms-milestone-subtitle')) {
    config.milestoneSubtitle = getVal('cms-milestone-subtitle');
  }

  if (hasEl('cms-protagonist-name')) {
    const pName = getVal('cms-protagonist-name').trim();
    config.protagonistName = pName;
    if (pName) {
      config.vipPassProtagonist = pName;
      config.navBrandTitle = pName.toUpperCase();

      const cleaned = pName.replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '');
      const words = cleaned.split(/\s+/).filter(Boolean);
      let mono = 'VIP';
      if (words.length === 1) {
        mono = words[0].slice(0, 2).toUpperCase();
      } else if (words.length >= 2) {
        mono = (words[0][0] + words[words.length - 1][0]).toUpperCase();
      }
      config.protagonistMonogram = mono;
      config.envelopeMonogram = mono;
      config.footerMonogram = mono;

      const firstName = words[0] || pName;
      config.heroQuoteAuthor = `— ${firstName}`;
      config.clinkCounterTitle = `Champagne Glasses Raised for ${firstName}:`;
      config.toastsSectionLead = `Leave your sparkling birthday wishes for ${firstName} or click to clink champagne glasses!`;
      config.footerCopyright = `© 2026 ${pName}. All Rights Reserved.`;

      // Live update preview elements in admin DOM
      setTxt('preview-auto-monogram-txt', mono);
      setTxt('header-studio-monogram', mono);
      setTxt('admin-preview-crest-monogram', mono);
      setTxt('nav-preview-mono', mono);
      setTxt('env-preview-monogram', mono);
      setTxt('cms-nav-brand-title-disp', pName.toUpperCase());
      setTxt('cms-vippass-protagonist-disp', pName);
      setTxt('cms-hero-quote-author-disp', firstName);
    }
  }

  if (hasEl('cms-milestone-age')) {
    const ageVal = getVal('cms-milestone-age');
    config.milestoneAge = ageVal;
    if (ageVal && ageVal !== '25' && activeEventSlug !== 'master_default') {
      config.envelopeSealNumeral = ageVal;
    }
  }

  if (hasEl('cms-hero-desc')) config.heroDescription = getVal('cms-hero-desc');
  
  // Date Picker & Text
  if (hasEl('cms-event-date-picker')) config.eventDatePicker = getVal('cms-event-date-picker');
  if (hasEl('cms-event-date-text')) config.eventDateText = getVal('cms-event-date-text');
  if (hasEl('cms-reception-time')) config.receptionTime = getVal('cms-reception-time');

  if (hasEl('cms-venue-name')) {
    const rawVenue = getVal('cms-venue-name').trim();
    if (rawVenue.includes(',')) {
      const parts = rawVenue.split(',');
      config.venueName = parts[0].trim();
      config.venueCity = parts.slice(1).join(',').trim();
    } else {
      config.venueName = rawVenue;
      if (activeEventSlug !== 'master_default' && (config.venueCity === 'Milan, Italy' || config.venueCity === 'Milan')) {
        config.venueCity = '';
      }
    }
  }
  if (hasEl('cms-hero-quote')) config.heroQuote = getVal('cms-hero-quote');
  if (hasEl('cms-hero-quote-author')) {
    const aVal = getVal('cms-hero-quote-author').trim();
    if (aVal) {
      config.heroQuoteAuthor = aVal.startsWith('—') ? aVal : `— ${aVal}`;
    }
  } else if (config.protagonistName) {
    const fName = config.protagonistName.trim().split(/\s+/)[0];
    config.heroQuoteAuthor = `— ${fName}`;
  }

  // Countdown
  if (hasEl('cms-countdown-eyebrow')) config.countdownEyebrow = getVal('cms-countdown-eyebrow');
  if (hasEl('cms-countdown-title')) config.countdownTitle = getVal('cms-countdown-title');

  // Photos
  const heroP = getVal('url-hero-portrait');
  if (heroP) config.heroPortraitImg = heroP;
  const venueP = getVal('url-venue-img');
  if (venueP) config.venueImg = venueP;
  const dressP = getVal('url-dresscode-img');
  if (dressP) config.dressCodeImg = dressP;

  // 2. About
  if (hasEl('cms-sec-about-sub')) config.aboutSectionSub = getVal('cms-sec-about-sub');
  if (hasEl('cms-sec-about-title')) config.aboutSectionTitle = getVal('cms-sec-about-title');
  if (hasEl('cms-about-card1-title')) config.aboutCard1Title = getVal('cms-about-card1-title');
  if (hasEl('cms-about-card1-desc')) config.aboutCard1Desc = getVal('cms-about-card1-desc');
  if (hasEl('cms-about-card2-title')) config.aboutCard2Title = getVal('cms-about-card2-title');
  if (hasEl('cms-about-card2-desc')) config.aboutCard2Desc = getVal('cms-about-card2-desc');
  if (hasEl('cms-about-card3-title')) config.aboutCard3Title = getVal('cms-about-card3-title');
  if (hasEl('cms-about-card3-desc')) config.aboutCard3Desc = getVal('cms-about-card3-desc');

  // 3. VIP Holographic Pass (Auto-synced from Master inputs)
  if (hasEl('cms-sec-vippass-sub')) config.vipPassSectionSub = getVal('cms-sec-vippass-sub');
  if (hasEl('cms-sec-vippass-title')) config.vipPassSectionTitle = getVal('cms-sec-vippass-title');
  if (hasEl('cms-sec-vippass-desc')) config.vipPassSectionDesc = getVal('cms-sec-vippass-desc');
  if (hasEl('cms-vippass-code-badge')) config.vipPassCodeBadge = getVal('cms-vippass-code-badge');
  if (hasEl('cms-vippass-tier-badge')) config.vipPassTierBadge = getVal('cms-vippass-tier-badge');
  if (hasEl('cms-vippass-presents')) config.vipPassPresents = getVal('cms-vippass-presents');
  if (hasEl('cms-vippass-guest-sample')) config.vipPassGuestSample = getVal('cms-vippass-guest-sample');
  if (hasEl('cms-vippass-occasion')) config.vipPassOccasion = getVal('cms-vippass-occasion');
  config.vipPassProtagonist = config.protagonistName || 'Victoria Sterling';
  config.vipPassDate = formatShortDate(config.eventDatePicker) || config.eventDateText || '26.09.2026';
  config.vipPassTime = config.receptionTime || '19:00 Till Late';
  config.vipPassVenue = config.venueName || 'Penthouse Villa';
  config.vipPassBarcode = `#${config.protagonistMonogram || 'VS'}-${config.milestoneAge || '25'}-EXCLUSIVE`;

  // 4. Timeline
  if (hasEl('cms-sec-timeline-sub')) config.timelineSectionSub = getVal('cms-sec-timeline-sub');
  if (hasEl('cms-sec-timeline-title')) config.timelineSectionTitle = getVal('cms-sec-timeline-title');
  if (hasEl('cms-sec-timeline-desc')) config.timelineSectionDesc = getVal('cms-sec-timeline-desc');
  config.itinerary = [
    {
      time: getVal('cms-timeline-time1') || '19:00',
      label: getVal('cms-timeline-lbl1') || 'TWILIGHT',
      title: getVal('cms-timeline-t1') || 'Red Carpet & Champagne Welcome',
      desc: getVal('cms-timeline-d1') || 'Vintage Dom Pérignon, French 75 cocktails, fresh oysters & caviar canapés...',
      tag: getVal('cms-timeline-tag1') || 'Acoustic Saxophone & Chilled Jazz'
    },
    {
      time: getVal('cms-timeline-time2') || '20:15',
      label: getVal('cms-timeline-lbl2') || 'BANQUET',
      title: getVal('cms-timeline-t2') || 'Haute Gastronomy Dinner',
      desc: getVal('cms-timeline-d2') || 'Four-course candlelit dinner orchestrated by Michelin culinary artists...',
      tag: getVal('cms-timeline-tag2') || 'Bespoke Tasting Menu'
    },
    {
      time: getVal('cms-timeline-time3') || '21:45',
      label: getVal('cms-timeline-lbl3') || 'CEREMONY',
      title: getVal('cms-timeline-t3') || 'The 25th Champagne Fountain & Cake',
      desc: getVal('cms-timeline-d3') || '7-tier crystal champagne coupe tower and edible gold cake toast...',
      tag: getVal('cms-timeline-tag3') || 'Milestone Moment & Sparklers',
      highlight: true
    },
    {
      time: getVal('cms-timeline-time4') || '22:30',
      label: getVal('cms-timeline-lbl4') || 'NIGHTFALL',
      title: getVal('cms-timeline-t4') || 'DJ Set, Cocktails & Starlight Dancing',
      desc: getVal('cms-timeline-d4') || 'World-class house anthems, illuminated dance floor, signature espresso martini bar...',
      tag: getVal('cms-timeline-tag4') || 'High Fashion & Euphoria'
    },
    {
      time: getVal('cms-timeline-time5') || '01:30',
      label: getVal('cms-timeline-lbl5') || 'AFTER HOURS',
      title: getVal('cms-timeline-t5') || 'Midnight Truffles & Secret Afterglow',
      desc: getVal('cms-timeline-d5') || 'Late-night gourmet sliders, Belgian dark chocolate truffles, and rooftop conversation...',
      tag: getVal('cms-timeline-tag5') || 'Till the early dawn'
    }
  ];

  // 5. Dress Code
  if (hasEl('cms-sec-dresscode-sub')) config.dressCodeSectionSub = getVal('cms-sec-dresscode-sub');
  if (hasEl('cms-dc-title')) config.dressCodeTitle = getVal('cms-dc-title');
  if (hasEl('cms-dc-lead')) config.dressCodeLead = getVal('cms-dc-lead');
  if (hasEl('cms-dc-ladies-title')) config.dressCodeLadiesTitle = getVal('cms-dc-ladies-title');
  config.dressCodeLadiesList = [
    getVal('cms-dc-ladies-1'),
    getVal('cms-dc-ladies-2'),
    getVal('cms-dc-ladies-3')
  ];
  if (hasEl('cms-dc-gents-title')) config.dressCodeGentsTitle = getVal('cms-dc-gents-title');
  config.dressCodeGentsList = [
    getVal('cms-dc-gents-1'),
    getVal('cms-dc-gents-2'),
    getVal('cms-dc-gents-3')
  ];
  config.dressCodePalette = currentPaletteSwatches;
  if (hasEl('cms-dc-alert-title')) config.dressCodeAlertTitle = getVal('cms-dc-alert-title');
  if (hasEl('cms-dc-alert-desc')) config.dressCodeAlertDesc = getVal('cms-dc-alert-desc');

  // 6. Venue & Location
  const vName = getVal('cms-venue-name') || getVal('cms-venue-name-det');
  if (vName) config.venueName = vName;
  if (hasEl('cms-sec-venue-sub')) config.venueSectionSub = getVal('cms-sec-venue-sub');
  if (hasEl('cms-sec-venue-title')) config.venueSectionTitle = getVal('cms-sec-venue-title');
  if (hasEl('cms-sec-venue-lead')) config.venueSectionLead = getVal('cms-sec-venue-lead');
  if (hasEl('cms-venue-badge')) config.venueBadge = getVal('cms-venue-badge');
  if (hasEl('cms-venue-desc')) config.venueDesc = getVal('cms-venue-desc');
  if (hasEl('cms-venue-map-url') || hasEl('cms-hero-map-url')) config.venueMapUrl = getVal('cms-hero-map-url') || getVal('cms-venue-map-url') || 'https://maps.google.com';
  if (hasEl('cms-venue-map-btn-text')) config.venueMapBtnText = getVal('cms-venue-map-btn-text');
  if (hasEl('cms-amenity1-title')) config.venueAmenity1Title = getVal('cms-amenity1-title');
  if (hasEl('cms-amenity1-badge')) config.venueAmenity1Badge = getVal('cms-amenity1-badge');
  if (hasEl('cms-amenity1-desc')) config.venueAmenity1Desc = getVal('cms-amenity1-desc');
  const valetP = getVal('url-valet-img');
  if (valetP) config.valetParkingImg = valetP;
  if (hasEl('cms-valet-caption')) config.valetParkingCaption = getVal('cms-valet-caption');
  if (hasEl('cms-amenity2-title')) config.venueAmenity2Title = getVal('cms-amenity2-title');
  if (hasEl('cms-amenity2-desc')) config.venueAmenity2Desc = getVal('cms-amenity2-desc');
  if (hasEl('cms-amenity3-title')) config.venueAmenity3Title = getVal('cms-amenity3-title');
  if (hasEl('cms-amenity3-desc')) config.venueAmenity3Desc = getVal('cms-amenity3-desc');

  // 7. RSVP
  if (hasEl('cms-sec-rsvp-sub')) config.rsvpSectionSub = getVal('cms-sec-rsvp-sub');
  if (hasEl('cms-rsvp-sec-title')) config.rsvpSectionTitle = getVal('cms-rsvp-sec-title');
  if (hasEl('cms-sec-rsvp-lead')) config.rsvpSectionLead = getVal('cms-sec-rsvp-lead');
  if (hasEl('cms-dining-title')) config.rsvpDiningTitle = getVal('cms-dining-title');
  if (hasEl('cms-cocktail-title')) config.rsvpCocktailTitle = getVal('cms-cocktail-title');

  if (hasEl('cms-rsvp-lbl-name')) config.rsvpNameLabel = getVal('cms-rsvp-lbl-name');
  if (hasEl('cms-rsvp-name-ph')) config.rsvpNamePlaceholder = getVal('cms-rsvp-name-ph');
  if (hasEl('cms-rsvp-lbl-email')) config.rsvpEmailLabel = getVal('cms-rsvp-lbl-email');
  if (hasEl('cms-rsvp-email-ph')) config.rsvpEmailPlaceholder = getVal('cms-rsvp-email-ph');
  if (hasEl('cms-rsvp-lbl-attending')) config.rsvpAttendingLabel = getVal('cms-rsvp-lbl-attending');
  if (hasEl('cms-rsvp-btn-attending-lbl')) config.rsvpAttendYesLabel = getVal('cms-rsvp-btn-attending-lbl');
  if (hasEl('cms-rsvp-btn-attending-sub')) config.rsvpAttendYesSub = getVal('cms-rsvp-btn-attending-sub');
  if (hasEl('cms-rsvp-btn-decline-lbl')) config.rsvpAttendNoLabel = getVal('cms-rsvp-btn-decline-lbl');
  if (hasEl('cms-rsvp-btn-decline-sub')) config.rsvpAttendNoSub = getVal('cms-rsvp-btn-decline-sub');
  if (hasEl('cms-rsvp-lbl-plusone')) config.rsvpPlusOneCountLabel = getVal('cms-rsvp-lbl-plusone');
  if (hasEl('cms-rsvp-opt-solo')) config.rsvpOptSolo = getVal('cms-rsvp-opt-solo');
  if (hasEl('cms-rsvp-opt-plusone')) config.rsvpOptPlusOne = getVal('cms-rsvp-opt-plusone');
  if (hasEl('cms-rsvp-lbl-plusone-name')) config.rsvpPlusOneNameLabel = getVal('cms-rsvp-lbl-plusone-name');
  if (hasEl('cms-rsvp-plusone-name-ph')) config.rsvpPlusOneNamePlaceholder = getVal('cms-rsvp-plusone-name-ph');
  if (hasEl('cms-rsvp-lbl-dietary')) config.rsvpDietaryLabel = getVal('cms-rsvp-lbl-dietary');
  if (hasEl('cms-rsvp-lbl-cocktail')) config.rsvpCocktailLabel = getVal('cms-rsvp-lbl-cocktail');
  if (hasEl('cms-rsvp-lbl-song')) config.rsvpSongLabel = getVal('cms-rsvp-lbl-song');
  if (hasEl('cms-rsvp-song-ph')) config.rsvpSongPlaceholder = getVal('cms-rsvp-song-ph');
  if (hasEl('cms-rsvp-lbl-message')) config.rsvpMessageLabel = getVal('cms-rsvp-lbl-message');
  if (hasEl('cms-rsvp-message-ph')) config.rsvpMessagePlaceholder = getVal('cms-rsvp-message-ph');
  if (hasEl('cms-rsvp-btn-submit')) config.rsvpSubmitBtnText = getVal('cms-rsvp-btn-submit');
  if (hasEl('cms-rsvp-privacy-note')) config.rsvpPrivacyNote = getVal('cms-rsvp-privacy-note');

  if (hasEl('cms-dining-title')) config.rsvpDiningTitle = getVal('cms-dining-title');
  if (hasEl('cms-cocktail-title')) config.rsvpCocktailTitle = getVal('cms-cocktail-title');

  config.rsvpDiningOptions = currentAdminDiningOptions;
  config.diningCourse1 = currentAdminDiningOptions[0]?.label || '';
  config.diningCourse2 = currentAdminDiningOptions[1]?.label || '';
  config.diningCourse3 = currentAdminDiningOptions[2]?.label || '';

  config.rsvpCocktailOptions = currentAdminCocktailOptions;
  config.cocktail1 = currentAdminCocktailOptions[0]?.label || '';
  config.cocktail2 = currentAdminCocktailOptions[1]?.label || '';
  config.cocktail3 = currentAdminCocktailOptions[2]?.label || '';

  // 8. Toasts
  if (hasEl('cms-sec-toasts-sub')) config.toastsSectionSub = getVal('cms-sec-toasts-sub');
  if (hasEl('cms-sec-toasts-title')) config.toastsSectionTitle = getVal('cms-sec-toasts-title');
  if (hasEl('cms-sec-toasts-lead')) config.toastsSectionLead = getVal('cms-sec-toasts-lead');
  if (hasEl('cms-clink-title')) config.clinkCounterTitle = getVal('cms-clink-title');
  if (hasEl('cms-clink-btn-text')) config.clinkBtnText = getVal('cms-clink-btn-text');
  if (hasEl('cms-toast-box-title')) config.toastBoxTitle = getVal('cms-toast-box-title');
  if (hasEl('cms-toast-name-ph')) config.toastAuthorPlaceholder = getVal('cms-toast-name-ph');
  if (hasEl('cms-toast-msg-ph')) config.toastMsgPlaceholder = getVal('cms-toast-msg-ph');
  if (hasEl('cms-toast-submit-text')) config.toastSubmitText = getVal('cms-toast-submit-text');
  config.toastsList = currentAdminToasts;
  localStorage.setItem(`aurelia_guestbook_${activeEventSlug}`, JSON.stringify(currentAdminToasts));

  // 9. Registry
  if (hasEl('cms-sec-registry-sub')) config.registrySectionSub = getVal('cms-sec-registry-sub');
  if (hasEl('cms-sec-registry-title')) config.registrySectionTitle = getVal('cms-sec-registry-title');
  if (hasEl('cms-sec-registry-lead')) config.registrySectionLead = getVal('cms-sec-registry-lead');
  if (hasEl('cms-reg1-title')) config.registryCard1Title = getVal('cms-reg1-title');
  if (hasEl('cms-reg1-desc')) config.registryCard1Desc = getVal('cms-reg1-desc');
  if (hasEl('cms-reg2-title')) config.registryCard2Title = getVal('cms-reg2-title');
  if (hasEl('cms-reg2-desc')) config.registryCard2Desc = getVal('cms-reg2-desc');
  if (hasEl('cms-reg3-title')) config.registryCard3Title = getVal('cms-reg3-title');
  if (hasEl('cms-reg3-desc')) config.registryCard3Desc = getVal('cms-reg3-desc');

  // 10. Social
  if (hasEl('cms-social-hashtags')) config.socialHashtags = getVal('cms-social-hashtags');
  if (hasEl('cms-social-title')) config.socialTitle = getVal('cms-social-title');
  if (hasEl('cms-social-desc')) config.socialDesc = getVal('cms-social-desc');

  // 11. Footer Studio
  if (hasEl('cms-footer-monogram')) config.footerMonogram = getVal('cms-footer-monogram');
  if (hasEl('cms-footer-title')) config.footerTitle = getVal('cms-footer-title');
  if (hasEl('cms-footer-quote')) config.footerQuote = getVal('cms-footer-quote');
  if (hasEl('cms-footer-link-1')) config.footerLink1 = getVal('cms-footer-link-1');
  if (hasEl('cms-footer-link-2')) config.footerLink2 = getVal('cms-footer-link-2');
  if (hasEl('cms-footer-link-3')) config.footerLink3 = getVal('cms-footer-link-3');
  if (hasEl('cms-footer-link-4')) config.footerLink4 = getVal('cms-footer-link-4');
  if (hasEl('cms-footer-copyright')) config.footerCopyright = getVal('cms-footer-copyright');
  if (hasEl('cms-footer-subtext')) config.footerSubtext = getVal('cms-footer-subtext');

  // Envelope Gateway Studio (Tab 2)
  if (hasEl('cms-envelope-monogram')) config.envelopeMonogram = getVal('cms-envelope-monogram');
  if (hasEl('cms-envelope-subtitle')) config.envelopeSubtitle = getVal('cms-envelope-subtitle');
  if (hasEl('cms-envelope-seal')) config.envelopeSealNumeral = getVal('cms-envelope-seal');
  if (hasEl('cms-envelope-tooltip')) config.envelopeSealTooltip = getVal('cms-envelope-tooltip');
  if (hasEl('cms-envelope-hint')) config.envelopeHint = getVal('cms-envelope-hint');
  if (hasEl('cms-envelope-enter-btn')) config.envelopeDirectEnterBtn = getVal('cms-envelope-enter-btn');

  // Live update Tab 2 mockup
  setTxt('env-preview-monogram', config.envelopeMonogram || config.protagonistMonogram || 'AV');
  setTxt('env-preview-sub', config.envelopeSubtitle || 'PRIVATE INVITATION • NO. XXV');
  setTxt('env-preview-seal-num', config.envelopeSealNumeral || 'XXV');
  setTxt('env-preview-tooltip', (config.envelopeSealTooltip || 'CLICK TO BREAK SEAL').toUpperCase());
  setTxt('env-preview-hint', config.envelopeHint || 'Touch the gold wax seal to enter the private soirée');
  setTxt('env-preview-enter-btn', config.envelopeDirectEnterBtn || 'Enter Directly');
}

window.removeValetParkingPhoto = function() {
  const urlInp = document.getElementById('url-valet-img');
  if (urlInp) urlInp.value = '';
  const prev = document.getElementById('preview-valet-img');
  if (prev) prev.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="70" height="45" viewBox="0 0 70 45"><rect width="70" height="45" fill="%23222"/><text x="35" y="25" fill="%23888" font-size="9" text-anchor="middle" font-family="sans-serif">No Photo</text></svg>';
  if (activeConfig) {
    activeConfig.valetParkingImg = '';
    activeConfig.showValetParkingImg = false;
  }
  window.saveCurrentConfigQuietly();
  window.showAdminToast('🚗 Valet parking photo removed (No photo mode active).');
};

window.restoreValetParkingPhoto = function() {
  const defaultValet = './assets/valet_parking.jpg';
  const urlInp = document.getElementById('url-valet-img');
  if (urlInp) urlInp.value = defaultValet;
  const prev = document.getElementById('preview-valet-img');
  if (prev) prev.src = defaultValet;
  if (activeConfig) {
    activeConfig.valetParkingImg = defaultValet;
    activeConfig.showValetParkingImg = true;
  }
  window.saveCurrentConfigQuietly();
  window.showAdminToast('✨ Restored default luxury valet parking photo.');
};

let liveAutoSaveTimeout = null;

window.triggerLiveAutoSave = function() {
  const badgeText = document.getElementById('autosave-text');
  const badgeIcon = document.getElementById('autosave-icon');
  if (badgeText) badgeText.textContent = 'Saving...';
  if (badgeIcon) {
    badgeIcon.className = 'fa-solid fa-arrows-rotate fa-spin';
    badgeIcon.style.color = '#FFDF73';
  }

  clearTimeout(liveAutoSaveTimeout);
  liveAutoSaveTimeout = setTimeout(() => {
    window.saveCurrentConfigQuietly();
    if (badgeText) badgeText.textContent = 'Auto-Saved';
    if (badgeIcon) {
      badgeIcon.className = 'fa-solid fa-cloud-arrow-up';
      badgeIcon.style.color = '#55EFC4';
    }
  }, 220);
};

window.saveCurrentConfigQuietly = function() {
  if (isSwitchingEvents) return;
  if (!activeEventSlug) return;

  const isSuperAdmin = currentSession && currentSession.role === 'superadmin';
  let targetSlug = activeEventSlug;
  if (!isSuperAdmin && currentSession && currentSession.assignedSlugs) {
    targetSlug = currentSession.assignedSlugs[0] || 'victoria-25';
  }

  let config = cmsStorage.getEventConfig(targetSlug) || {};
  config.slug = targetSlug;
  collectAdminConfig(config);

  cmsStorage.saveEventConfig(targetSlug, config);
  activeConfig = config;
  localStorage.setItem('cms_last_active_slug', targetSlug);

  // If editing the master template, sync to master keys
  if (targetSlug === 'master_default') {
    const jsonStr = JSON.stringify(config);
    localStorage.setItem('cms_master_config', jsonStr);
    localStorage.setItem('cms_event_master_default_config', jsonStr);
  }

  // Real-time broadcast sync to any open tabs of the public website
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cms_live_sync');
      bc.postMessage({ slug: targetSlug, config });
    }
  } catch (eBc) {}
};

window.saveCurrentConfig = function() {
  window.saveCurrentConfigQuietly();
  const targetHref = activeEventSlug === 'master_default' ? 'index.html' : `index.html?event=${activeEventSlug}`;
  window.showAdminToast(`💾 Auto-Saved & Published! <a href="${targetHref}" target="_blank" style="color:#FFF;text-decoration:underline;margin-left:6px;font-weight:bold;">View Live Site →</a>`);
};

window.resetToEnglishDefaults = function() {
  if (confirm('Reset all fields of this event back to pristine English celebration defaults?')) {
    const cleanConfig = JSON.parse(JSON.stringify(DEFAULT_MASTER_CONFIG));
    cleanConfig.slug = activeEventSlug;
    if (activeEventSlug === 'victoria-25') {
      cleanConfig.protagonistName = 'Victoria Sterling';
      cleanConfig.protagonistMonogram = 'VS';
      cleanConfig.eventName = "Victoria's 25th Diamond Gala";
      cleanConfig.milestoneTitle = "VICTORIA'S 25TH DIAMOND GALA";
      cleanConfig.heroTitleMain = "VICTORIA'S 25TH DIAMOND GALA";
      cleanConfig.milestoneSubtitle = "A Milestone Celebration in Paris";
      cleanConfig.venueCity = "Paris, France";
      cleanConfig.venueName = "Hôtel de Crillon Penthouse";
      cleanConfig.venueAddress = "10 Place de la Concorde, 75008 Paris, France";
      cleanConfig.venueMapUrl = "https://maps.google.com/?q=Hôtel+de+Crillon+Paris";
    }
    cmsStorage.saveEventConfig(activeEventSlug, cleanConfig);
    activeConfig = cleanConfig;
    hydrateCurrentEvent();
    window.showAdminToast('✨ Successfully restored pristine English defaults!');
  }
};

window.deleteActiveSite = async function() {
  if (!currentSession || currentSession.role !== 'superadmin') {
    return alert('Only Super Admin can delete site instances.');
  }
  if (!activeEventSlug || activeEventSlug === 'master_default') {
    return alert('Master default template cannot be deleted.');
  }

  const cfg = cmsStorage.getEventConfig(activeEventSlug);
  const siteName = (cfg && cfg.eventName) ? cfg.eventName : activeEventSlug;

  if (confirm(`⚠️ Are you sure you want to permanently delete "${siteName}" (${activeEventSlug}) across all devices and server databases?\n\nThis action cannot be undone.`)) {
    const targetToDelete = activeEventSlug;
    try {
      await cmsStorage.deleteEvent(targetToDelete);
      
      // Broadcast deletion to all open tabs and devices
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('cms_live_sync');
          bc.postMessage({ type: 'site_deleted', slug: targetToDelete });
        }
      } catch (eBc) {}

      activeEventSlug = 'master_default';
      localStorage.setItem('cms_last_active_slug', 'master_default');
      loadAdminPortal();
      window.showAdminToast(`🗑️ Site "${targetToDelete}" permanently deleted.`);
    } catch (err) {
      alert(err.message || 'Error deleting site.');
    }
  }
};

window.showAdminToast = function(msg) {
  let container = document.getElementById('admin-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'admin-toast-container';
    container.style.cssText = 'position: fixed; bottom: 85px; right: 25px; z-index: 100000; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: #0f0f15;
    border: 1px solid #D4AF37;
    color: #FFDF73;
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.95), 0 0 25px rgba(212, 175, 55, 0.4);
    font-size: 0.85rem;
    font-family: 'Montserrat', sans-serif;
    display: flex;
    align-items: center;
    gap: 12px;
    backdrop-filter: blur(20px);
    pointer-events: auto;
  `;
  toast.innerHTML = `<i class="fa-solid fa-circle-check" style="font-size: 1.15rem; color: #55EFC4;"></i> <div>${msg}</div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

window.saveCurrentConfig = function() {
  const selector = document.getElementById('active-event-selector');
  const currentSlug = (selector && selector.value) ? selector.value : (activeEventSlug || 'victoria-25');
  activeEventSlug = currentSlug;

  let config = cmsStorage.getEventConfig(activeEventSlug) || {};
  config.slug = activeEventSlug;
  collectAdminConfig(config);

  cmsStorage.saveEventConfig(activeEventSlug, config);
  activeConfig = config;
  localStorage.setItem('cms_last_active_slug', activeEventSlug);

  const liveHref = activeEventSlug === 'master_default' ? 'index.html' : `index.html?event=${activeEventSlug}`;
  window.showAdminToast(`✨ Saved & Published! <a href="${liveHref}" target="_blank" style="color:#FFF; text-decoration:underline; font-weight:bold; margin-left:6px;">View Live Site (${activeEventSlug}) ↗</a>`);
};

function compressImageToWebP(file, maxDimension = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target.result);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(dataUrl);
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

function bindPhotoUpload(fileInputId, urlInputId, previewImgId) {
  const fileInput = document.getElementById(fileInputId);
  const urlInput = document.getElementById(urlInputId);
  const previewImg = document.getElementById(previewImgId);
  const labelSpan = document.querySelector(`label[for="${fileInputId}"] span`);

  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (labelSpan) labelSpan.textContent = `Change Photo (${file.name.substring(0, 14)}...)`;
      window.showAdminToast(`⚡ Optimizing & compressing "${file.name}"...`);
      const compressedWebP = await compressImageToWebP(file, 1600, 0.85);
      if (urlInput) urlInput.value = compressedWebP;
      if (previewImg) previewImg.src = compressedWebP;
      window.saveCurrentConfigQuietly();
      window.showAdminToast(`✨ "${file.name}" compressed to lightweight WebP & saved!`);
    });
  }

  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      if (previewImg) previewImg.src = e.target.value;
    });
  }
}

function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function hasEl(id) { return document.getElementById(id) !== null; }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function setTxt(id, val) { const el = document.getElementById(id); if (el) el.textContent = val ?? ''; }
function setSrc(id, val) { const el = document.getElementById(id); if (el && val) el.src = val; }
function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
