// ==========================================================================
// CHAPTER 25 • PUBLIC SITE MULTI-TENANT APPLICATION CONTROLLER
// Dynamically hydrates customized content per event slug (?event=slug),
// enforces section visibility, routes RSVPs to isolated DB, and runs animations
// ==========================================================================

// Global Event Slug & CMS Storage Reference
const cmsStorage = window.cmsStorage || (window.CMSStorageEngine ? new window.CMSStorageEngine() : null);

const urlParams = new URLSearchParams(window.location.search);
const currentEventSlug = urlParams.get('event') || 'master_default';
let currentConfig = null;

document.addEventListener('DOMContentLoaded', async () => {
  hydrateEventContent();
  initAllFeatures();
  
  // Authoritative cloud sync on initial load
  try {
    if (cmsStorage && typeof cmsStorage.syncWithServer === 'function') {
      const cloudCfg = await cmsStorage.syncWithServer(currentEventSlug);
      if (cloudCfg) hydrateEventContent();
    }
  } catch (eInitSync) {}
  
  // Real-time live sync with Admin Studio & cross-client peers via BroadcastChannel
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cms_live_sync');
      bc.onmessage = (msg) => {
        if (msg && msg.data) {
          if (msg.data.type === 'cheers_update' && msg.data.slug === currentEventSlug) {
            const clinkEl = document.getElementById('clink-counter');
            if (clinkEl && typeof msg.data.count === 'number') {
              clinkEl.textContent = msg.data.count;
            }
          } else if (msg.data.type === 'toast_new' && msg.data.slug === currentEventSlug) {
            if (msg.data.toast) {
              renderToastCard(msg.data.toast.author, msg.data.toast.message, msg.data.toast.time || 'Just now', msg.data.toast.signature || '✨ Sent with love', true);
            }
          } else if (msg.data.slug === currentEventSlug || (currentEventSlug === 'master_default' && msg.data.slug === 'master_default')) {
            hydrateEventContent();
          }
        }
      };
    }
  } catch (eBc) {}

  // Real-time cross-tab storage listener
  window.addEventListener('storage', (e) => {
    if (e.key === `cms_event_${currentEventSlug}_config` || e.key === 'cms_master_config' || e.key === 'cms_last_active_slug') {
      hydrateEventContent();
    }
  });

  // Asynchronously sync latest cloud config from server (so phone edits appear on PC & all devices)
  const syncLatestOnFocus = async () => {
    try {
      if (cmsStorage && typeof cmsStorage.syncWithServer === 'function') {
        const cloudConfig = await cmsStorage.syncWithServer(currentEventSlug);
        if (cloudConfig) {
          hydrateEventContent();
        }
      }
    } catch (e) {}
  };

  syncLatestOnFocus();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncLatestOnFocus();
  });
  window.addEventListener('pageshow', syncLatestOnFocus);
  window.addEventListener('focus', syncLatestOnFocus);

  // Periodic lightweight live cloud poller for mobile browser sandboxes
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      syncLatestOnFocus();
    }
  }, 4000);
});

/* ==========================================================================
   DYNAMIC MULTI-TENANT CONTENT & VISIBILITY HYDRATION
   ========================================================================== */
