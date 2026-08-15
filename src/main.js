// ==========================================================================
// CHAPTER 25 • AURELIA'S GOLDEN SOIRÉE MAIN CONTROLLER
// Handles 3D Tilt, Wax Seal, RSVP Engine, Live Toasts & Audio
// ==========================================================================

import { luxuryAudio } from './sound.js';

document.addEventListener('DOMContentLoaded', () => {
  initEnvelopeGatekeeper();
  init3DCardTilt();
  initCountdownTimer();
  initRSVPEngine();
  initToastWall();
  initAudioControls();
  initCalendarIntegrations();
  initScrollNav();
});

/* ==========================================================================
   1. ENVELOPE GATEKEEPER & WAX SEAL UNSEALING
   ========================================================================== */
function initEnvelopeGatekeeper() {
  const gatekeeper = document.getElementById('envelope-gatekeeper');
  const envelope = document.getElementById('interactive-envelope');
  const waxSeal = document.getElementById('wax-seal-btn');
  const directBtn = document.getElementById('direct-enter-btn');

  function openEnvelope() {
    if (envelope.classList.contains('unsealed')) return;

    // Play crystal wax break chime
    luxuryAudio.playWaxBreakSound();

    // Trigger visual opening
    envelope.classList.add('unsealed');
    waxSeal.style.pointerEvents = 'none';

    // Spawn gold confetti burst
    spawnBurstParticles(window.innerWidth / 2, window.innerHeight / 2);

    setTimeout(() => {
      gatekeeper.classList.add('opened');
      document.body.classList.remove('loading-state');

      // Auto start lounge music if user interacted
      const isPlaying = luxuryAudio.toggleLoungeAmbiance();
      updateAudioBtnState(isPlaying);
    }, 1200);
  }

  if (waxSeal) {
    waxSeal.addEventListener('click', openEnvelope);
    waxSeal.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') openEnvelope();
    });
  }

  if (directBtn) {
    directBtn.addEventListener('click', openEnvelope);
  }
}

/* ==========================================================================
   2. 3D HOLOGRAPHIC VIP INVITATION CARD TILT PHYSICS
   ========================================================================== */
function init3DCardTilt() {
  const container = document.getElementById('card-3d-container');
  const card = document.getElementById('vip-invitation-card');
  const holoSheen = document.getElementById('holo-sheen');
  const liveGuestInput = document.getElementById('live-guest-input');
  const previewGuestName = document.getElementById('preview-guest-name');

  if (!container || !card) return;

  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -16;
    const rotateY = ((x - centerX) / centerX) * 16;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    if (holoSheen) {
      const sheenX = (x / rect.width) * 100;
      const sheenY = (y / rect.height) * 100;
      holoSheen.style.background = `radial-gradient(circle at ${sheenX}% ${sheenY}%, rgba(255, 223, 115, 0.45) 0%, rgba(13, 59, 46, 0.25) 45%, transparent 75%)`;
    }
  });

  container.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
  });

  // Live personalization typing
  if (liveGuestInput && previewGuestName) {
    liveGuestInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      previewGuestName.textContent = val ? val : 'Valued Guest & Plus One';
    });
  }
}

/* ==========================================================================
   3. LIVE MILESTONE COUNTDOWN TIMER
   Target: Saturday, September 26, 2026 at 19:00:00 CEST
   ========================================================================== */