function hydrateEventContent() {
  currentConfig = cmsStorage.getEventConfig(currentEventSlug);

  // 1. Title & Meta
  if (currentConfig.eventName) {
    document.title = `${currentConfig.eventName} | Exclusive VIP Invitation`;
  }

  // 1b. Footer Organizer CMS Link (Preserves exact active site)
  const footerAdminLink = document.getElementById('footer-admin-link');
  if (footerAdminLink) {
    footerAdminLink.href = currentEventSlug === 'master_default' ? 'admin.html' : `admin.html?event=${encodeURIComponent(currentEventSlug)}`;
  }

  // 2. Monogram Initials
  const mono = currentConfig.protagonistMonogram || 'AV';
  document.querySelectorAll('.crest-monogram, .logo-monogram, .stub-monogram, .footer-monogram').forEach(el => {
    el.textContent = mono;
  });

  // 3. Protagonist & Brand Names in Nav & Page
  const protagonistName = currentConfig.protagonistName || 'Aurelia Vance';
  const navBrandTitle = currentConfig.navBrandTitle || protagonistName;
  document.querySelectorAll('.brand-title').forEach(el => el.textContent = navBrandTitle.toUpperCase());

  document.querySelectorAll('#hero-celebrant-name, .hero-celebrant-name').forEach(el => {
    if (protagonistName && protagonistName.trim() !== '') {
      el.textContent = protagonistName.toUpperCase();
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });

  // 3b. Header brand subtitle & logo text
  const navSubtitle = (currentConfig.navBrandSub !== undefined && currentConfig.navBrandSub !== null && currentConfig.navBrandSub.trim() !== '') ? currentConfig.navBrandSub : (currentConfig.milestoneSubtitle || (currentConfig.milestoneAge ? `MILESTONE ${currentConfig.milestoneAge} • GALA` : (currentConfig.eventName || 'EXCLUSIVE GALA')));
  document.querySelectorAll('.brand-sub, .logo-sub, .nav-subtitle').forEach(el => {
    el.textContent = navSubtitle;
  });

  // 3c. Navbar Menu Item Links & Buttons (Live synced with CMS Section 0)
  document.querySelectorAll('#nav-item-about, a[href="#about"]').forEach(el => {
    if (currentConfig.navLinkAbout) el.textContent = currentConfig.navLinkAbout;
  });
  document.querySelectorAll('#nav-item-vippass, a[href="#vip-card"]').forEach(el => {
    if (currentConfig.navLinkVipPass) el.textContent = currentConfig.navLinkVipPass;
  });
  document.querySelectorAll('#nav-item-itinerary, a[href="#timeline"]').forEach(el => {
    if (currentConfig.navLinkItinerary) el.textContent = currentConfig.navLinkItinerary;
  });
  document.querySelectorAll('#nav-item-dresscode, a[href="#dress-code"]').forEach(el => {
    if (currentConfig.navLinkDressCode) el.textContent = currentConfig.navLinkDressCode;
  });
  document.querySelectorAll('#nav-item-venue, a[href="#venue"]').forEach(el => {
    if (currentConfig.navLinkVenue) el.textContent = currentConfig.navLinkVenue;
  });
  document.querySelectorAll('#nav-item-toastwall, a[href="#toasts"]').forEach(el => {
    if (currentConfig.navLinkToastWall) el.textContent = currentConfig.navLinkToastWall;
  });
  document.querySelectorAll('#nav-audio-label, .audio-label').forEach(el => {
    if (currentConfig.navAudioLabel) el.textContent = currentConfig.navAudioLabel;
  });
  document.querySelectorAll('#nav-rsvp-btn-text, .nav-rsvp-btn span').forEach(el => {
    if (currentConfig.navLinkRsvpBtn) el.textContent = currentConfig.navLinkRsvpBtn;
  });

  document.querySelectorAll('.text-champagne, .card-protagonist-name').forEach(el => {
    el.textContent = protagonistName;
  });

  // 4. Quote Box Visibility & Dynamic Author (Clean handling when empty)
  const quoteBox = document.querySelector('.hero-quote-box, .floating-quote');
  if (quoteBox) {
    if (currentConfig.heroQuote && currentConfig.heroQuote.trim() !== '') {
      quoteBox.style.display = '';
      const qP = quoteBox.querySelector('p');
      if (qP) qP.textContent = currentConfig.heroQuote;
      const quoteAuthorEl = quoteBox.querySelector('.quote-author');
      if (quoteAuthorEl) {
        if (currentConfig.heroQuoteAuthor && currentConfig.heroQuoteAuthor.trim() !== '') {
          quoteAuthorEl.textContent = currentConfig.heroQuoteAuthor.startsWith('—') ? currentConfig.heroQuoteAuthor : `— ${currentConfig.heroQuoteAuthor}`;
          quoteAuthorEl.style.display = '';
        } else if (protagonistName) {
          const fName = protagonistName.trim().split(/\s+/)[0] || protagonistName;
          quoteAuthorEl.textContent = `— ${fName}`;
          quoteAuthorEl.style.display = '';
        } else {
          quoteAuthorEl.style.display = 'none';
        }
      }
    } else {
      quoteBox.style.display = 'none';
    }
  }

  // 4b. Headline & Slogan
  if (currentConfig.milestoneTitle) {
    document.querySelectorAll('.editorial-line-2').forEach(el => el.textContent = currentConfig.milestoneTitle.replace('CHAPTER ', ''));
    document.querySelectorAll('.letter-title, .footer-title').forEach(el => el.textContent = currentConfig.milestoneTitle);
  }
  if (currentConfig.milestoneSubtitle) {
    document.querySelectorAll('.editorial-signature').forEach(el => el.textContent = currentConfig.milestoneSubtitle);
  }
  if (currentConfig.milestoneAge) {
    document.querySelectorAll('.badge-num').forEach(el => el.textContent = currentConfig.milestoneAge);
  }
  if (currentConfig.heroBadgeSparkle) {
    document.querySelectorAll('.badge-text').forEach(el => el.textContent = currentConfig.heroBadgeSparkle);
  }
  
  // 4c. Hero Description
  const heroDescEls = document.querySelectorAll('.hero-description');
  heroDescEls.forEach(el => {
    if (currentConfig.heroDescription && currentConfig.heroDescription.trim() !== '') {
      el.style.display = '';
      let desc = currentConfig.heroDescription;
      if (protagonistName && desc.includes(protagonistName)) {
        desc = desc.replace(protagonistName, `<strong class="text-champagne">${escapeHtml(protagonistName)}</strong>`);
      }
      el.innerHTML = desc;
    } else {
      el.style.display = 'none';
    }
  });

  // 5. Envelope texts
  if (currentConfig.envelopeLetterTag) {
    const tagEl = document.querySelector('.letter-gold-tag');
    if (tagEl) tagEl.textContent = currentConfig.envelopeLetterTag;
  }
  if (currentConfig.envelopeLetterSubtitle) {
    const subEl = document.querySelector('.letter-subtitle');
    if (subEl) subEl.textContent = currentConfig.envelopeLetterSubtitle;
  }
  if (currentConfig.envelopeSealNumeral) {
    const sealNum = document.querySelector('.wax-seal-numeral');
    if (sealNum) sealNum.textContent = currentConfig.envelopeSealNumeral;
  }
  if (currentConfig.envelopeHint) {
    const hintEl = document.querySelector('.gatekeeper-hint');
    if (hintEl) hintEl.textContent = currentConfig.envelopeHint;
  }

  // 6. Countdown texts
  if (currentConfig.countdownEyebrow) {
    const eb = document.querySelector('.countdown-eyebrow');
    if (eb) eb.textContent = currentConfig.countdownEyebrow;
  }
  if (currentConfig.countdownTitle) {
    const ct = document.querySelector('.countdown-title');
    if (ct) ct.textContent = currentConfig.countdownTitle;
  }
  if (currentConfig.countdownTag) {
    const tg = document.querySelector('.spots-left-tag');
    if (tg) tg.innerHTML = `<i class="fa-solid fa-gem"></i> ${escapeHtml(currentConfig.countdownTag)}`;
  }

  // 7. About Section Cards
  if (currentConfig.aboutSectionSub) {
    const abSub = document.querySelector('.about-section .section-sub-gold');
    if (abSub) abSub.textContent = currentConfig.aboutSectionSub;
  }
  if (currentConfig.aboutSectionTitle) {
    const abTitle = document.querySelector('.about-section .section-title');
    if (abTitle) abTitle.textContent = currentConfig.aboutSectionTitle;
  }
  if (currentConfig.aboutSectionLead) {
    const abLead = document.querySelector('.about-section .section-lead');
    if (abLead) abLead.textContent = currentConfig.aboutSectionLead;
  }
  if (currentConfig.aboutCard1Title) {
    const c1t = document.querySelector('.about-card:nth-child(1) .card-heading');
    if (c1t) c1t.textContent = currentConfig.aboutCard1Title;
  }
  if (currentConfig.aboutCard1Desc) {
    const c1d = document.querySelector('.about-card:nth-child(1) p');
    if (c1d) c1d.textContent = currentConfig.aboutCard1Desc;
  }
  if (currentConfig.aboutCard2Title) {
    const c2t = document.querySelector('.about-card:nth-child(2) .card-heading');
    if (c2t) c2t.textContent = currentConfig.aboutCard2Title;
  }
  if (currentConfig.aboutCard2Desc) {
    const c2d = document.querySelector('.about-card:nth-child(2) p');
    if (c2d) c2d.textContent = currentConfig.aboutCard2Desc;
  }
  if (currentConfig.aboutCard3Title) {
    const c3t = document.querySelector('.about-card:nth-child(3) .card-heading');
    if (c3t) c3t.textContent = currentConfig.aboutCard3Title;
  }
  if (currentConfig.aboutCard3Desc) {
    const c3d = document.querySelector('.about-card:nth-child(3) p');
    if (c3d) c3d.textContent = currentConfig.aboutCard3Desc;
  }

  // 7b. Timeline & Itinerary Section
  if (currentConfig.timelineSectionSub) {
    const tSub = document.querySelector('.timeline-section .section-sub-gold');
    if (tSub) tSub.textContent = currentConfig.timelineSectionSub;
  }
  if (currentConfig.timelineSectionTitle) {
    const tTitle = document.querySelector('.timeline-section .section-title');
    if (tTitle) tTitle.textContent = currentConfig.timelineSectionTitle;
  }
  if (currentConfig.timelineSectionDesc) {
    const tDesc = document.querySelector('.timeline-section .section-lead');
    if (tDesc) tDesc.textContent = currentConfig.timelineSectionDesc;
  }
  if (currentConfig.itinerary && Array.isArray(currentConfig.itinerary) && currentConfig.itinerary.length > 0) {
    const timelineItems = document.querySelectorAll('.timeline-item');
    currentConfig.itinerary.forEach((item, index) => {
      const el = timelineItems[index];
      if (el) {
        const timeEl = el.querySelector('.time-main');
        if (timeEl && item.time) timeEl.textContent = item.time;
        const subEl = el.querySelector('.time-sub');
        if (subEl && item.label) subEl.textContent = item.label;
        const titleEl = el.querySelector('.t-card-title');
        if (titleEl && item.title) titleEl.textContent = item.title;
        const descEl = el.querySelector('.t-card-desc');
        if (descEl && item.desc) descEl.textContent = item.desc;
        const tagEl = el.querySelector('.t-card-tag');
        if (tagEl && item.tag) tagEl.textContent = item.tag.startsWith('Vibe:') ? item.tag : `Vibe: ${item.tag}`;
      }
    });
  }

  // 8. Dress Code Studio
  if (currentConfig.dressCodeSectionSub) {
    const dcS = document.getElementById('dresscode-sec-sub') || document.querySelector('.dresscode-section .section-sub-gold');
    if (dcS) dcS.textContent = currentConfig.dressCodeSectionSub;
  }
  if (currentConfig.dressCodeTitle) {
    const dcT = document.getElementById('dresscode-sec-title') || document.querySelector('.dresscode-section .section-title');
    if (dcT) dcT.textContent = currentConfig.dressCodeTitle;
  }
  if (currentConfig.dressCodeLead) {
    const dcL = document.getElementById('dresscode-sec-lead') || document.querySelector('.dresscode-section .section-lead');
    if (dcL) dcL.textContent = currentConfig.dressCodeLead;
  }
  if (currentConfig.dressCodeCaptionTitle) {
    const capT = document.querySelector('.caption-title');
    if (capT) capT.textContent = currentConfig.dressCodeCaptionTitle;
  }
  if (currentConfig.dressCodeCaptionSub) {
    const capS = document.querySelector('.caption-sub');
    if (capS) capS.textContent = currentConfig.dressCodeCaptionSub;
  }
  // Dynamic Curated Palette Swatches
  if (currentConfig.dressCodePalette && Array.isArray(currentConfig.dressCodePalette) && currentConfig.dressCodePalette.length > 0) {
    const swatchesContainer = document.querySelector('.swatches-container');
    if (swatchesContainer) {
      swatchesContainer.innerHTML = '';
      currentConfig.dressCodePalette.forEach(swatch => {
        const item = document.createElement('div');
        item.className = 'swatch-item';
        item.title = `${swatch.name || 'Color'} (${swatch.color || '#D4AF37'})`;
        item.innerHTML = `
          <span class="swatch-circle" style="background: ${swatch.color || '#D4AF37'}; border: 1.5px solid ${swatch.color === '#0a0a0c' ? '#d4af37' : 'rgba(212, 175, 55, 0.4)'};"></span>
          <span class="swatch-name">${escapeHtml(swatch.name || 'Color')}</span>
        `;
        swatchesContainer.appendChild(item);
      });
    }
  }

  if (currentConfig.dressCodeLadiesTitle) {
    const lT = document.querySelector('.guide-card:nth-child(1) h3');
    if (lT) lT.textContent = currentConfig.dressCodeLadiesTitle;
  }
  if (currentConfig.dressCodeLadiesList && currentConfig.dressCodeLadiesList.length > 0) {
    const lList = document.querySelectorAll('.guide-card:nth-child(1) .guide-list li');
    currentConfig.dressCodeLadiesList.forEach((text, i) => {
      if (lList[i]) lList[i].innerHTML = `<i class="fa-solid fa-check"></i> ${escapeHtml(text)}`;
    });
  }

  if (currentConfig.dressCodeGentsTitle) {
    const gT = document.querySelector('.guide-card:nth-child(2) h3');
    if (gT) gT.textContent = currentConfig.dressCodeGentsTitle;
  }
  if (currentConfig.dressCodeGentsList && currentConfig.dressCodeGentsList.length > 0) {
    const gList = document.querySelectorAll('.guide-card:nth-child(2) .guide-list li');
    currentConfig.dressCodeGentsList.forEach((text, i) => {
      if (gList[i]) gList[i].innerHTML = `<i class="fa-solid fa-check"></i> ${escapeHtml(text)}`;
    });
  }

  if (currentConfig.dressCodeAlertTitle !== undefined) {
    const altT = document.getElementById('dresscode-alert-title') || document.querySelector('.dresscode-alert strong');
    if (altT) altT.textContent = currentConfig.dressCodeAlertTitle;
  }
  if (currentConfig.dressCodeAlertDesc !== undefined) {
    const altD = document.getElementById('dresscode-alert-desc') || document.querySelector('.dresscode-alert p');
    if (altD) altD.textContent = currentConfig.dressCodeAlertDesc;
  }

  // 9. Venue & Logistics
  if (currentConfig.eventDateText) {
    document.querySelectorAll('.meta-item:nth-child(1) .meta-val, .c-meta-val:nth-child(1)').forEach(el => el.textContent = currentConfig.eventDateText);
  }
  if (currentConfig.receptionTime) {
    document.querySelectorAll('.meta-item:nth-child(2) .meta-val, .c-meta-val:nth-child(2)').forEach(el => el.textContent = currentConfig.receptionTime);
  }
  if (currentConfig.venueName) {
    document.querySelectorAll('.hero-location-val, .meta-item:nth-child(3) .meta-val').forEach(el => el.textContent = currentConfig.venueName);
    document.querySelectorAll('.venue-title').forEach(el => el.textContent = currentConfig.venueName);
    document.querySelectorAll('.pass-venue-sm').forEach(el => el.textContent = currentConfig.venueName);
  }
  if (currentConfig.venueSectionSub) {
    const vSub = document.querySelector('.venue-section .section-sub-gold');
    if (vSub) vSub.textContent = currentConfig.venueSectionSub;
  }
  if (currentConfig.venueSectionTitle) {
    const vTitle = document.querySelector('.venue-section .section-title');
    if (vTitle) vTitle.textContent = currentConfig.venueSectionTitle;
  }
  if (currentConfig.venueSectionLead) {
    document.querySelectorAll('.venue-section .section-lead').forEach(el => el.textContent = currentConfig.venueSectionLead);
  } else if (currentConfig.venueName) {
    document.querySelectorAll('.venue-section .section-lead').forEach(el => el.textContent = currentConfig.venueName);
  }
  if (currentConfig.venueImg) {
    const vImg = document.getElementById('venue-main-img') || document.querySelector('.venue-img');
    if (vImg) vImg.src = currentConfig.venueImg;
  }
  if (currentConfig.venueBadge) {
    const vBadge = document.getElementById('venue-badge-text') || document.querySelector('.venue-overlay-badge span');
    if (vBadge) vBadge.textContent = currentConfig.venueBadge;
  }
  if (currentConfig.venueDesc) {
    const vDesc = document.getElementById('venue-details-desc') || document.querySelector('.venue-desc');
    if (vDesc) vDesc.textContent = currentConfig.venueDesc;
  }
  let mapUrl = currentConfig.venueMapUrl;
  if (!mapUrl || mapUrl === 'https://maps.google.com' || mapUrl === '#') {
    const query = currentConfig.venueAddress || `${currentConfig.venueName || 'Villa Solaria Penthouse'}, ${currentConfig.venueCity || 'Milan, Italy'}`;
    mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  document.querySelectorAll('.btn-location, .hero-location-link, #open-gmaps-btn').forEach(el => {
    el.href = mapUrl;
    el.target = '_blank';
    el.rel = 'noopener noreferrer';
  });
  if (currentConfig.venueMapBtnText) {
    const mapBtnText = document.getElementById('venue-map-btn-text') || document.querySelector('#open-gmaps-btn span');
    if (mapBtnText) mapBtnText.textContent = currentConfig.venueMapBtnText;
  }
  if (currentConfig.venueAmenity1Title) {
    const a1t = document.getElementById('venue-amenity1-title') || document.querySelector('.amenity-item:nth-child(1) strong');
    if (a1t) a1t.textContent = currentConfig.venueAmenity1Title;
  }
  if (currentConfig.venueAmenity1Badge) {
    const a1b = document.getElementById('venue-amenity1-badge');
    if (a1b) a1b.innerHTML = `<i class="fa-solid fa-car"></i> ${currentConfig.venueAmenity1Badge}`;
  }
  if (currentConfig.venueAmenity1Desc) {
    const a1d = document.getElementById('venue-amenity1-desc') || document.querySelector('.amenity-item:nth-child(1) p');
    if (a1d) a1d.textContent = currentConfig.venueAmenity1Desc;
  }
  // Valet Parking Option: With Photo vs Without Photo
  const valetBox = document.getElementById('venue-valet-box');
  if (valetBox) {
    if (currentConfig.showValetParkingImg === false || !currentConfig.valetParkingImg || currentConfig.valetParkingImg.trim() === '') {
      valetBox.style.display = 'none';
    } else {
      valetBox.style.display = 'block';
      const valetImg = document.getElementById('valet-parking-photo');
      if (valetImg) valetImg.src = currentConfig.valetParkingImg;
      const valetCap = document.getElementById('valet-caption-text');
      if (valetCap && currentConfig.valetParkingCaption) valetCap.textContent = currentConfig.valetParkingCaption;
    }
  }
  if (currentConfig.venueAmenity2Title) {
    const a2t = document.getElementById('venue-amenity2-title') || document.querySelector('.amenity-item:nth-child(2) strong');
    if (a2t) a2t.textContent = currentConfig.venueAmenity2Title;
  }
  if (currentConfig.venueAmenity2Desc) {
    const a2d = document.getElementById('venue-amenity2-desc') || document.querySelector('.amenity-item:nth-child(2) p');
    if (a2d) a2d.textContent = currentConfig.venueAmenity2Desc;
  }
  if (currentConfig.venueAmenity3Title) {
    const a3t = document.getElementById('venue-amenity3-title') || document.querySelector('.amenity-item:nth-child(3) strong');
    if (a3t) a3t.textContent = currentConfig.venueAmenity3Title;
  }
  if (currentConfig.venueAmenity3Desc) {
    const a3d = document.getElementById('venue-amenity3-desc') || document.querySelector('.amenity-item:nth-child(3) p');
    if (a3d) a3d.textContent = currentConfig.venueAmenity3Desc;
  }

  // 10. RSVP Form Customizations & Dynamic Labels
  if (currentConfig.rsvpSectionTitle) {
    const rT = document.querySelector('.rsvp-section .section-title');
    if (rT) rT.textContent = currentConfig.rsvpSectionTitle;
  }
  if (currentConfig.rsvpSectionLead) {
    const rL = document.querySelector('.rsvp-section .section-lead');
    if (rL) rL.innerHTML = currentConfig.rsvpSectionLead;
  }

  if (currentConfig.rsvpNameLabel) {
    const el = document.getElementById('rsvp-lbl-name');
    if (el) el.innerHTML = `${escapeHtml(currentConfig.rsvpNameLabel)} <span class="req">*</span>`;
  }
  if (currentConfig.rsvpEmailLabel) {
    const el = document.getElementById('rsvp-lbl-email');
    if (el) el.innerHTML = `${escapeHtml(currentConfig.rsvpEmailLabel)} <span class="req">*</span>`;
  }
  if (currentConfig.rsvpAttendingLabel) {
    const el = document.getElementById('rsvp-lbl-attending');
    if (el) el.innerHTML = `${escapeHtml(currentConfig.rsvpAttendingLabel)} <span class="req">*</span>`;
  }
  if (currentConfig.rsvpAttendYesLabel) {
    const el = document.getElementById('rsvp-btn-attending-lbl');
    if (el) el.textContent = currentConfig.rsvpAttendYesLabel;
  }
  if (currentConfig.rsvpAttendYesSub) {
    const el = document.getElementById('rsvp-btn-attending-sub');
    if (el) el.textContent = currentConfig.rsvpAttendYesSub;
  }
  if (currentConfig.rsvpAttendNoLabel) {
    const el = document.getElementById('rsvp-btn-decline-lbl');
    if (el) el.textContent = currentConfig.rsvpAttendNoLabel;
  }
  if (currentConfig.rsvpAttendNoSub) {
    const el = document.getElementById('rsvp-btn-decline-sub');
    if (el) el.textContent = currentConfig.rsvpAttendNoSub;
  }
  if (currentConfig.rsvpPlusOneCountLabel) {
    const el = document.getElementById('rsvp-lbl-plusone');
    if (el) el.textContent = currentConfig.rsvpPlusOneCountLabel;
  }
  if (currentConfig.rsvpPlusOneNameLabel) {
    const el = document.getElementById('rsvp-lbl-plusone-name');
    if (el) el.textContent = currentConfig.rsvpPlusOneNameLabel;
  }
  if (currentConfig.rsvpDietaryLabel) {
    const el = document.getElementById('rsvp-lbl-dietary');
    if (el) el.textContent = currentConfig.rsvpDietaryLabel;
  }
  if (currentConfig.rsvpCocktailLabel) {
    const el = document.getElementById('rsvp-lbl-cocktail');
    if (el) el.textContent = currentConfig.rsvpCocktailLabel;
  }
  if (currentConfig.rsvpSongLabel) {
    const el = document.getElementById('rsvp-lbl-song');
    if (el) el.textContent = currentConfig.rsvpSongLabel;
  }
  if (currentConfig.rsvpMessageLabel) {
    const el = document.getElementById('rsvp-lbl-message');
    if (el) el.textContent = currentConfig.rsvpMessageLabel;
  }
  if (currentConfig.rsvpSubmitBtnText) {
    const el = document.getElementById('rsvp-submit-btn-text');
    if (el) el.innerHTML = `<i class="fa-solid fa-sparkles"></i> ${escapeHtml(currentConfig.rsvpSubmitBtnText)}`;
  }
  if (currentConfig.rsvpPrivacyNote) {
    const el = document.getElementById('rsvp-privacy-note');
    if (el) el.innerHTML = `<i class="fa-solid fa-lock"></i> ${escapeHtml(currentConfig.rsvpPrivacyNote)}`;
  }

  // Dynamic Dining Dropdown
  const dietarySelect = document.getElementById('rsvp-dietary');
  if (dietarySelect) {
    let diningList = [];
    if (currentConfig.rsvpDiningOptions && Array.isArray(currentConfig.rsvpDiningOptions)) {
      diningList = currentConfig.rsvpDiningOptions.filter(opt => opt && opt.label && opt.label.trim() !== '');
    }
    if (diningList.length === 0) {
      diningList = [
        { id: "wagyu", label: currentConfig.diningCourse1 || "Imperial Wagyu Beef Fillet & Truffle Jus" },
        { id: "seabass", label: currentConfig.diningCourse2 || "Pan-Seared Chilean Seabass & Saffron" },
        { id: "truffle", label: currentConfig.diningCourse3 || "Truffle Wild Mushroom & Porcini Risotto (Veg)" }
      ].filter(opt => opt && opt.label && opt.label.trim() !== '');
    }

    dietarySelect.innerHTML = '';
    diningList.forEach(opt => {
      if (opt && opt.label) {
        const o = document.createElement('option');
        o.value = opt.label;
        o.textContent = opt.label;
        dietarySelect.appendChild(o);
      }
    });
  }

  // Dynamic Cocktail Dropdown
  const cocktailSelect = document.getElementById('rsvp-cocktail');
  if (cocktailSelect) {
    let cocktailList = [];
    if (currentConfig.rsvpCocktailOptions && Array.isArray(currentConfig.rsvpCocktailOptions)) {
      cocktailList = currentConfig.rsvpCocktailOptions.filter(opt => opt && opt.label && opt.label.trim() !== '');
    }
    if (cocktailList.length === 0) {
      cocktailList = [
        { id: "c1", label: currentConfig.cocktail1 || "Dom Pérignon Vintage Champagne" },
        { id: "c2", label: currentConfig.cocktail2 || "French 75 (Gin, Champagne, Lemon)" },
        { id: "c3", label: currentConfig.cocktail3 || "Smoked Velvet Espresso Martini" }
      ].filter(opt => opt && opt.label && opt.label.trim() !== '');
    }

    cocktailSelect.innerHTML = '';
    cocktailList.forEach(opt => {
      if (opt && opt.label) {
        const o = document.createElement('option');
        o.value = opt.label;
        o.textContent = opt.label;
        cocktailSelect.appendChild(o);
      }
    });
  }

  // Dynamic Placeholders & Dropdown Option Texts
  const rsvpNameInp = document.getElementById('rsvp-name');
  if (rsvpNameInp && currentConfig.rsvpNamePlaceholder) {
    rsvpNameInp.placeholder = currentConfig.rsvpNamePlaceholder;
  }
  const rsvpEmailInp = document.getElementById('rsvp-email');
  if (rsvpEmailInp && currentConfig.rsvpEmailPlaceholder) {
    rsvpEmailInp.placeholder = currentConfig.rsvpEmailPlaceholder;
  }
  const rsvpPlusNameInp = document.getElementById('rsvp-plusone-name');
  if (rsvpPlusNameInp && currentConfig.rsvpPlusOneNamePlaceholder) {
    rsvpPlusNameInp.placeholder = currentConfig.rsvpPlusOneNamePlaceholder;
  }
  const rsvpSongInp = document.getElementById('rsvp-song');
  if (rsvpSongInp && currentConfig.rsvpSongPlaceholder) {
    rsvpSongInp.placeholder = currentConfig.rsvpSongPlaceholder;
  }
  const rsvpMsgInp = document.getElementById('rsvp-message');
  if (rsvpMsgInp && currentConfig.rsvpMessagePlaceholder) {
    rsvpMsgInp.placeholder = currentConfig.rsvpMessagePlaceholder;
  }

  const plusOneCountSelect = document.getElementById('rsvp-plusone-count');
  if (plusOneCountSelect) {
    const opt0 = plusOneCountSelect.querySelector('option[value="0"]');
    if (opt0 && currentConfig.rsvpOptSolo) opt0.textContent = currentConfig.rsvpOptSolo;
    const opt1 = plusOneCountSelect.querySelector('option[value="1"]');
    if (opt1 && currentConfig.rsvpOptPlusOne) opt1.textContent = currentConfig.rsvpOptPlusOne;
  }

  // 11. Wishlist & Registry
  if (currentConfig.registrySectionTitle) {
    const regT = document.querySelector('.registry-section .section-title');
    if (regT) regT.textContent = currentConfig.registrySectionTitle;
  }
  if (currentConfig.registrySectionLead) {
    const regL = document.querySelector('.registry-section .section-lead');
    if (regL) regL.textContent = currentConfig.registrySectionLead;
  }
  if (currentConfig.registryCard1Title) {
    const r1t = document.querySelector('.registry-card:nth-child(1) .reg-title');
    if (r1t) r1t.textContent = currentConfig.registryCard1Title;
  }
  if (currentConfig.registryCard1Desc) {
    const r1d = document.querySelector('.registry-card:nth-child(1) .reg-desc');
    if (r1d) r1d.textContent = currentConfig.registryCard1Desc;
  }

  if (currentConfig.registryCard2Title) {
    const r2t = document.querySelector('.registry-card:nth-child(2) .reg-title');
    if (r2t) r2t.textContent = currentConfig.registryCard2Title;
  }
  if (currentConfig.registryCard2Desc) {
    const r2d = document.querySelector('.registry-card:nth-child(2) .reg-desc');
    if (r2d) r2d.textContent = currentConfig.registryCard2Desc;
  }

  if (currentConfig.registryCard3Title) {
    const r3t = document.querySelector('.registry-card:nth-child(3) .reg-title');
    if (r3t) r3t.textContent = currentConfig.registryCard3Title;
  }
  if (currentConfig.registryCard3Desc) {
    const r3d = document.querySelector('.registry-card:nth-child(3) .reg-desc');
    if (r3d) r3d.textContent = currentConfig.registryCard3Desc;
  }

  // 12. VIP Holographic Pass & Emerging Envelope VIP Pass
  function getMonogramInitials(name) {
    if (!name) return 'AV';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const activeProtagonist = currentConfig.vipPassProtagonist || currentConfig.protagonistName || 'Aurelia Vance';
  const customMonogram = currentConfig.envelopeMonogram || currentConfig.protagonistMonogram || getMonogramInitials(activeProtagonist);
  document.querySelectorAll('.crest-monogram, .env-monogram, .env-monogram-top, #gatekeeper-monogram').forEach(el => el.textContent = customMonogram);

  // Envelope Gatekeeper Screen Texts
  if (currentConfig.envelopeSubtitle) {
    document.querySelectorAll('#gatekeeper-subtitle, .crest-subtitle').forEach(el => el.textContent = currentConfig.envelopeSubtitle);
  }
  if (currentConfig.envelopeSealNumeral) {
    document.querySelectorAll('#gatekeeper-seal-numeral, .wax-seal-numeral').forEach(el => el.textContent = currentConfig.envelopeSealNumeral);
  }
  if (currentConfig.envelopeSealTooltip) {
    document.querySelectorAll('#gatekeeper-seal-tooltip, .wax-seal-tooltip').forEach(el => el.textContent = currentConfig.envelopeSealTooltip);
  }
  if (currentConfig.envelopeHint) {
    document.querySelectorAll('#gatekeeper-hint-text, .gatekeeper-hint').forEach(el => el.textContent = currentConfig.envelopeHint);
  }
  if (currentConfig.envelopeDirectEnterBtn) {
    document.querySelectorAll('#gatekeeper-enter-btn-text, #direct-enter-btn span').forEach(el => el.textContent = currentConfig.envelopeDirectEnterBtn);
  }

  if (currentConfig.vipPassSectionSub) {
    const vpS = document.querySelector('.card-showcase-section .section-sub-gold');
    if (vpS) vpS.textContent = currentConfig.vipPassSectionSub;
  }
  if (currentConfig.vipPassSectionTitle) {
    const vpT = document.querySelector('.card-showcase-section .section-title');
    if (vpT) vpT.textContent = currentConfig.vipPassSectionTitle;
  }
  if (currentConfig.vipPassSectionDesc) {
    const vpD = document.querySelector('.card-showcase-section .section-lead');
    if (vpD) vpD.textContent = currentConfig.vipPassSectionDesc;
  }

  const guestParam = urlParams.get('guest');
  const guestName = guestParam || currentConfig.vipPassGuestName || currentConfig.vipPassGuestSample || (currentEventSlug === 'master_default' ? 'Valued Guest & Plus One' : 'Дорогой Гость');
  document.querySelectorAll('#preview-guest-name, .card-guest-name, .env-guest, #ticket-guest-name').forEach(el => el.textContent = guestName);

  const liveGuestInp = document.getElementById('live-guest-input');
  if (liveGuestInp) {
    if (currentConfig.vipPassGuestPlaceholder) {
      liveGuestInp.placeholder = currentConfig.vipPassGuestPlaceholder;
    } else if (currentEventSlug !== 'master_default') {
      liveGuestInp.placeholder = 'например, Анна Смирнова / Дорогой Гость';
    }
  }

  const emailParam = urlParams.get('email');
  if (emailParam) {
    const rsvpEmailInput = document.getElementById('rsvp-email');
    if (rsvpEmailInput && !rsvpEmailInput.value) rsvpEmailInput.value = emailParam;
  }

  const tierBadge = (currentConfig.vipPassTierBadge || '✦ HAUTE GALA').replace('✦', '').trim();
  document.querySelectorAll('.card-tier-badge span, .env-tier span').forEach(el => el.textContent = tierBadge);

  const codeBadge = currentConfig.vipPassCodeBadge || 'VIP • ALL ACCESS';
  document.querySelectorAll('.card-crest .crest-code, .env-code').forEach(el => el.textContent = codeBadge);

  const presentsTxt = currentConfig.vipPassPresents || 'CORDIALLY INVITES';
  document.querySelectorAll('.card-sub-presents, .env-presents').forEach(el => el.textContent = presentsTxt);

  const occasionTxt = currentConfig.vipPassOccasion || 'TO CELEBRATE THE 25TH BIRTHDAY OF';
  document.querySelectorAll('.card-occasion, .env-occasion').forEach(el => el.textContent = occasionTxt);

  document.querySelectorAll('.card-protagonist-name, .env-protagonist').forEach(el => el.textContent = activeProtagonist);

  const passDate = currentConfig.vipPassDate || currentConfig.eventDateText || '26.09.2026';
  document.querySelectorAll('.card-meta-col:nth-child(1) .c-meta-val, .env-date').forEach(el => el.textContent = passDate);

  const passTime = currentConfig.vipPassTime || currentConfig.receptionTime || '19:00 CEST';
  document.querySelectorAll('.card-meta-col:nth-child(2) .c-meta-val, .env-time').forEach(el => el.textContent = passTime);

  const passVenue = currentConfig.vipPassVenue || currentConfig.venueName || 'Penthouse Villa';
  document.querySelectorAll('.card-meta-col:nth-child(3) .c-meta-val, .env-venue').forEach(el => el.textContent = passVenue);

  const passBarcode = currentConfig.vipPassBarcode || `#${customMonogram}-EXCLUSIVE`;
  document.querySelectorAll('.card-barcode-box .barcode-num, .env-barcode').forEach(el => el.textContent = passBarcode);

  // Pre-hydrate Ticket Modal with this active event's unique data
  const ticketMonogram = document.getElementById('ticket-monogram');
  const ticketEventTitle = document.getElementById('ticket-event-title');
  const ticketPassType = document.getElementById('ticket-pass-type');
  const ticketDateStr = document.getElementById('ticket-date-str');
  const ticketTimeStr = document.getElementById('ticket-time-str');
  const ticketVenueStr = document.getElementById('ticket-venue-str');
  const ticketCodeStr = document.getElementById('ticket-code-str');

  if (ticketMonogram) ticketMonogram.textContent = customMonogram;
  if (ticketEventTitle) ticketEventTitle.textContent = currentConfig.milestoneTitle || currentConfig.eventName || 'VIP INVITATION';
  if (ticketPassType) ticketPassType.textContent = currentConfig.vipPassTierBadge || 'ALL-ACCESS VIP';
  if (ticketDateStr) ticketDateStr.textContent = currentConfig.vipPassDate || currentConfig.eventDateText || '26.09.2026';
  if (ticketTimeStr) ticketTimeStr.textContent = currentConfig.receptionTime || currentConfig.vipPassTime || currentConfig.eventTimeText || '19:00 CEST';
  if (ticketCodeStr) ticketCodeStr.textContent = `${customMonogram}-${Math.floor(1000 + Math.random() * 9000)}-VIP`;

  let initialVenueDisplay = currentConfig.venueName || 'VIP Private Location';
  if (currentConfig.venueCity && currentConfig.venueCity.trim() !== '' && !initialVenueDisplay.includes(currentConfig.venueCity)) {
    initialVenueDisplay += `, ${currentConfig.venueCity}`;
  }
  if (ticketVenueStr) ticketVenueStr.textContent = initialVenueDisplay;

  // 13. Timeline Section Sub & Desc
  if (currentConfig.timelineSectionSub) {
    const tSub = document.querySelector('.timeline-section .section-sub-gold');
    if (tSub) tSub.textContent = currentConfig.timelineSectionSub;
  }
  if (currentConfig.timelineSectionTitle) {
    const tTit = document.querySelector('.timeline-section .section-title');
    if (tTit) tTit.textContent = currentConfig.timelineSectionTitle;
  }
  if (currentConfig.timelineSectionDesc) {
    const tD = document.querySelector('.timeline-section .section-lead');
    if (tD) tD.textContent = currentConfig.timelineSectionDesc;
  }

  // 14. Toasts Section Sub & Titles & Placeholders
  if (currentConfig.toastsSectionSub) {
    const tstS = document.querySelector('.toasts-section .section-sub-gold');
    if (tstS) tstS.textContent = currentConfig.toastsSectionSub;
  }
  if (currentConfig.toastsSectionTitle) {
    const tstT = document.querySelector('.toasts-section .section-title');
    if (tstT) tstT.textContent = currentConfig.toastsSectionTitle;
  }
  if (currentConfig.toastsSectionLead) {
    const tstL = document.querySelector('.toasts-section .section-lead');
    if (tstL) tstL.textContent = currentConfig.toastsSectionLead;
  }
  if (currentConfig.clinkCounterTitle) {
    const el = document.getElementById('clink-counter-title');
    if (el) el.textContent = currentConfig.clinkCounterTitle;
  }
  if (currentConfig.clinkBtnText) {
    const el = document.getElementById('cheers-btn-text');
    if (el) el.textContent = currentConfig.clinkBtnText;
  }
  if (currentConfig.toastBoxTitle) {
    const el = document.getElementById('quick-toast-title');
    if (el) el.innerHTML = `<i class="fa-solid fa-pen-fancy"></i> ${escapeHtml(currentConfig.toastBoxTitle)}`;
  }
  if (currentConfig.toastAuthorPlaceholder) {
    const el = document.getElementById('toast-author-input');
    if (el) el.placeholder = currentConfig.toastAuthorPlaceholder;
  }
  if (currentConfig.toastMsgPlaceholder) {
    const el = document.getElementById('toast-message-input');
    if (el) el.placeholder = currentConfig.toastMsgPlaceholder;
  }
  if (currentConfig.toastSubmitText) {
    const el = document.getElementById('btn-toast-send-text');
    if (el) el.textContent = currentConfig.toastSubmitText;
  }

  // 15. Social Banner & Footer Studio Hydration
  if (currentConfig.socialHashtags) {
    const sH = document.querySelector('.social-hashtag');
    if (sH) sH.textContent = currentConfig.socialHashtags;
  }
  if (currentConfig.socialTitle) {
    const sT = document.querySelector('.social-title');
    if (sT) sT.textContent = currentConfig.socialTitle;
  }
  if (currentConfig.socialDesc) {
    const sD = document.querySelector('.social-banner-content p');
    if (sD) sD.textContent = currentConfig.socialDesc;
  }
  if (currentConfig.footerMonogram) {
    const el = document.getElementById('footer-monogram-txt') || document.querySelector('.footer-monogram');
    if (el) el.textContent = currentConfig.footerMonogram;
  }
  if (currentConfig.footerTitle) {
    const el = document.getElementById('footer-title-txt') || document.querySelector('.footer-title');
    if (el) el.textContent = currentConfig.footerTitle;
  }
  if (currentConfig.footerQuote) {
    const el = document.getElementById('footer-quote-txt') || document.querySelector('.footer-quote');
    if (el) el.textContent = currentConfig.footerQuote;
  }
  if (currentConfig.footerLink1) {
    const el = document.getElementById('footer-link-1');
    if (el) el.textContent = currentConfig.footerLink1;
  }
  if (currentConfig.footerLink2) {
    const el = document.getElementById('footer-link-2');
    if (el) el.textContent = currentConfig.footerLink2;
  }
  if (currentConfig.footerLink3) {
    const el = document.getElementById('footer-link-3');
    if (el) el.textContent = currentConfig.footerLink3;
  }
  if (currentConfig.footerLink4) {
    const el = document.getElementById('footer-link-4');
    if (el) el.textContent = currentConfig.footerLink4;
  }
  if (currentConfig.footerCopyright) {
    const el = document.getElementById('footer-copyright-txt');
    if (el) el.textContent = currentConfig.footerCopyright;
  }
  if (currentConfig.footerSubtext) {
    const el = document.getElementById('footer-subtext-txt');
    if (el) el.textContent = currentConfig.footerSubtext;
  }

  // 16. Custom Uploaded Imagery
  if (currentConfig.heroPortraitImg) {
    const heroImg = document.querySelector('.hero-portrait-img');
    if (heroImg) heroImg.src = currentConfig.heroPortraitImg;
  }
  if (currentConfig.venueImg) {
    const vImg = document.querySelector('.venue-img');
    if (vImg) vImg.src = currentConfig.venueImg;
  }
  if (currentConfig.dressCodeImg) {
    const dcImg = document.querySelector('.moodboard-img');
    if (dcImg) dcImg.src = currentConfig.dressCodeImg;
  }

  // 17. Dynamic Section Visibility (Hides section from page AND removes from navigation menu)
  const vis = currentConfig.visibleSections || {};
  toggleSection('#envelope-gatekeeper', vis.envelope !== false);
  toggleSection('#hero', vis.hero !== false);
  toggleSection('#about', vis.about !== false);
  toggleSection('#vip-card', vis.vipCard !== false);
  toggleSection('#timeline', vis.timeline !== false);
  toggleSection('#dress-code', vis.dressCode !== false);
  toggleSection('#venue', vis.venue !== false);
  toggleSection('#rsvp', vis.rsvp !== false);
  toggleSection('#toasts', vis.toasts !== false);
  toggleSection('#registry', vis.registry !== false);
  toggleSection('#social', vis.social !== false);
  toggleSection('.social-moment-banner', vis.social !== false);
  toggleSection('#main-footer', vis.footer !== false);
  toggleSection('.luxury-footer', vis.footer !== false);

  if (vis.envelope === false) {
    document.body.classList.remove('loading-state');
    const gk = document.getElementById('envelope-gatekeeper');
    if (gk) gk.style.display = 'none';
  }

  // 15. Dynamic Itinerary
  if (currentConfig.itinerary && currentConfig.itinerary.length > 0) {
    renderDynamicTimeline(currentConfig.itinerary);
  }

  renderFloatingAdminBadge();
}

function setSwatch(idx, name) {
  const swatchName = document.querySelector(`.swatch-item:nth-child(${idx}) .swatch-name`);
  if (swatchName) swatchName.textContent = name;
  const swatchItem = document.querySelector(`.swatch-item:nth-child(${idx})`);
  if (swatchItem) swatchItem.title = `${name} Palette Accent`;
}

function toggleSection(selector, isVisible) {
  const elements = document.querySelectorAll(selector);
  elements.forEach(el => {
    el.style.display = isVisible ? '' : 'none';
  });

  // Also remove from Navbar Menu, Mobile Drawer, and Footer Table of Contents
  let anchor = null;
  if (selector.startsWith('#')) {
    anchor = selector;
  } else if (selector === '.social-moment-banner') {
    anchor = '#social';
  } else if (selector === '.luxury-footer') {
    anchor = '#main-footer';
  }

  if (anchor) {
    const matchingLinks = document.querySelectorAll(`a[href="${anchor}"], .nav-links a[href="${anchor}"], .footer-links a[href="${anchor}"], .mobile-nav a[href="${anchor}"]`);
    matchingLinks.forEach(link => {
      link.style.display = isVisible ? '' : 'none';
    });

    // Special case for RSVP nav button and hero CTA button
    if (anchor === '#rsvp') {
      const navRsvp = document.querySelector('.nav-rsvp-btn');
      if (navRsvp) navRsvp.style.display = isVisible ? '' : 'none';
      const heroRsvp = document.querySelector('.hero-cta-group a[href="#rsvp"]');
      if (heroRsvp) heroRsvp.style.display = isVisible ? '' : 'none';
    }
  }
}

function renderDynamicTimeline(items) {
  const wrapper = document.querySelector('.luxury-timeline-wrapper');
  if (!wrapper) return;

  wrapper.innerHTML = '<div class="timeline-central-spine"></div>';
  items.forEach((item, idx) => {
    const isLeft = idx % 2 === 0;
    const div = document.createElement('div');
    div.className = `timeline-item ${isLeft ? 'left' : 'right'} animate-timeline`;
    div.innerHTML = `
      <div class="timeline-time-badge">
        <span class="time-main">${escapeHtml(item.time || '')}</span>
        <span class="time-sub">${escapeHtml(item.label || 'PHASE')}</span>
      </div>
      <div class="timeline-content-card glass-card ${item.highlight ? 'highlight-glow' : ''}">
        <div class="t-card-icon"><i class="fa-solid fa-champagne-glasses"></i></div>
        <h3 class="t-card-title">${escapeHtml(item.title || '')}</h3>
        <p class="t-card-desc">${escapeHtml(item.desc || '')}</p>
        <span class="t-card-tag ${item.highlight ? 'gold-tag' : ''}">${escapeHtml(item.tag || 'Haute Moment')}</span>
      </div>
    `;
    wrapper.appendChild(div);
  });
}

function renderFloatingAdminBadge() {
  const existing = document.getElementById('floating-admin-access-badge');
  if (existing) existing.remove();

  const isMobile = window.innerWidth <= 768;
  const container = document.createElement('div');
  container.id = 'floating-admin-access-badge';
  container.style.cssText = `
    position: fixed;
    bottom: ${isMobile ? '12px' : '16px'};
    ${isMobile ? 'left: 12px;' : 'right: 16px;'};
    z-index: 99999;
    display: flex;
    align-items: center;
    background: rgba(12, 12, 18, 0.92);
    border: 1px solid #D4AF37;
    border-radius: 30px;
    padding: 3px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.85), 0 0 15px rgba(212, 175, 55, 0.35);
  `;

  container.innerHTML = `
    <a href="admin.html" style="background: linear-gradient(135deg, #F3E5AB, #D4AF37); color: #121212; font-weight: 700; text-decoration: none; padding: ${isMobile ? '6px 10px' : '5px 12px'}; border-radius: 20px; font-size: 0.68rem; letter-spacing: 1px; text-transform: uppercase; display: flex; align-items: center; gap: 4px;">
      <i class="fa-solid fa-crown"></i> <span>${isMobile ? 'CMS' : 'Studio CMS'}</span>
    </a>
  `;
  document.body.appendChild(container);
}

/* ==========================================================================
   SOUND & AMBIANCE CONTROLLER (Supports YouTube & Direct Audio)
   ========================================================================== */
function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/i;
  const match = cleanUrl.match(regExp);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) return cleanUrl;
  return null;
}

class LuxuryAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlayingLounge = false;
    this.loungeInterval = null;
    this.gainNode = null;
    this.masterVolume = 0.28;
    this.customAudio = null;
    this.ytPlayer = null;
    this.isYtReady = false;
    this.pendingYtVideoId = null;
    this.pendingAutoPlay = false;
    this.initYouTubeApi();
  }

  initYouTubeApi() {
    if (window.YT && window.YT.Player) {
      this.isYtReady = true;
      return;
    }
    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevReady === 'function') prevReady();
      this.isYtReady = true;
      if (this.pendingYtVideoId) {
        this.setupYouTubePlayer(this.pendingYtVideoId, this.pendingAutoPlay);
        this.pendingYtVideoId = null;
      }
    };
  }

  setupYouTubePlayer(videoId, autoPlay = true) {
    let container = document.getElementById('yt-bg-audio-slot');
    if (!container) {
      container = document.createElement('div');
      container.id = 'yt-bg-audio-slot';
      container.style.cssText = 'position:fixed; width:1px; height:1px; bottom:-200px; left:-200px; opacity:0; pointer-events:none; z-index:-9999;';
      document.body.appendChild(container);
    }

    if (!window.YT || !window.YT.Player) {
      this.pendingYtVideoId = videoId;
      this.pendingAutoPlay = autoPlay;
      return;
    }

    if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
      try {
        this.ytPlayer.loadVideoById(videoId);
        if (autoPlay) {
          this.ytPlayer.unMute();
          this.ytPlayer.setVolume(50);
          this.ytPlayer.playVideo();
        }
      } catch (e) {}
      return;
    }

    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-player-instance';
    container.innerHTML = '';
    container.appendChild(playerDiv);

    try {
      this.ytPlayer = new window.YT.Player('yt-player-instance', {
        height: '1',
        width: '1',
        videoId: videoId,
        playerVars: {
          autoplay: autoPlay ? 1 : 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          loop: 1,
          playlist: videoId,
          modestbranding: 1,
          rel: 0,
          playsinline: 1
        },
        events: {
          onReady: (event) => {
            this.isYtReady = true;
            if (autoPlay) {
              try {
                event.target.unMute();
                event.target.setVolume(50);
                event.target.playVideo();
              } catch (e) {}
            }
          },
          onStateChange: (event) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              this.isPlayingLounge = true;
              updateAudioBtnState(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              this.isPlayingLounge = false;
              updateAudioBtnState(false);
            }
          }
        }
      });
    } catch (err) {
      console.warn('YouTube Player initialization:', err);
    }
  }

  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    } catch (e) {}
  }

  playWaxBreakSound() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + idx * 0.04);
        noteGain.gain.setValueAtTime(0, now + idx * 0.04);
        noteGain.gain.linearRampToValueAtTime(0.18 / (idx + 1), now + idx * 0.04 + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 1.6);
        osc.connect(noteGain);
        noteGain.connect(this.gainNode);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 1.7);
      });
    } catch (e) {}
  }

  playChampagneClink() {
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const oscHarmonic = this.ctx.createOscillator();
      const clinkGain = this.ctx.createGain();
      osc.type = 'triangle';
      oscHarmonic.type = 'sine';
      osc.frequency.setValueAtTime(2480, now);
      oscHarmonic.frequency.setValueAtTime(4960, now);
      clinkGain.gain.setValueAtTime(0, now);
      clinkGain.gain.linearRampToValueAtTime(0.25, now + 0.005);
      clinkGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
      osc.connect(clinkGain);
      oscHarmonic.connect(clinkGain);
      clinkGain.connect(this.gainNode);
      osc.start(now);
      oscHarmonic.start(now);
      osc.stop(now + 1.25);
      oscHarmonic.stop(now + 1.25);
    } catch (e) {}
  }

  async startLoungeAmbiance() {
    try {
      if (this.loungeInterval) {
        clearInterval(this.loungeInterval);
        this.loungeInterval = null;
      }

      // 1. Fetch custom uploaded audio from IndexedDB for the current event
      let customAudioRec = null;
      if (window.CelebrationAudioDB) {
        try {
          customAudioRec = await window.CelebrationAudioDB.getAudio(currentEventSlug);
        } catch (e) {}
      }

      if (customAudioRec && customAudioRec.data) {
        const audioSrc = (typeof customAudioRec.data === 'string') ? customAudioRec.data : URL.createObjectURL(customAudioRec.data);
        if (!this.customAudio || this.customAudioSrc !== audioSrc) {
          if (this.customAudio) {
            try { this.customAudio.pause(); } catch (e) {}
          }
          this.customAudio = new Audio(audioSrc);
          this.customAudioSrc = audioSrc;
          this.customAudio.loop = true;
          this.customAudio.volume = 0.75;
        }
        const p = this.customAudio.play();
        if (p && typeof p.then === 'function') {
          p.then(() => {
            this.isPlayingLounge = true;
            updateAudioBtnState(true);
          }).catch(err => {
            console.warn('Audio playback waiting for user interaction:', err);
          });
        } else {
          this.isPlayingLounge = true;
          updateAudioBtnState(true);
        }
        return;
      }

      // 2. Synthesized Infectious Nu-Disco & Met Gala Celebration Hit (120 BPM, Catchy & Upbeat)
      this.init();
      if (!this.ctx) return;
      this.isPlayingLounge = true;
      updateAudioBtnState(true);

      // Hit Disco-Pop Progression: Bm7 -> E9 -> Gmaj7 -> F#7 (Daft Punk / Dua Lipa / Sophie Ellis-Bextor style)
      const hitProgressions = [
        {
          root: 123.47, // B2
          bassNotes: [123.47, 246.94, 123.47, 185.00], // Funky slap bass pattern
          chords: [493.88, 587.33, 739.99, 880.00],    // Bm9
          lead: [739.99, 880.00, 987.77, 1174.66]       // Catchy hook note sequence
        },
        {
          root: 164.81, // E3
          bassNotes: [164.81, 329.63, 164.81, 246.94], // E9 funky bounce
          chords: [493.88, 659.25, 783.99, 987.77],    // E9
          lead: [987.77, 880.00, 739.99, 659.25]
        },
        {
          root: 196.00, // G3
          bassNotes: [196.00, 392.00, 196.00, 293.66], // Gmaj7
          chords: [587.33, 739.99, 880.00, 1174.66],   // Gmaj7
          lead: [1174.66, 987.77, 880.00, 739.99]
        },
        {
          root: 185.00, // F#3
          bassNotes: [185.00, 370.00, 185.00, 277.18], // F#7 dominant turnaround
          chords: [554.37, 739.99, 880.00, 1108.73],   // F#7#9
          lead: [880.00, 987.77, 1108.73, 1318.51]
        }
      ];

      let progIdx = 0;
      let beatCount = 0;

      const playHitBar = () => {
        if (!this.isPlayingLounge || !this.ctx) return;
        const currentBar = hitProgressions[progIdx];
        progIdx = (progIdx + 1) % hitProgressions.length;
        const now = this.ctx.currentTime;
        const barDuration = 1.95; // ~123 BPM

        // 1. Four-on-the-floor Dance Kick & Hi-Hat Shimmer
        for (let b = 0; b < 4; b++) {
          const beatTime = now + b * (barDuration / 4);

          // Punchy Dance Kick
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.frequency.setValueAtTime(140, beatTime);
          kickOsc.frequency.exponentialRampToValueAtTime(38, beatTime + 0.12);
          kickGain.gain.setValueAtTime(0.08, beatTime);
          kickGain.gain.exponentialRampToValueAtTime(0.0001, beatTime + 0.14);
          kickOsc.connect(kickGain);
          kickGain.connect(this.gainNode);
          kickOsc.start(beatTime);
          kickOsc.stop(beatTime + 0.15);

          // Crisp Disco Hi-Hat on off-beats
          const hatTime = beatTime + (barDuration / 8);
          const hatOsc = this.ctx.createOscillator();
          const hatGain = this.ctx.createGain();
          const hatFilter = this.ctx.createBiquadFilter();
          hatOsc.type = 'square';
          hatOsc.frequency.setValueAtTime(8000 + Math.random() * 2000, hatTime);
          hatFilter.type = 'highpass';
          hatFilter.frequency.setValueAtTime(7000, hatTime);
          hatGain.gain.setValueAtTime(0.02, hatTime);
          hatGain.gain.exponentialRampToValueAtTime(0.0001, hatTime + 0.05);
          hatOsc.connect(hatFilter);
          hatFilter.connect(hatGain);
          hatGain.connect(this.gainNode);
          hatOsc.start(hatTime);
          hatOsc.stop(hatTime + 0.06);
        }

        // 2. Funky Slap Bass Riff
        currentBar.bassNotes.forEach((freq, idx) => {
          const noteTime = now + idx * (barDuration / 4);
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          const bassFilter = this.ctx.createBiquadFilter();

          bassOsc.type = 'sawtooth';
          bassOsc.frequency.setValueAtTime(freq, noteTime);

          bassFilter.type = 'lowpass';
          bassFilter.frequency.setValueAtTime(850, noteTime);
          bassFilter.frequency.exponentialRampToValueAtTime(280, noteTime + 0.22);

          bassGain.gain.setValueAtTime(0.065, noteTime);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.24);

          bassOsc.connect(bassFilter);
          bassFilter.connect(bassGain);
          bassGain.connect(this.gainNode);

          bassOsc.start(noteTime);
          bassOsc.stop(noteTime + 0.25);
        });

        // 3. Rhythmic Funk Chords
        [0.24, 0.73, 1.22, 1.71].forEach((offset) => {
          currentBar.chords.forEach((freq, ci) => {
            const chordTime = now + offset;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();

            osc.type = ci % 2 === 0 ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, chordTime);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1200, chordTime);
            filter.Q.setValueAtTime(1.5, chordTime);

            gain.gain.setValueAtTime(0.03, chordTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, chordTime + 0.22);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.gainNode);

            osc.start(chordTime);
            osc.stop(chordTime + 0.23);
          });
        });

        // 4. Catchy Sparkling Synth Hook Melody
        currentBar.lead.forEach((leadFreq, li) => {
          const leadTime = now + li * (barDuration / 4) + 0.1;
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          const leadFilter = this.ctx.createBiquadFilter();

          leadOsc.type = 'sine';
          leadOsc.frequency.setValueAtTime(leadFreq, leadTime);

          leadFilter.type = 'lowpass';
          leadFilter.frequency.setValueAtTime(2500, leadTime);

          leadGain.gain.setValueAtTime(0.035, leadTime);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, leadTime + 0.28);

          leadOsc.connect(leadFilter);
          leadFilter.connect(leadGain);
          leadGain.connect(this.gainNode);

          leadOsc.start(leadTime);
          leadOsc.stop(leadTime + 0.3);
        });
      };

      playHitBar();
      this.loungeInterval = setInterval(playHitBar, 1950);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  stopLoungeAmbiance() {
    this.isPlayingLounge = false;
    updateAudioBtnState(false);
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }
    if (this.customAudio) {
      try { this.customAudio.pause(); } catch (e) {}
    }
    if (this.loungeInterval) {
      clearInterval(this.loungeInterval);
      this.loungeInterval = null;
    }
  }

  async toggleLoungeAmbiance() {
    if (this.isPlayingLounge) {
      this.stopLoungeAmbiance();
      return false;
    } else {
      await this.startLoungeAmbiance();
      return true;
    }
  }
}

const luxuryAudio = new LuxuryAudioEngine();
window.luxuryAudio = luxuryAudio;

/* ==========================================================================
   GOLDEN STARDUST & SPARKLING STARLIGHT CANVAS ENGINE
   ========================================================================== */
class StardustEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.particleCount = window.innerWidth < 768 ? 24 : 65;
    this.mouse = { x: null, y: null, radius: 120 };
    this.init();
  }

  init() {
    this.resize();
    this.isScrolling = false;
    this.scrollTimeout = null;

    window.addEventListener('resize', () => this.resize(), { passive: true });

    // Instantly pause particle canvas repainting during mobile touch scrolling for 60 FPS native smoothness
    window.addEventListener('scroll', () => {
      if (window.innerWidth <= 768) {
        this.isScrolling = true;
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
          this.isScrolling = false;
        }, 120);
      }
    }, { passive: true });

    if (window.innerWidth > 768) {
      window.addEventListener('mousemove', (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        if (Math.random() < 0.1) {
          this.addCursorSparkle(e.clientX, e.clientY);
        }
      }, { passive: true });
      window.addEventListener('mouseleave', () => {
        this.mouse.x = null;
        this.mouse.y = null;
      }, { passive: true });
    }

    this.createParticles();
    this.animate();
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  addCursorSparkle(x, y) {
    if (this.particles.length > (window.innerWidth < 768 ? 20 : 90)) return;
    this.particles.push({
      x: x + (Math.random() - 0.5) * 15,
      y: y + (Math.random() - 0.5) * 15,
      size: Math.random() * 2.5 + 1,
      speedX: (Math.random() - 0.5) * 1,
      speedY: Math.random() * -1.2 - 0.4,
      opacity: 1,
      decay: Math.random() * 0.04 + 0.03,
      isSparkle: true,
      color: 'rgba(255, 235, 160, '
    });
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2.2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3 - 0.15,
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.03 + 0.008,
        pulseAngle: Math.random() * Math.PI * 2,
        isStar: Math.random() > 0.7,
        color: this.getRandomGoldColor()
      });
    }
  }

  getRandomGoldColor() {
    const golds = ['rgba(243, 229, 171, ', 'rgba(212, 175, 55, ', 'rgba(255, 223, 115, ', 'rgba(255, 255, 255, '];
    return golds[Math.floor(Math.random() * golds.length)];
  }

  drawSparkleStar(ctx, cx, cy, spikes, outerRadius, innerRadius, alpha, color) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = color + alpha + ')';
    ctx.fill();
  }

  animate() {
    if (this.isScrolling && window.innerWidth <= 768) {
      requestAnimationFrame(() => this.animate());
      return;
    }
    this.ctx.clearRect(0, 0, this.width, this.height);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.isSparkle) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.opacity -= p.decay;
        if (p.opacity <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        this.drawSparkleStar(this.ctx, p.x, p.y, 4, p.size * 1.8, p.size * 0.5, p.opacity, p.color);
        continue;
      }

      p.x += p.speedX;
      p.y += p.speedY;
      p.pulseAngle += p.pulseSpeed;
      const currentOpacity = p.opacity + Math.sin(p.pulseAngle) * 0.25;
      const finalAlpha = Math.max(0.08, Math.min(1, currentOpacity));

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      if (this.mouse.x !== null && this.mouse.y !== null) {
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < this.mouse.radius) {
          const force = (this.mouse.radius - distance) / this.mouse.radius;
          p.x += (dx / distance) * force * 2.5;
          p.y += (dy / distance) * force * 2.5;
        }
      }

      if (p.isStar) {
        this.drawSparkleStar(this.ctx, p.x, p.y, 4, p.size * 1.8, p.size * 0.5, finalAlpha, p.color);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color + finalAlpha + ')';
        this.ctx.fill();
      }
    }
    requestAnimationFrame(() => this.animate());
  }
}