function initCountdownTimer() {
  const targetDate = new Date('2026-09-26T19:00:00+02:00').getTime();

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minEl = document.getElementById('cd-minutes');
  const secEl = document.getElementById('cd-seconds');

  function update() {
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

  update();
  setInterval(update, 1000);
}

/* ==========================================================================
   4. VIP RSVP CONCIERGE & DIGITAL PASS GENERATOR
   ========================================================================== */
function initRSVPEngine() {
  const rsvpForm = document.getElementById('rsvp-form');
  const plusOneSelect = document.getElementById('rsvp-plusone-count');
  const plusOneNameGroup = document.getElementById('plus-one-name-group');
  const ticketModal = document.getElementById('ticket-modal');
  const closeTicketBtn = document.getElementById('close-ticket-btn');
  const dismissTicketBtn = document.getElementById('dismiss-ticket-btn');
  const printTicketBtn = document.getElementById('print-ticket-btn');

  // Radio cards selection visual state
  const radioCards = document.querySelectorAll('.radio-card');
  radioCards.forEach((card) => {
    card.addEventListener('click', () => {
      radioCards.forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  // Plus one visibility
  if (plusOneSelect && plusOneNameGroup) {
    plusOneSelect.addEventListener('change', (e) => {
      if (e.target.value === '1') {
        plusOneNameGroup.style.display = 'flex';
      } else {
        plusOneNameGroup.style.display = 'none';
      }
    });
  }

  // RSVP Submit Handler
  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('rsvp-name').value.trim();
      const email = document.getElementById('rsvp-email').value.trim();
      const attendance = document.querySelector('input[name="attendance"]:checked').value;
      const plusOneCount = plusOneSelect ? plusOneSelect.value : '0';
      const plusOneName = document.getElementById('rsvp-plusone-name')?.value.trim();
      const dietary = document.getElementById('rsvp-dietary').value;
      const cocktail = document.getElementById('rsvp-cocktail').value;
      const song = document.getElementById('rsvp-song').value.trim();
      const message = document.getElementById('rsvp-message').value.trim();

      const rsvpData = {
        name,
        email,
        attendance,
        plusOneCount,
        plusOneName,
        dietary,
        cocktail,
        song,
        message,
        timestamp: new Date().toISOString(),
        passId: 'AV25-' + Math.floor(1000 + Math.random() * 9000) + '-VIP'
      };

      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem('aurelia_rsvps') || '[]');
      existing.push(rsvpData);
      localStorage.setItem('aurelia_rsvps', JSON.stringify(existing));

      // Populate Digital Boarding Pass
      const ticketGuestName = document.getElementById('ticket-guest-name');
      const ticketCodeStr = document.getElementById('ticket-code-str');
      const ticketSeatTier = document.getElementById('ticket-seat-tier');

      if (ticketGuestName) {
        ticketGuestName.textContent = name + (plusOneName ? ` & ${plusOneName}` : '');
      }
      if (ticketCodeStr) {
        ticketCodeStr.textContent = rsvpData.passId;
      }
      if (ticketSeatTier) {
        ticketSeatTier.textContent = attendance === 'attending' ? 'TIER 1 • RED CARPET' : 'HONORARY VIRTUAL TOAST';
      }

      // If left a message, post to toast wall automatically
      if (message) {
        addToastToWall(name, message);
      }

      // Sound & Confetti
      luxuryAudio.playChampagneClink();
      spawnBurstParticles(window.innerWidth / 2, window.innerHeight / 2);

      // Open Pass Modal
      if (ticketModal) {
        ticketModal.classList.add('active');
      }

      rsvpForm.reset();
    });
  }

  // Modal actions
  if (closeTicketBtn && ticketModal) {
    closeTicketBtn.addEventListener('click', () => ticketModal.classList.remove('active'));
  }
  if (dismissTicketBtn && ticketModal) {
    dismissTicketBtn.addEventListener('click', () => ticketModal.classList.remove('active'));
  }
  if (printTicketBtn) {
    printTicketBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

/* ==========================================================================
   5. TOAST WALL & CHEERS INTERACTIVE COUNTER
   ========================================================================== */
function initToastWall() {
  const cheersBtn = document.getElementById('cheers-btn');
  const clinkCounter = document.getElementById('clink-counter');
  const toastForm = document.getElementById('quick-toast-form');

  // Load cheers from local storage
  let currentCheers = parseInt(localStorage.getItem('aurelia_cheers_count') || '248', 10);
  if (clinkCounter) clinkCounter.textContent = currentCheers;

  if (cheersBtn) {
    cheersBtn.addEventListener('click', () => {
      currentCheers++;
      if (clinkCounter) clinkCounter.textContent = currentCheers;
      localStorage.setItem('aurelia_cheers_count', currentCheers);

      // Play crystal glass clink sound
      luxuryAudio.playChampagneClink();

      // Animate button
      cheersBtn.style.transform = 'scale(1.15)';
      setTimeout(() => {
        cheersBtn.style.transform = '';
      }, 200);

      // Floating celebratory text
      createFloatingToastBadge(cheersBtn);
    });
  }

  // Toast form submission
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

  // Load custom toasts from storage
  const savedToasts = JSON.parse(localStorage.getItem('aurelia_guestbook') || '[]');
  savedToasts.forEach((t) => {
    renderToastCard(t.author, t.message, t.time);
  });
}

function addToastToWall(author, message) {
  const time = 'Just now';
  renderToastCard(author, message, time, true);

  // Save to local storage
  const savedToasts = JSON.parse(localStorage.getItem('aurelia_guestbook') || '[]');
  savedToasts.unshift({ author, message, time });
  localStorage.setItem('aurelia_guestbook', JSON.stringify(savedToasts));
}

function renderToastCard(author, message, time, prepend = false) {
  const container = document.getElementById('toasts-wall-container');
  if (!container) return;

  const card = document.createElement('div');
  card.className = 'toast-item-card glass-card animate-fade-up';
  card.innerHTML = `
    <div class="toast-card-top">
      <span class="toast-author"><i class="fa-solid fa-circle-check gold-check"></i> ${escapeHtml(author)}</span>
      <span class="toast-time">${time}</span>
    </div>
    <p class="toast-text">“${escapeHtml(message)}” 🥂✨</p>
    <div class="toast-signature">✨ Sent with love</div>
  `;

  if (prepend && container.firstChild) {
    container.insertBefore(card, container.firstChild);
  } else {
    container.appendChild(card);
  }
}

function createFloatingToastBadge(btn) {
  const badge = document.createElement('div');
  badge.textContent = '🥂 +1 Toast!';
  badge.style.position = 'fixed';
  const rect = btn.getBoundingClientRect();
  badge.style.left = `${rect.left + rect.width / 2}px`;
  badge.style.top = `${rect.top - 20}px`;
  badge.style.transform = 'translateX(-50%)';
  badge.style.color = '#FFDF73';
  badge.style.fontWeight = 'bold';
  badge.style.fontSize = '0.9rem';
  badge.style.pointerEvents = 'none';
  badge.style.zIndex = '9999';
  badge.style.transition = 'all 1s ease-out';

  document.body.appendChild(badge);

  setTimeout(() => {
    badge.style.top = `${rect.top - 60}px`;
    badge.style.opacity = '0';
  }, 20);

  setTimeout(() => {
    badge.remove();
  }, 1000);
}

/* ==========================================================================
   6. AUDIO CONTROLS
   ========================================================================== */
function initAudioControls() {
  const audioBtn = document.getElementById('audio-toggle-btn');
  if (!audioBtn) return;

  audioBtn.addEventListener('click', () => {
    const isPlaying = luxuryAudio.toggleLoungeAmbiance();
    updateAudioBtnState(isPlaying);
  });
}

function updateAudioBtnState(isPlaying) {
  const audioBtn = document.getElementById('audio-toggle-btn');
  const audioIcon = document.getElementById('audio-icon');
  if (!audioBtn) return;

  if (isPlaying) {
    audioBtn.classList.add('playing');
    if (audioIcon) {
      audioIcon.className = 'fa-solid fa-volume-high';
    }
  } else {
    audioBtn.classList.remove('playing');
    if (audioIcon) {
      audioIcon.className = 'fa-solid fa-volume-xmark';
    }
  }
}

/* ==========================================================================
   7. CALENDAR (.ICS & GOOGLE CALENDAR)
   ========================================================================== */
function initCalendarIntegrations() {
  const addToCalHero = document.getElementById('add-to-cal-hero-btn');
  const downloadIcsBtn = document.getElementById('download-ics-btn');

  const calData = {
    title: "Aurelia's 25th Birthday Golden Soirée (Chapter 25)",
    description: "Haute Couture & Black Tie 25th Birthday Celebration for Aurelia Vance. Villa Solaria Penthouse, Milan.",
    location: "Villa Solaria Penthouse Estate, Milan, Italy",
    start: "20260926T170000Z",
    end: "20260927T020000Z"
  };

  function downloadIcs() {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aurelia Vance Chapter 25//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:aurelia-25th-${Date.now()}@vancegala.com
DTSTAMP:${calData.start}
DTSTART:${calData.start}
DTEND:${calData.end}
SUMMARY:${calData.title}
DESCRIPTION:${calData.description}
LOCATION:${calData.location}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'Aurelia_25th_Golden_Soiree.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function openGoogleCalendar() {
    const gCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(calData.title)}&dates=${calData.start}/${calData.end}&details=${encodeURIComponent(calData.description)}&location=${encodeURIComponent(calData.location)}`;
    window.open(gCalUrl, '_blank');
  }

  if (addToCalHero) addToCalHero.addEventListener('click', openGoogleCalendar);
  if (downloadIcsBtn) downloadIcsBtn.addEventListener('click', downloadIcs);
}

/* ==========================================================================
   8. NAVIGATION SCROLL BLUR
   ========================================================================== */
function initScrollNav() {
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
    mobileToggle.addEventListener('click', () => {
      const isVisible = navLinks.style.display === 'flex';
      navLinks.style.display = isVisible ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.width = '100%';
      navLinks.style.background = 'rgba(7,7,9,0.95)';
      navLinks.style.backdropFilter = 'blur(20px)';
      navLinks.style.padding = '20px';
    });
  }
}

/* ==========================================================================
   CONFETTI / GOLDEN BURST HELPER
   ========================================================================== */
function spawnBurstParticles(centerX, centerY) {
  const burstCount = 35;
  for (let i = 0; i < burstCount; i++) {
    const el = document.createElement('div');
    el.style.position = 'fixed';
    el.style.left = `${centerX}px`;
    el.style.top = `${centerY}px`;
    el.style.width = `${Math.random() * 8 + 4}px`;
    el.style.height = `${Math.random() * 8 + 4}px`;
    el.style.backgroundColor = ['#FFDF73', '#D4AF37', '#F3E5AB', '#FFFFFF'][Math.floor(Math.random() * 4)];
    el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    el.style.pointerEvents = 'none';
    el.style.zIndex = '99999';
    el.style.transition = 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)';

    document.body.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 220 + 80;
    const targetX = centerX + Math.cos(angle) * distance;
    const targetY = centerY + Math.sin(angle) * distance;

    requestAnimationFrame(() => {
      el.style.left = `${targetX}px`;
      el.style.top = `${targetY}px`;
      el.style.opacity = '0';
      el.style.transform = `scale(${Math.random() * 1.5}) rotate(${Math.random() * 360}deg)`;
    });

    setTimeout(() => el.remove(), 1200);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