/* ==========================================================================
   GLOBAL AUDIO AUTO-START ON SITE LAUNCH
   ========================================================================== */
function autoStartBackgroundMusic() {
  const tryStartAudio = () => {
    if (luxuryAudio && !luxuryAudio.isPlayingLounge) {
      luxuryAudio.startLoungeAmbiance();
      updateAudioBtnState(true);
    }
  };

  // 1. Immediate attempt on page load
  try {
    tryStartAudio();
  } catch (e) {}

  // 2. Seamless user interaction trigger to guarantee playback across all browsers
  const startOnFirstInteraction = () => {
    tryStartAudio();
    ['click', 'pointerdown', 'touchstart'].forEach(ev => {
      window.removeEventListener(ev, startOnFirstInteraction, true);
    });
  };

  ['click', 'pointerdown', 'touchstart'].forEach(ev => {
    window.addEventListener(ev, startOnFirstInteraction, { once: true, passive: true, capture: true });
  });
}

/* ==========================================================================
   GLOBAL DIRECT ENVELOPE OPEN FUNCTION (4-SEC EXPOSURE, DOWNWARD FLIGHT & CENTERED INVITATION)
   ========================================================================== */
window.openEnvelopeNow = function(isInstant = false) {
  const gatekeeper = document.getElementById('envelope-gatekeeper');
  const envelope = document.getElementById('interactive-envelope');
  const waxSeal = document.getElementById('wax-seal-btn');

  if (!gatekeeper) return;

  try { luxuryAudio.playWaxBreakSound(); } catch (e) {}
  // Do NOT start heavy audio synthesis on reveal to ensure instantaneous 60fps opening

  if (gatekeeper) gatekeeper.classList.add('unsealed');
  if (envelope) {
    envelope.classList.add('unsealed');
    envelope.style.background = 'transparent';
    envelope.style.boxShadow = 'none';
    envelope.style.border = 'none';
    envelope.style.outline = 'none';
    envelope.querySelectorAll('.envelope-pocket, .envelope-flap-fold, .envelope-flap-back').forEach(el => {
      el.remove();
    });
  }
  if (waxSeal) {
    waxSeal.remove();
  }

  // Subtle atmospheric golden aura pulse
  const sealRect = waxSeal ? waxSeal.getBoundingClientRect() : { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 - 40, width: 80, height: 80 };
  const sealCenterX = sealRect.left + sealRect.width / 2;
  const sealCenterY = sealRect.top + sealRect.height / 2;

  const shockwave = document.createElement('div');
  shockwave.style.position = 'fixed';
  shockwave.style.left = `${sealCenterX}px`;
  shockwave.style.top = `${sealCenterY}px`;
  shockwave.style.width = '100px';
  shockwave.style.height = '100px';
  shockwave.style.borderRadius = '50%';
  shockwave.style.pointerEvents = 'none';
  shockwave.style.zIndex = '99999';
  shockwave.style.animation = 'magicalAuraExpansion 1.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
  document.body.appendChild(shockwave);
  setTimeout(() => shockwave.remove(), 1600);

  // Initialize Interactive 3D Touch & Cursor Tilt for the Invitation Pass
  initEnvelope3DTilt();

  // Exact 5-second majestic exposure centered on screen, then smoothly dissolves into live site
  const exposureDelay = (isInstant === true) ? 200 : 5000;
  const finishDelay = (isInstant === true) ? 600 : 6200;

  setTimeout(() => {
    if (gatekeeper) gatekeeper.classList.add('fly-down-exit');
  }, exposureDelay);

  // Centered full-screen celebration invitation is revealed seamlessly
  setTimeout(() => {
    gatekeeper.classList.add('opened');
    document.body.classList.remove('loading-state');
  }, finishDelay);
};

function initEnvelope3DTilt() {
  const envelope = document.getElementById('interactive-envelope');
  const letter = document.getElementById('envelope-letter');
  const holoSheen = document.getElementById('env-holo-sheen');
  const gatekeeper = document.getElementById('envelope-gatekeeper');

  if (!envelope || !letter) return;

  letter.style.touchAction = 'none';
  if (gatekeeper) gatekeeper.style.touchAction = 'none';

  const handleTilt = (clientX, clientY) => {
    if (!envelope.classList.contains('unsealed')) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const rotateX = Math.max(-20, Math.min(20, ((clientY - centerY) / centerY) * -22));
    const rotateY = Math.max(-20, Math.min(20, ((clientX - centerX) / centerX) * 22));

    letter.style.transition = 'transform 0.08s ease-out, box-shadow 0.15s ease';
    letter.style.transform = `translate(-50%, -50%) perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`;

    if (holoSheen) {
      const sheenX = (clientX / window.innerWidth) * 100;
      const sheenY = (clientY / window.innerHeight) * 100;
      holoSheen.style.background = `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255, 223, 115, 0.6) 0%, rgba(13, 59, 46, 0.35) 45%, transparent 75%)`;
    }
  };

  const handleReset = () => {
    if (!envelope.classList.contains('unsealed')) return;
    letter.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s ease';
    letter.style.transform = 'translate(-50%, -50%) perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  };

  // Mouse move tilt
  window.addEventListener('mousemove', (e) => handleTilt(e.clientX, e.clientY), { passive: true });
  window.addEventListener('mouseleave', handleReset, { passive: true });

  // Mobile Touch Drag 3D Tilt for Invitation Pass
  const onTouch = (e) => {
    if (e.touches && e.touches[0]) {
      handleTilt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  [letter, gatekeeper, window].forEach(target => {
    if (target) {
      target.addEventListener('touchstart', onTouch, { passive: true });
      target.addEventListener('touchmove', onTouch, { passive: true });
      target.addEventListener('touchend', handleReset, { passive: true });
      target.addEventListener('touchcancel', handleReset, { passive: true });
    }
  });
}

/* ==========================================================================
   INTERACTIVE 3D MAGNETIC CARD TILT (EXCLUDING ALL FORMS & INPUTS)
   ========================================================================== */
function initCardMagneticTilts() {
  if (window.innerWidth <= 768) return; // Skip CPU tilt calculation on mobile touch devices
  // Only target visual cards, strictly ignoring RSVP forms, radio cards, and inputs
  const cards = document.querySelectorAll('.about-card, .guide-card, .venue-details-card, .registry-card, .toast-card, .portrait-frame-container');
  cards.forEach(card => {
    if (card.closest('.rsvp-section') || card.closest('form') || card.classList.contains('rsvp-wrapper') || card.classList.contains('radio-card')) {
      return;
    }
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -5.0;
      const rotateY = ((x - centerX) / centerX) * 5.0;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

function spawnBurstParticles(centerX, centerY) {
  const burstCount = 40;
  const emojis = ['🥂', '✨', '💎', '✦', '★', '🍾'];

  for (let i = 0; i < burstCount; i++) {
    const el = document.createElement('div');
    const isEmoji = Math.random() > 0.65;

    el.style.position = 'fixed';
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.pointerEvents = 'none';
    el.style.zIndex = '999999';
    el.style.transition = 'all 1.4s cubic-bezier(0.16, 1, 0.3, 1)';

    if (isEmoji) {
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.fontSize = `${Math.random() * 16 + 12}px`;
      el.style.filter = 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.8))';
    } else {
      const size = Math.random() * 8 + 4;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.backgroundColor = ['#FFDF73', '#D4AF37', '#F3E5AB', '#FFFFFF', '#0D3B2E'][Math.floor(Math.random() * 5)];
      el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      el.style.boxShadow = '0 0 10px rgba(255, 223, 115, 0.8)';
    }

    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 260 + 90;
    const targetX = centerX + Math.cos(angle) * distance;
    const targetY = centerY + Math.sin(angle) * distance;

    requestAnimationFrame(() => {
      el.style.left = `${targetX}px`;
      el.style.top = `${targetY}px`;
      el.style.opacity = '0';
      el.style.transform = `scale(${Math.random() * 1.6}) rotate(${Math.random() * 720 - 360}deg)`;
    });

    setTimeout(() => el.remove(), 1400);
  }
}

function updateAudioBtnState(isPlaying) {
  const audioBtn = document.getElementById('audio-toggle-btn');
  const audioIcon = document.getElementById('audio-icon');
  if (!audioBtn) return;
  if (isPlaying) {
    audioBtn.classList.add('playing');
    if (audioIcon) audioIcon.className = 'fa-solid fa-volume-high';
  } else {
    audioBtn.classList.remove('playing');
    if (audioIcon) audioIcon.className = 'fa-solid fa-volume-xmark';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ==========================================================================
   MAIN EVENT WIRING & ISOLATED RSVP SUBMISSIONS
   ========================================================================== */
function initAllFeatures() {
  new StardustEngine('stardust-canvas');
  initCardMagneticTilts();

  // Envelope Listeners
  const waxSeal = document.getElementById('wax-seal-btn');
  const directBtn = document.getElementById('direct-enter-btn');
  const envelope = document.getElementById('interactive-envelope');

  if (waxSeal) {
    waxSeal.onclick = window.openEnvelopeNow;
    waxSeal.addEventListener('click', window.openEnvelopeNow);
  }
  if (directBtn) {
    directBtn.onclick = window.openEnvelopeNow;
    directBtn.addEventListener('click', window.openEnvelopeNow);
  }
  if (envelope) {
    envelope.addEventListener('click', (e) => {
      if (e.target.closest('#wax-seal-btn') || e.target.closest('.envelope-paper-letter')) {
        window.openEnvelopeNow();
      }
    });
  }

  // 3D Card Tilt
  const container = document.getElementById('card-3d-container');
  const card = document.getElementById('vip-invitation-card');
  const holoSheen = document.getElementById('holo-sheen');
  const liveGuestInput = document.getElementById('live-guest-input');
  const previewGuestName = document.getElementById('preview-guest-name');

  if (container && card) {
    const handleCardTilt = (clientX, clientY) => {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = Math.max(-16, Math.min(16, ((y - centerY) / centerY) * -16));
      const rotateY = Math.max(-16, Math.min(16, ((x - centerX) / centerX) * 16));
      card.style.animation = 'none'; // Stop auto-animation during active touch/mouse
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
      if (holoSheen) {
        const sheenX = (x / rect.width) * 100;
        const sheenY = (y / rect.height) * 100;
        holoSheen.style.animation = 'none';
        holoSheen.style.background = `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255, 223, 115, 0.55) 0%, rgba(13, 59, 46, 0.3) 45%, transparent 75%)`;
      }
    };

    const resetCardTilt = () => {
      if (window.innerWidth <= 768) {
        card.style.animation = 'cardMobileTiltFloat 6s ease-in-out infinite alternate';
        if (holoSheen) holoSheen.style.animation = 'cardMobileSheen 4s ease-in-out infinite alternate';
      } else {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
    };

    container.addEventListener('mousemove', (e) => handleCardTilt(e.clientX, e.clientY), { passive: true });
    container.addEventListener('mouseleave', resetCardTilt, { passive: true });

    // Full Mobile Touch Support
    container.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        handleCardTilt(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        handleCardTilt(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    container.addEventListener('touchend', resetCardTilt, { passive: true });
    container.addEventListener('touchcancel', resetCardTilt, { passive: true });

    if (liveGuestInput) {
      liveGuestInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const defaultName = (window.currentEventConfig && (window.currentEventConfig.vipPassGuestName || window.currentEventConfig.vipPassGuestSample)) || (currentEventSlug === 'master_default' ? 'Valued Guest & Plus One' : 'Дорогой Гость');
        const displayName = val || defaultName;
        document.querySelectorAll('#preview-guest-name, .card-guest-name, .env-guest, #ticket-guest-name').forEach(el => {
          el.textContent = displayName;
        });
      });
    }
  }

  // Countdown Timer (Dynamic from CMS eventDatePicker)
  let targetIso = '2026-09-26T19:00:00';
  if (currentConfig && currentConfig.eventDatePicker) {
    targetIso = `${currentConfig.eventDatePicker}T19:00:00`;
  } else if (currentConfig && currentConfig.eventIsoDate) {
    targetIso = currentConfig.eventIsoDate;
  }
  const targetDate = new Date(targetIso).getTime();
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minEl = document.getElementById('cd-minutes');
  const secEl = document.getElementById('cd-seconds');

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      if (daysEl) daysEl.textContent = '00';
      if (hoursEl) hoursEl.textContent = '00';
      if (minEl) minEl.textContent = '00';
      if (secEl) secEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
    if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
    if (minEl) minEl.textContent = String(minutes).padStart(2, '0');
    if (secEl) secEl.textContent = String(seconds).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // RSVP Form (Multi-Tenant Saved into currentEventSlug DB)
  const rsvpForm = document.getElementById('rsvp-form');
  const plusOneSelect = document.getElementById('rsvp-plusone-count');
  const plusOneNameGroup = document.getElementById('plus-one-name-group');
  const ticketModal = document.getElementById('ticket-modal');
  const closeTicketBtn = document.getElementById('close-ticket-btn');
  const dismissTicketBtn = document.getElementById('dismiss-ticket-btn');
  const printTicketBtn = document.getElementById('print-ticket-btn');

  document.querySelectorAll('.radio-card').forEach((card) => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.radio-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  if (plusOneSelect && plusOneNameGroup) {
    plusOneSelect.addEventListener('change', (e) => {
      plusOneNameGroup.style.display = e.target.value === '1' ? 'flex' : 'none';
    });
  }

  // Helper for real domain email validation
  function isRealValidEmail(email) {
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

  // Live RSVP Email validation input feedback
  const rsvpEmailInput = document.getElementById('rsvp-email');
  const rsvpEmailFeedback = document.getElementById('rsvp-email-feedback');
  if (rsvpEmailInput) {
    const validateEmailField = () => {
      const val = rsvpEmailInput.value.trim();
      if (!val) {
        rsvpEmailInput.style.borderColor = '';
        rsvpEmailInput.style.boxShadow = '';
        if (rsvpEmailFeedback) {
          rsvpEmailFeedback.style.display = 'none';
          rsvpEmailFeedback.textContent = '';
        }
        return false;
      }
      
      const isValid = isRealValidEmail(val);
      if (isValid) {
        rsvpEmailInput.style.borderColor = '#55EFC4';
        rsvpEmailInput.style.boxShadow = '0 0 10px rgba(85, 239, 196, 0.35)';
        if (rsvpEmailFeedback) {
          rsvpEmailFeedback.style.display = 'block';
          rsvpEmailFeedback.style.color = '#55EFC4';
          rsvpEmailFeedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> Valid email address for VIP Confirmation';
        }
        return true;
      } else {
        rsvpEmailInput.style.borderColor = '#FF7675';
        rsvpEmailInput.style.boxShadow = '0 0 10px rgba(255, 118, 117, 0.35)';
        if (rsvpEmailFeedback) {
          rsvpEmailFeedback.style.display = 'block';
          rsvpEmailFeedback.style.color = '#FF7675';
          rsvpEmailFeedback.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Please enter a real email with a valid domain (e.g. name@example.com)';
        }
        return false;
      }
    };

    rsvpEmailInput.addEventListener('input', validateEmailField);
    rsvpEmailInput.addEventListener('blur', validateEmailField);
  }

  // Google Maps button click handler
  document.querySelectorAll('#open-gmaps-btn, .btn-location').forEach(btn => {
    btn.addEventListener('click', () => {
      let mapUrl = currentConfig?.venueMapUrl;
      if (!mapUrl || mapUrl === 'https://maps.google.com' || mapUrl === '#') {
        const query = currentConfig?.venueAddress || `${currentConfig?.venueName || 'Villa Solaria Penthouse'}, ${currentConfig?.venueCity || 'Milan, Italy'}`;
        mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }
      btn.href = mapUrl;
    });
  });

  // Direct Frictionless RSVP & VIP Pass Generation
  let currentRegisteredGuest = null;

  function renderAndDownloadPassImage(guest) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const eventTitle = (currentConfig?.milestoneTitle || currentConfig?.eventName || 'EXCLUSIVE CELEBRATION GALA').toUpperCase();
    const presentsText = (currentConfig?.vipPassPresents || 'CORDIALLY INVITES').toUpperCase();
    const protagonist = currentConfig?.protagonistName || 'Aurelia Vance';
    const monogram = (currentConfig?.protagonistMonogram || 'VIP').slice(0, 3);
    const dateText = currentConfig?.vipPassDate || currentConfig?.eventDateText || 'Saturday, Sep 26, 2026';
    const timeText = currentConfig?.receptionTime || currentConfig?.vipPassTime || currentConfig?.eventTimeText || '19:00 CEST';
    let venueName = currentConfig?.venueName || 'Private Penthouse';
    let venueCity = currentConfig?.venueCity || '';

    if (venueName.includes(',')) {
      const vParts = venueName.split(',');
      venueName = vParts[0].trim();
      if (!venueCity) venueCity = vParts.slice(1).join(',').trim();
    }
    const venueDisplay = venueCity ? `${venueName}, ${venueCity}` : venueName;

    // Helper: Rounded Rectangle
    function roundRect(x, y, w, h, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + w - radius, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
      ctx.lineTo(x + w, y + h - radius);
      ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
      ctx.lineTo(x + radius, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    // 1. Full Solid Canvas Background (100% Obsidian Luxury, NO transparent corners)
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, 1200, 720);

    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 720);
    bgGrad.addColorStop(0, '#0c0c14');
    bgGrad.addColorStop(0.5, '#161626');
    bgGrad.addColorStop(1, '#08080e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 720);

    // 2. Gold Foil Outer Border
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3.5;
    roundRect(24, 24, 1152, 672, 24);
    ctx.stroke();

    // Subtle Inner Border
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    roundRect(32, 32, 1136, 656, 18);
    ctx.stroke();

    // 3. Stardust Accents
    ctx.fillStyle = '#FFDF73';
    for (let i = 0; i < 45; i++) {
      const sx = 40 + Math.random() * 1120;
      const sy = 40 + Math.random() * 640;
      const sr = Math.random() * 2.2;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- TOP ROW ---
    // Top Left: Gold Square Monogram Badge
    const monoGrad = ctx.createLinearGradient(70, 65, 155, 150);
    monoGrad.addColorStop(0, '#FFF3C4');
    monoGrad.addColorStop(0.5, '#D4AF37');
    monoGrad.addColorStop(1, '#9B7B3E');
    ctx.fillStyle = monoGrad;
    roundRect(70, 65, 85, 85, 12);
    ctx.fill();

    // Monogram Letters inside box
    ctx.fillStyle = '#0a0a0f';
    ctx.font = 'bold 36px "Cinzel", "Forum", "Cormorant SC", "Playfair Display", serif';
    ctx.textAlign = 'center';
    ctx.fillText(monogram, 112, 122);

    // Code text next to monogram
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFDF73';
    ctx.font = 'bold 14px "Montserrat", sans-serif';
    ctx.letterSpacing = '2.5px';
    ctx.fillText((currentConfig?.vipPassCodeBadge || 'VIP • ALL ACCESS').toUpperCase(), 175, 114);

    // Top Right: Gold Pill Tier Badge
    const tierText = (currentConfig?.vipPassTierBadge || 'ALL-ACCESS VIP').toUpperCase();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.12)';
    roundRect(870, 70, 260, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#FFDF73';
    ctx.font = 'bold 14px "Montserrat", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`◆  ${tierText}`, 1000, 102);

    // --- CENTER INVITATION DETAILS ---
    // 1. Presents Line
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9B988F';
    ctx.font = 'bold 14px "Montserrat", sans-serif';
    ctx.letterSpacing = '4px';
    ctx.fillText(presentsText, 600, 230);

    // 2. Guest of Honor Name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 38px "Cinzel", "Forum", "Playfair Display", "Times New Roman", serif';
    const guestDisplayName = guest.name + (guest.plusOneName ? ` & ${guest.plusOneName}` : '');
    ctx.fillText(guestDisplayName.slice(0, 36), 600, 290);

    // 3. Occasion / Event Title
    ctx.fillStyle = '#FFDF73';
    ctx.font = 'bold 16px "Cinzel", "Forum", "Playfair Display", serif';
    ctx.letterSpacing = '2px';
    ctx.fillText(eventTitle.slice(0, 48), 600, 355);

    // 4. Protagonist Glowing Cursive Name
    ctx.fillStyle = '#FFDF73';
    ctx.font = 'italic 52px "Alex Brush", "Great Vibes", "Marck Script", "Bad Script", "Caveat", "Playfair Display", serif';
    ctx.fillText(protagonist, 600, 435);

    // --- GOLD DIVIDER LINE ---
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(70, 505);
    ctx.lineTo(1130, 505);
    ctx.stroke();

    // --- BOTTOM ROW (4 EVEN COLUMNS) ---
    // Col 1: DATE
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9B7B3E';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DATE', 170, 550);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(dateText.slice(0, 22), 170, 585);

    // Col 2: TIME
    ctx.fillStyle = '#9B7B3E';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('TIME', 450, 550);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(timeText.slice(0, 20), 450, 585);

    // Col 3: VENUE
    ctx.fillStyle = '#9B7B3E';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('VENUE', 740, 550);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(venueDisplay.slice(0, 24), 740, 585);

    // Col 4: QR & PASS ID
    ctx.fillStyle = '#9B7B3E';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('SECURITY CODE', 1010, 550);
    ctx.fillStyle = '#FFDF73';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(guest.passId || `${monogram}-8849-VIP`, 1010, 585);

    // Bottom Gold Accent Dot
    ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText('✦ EXCLUSIVE VIP DIGITAL INVITATION ✦', 600, 655);

    // Trigger Image Download
    try {
      const imageUri = canvas.toDataURL('image/png');
      const dlLink = document.createElement('a');
      const safeName = (guest.name || 'VIP_Guest').replace(/[^a-zA-Z0-9_-]/g, '_');
      dlLink.download = `VIP_Invitation_${safeName}.png`;
      dlLink.href = imageUri;
      document.body.appendChild(dlLink);
      dlLink.click();
      document.body.removeChild(dlLink);
    } catch (err) {
      console.error('Error generating pass image:', err);
      window.print();
    }
  }

  // RSVP Email Autocompletion / Recognition
  if (rsvpEmailInput) {
    rsvpEmailInput.addEventListener('change', (e) => {
      const emailVal = e.target.value.trim().toLowerCase();
      if (!emailVal || !cmsStorage) return;
      const existingGuests = cmsStorage.getGuests(currentEventSlug);
      const matched = existingGuests.find(g => (g.email || '').toLowerCase() === emailVal);
      if (matched) {
        currentRegisteredGuest = matched;
        const nameInput = document.getElementById('rsvp-name');
        const songInput = document.getElementById('rsvp-song');
        const msgInput = document.getElementById('rsvp-message');
        if (nameInput && !nameInput.value) nameInput.value = matched.name || '';
        if (songInput && !songInput.value) songInput.value = matched.song || '';
        if (msgInput && !msgInput.value) msgInput.value = matched.message || '';
      }
    });
  }

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('rsvp-name')?.value || '').trim() || 'Distinguished Guest';
      const email = (document.getElementById('rsvp-email')?.value || '').trim() || 'guest@domain.com';
      const attendanceEl = document.querySelector('input[name="attendance"]:checked');
      const attendance = attendanceEl ? attendanceEl.value : 'attending';
      const plusOneCount = plusOneSelect ? plusOneSelect.value : '0';
      const plusOneName = document.getElementById('rsvp-plusone-name')?.value.trim() || '';
      const dietary = document.getElementById('rsvp-dietary')?.value || 'Chef Selection';
      const cocktail = document.getElementById('rsvp-cocktail')?.value || 'Dom Pérignon';
      const song = document.getElementById('rsvp-song')?.value.trim() || '';
      const message = document.getElementById('rsvp-message')?.value.trim() || '';

      const existingGuests = cmsStorage ? cmsStorage.getGuests(currentEventSlug) : [];
      let guestRecord = existingGuests.find(g => (g.email || '').toLowerCase() === email.toLowerCase());

      const monoPrefix = (currentConfig?.protagonistMonogram || 'VIP').toUpperCase().slice(0, 3);
      const generatedPassId = `${monoPrefix}-${Math.floor(1000 + Math.random() * 9000)}-VIP`;

      if (guestRecord) {
        // Update existing record
        guestRecord.name = name;
        guestRecord.attendance = attendance;
        guestRecord.plusOneCount = plusOneCount;
        guestRecord.plusOneName = plusOneName;
        guestRecord.dietary = dietary;
        guestRecord.cocktail = cocktail;
        guestRecord.song = song;
        guestRecord.message = message;
        guestRecord.status = attendance === 'attending' ? 'attending' : 'declined';
        localStorage.setItem(`cms_event_${currentEventSlug}_guests`, JSON.stringify(existingGuests));
      } else {
        // Create new guest
        guestRecord = {
          name,
          email,
          attendance,
          plusOne: plusOneCount !== '0' ? `Yes (${plusOneName || 'Companion'})` : 'No',
          plusOneCount,
          plusOneName,
          dietary,
          cocktail,
          song,
          message,
          status: attendance === 'attending' ? 'attending' : 'declined',
          passId: generatedPassId,
          doorCheckIn: false,
          createdAt: new Date().toISOString()
        };
        if (cmsStorage) {
          cmsStorage.addGuest(currentEventSlug, guestRecord);
        }
      }

      currentRegisteredGuest = guestRecord;

      // Cross-device sync RSVP to server
      try {
        const apiBase = (cmsStorage && typeof cmsStorage.getApiBaseUrl === 'function') ? cmsStorage.getApiBaseUrl() : '';
        fetch(`${apiBase}/api/events/${encodeURIComponent(currentEventSlug)}/guests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(guestRecord)
        }).catch(() => {});
      } catch (eFetch) {}

      // Real-time broadcast RSVP to Admin Studio
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('cms_live_sync');
          bc.postMessage({ type: 'guest_rsvp', slug: currentEventSlug, guest: guestRecord });
        }
      } catch (eBc) {}

      // Hydrate Ticket Modal completely with this specific event's data
      const ticketMonogram = document.getElementById('ticket-monogram');
      const ticketEventTitle = document.getElementById('ticket-event-title');
      const ticketGuestName = document.getElementById('ticket-guest-name');
      const ticketPassType = document.getElementById('ticket-pass-type');
      const ticketSeatTier = document.getElementById('ticket-seat-tier');
      const ticketDateStr = document.getElementById('ticket-date-str');
      const ticketTimeStr = document.getElementById('ticket-time-str');
      const ticketCodeStr = document.getElementById('ticket-code-str');
      const ticketVenueStr = document.getElementById('ticket-venue-str');

      const ticketPresents = document.getElementById('ticket-presents-str');
      const ticketProtagonist = document.getElementById('ticket-protagonist-name');
      const ticketCodeBadge = document.getElementById('ticket-code-badge');

      if (ticketMonogram) ticketMonogram.textContent = currentConfig?.protagonistMonogram || 'VIP';
      if (ticketCodeBadge) ticketCodeBadge.textContent = currentConfig?.vipPassCodeBadge || 'VIP • ALL ACCESS';
      if (ticketPassType) ticketPassType.textContent = currentConfig?.vipPassTierBadge || 'ALL-ACCESS VIP';
      if (ticketPresents) ticketPresents.textContent = currentConfig?.vipPassPresents || 'CORDIALLY INVITES';
      if (ticketGuestName) ticketGuestName.textContent = guestRecord.name + (guestRecord.plusOneName ? ` & ${guestRecord.plusOneName}` : '');
      if (ticketEventTitle) ticketEventTitle.textContent = currentConfig?.milestoneTitle || currentConfig?.eventName || 'VIP INVITATION';
      if (ticketProtagonist) ticketProtagonist.textContent = currentConfig?.protagonistName || 'Aurelia Vance';
      if (ticketDateStr) ticketDateStr.textContent = currentConfig?.vipPassDate || currentConfig?.eventDateText || '26.09.2026';
      if (ticketTimeStr) ticketTimeStr.textContent = currentConfig?.receptionTime || currentConfig?.vipPassTime || currentConfig?.eventTimeText || '19:00 CEST';
      if (ticketCodeStr) ticketCodeStr.textContent = guestRecord.passId;
      
      let venueDisplay = currentConfig?.venueName || 'VIP Private Location';
      if (currentConfig?.venueCity && currentConfig.venueCity.trim() !== '' && !venueDisplay.includes(currentConfig.venueCity)) {
        venueDisplay += `, ${currentConfig.venueCity}`;
      }
      if (ticketVenueStr) ticketVenueStr.textContent = venueDisplay;

      if (guestRecord.message) addToastToWall(guestRecord.name, guestRecord.message);

      // Dispatch Luxury VIP Email Confirmation in background
      if (email && email.includes('@')) {
        fetch('/api/dispatch-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: guestRecord.name,
            email: guestRecord.email,
            eventSlug: currentEventSlug,
            eventTitle: currentConfig?.milestoneTitle || currentConfig?.eventName || 'THE GOLDEN SOIRÉE',
            eventDate: currentConfig?.eventDateText || currentConfig?.vipPassDate,
            venueName: venueDisplay,
            plusOne: guestRecord.plusOneCount === '1'
          })
        }).then(r => r.json()).then(data => {
          console.log('✉️ Email invite dispatch response:', data);
        }).catch(err => console.warn('Email dispatch background:', err));
      }

      luxuryAudio.playChampagneClink();
      spawnBurstParticles(window.innerWidth / 2, window.innerHeight / 2);

      if (ticketModal) ticketModal.classList.add('active');
    });
  }

  // Direct Ticket Image Download Button
  const btnDownloadTicketImg = document.getElementById('download-ticket-img-btn');
  if (btnDownloadTicketImg) {
    btnDownloadTicketImg.addEventListener('click', () => {
      const guest = currentRegisteredGuest || {
        name: document.getElementById('ticket-guest-name')?.textContent || 'Distinguished Guest',
        passId: document.getElementById('ticket-code-str')?.textContent || 'AV25-8849-VIP',
        attendance: 'attending'
      };
      renderAndDownloadPassImage(guest);
    });
  }

  if (closeTicketBtn && ticketModal) {
    closeTicketBtn.addEventListener('click', () => ticketModal.classList.remove('active'));
  }
  if (dismissTicketBtn && ticketModal) {
    dismissTicketBtn.addEventListener('click', () => ticketModal.classList.remove('active'));
  }

  // Toast Wall & Cheers (Strictly starts from 249)
  const cheersBtn = document.getElementById('cheers-btn');
  const clinkCounter = document.getElementById('clink-counter');
  const toastForm = document.getElementById('quick-toast-form');

  let currentCheers = 249;
  try {
    const savedCheers = localStorage.getItem(`aurelia_cheers_${currentEventSlug}`);
    if (savedCheers) {
      currentCheers = Math.max(249, parseInt(savedCheers, 10));
    } else {
      localStorage.setItem(`aurelia_cheers_${currentEventSlug}`, '249');
    }
  } catch (err) {}
  if (clinkCounter) clinkCounter.textContent = currentCheers;

  // Background server sync for initial cheers count
  try {
    const apiBase = (cmsStorage && typeof cmsStorage.getApiBaseUrl === 'function') ? cmsStorage.getApiBaseUrl() : '';
    fetch(`${apiBase}/api/events/${encodeURIComponent(currentEventSlug)}/cheers`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && typeof data.count === 'number' && data.count >= 249) {
          if (data.count > currentCheers) {
            currentCheers = data.count;
            if (clinkCounter) clinkCounter.textContent = currentCheers;
            try { localStorage.setItem(`aurelia_cheers_${currentEventSlug}`, String(currentCheers)); } catch (e) {}
          }
        }
      }).catch(() => {});
  } catch (e) {}

  if (cheersBtn) {
    cheersBtn.addEventListener('click', () => {
      currentCheers++;
      if (clinkCounter) clinkCounter.textContent = currentCheers;
      try {
        localStorage.setItem(`aurelia_cheers_${currentEventSlug}`, String(currentCheers));
      } catch (err) {}

      // Real-time broadcast to all open tabs
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('cms_live_sync');
          bc.postMessage({ type: 'cheers_update', slug: currentEventSlug, count: currentCheers });
        }
      } catch (eBc) {}

      // Cross-device sync to server
      try {
        const apiBase = (cmsStorage && typeof cmsStorage.getApiBaseUrl === 'function') ? cmsStorage.getApiBaseUrl() : '';
        fetch(`${apiBase}/api/events/${encodeURIComponent(currentEventSlug)}/cheers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: currentCheers })
        }).catch(() => {});
      } catch (eFetch) {}

      luxuryAudio.playChampagneClink();
      cheersBtn.style.transform = 'scale(1.15)';
      setTimeout(() => { cheersBtn.style.transform = ''; }, 200);

      const badge = document.createElement('div');
      badge.textContent = '🥂 +1 Toast!';
      badge.style.position = 'fixed';
      const rect = cheersBtn.getBoundingClientRect();
      badge.style.left = `${rect.left + rect.width / 2}px`;
      badge.style.top = `${rect.top - 20}px`;
      badge.style.transform = 'translateX(-50%)';
      badge.style.color = '#FFDF73';
      badge.style.fontWeight = 'bold';
      badge.style.fontSize = '0.9rem';
      badge.style.pointerEvents = 'none';
      badge.style.zIndex = '99999';
      badge.style.transition = 'all 1s ease-out';
      document.body.appendChild(badge);

      spawnBurstParticles(rect.left + rect.width / 2, rect.top);

      setTimeout(() => {
        badge.style.top = `${rect.top - 60}px`;
        badge.style.opacity = '0';
      }, 20);
      setTimeout(() => badge.remove(), 1000);
    });
  }

  if (toastForm) {
    toastForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const authorInput = document.getElementById('toast-author-input');
      const messageInput = document.getElementById('toast-message-input');
      const author = authorInput.value.trim();
      const message = messageInput.value.trim();

      if (author && message) {
        addToastToWall(author, message);
        luxuryAudio.playChampagneClink();
        authorInput.value = '';
        messageInput.value = '';
      }
    });
  }

  // Load event-specific guestbook toasts
  renderAllToastsOnWall();

  // Audio Controls
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (audioBtn) {
    audioBtn.addEventListener('click', async () => {
      const isPlaying = await luxuryAudio.toggleLoungeAmbiance();
      updateAudioBtnState(isPlaying);
    });
  }

  // Calendar
  const addToCalHero = document.getElementById('add-to-cal-hero-btn');

  const calData = {
    title: `${currentConfig?.protagonistName || 'Aurelia'}'s 25th Birthday Golden Soirée`,
    description: currentConfig?.heroDescription || "Haute Couture 25th Birthday Celebration.",
    location: `${currentConfig?.venueName || 'Penthouse'}, ${currentConfig?.venueCity || 'Milan'}`,
    start: "20260926T170000Z",
    end: "20260927T020000Z"
  };

  if (addToCalHero) {
    addToCalHero.addEventListener('click', () => {
      const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calData.title)}&dates=${calData.start}/${calData.end}&details=${encodeURIComponent(calData.description)}&location=${encodeURIComponent(calData.location)}`;
      window.open(gCalUrl, '_blank');
    });
  }

  // Scroll Nav
  const nav = document.getElementById('main-nav');
  const mobileToggle = document.getElementById('mobile-toggle');
  const navLinks = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  if (mobileToggle && navLinks) {
    const toggleMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navLinks.classList.toggle('mobile-active');
    };

    mobileToggle.addEventListener('click', toggleMenu);
    mobileToggle.addEventListener('touchend', toggleMenu, { passive: false });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-active');
      });
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && !nav.contains(e.target)) {
        navLinks.classList.remove('mobile-active');
      }
    });
  }

  // Initialize lively scroll-triggered pop & spring bounce animations
  initScrollRevealAnimations();
}

function initScrollRevealAnimations() {
  const targets = document.querySelectorAll(
    '.about-card, .timeline-node, .venue-details-card, .guide-card, .registry-card, .rsvp-wrapper, .social-moment-banner, .toast-item-card, .countdown-unit, .editorial-line-2, .section-header, .vip-invitation-card'
  );

  targets.forEach((el, i) => {
    el.classList.add('scroll-reveal-item');
    el.style.transitionDelay = `${(i % 3) * 0.12}s`;
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-scrolled-in', 'bounce-pop');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    });

    targets.forEach(el => observer.observe(el));
  } else {
    targets.forEach(el => el.classList.add('is-scrolled-in'));
  }
}

function renderAllToastsOnWall() {
  const container = document.getElementById('toasts-wall-container');
  if (!container) return;
  container.innerHTML = '';

  let toasts = [];
  try {
    const saved = localStorage.getItem(`aurelia_guestbook_${currentEventSlug}`);
    if (saved) {
      toasts = JSON.parse(saved);
    }
  } catch (err) {}

  if (!toasts || toasts.length === 0) {
    if (currentConfig && Array.isArray(currentConfig.toastsList) && currentConfig.toastsList.length > 0) {
      toasts = currentConfig.toastsList;
    } else {
      toasts = [
        {
          author: "Camille Duprès",
          time: "Just now",
          message: "Happy 25th birthday, my queen! To a woman who redefines elegance, kindness, and beauty every single day. Can't wait to dance all night in Milan!",
          signature: "❤️ With endless love"
        },
        {
          author: "Alexander & Sophie",
          time: "1 hour ago",
          message: "May Chapter 25 be filled with grand adventures, timeless memories, and the finest champagne. You deserve the world, Aurelia!",
          signature: "🥂 See you on the red carpet!"
        },
        {
          author: "Lord Julian Vance",
          time: "3 hours ago",
          message: "Twenty-five years of pure brilliance. Proud of everything you've accomplished and the incredible grace you bring to every room.",
          signature: "✨ Happy 25th!"
        }
      ];
    }
  }

  toasts.forEach((t) => renderToastCard(t.author, t.message, t.time, t.signature, false));

  // Background server fetch to sync toasts from other devices
  try {
    const apiBase = (cmsStorage && typeof cmsStorage.getApiBaseUrl === 'function') ? cmsStorage.getApiBaseUrl() : '';
    fetch(`${apiBase}/api/events/${encodeURIComponent(currentEventSlug)}/toasts`)
      .then(r => r.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.toasts) && data.toasts.length > 0) {
          localStorage.setItem(`aurelia_guestbook_${currentEventSlug}`, JSON.stringify(data.toasts));
          container.innerHTML = '';
          data.toasts.forEach((t) => renderToastCard(t.author, t.message, t.time, t.signature, false));
        }
      }).catch(() => {});
  } catch (e) {}
}

function addToastToWall(author, message) {
  const time = 'Just now';
  const signature = '✨ Sent with love';
  renderToastCard(author, message, time, signature, true);
  
  let savedToasts = [];
  try {
    const saved = localStorage.getItem(`aurelia_guestbook_${currentEventSlug}`);
    if (saved) savedToasts = JSON.parse(saved);
    else if (currentConfig && Array.isArray(currentConfig.toastsList)) savedToasts = JSON.parse(JSON.stringify(currentConfig.toastsList));
    savedToasts.unshift({ author, message, time, signature });
    localStorage.setItem(`aurelia_guestbook_${currentEventSlug}`, JSON.stringify(savedToasts));
  } catch (err) {}

  // Broadcast live to all open tabs
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('cms_live_sync');
      bc.postMessage({ type: 'toast_new', slug: currentEventSlug, toast: { author, message, time, signature } });
    }
  } catch (eBc) {}

  // Cross-device sync to server
  try {
    const apiBase = (cmsStorage && typeof cmsStorage.getApiBaseUrl === 'function') ? cmsStorage.getApiBaseUrl() : '';
    fetch(`${apiBase}/api/events/${encodeURIComponent(currentEventSlug)}/toasts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, message, time, signature })
    }).catch(() => {});
  } catch (eFetch) {}
}

function renderToastCard(author, message, time = 'Just now', signature = '✨ Sent with love', prepend = false) {
  const container = document.getElementById('toasts-wall-container');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'toast-item-card glass-card animate-fade-up';
  card.innerHTML = `
    <div class="toast-card-top">
      <span class="toast-author"><i class="fa-solid fa-circle-check gold-check"></i> ${escapeHtml(author)}</span>
      <span class="toast-time">${escapeHtml(time)}</span>
    </div>
    <p class="toast-text">“${escapeHtml(message)}” 🥂✨</p>
    <div class="toast-signature">${escapeHtml(signature || '✨ Sent with love')}</div>
  `;

  if (prepend && container.firstChild) {
    container.insertBefore(card, container.firstChild);
  } else {
    container.appendChild(card);
  }
}
