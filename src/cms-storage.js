// ==========================================================================
// CHAPTER 25 • MULTI-TENANT CMS & STORAGE ENGINE
// Handles Super Admin master settings, Sub-Admin instances, isolated event DBs,
// invite token generation, and guest RSVP management
// ==========================================================================

/* IndexedDB Audio Storage Engine (Supports large MP3/WAV files across tabs) */
const CelebrationAudioDB = {
  dbName: 'CelebrationAudioDB',
  storeName: 'audio_tracks',
  _dbPromise: null,
  open() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(this.dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('IndexedDB open error:', req.error);
        resolve(null);
      };
    });
    return this._dbPromise;
  },
  async setAudio(slug, fileOrBlob, fileName = '') {
    try {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.put({ data: fileOrBlob, name: fileName, updated: Date.now() }, slug);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      console.warn('AudioDB setAudio error:', e);
      return false;
    }
  },
  async getAudio(slug) {
    try {
      const db = await this.open();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const req = store.get(slug);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) {
      return null;
    }
  },
  async deleteAudio(slug) {
    try {
      const db = await this.open();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const req = store.delete(slug);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }
};
window.CelebrationAudioDB = CelebrationAudioDB;

const DEFAULT_MASTER_CONFIG = {
  slug: 'master_default',
  eventName: "Chapter 25: The Golden Soirée",
  protagonistName: "Aurelia Vance",
  protagonistMonogram: "AV",
  milestoneTitle: "CHAPTER TWENTY-FIVE",
  milestoneSubtitle: "A Quarter Century in Haute Couture",
  milestoneAge: "25",
  eventDateText: "Saturday, Sept 26, 2026",
  eventIsoDate: "2026-09-26T19:00:00+02:00",
  receptionTime: "19:00 Till Late",
  venueName: "Villa Solaria Penthouse",
  venueCity: "Milan, Italy",
  venueAddress: "Via Monte Napoleone 28, Milan, Italy",
  venueMapUrl: "https://www.google.com/maps/search/?api=1&query=Via+Monte+Napoleone+28+Milan+Italy",
  heroDescription: "An evening of effortless glamour, vintage champagne, gourmet gastronomy, and midnight revelry celebrating the 25th birthday.",
  heroQuote: "“Pour the champagne, turn up the music, and let's toast to the most glamorous chapter yet.”",
  heroQuoteAuthor: "— Aurelia",
  heroBadgeSparkle: "EXCLUSIVE 25TH MILESTONE CELEBRATION",
  heroPortraitImg: "./assets/hero_portrait.jpg",
  venueImg: "./assets/venue_soirée.jpg",
  dressCodeImg: "./assets/dress_code.jpg",
  themePalette: 'obsidian-gold',
  
  // Top Navigation Bar
  navBrandTitle: "AURELIA VANCE",
  navBrandSub: "CHAPTER 25 • GALA",
  navLinkAbout: "The Soirée",
  navLinkVipPass: "VIP Pass",
  navLinkItinerary: "Itinerary",
  navLinkDressCode: "Dress Code",
  navLinkVenue: "Venue",
  navLinkToastWall: "Toast Wall",
  navLinkRsvpBtn: "VIP RSVP",
  navAudioLabel: "Lounge Music",

  // Envelope & Wax Seal Gatekeeper texts
  envelopeMonogram: "AV",
  envelopeSubtitle: "PRIVATE INVITATION • NO. XXV",
  envelopeLetterTag: "You are cordially summoned",
  envelopeLetterTitle: "CHAPTER XXV",
  envelopeLetterSubtitle: "The Golden Soirée of Aurelia Vance",
  envelopeSealNumeral: "XXV",
  envelopeSealTooltip: "Click to Break Seal",
  envelopeHint: "Touch the gold wax seal to open invitation",
  envelopeDirectEnterBtn: "Enter Directly",

  // Countdown texts
  countdownEyebrow: "COUNTDOWN TO THE GRAND GALA",
  countdownTitle: "The Celebration Begins In",
  countdownTag: "Strictly Private & Exclusive (Guestlist Only)",

  // About Section (3 Cards)
  aboutSectionTitle: "A Quarter Century of Memories",
  aboutSectionLead: "An intimate gathering of our dearest circle for a night drenched in champagne and pure euphoria.",
  aboutCard1Title: "The Vision",
  aboutCard1Desc: "Twenty-five is a milestone of ambition, elegance, and unforgettable connections. We are gathering our dearest circle for a night drenched in champagne, cinematic music, and pure euphoria.",
  aboutCard2Title: "The Experience",
  aboutCard2Desc: "From sunset caviar & Bellini receptions on the sky terrace to a bespoke candlelight banquet and high-energy after-party beneath crystal chandeliers.",
  aboutCard3Title: "The Dress Code",
  aboutCard3Desc: "Haute Glamour & Black Tie. Think obsidian silks, liquid gold satins, tailored velvet, and statement diamond brilliance. Let's make every photo look like a runway spread.",

  // Dress Code Studio (100% customizable with presets)
  dressCodeSectionSub: "SARTORIAL ELEGANCE",
  dressCodeTitle: "The Dress Code: Haute Glamour",
  dressCodeLead: "Dress to enchant. Think Black Tie, Red Carpet Luxury, Liquid Metals & Midnight Velvet.",
  dressCodeCaptionTitle: "Haute Couture Moodboard",
  dressCodeCaptionSub: "Obsidian • Champagne Gold • Emerald Radiance",
  dressCodePalette: [
    { name: "Obsidian", color: "#0a0a0c" },
    { name: "Champagne", color: "#D4AF37" },
    { name: "Bronze", color: "#9b7b3e" },
    { name: "Emerald", color: "#0D3B2E" },
    { name: "Pearl", color: "#F9F6F0" }
  ],
  dressCodeSwatch1: "Obsidian",
  dressCodeSwatch2: "Champagne",
  dressCodeSwatch3: "Bronze",
  dressCodeSwatch4: "Emerald",
  dressCodeSwatch5: "Pearl",
  dressCodeLadiesTitle: "For the Ladies",
  dressCodeLadiesList: [
    "Floor-length silk, satin or metallic evening gowns.",
    "Sparkling cocktail dresses with dramatic silhouettes.",
    "Statement diamond jewelry, delicate strappy heels & chic clutches.",
    "Hair & Makeup: Glossy editorial waves, luminous golden glow."
  ],
  dressCodeGentsTitle: "For the Gentlemen",
  dressCodeGentsList: [
    "Classic Black Tie tuxedos or midnight navy velvet jackets.",
    "Crisp white dress shirts with black or gold cufflinks.",
    "Polished Oxford patent leather shoes or designer loafers.",
    "Silk bow ties or sharp pocket squares."
  ],
  dressCodeAlertTitle: "Fashion Note:",
  dressCodeAlertDesc: "Casual wear, sneakers, and distressed denim are kindly not permitted. When in doubt, lean towards the most glamorous option!",

  // Venue & Amenities
  venueSectionSub: "THE DESTINATION",
  venueSectionTitle: "The Penthouse & Sky Terrace",
  venueSectionLead: "Villa Solaria Estate • Milan, Italy",
  venueImg: "./assets/venue_soirée.jpg",
  venueBadge: "PRIVATE ESTATE ACCESS",
  venueDesc: "Perched atop the historic hills, offering panoramic 360-degree views of the illuminated city, private marble gardens, and crystal ballroom.",
  venueAmenity1Title: "Complimentary Valet Parking",
  venueAmenity1Badge: "VIP Service",
  venueAmenity1Desc: "White-glove private valet at the grand gates upon arrival.",
  valetParkingImg: "./assets/valet_parking.jpg",
  valetParkingCaption: "Private Valet Parking Pavilion",
  venueAmenity2Title: "Strict Guestlist Check-in",
  venueAmenity2Desc: "Digital VIP boarding pass or RSVP name required for estate entry.",
  venueAmenity3Title: "Preferred Accommodation",
  venueAmenity3Desc: "Private luxury suite discount at Grand Hotel Milano (Code: AURELIA25).",
  venueMapBtnText: "Open in Google Maps",

  // RSVP Form texts
  rsvpSectionTitle: "VIP Concierge & RSVP",
  rsvpSectionLead: "Please confirm your attendance by September 10th, 2026 to ensure your personalized culinary seating and VIP credential.",
  rsvpDiningOptions: [
    { id: "wagyu", label: "Imperial Wagyu & Caviar Reduction" },
    { id: "seabass", label: "Pan-Seared Chilean Seabass & Saffron" },
    { id: "truffle_veg", label: "Truffle Wild Mushroom & Porcini Risotto (Vegetarian)" },
    { id: "gluten_free", label: "Gluten-Free Chef's Creation" }
  ],
  rsvpCocktailOptions: [
    { id: "vintage_champagne", label: "Dom Pérignon Vintage Champagne" },
    { id: "french75", label: "French 75 (Gin, Champagne, Lemon)" },
    { id: "espresso_martini", label: "Smoked Velvet Espresso Martini" },
    { id: "zero_proof", label: "Zero-Proof Starlight Elderflower Spritz" }
  ],

  // Toast Wall texts & custom manageable toasts
  toastsSectionSub: "RAISE A GLASS",
  toastsSectionTitle: "The Golden Toast Wall",
  toastsSectionLead: "Leave your sparkling birthday wishes for Aurelia or click to clink champagne glasses!",
  toastsCounterTitle: "Champagne Glasses Raised:",
  toastsList: [
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
  ],

  // Wishlist & Registry
  registrySectionTitle: "The 25th Milestone Registry",
  registrySectionLead: "Your presence and warmth are the greatest gift. For those who have kindly enquired about gifts, here are thoughtfully curated avenues:",
  registryCard1Title: "Amalfi & French Riviera Fund",
  registryCard1Desc: "Contributions towards creating unforgettable travel memories and milestone experiences across the Mediterranean.",
  registryCard1Btn: "Contribute to Experience",
  registryCard2Title: "Fine Vintage Wine Cellar",
  registryCard2Desc: "For wine and champagne connoisseurs wishing to gift a bottle of Grand Cru or vintage bubbly to age for future milestones.",
  registryCard2Btn: "View Sommelier Picks",
  registryCard3Title: "Ocean & Youth Arts Philanthropy",
  registryCard3Desc: "In honor of turning 25, a portion of gifts will be dedicated to ocean preservation and young artists foundation.",
  registryCard3Btn: "Support Charity Fund",

  // Social Banner & Footer
  socialHashtags: "#CHAPTER25AURELIA • #VANCE25GALA",
  socialTitle: "Capture The Starlight",
  socialDesc: "Tag your gala photos and stories with our official celebration tags to be featured on the live soirée gallery display.",
  footerMonogram: "AV",
  footerTitle: "CHAPTER TWENTY-FIVE",
  footerQuote: "“To the golden hours behind us, and the brilliant years ahead.”",
  footerLink1: "Back to Top",
  footerLink2: "Schedule",
  footerLink3: "Dress Code",
  footerLink4: "RSVP",
  footerCopyright: "© 2026 Aurelia Vance 25th Birthday Celebration. All Rights Reserved.",
  footerSubtext: "Bespoke Haute Couture Invitation Experience",

  // RSVP Form Labels & Custom Texts
  rsvpDiningTitle: "Dinner Courses:",
  rsvpCocktailTitle: "Signature Cocktails:",
  rsvpDiningOptions: [
    { id: "wagyu", label: "Imperial Wagyu Beef Fillet & Truffle Jus" },
    { id: "seabass", label: "Pan-Seared Chilean Seabass & Saffron" },
    { id: "truffle", label: "Truffle Wild Mushroom & Porcini Risotto (Veg)" }
  ],
  rsvpCocktailOptions: [
    { id: "c1", label: "Dom Pérignon Vintage Champagne" },
    { id: "c2", label: "French 75 (Gin, Champagne, Lemon)" },
    { id: "c3", label: "Smoked Velvet Espresso Martini" }
  ],
  diningCourse1: "Imperial Wagyu Beef Fillet & Truffle Jus",
  diningCourse2: "Pan-Seared Chilean Seabass & Saffron",
  diningCourse3: "Truffle Wild Mushroom & Porcini Risotto (Veg)",
  cocktail1: "Dom Pérignon Vintage Champagne",
  cocktail2: "French 75 (Gin, Champagne, Lemon)",
  cocktail3: "Smoked Velvet Espresso Martini",
  rsvpNameLabel: "Your Full Name *",
  rsvpNamePlaceholder: "e.g. Lady Genevieve Sterling",
  rsvpEmailLabel: "Email for VIP Confirmation *",
  rsvpEmailPlaceholder: "genevieve@luxury.com",
  rsvpAttendingLabel: "Will You Grace Us With Your Presence? *",
  rsvpAttendYesLabel: "Delighted to Attend",
  rsvpAttendYesSub: "I will be there in high glamour",
  rsvpAttendNoLabel: "Regretfully Decline",
  rsvpAttendNoSub: "Sending all my love from afar",
  rsvpPlusOneCountLabel: "Bringing a Companion?",
  rsvpOptSolo: "Solo (VIP Pass x1)",
  rsvpOptPlusOne: "With 1 Distinguished Plus-One (VIP Pass x2)",
  rsvpPlusOneNameLabel: "Plus-One Full Name",
  rsvpPlusOneNamePlaceholder: "Companion's Full Name",
  rsvpDietaryLabel: "Gourmet Dinner Course Preference",
  rsvpCocktailLabel: "Favorite Signature Libation",
  rsvpSongLabel: "Song That Will Keep You on the Dance Floor",
  rsvpSongPlaceholder: "Artist - Track Title",
  rsvpMessageLabel: "Personal Note or Birthday Toast",
  rsvpMessagePlaceholder: "A sparkling wish for Aurelia...",
  rsvpSubmitBtnText: "Submit VIP RSVP & Generate Digital Pass",
  rsvpPrivacyNote: "Your information is strictly confidential for private guestlist verification.",

  // Toast Box Texts
  clinkCounterTitle: "Champagne Glasses Raised for Aurelia:",
  clinkBtnText: "Raise a Toast! 🥂",
  toastBoxTitle: "Leave a Sparkling Toast",
  toastAuthorPlaceholder: "Your Name",
  toastMsgPlaceholder: "Write your celebratory wish...",
  toastSubmitText: "Post Toast",

  // Valet Parking Option
  showValetParkingImg: true,

  // Timeline / Itinerary section
  timelineSectionTitle: "The Soirée Itinerary",
  timelineSectionSub: "AN UNFORGETTABLE EVENING",
  timelineSectionDesc: "A seamless orchestration of haute cuisine, sparkling toasts, and vibrant rhythms.",

  visibleSections: {
    envelope: true,
    hero: true,
    countdown: true,
    about: true,
    vipCard: true,
    timeline: true,
    dressCode: true,
    venue: true,
    rsvp: true,
    toasts: true,
    registry: true,
    social: true
  },
  itinerary: [
    { time: "19:00", label: "TWILIGHT", title: "Red Carpet & Champagne Welcome", desc: "Vintage Dom Pérignon, French 75 cocktails, fresh oysters & caviar canapés served at sunset.", tag: "Acoustic Saxophone & Chilled Jazz" },
    { time: "20:15", label: "BANQUET", title: "Haute Gastronomy Dinner", desc: "Four-course candlelit dinner orchestrated by Michelin-starred culinary artists, paired with Grand Cru vintages.", tag: "Bespoke Tasting Menu" },
    { time: "21:45", label: "CEREMONY", title: "The 25th Champagne Fountain & Cake", desc: "7-tier crystal champagne coupe tower and bespoke edible gold birthday cake toast.", tag: "Milestone Moment & Sparklers", highlight: true },
    { time: "22:30", label: "NIGHTFALL", title: "DJ Set, Cocktails & Starlight Dancing", desc: "World-class house anthems, illuminated dance floor, signature espresso martini bar.", tag: "High Fashion & Euphoria" },
    { time: "01:30", label: "AFTER HOURS", title: "Midnight Truffles & Secret Afterglow", desc: "Late-night gourmet sliders, Belgian dark chocolate truffles, and intimate rooftop conversation.", tag: "Till the early dawn" }
  ]
};

class CMSStorageEngine {
  constructor() {
    this.initMasterDefaults();
  }

  initMasterDefaults() {
    const CURRENT_STORAGE_VERSION = 'v2_6_aurelia_master_pristine';
    const savedVersion = localStorage.getItem('cms_storage_version');

    if (savedVersion !== CURRENT_STORAGE_VERSION) {
      // Force clean old polluted master configs from previous sessions
      localStorage.setItem('cms_master_config', JSON.stringify(DEFAULT_MASTER_CONFIG));
      localStorage.setItem('cms_event_master_default_config', JSON.stringify(DEFAULT_MASTER_CONFIG));
      localStorage.setItem('cms_storage_version', CURRENT_STORAGE_VERSION);
    } else if (!localStorage.getItem('cms_master_config')) {
      localStorage.setItem('cms_master_config', JSON.stringify(DEFAULT_MASTER_CONFIG));
    }

    // Default Super Admin (8vinokurova@gmail.com / 1Lytham!) and Demo Sub Admin (Victoria)
    let initialAdmins = [];
    try {
      const saved = localStorage.getItem('cms_admins_db');
      if (saved) initialAdmins = JSON.parse(saved);
    } catch (e) { initialAdmins = []; }

    const superAdminObj = {
      id: 'admin-super',
      name: 'Super Admin',
      email: '8vinokurova@gmail.com',
      password: '1Lytham!',
      role: 'superadmin',
      assignedSlugs: ['*'],
      createdAt: new Date().toISOString()
    };

    const victoriaObj = {
      id: 'admin-victoria',
      name: 'Victoria Sterling',
      email: 'victoria@sterling.com',
      password: 'victoria2026',
      role: 'admin',
      assignedSlugs: ['victoria-25'],
      createdAt: new Date().toISOString()
    };

    // Upsert Super Admin and Victoria
    const superIdx = initialAdmins.findIndex(a => a.role === 'superadmin' || a.email.toLowerCase() === '8vinokurova@gmail.com');
    if (superIdx >= 0) {
      initialAdmins[superIdx] = { ...initialAdmins[superIdx], ...superAdminObj };
    } else {
      initialAdmins.unshift(superAdminObj);
    }

    if (!initialAdmins.some(a => a.email.toLowerCase() === 'victoria@sterling.com')) {
      initialAdmins.push(victoriaObj);
    }
    localStorage.setItem('cms_admins_db', JSON.stringify(initialAdmins));

    // Default Demo Event for Victoria (Completely isolated Paris Gala)
    if (!localStorage.getItem('cms_event_victoria-25_config')) {
      const victoriaConfig = JSON.parse(JSON.stringify(DEFAULT_MASTER_CONFIG));
      victoriaConfig.slug = 'victoria-25';
      victoriaConfig.protagonistName = 'Victoria Sterling';
      victoriaConfig.protagonistMonogram = 'VS';
      victoriaConfig.eventName = "Victoria's 25th Diamond Gala";
      victoriaConfig.eventDateText = "Saturday, Oct 17, 2026";
      victoriaConfig.eventDatePicker = "2026-10-17";
      victoriaConfig.venueCity = "Paris, France";
      victoriaConfig.venueName = "Hôtel de Crillon Penthouse";
      victoriaConfig.venueAddress = "10 Place de la Concorde, 75008 Paris, France";
      victoriaConfig.venueMapUrl = "https://maps.google.com/?q=Hôtel+de+Crillon+Paris";
      localStorage.setItem('cms_event_victoria-25_config', JSON.stringify(victoriaConfig));
    }

    // Sample guests for master and victoria
    if (!localStorage.getItem('cms_event_master_default_guests')) {
      const initialGuests = [
        {
          name: 'Lady Genevieve Sterling',
          email: 'genevieve@sterling.com',
          attendance: 'attending',
          plusOneCount: '1',
          plusOneName: 'Marcus Sterling',
          dietary: 'Imperial Wagyu & Caviar',
          cocktail: 'Dom Pérignon Vintage',
          song: 'Dua Lipa - Levitating',
          message: 'Can’t wait for the most glamorous night in Milan!',
          passId: 'AV25-8849-VIP',
          checkedIn: false,
          timestamp: '2026-08-01T14:30:00Z'
        },
        {
          name: 'Count Julian Laurent',
          email: 'julian@laurent.fr',
          attendance: 'attending',
          plusOneCount: '0',
          plusOneName: '',
          dietary: 'Chilean Seabass & Saffron',
          cocktail: 'French 75',
          song: 'Peggy Gou - (It Goes Like) Nanana',
          message: 'To 25 wonderful years of brilliance!',
          passId: 'AV25-4421-VIP',
          checkedIn: true,
          timestamp: '2026-08-03T11:15:00Z'
        }
      ];
      localStorage.setItem('cms_event_master_default_guests', JSON.stringify(initialGuests));
    }
  }

  // --- Master Config ---
  getMasterConfig() {
    try {
      const saved = localStorage.getItem('cms_master_config');
      return saved ? JSON.parse(saved) : DEFAULT_MASTER_CONFIG;
    } catch (e) {
      return DEFAULT_MASTER_CONFIG;
    }
  }

  saveMasterConfig(config) {
    localStorage.setItem('cms_master_config', JSON.stringify(config));
  }

  // --- Event Specific Configs (Multi-Tenant Isolation) ---
  getEventConfig(slug) {
    if (!slug || slug === 'default' || slug === 'master') {
      slug = 'master_default';
    }
    try {
      if (slug === 'master_default') {
        const masterSaved = localStorage.getItem('cms_master_config') || localStorage.getItem('cms_event_master_default_config');
        if (masterSaved) {
          const parsed = JSON.parse(masterSaved);
          return { ...DEFAULT_MASTER_CONFIG, ...parsed, slug: 'master_default' };
        }
      }

      const saved = localStorage.getItem(`cms_event_${slug}_config`);
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...DEFAULT_MASTER_CONFIG, ...parsed, slug };

        // Smart healing & full propagation: ensure celebrant name, monogram, age, and location are strictly synchronized across all places
        if (merged.protagonistName) {
          merged.vipPassProtagonist = merged.protagonistName;
          merged.navBrandTitle = merged.protagonistName.toUpperCase();

          const cleaned = merged.protagonistName.trim().replace(/[^a-zA-Zа-яА-ЯёЁ\s]/g, '');
          const words = cleaned.split(/\s+/).filter(Boolean);
          let mono = 'VIP';
          if (words.length === 1) {
            mono = words[0].slice(0, 2).toUpperCase();
          } else if (words.length >= 2) {
            mono = (words[0][0] + words[words.length - 1][0]).toUpperCase();
          }
          merged.protagonistMonogram = mono;
          merged.envelopeMonogram = mono;
          merged.footerMonogram = mono;

          const firstName = words[0] || merged.protagonistName;
          if (parsed.heroQuoteAuthor === undefined) {
            merged.heroQuoteAuthor = `— ${firstName}`;
          }
          if (parsed.clinkCounterTitle === undefined) {
            merged.clinkCounterTitle = `Champagne Glasses Raised for ${firstName}:`;
          }
          if (parsed.toastsSectionLead === undefined) {
            merged.toastsSectionLead = `Leave your sparkling birthday wishes for ${firstName} or click to clink champagne glasses!`;
          }
          if (parsed.footerCopyright === undefined) {
            merged.footerCopyright = `© 2026 ${merged.protagonistName}. All Rights Reserved.`;
          }
        }

        if (slug !== 'master_default') {
          const ageMatch = (merged.eventName || '').match(/\b(\d{1,3})\b/) || slug.match(/\b(\d{1,3})\b/);
          if (ageMatch && (merged.milestoneAge === '25' || !merged.milestoneAge)) {
            merged.milestoneAge = ageMatch[1];
          }

          // If milestoneTitle was edited, sync to eventName and hero
          if (merged.milestoneTitle && merged.milestoneTitle !== 'CHAPTER TWENTY-FIVE' && merged.milestoneTitle !== 'CHAPTER 25') {
            merged.eventName = merged.milestoneTitle;
            merged.heroTitleMain = merged.milestoneTitle.toUpperCase();
            merged.vipPassOccasion = merged.milestoneTitle;
          } else if (merged.eventName && (merged.milestoneTitle === 'CHAPTER TWENTY-FIVE' || merged.milestoneTitle === 'CHAPTER 25')) {
            merged.milestoneTitle = merged.eventName.toUpperCase();
            merged.heroTitleMain = merged.eventName.toUpperCase();
          }

          // If venue was edited without city, remove default "Milan, Italy"
          if (merged.venueName && merged.venueName !== 'Villa Solaria Penthouse' && (merged.venueCity === 'Milan, Italy' || merged.venueCity === 'Milan')) {
            if (merged.venueName.includes(',')) {
              const parts = merged.venueName.split(',');
              merged.venueName = parts[0].trim();
              merged.venueCity = parts.slice(1).join(',').trim();
            } else {
              merged.venueCity = '';
            }
          }
          // Recover audio if stored in dedicated key
          if (!merged.musicTrackUrl || merged.musicTrackUrl === 'session_audio') {
            try {
              const dedicatedAudio = sessionStorage.getItem(`cms_event_${slug}_audio`) || localStorage.getItem(`cms_event_${slug}_audio`);
              if (dedicatedAudio) merged.musicTrackUrl = dedicatedAudio;
            } catch (e) {}
          }
        }
        return merged;
      }
      // If not yet customized, create clone from master template
      const master = this.getMasterConfig();
      const newClone = JSON.parse(JSON.stringify(master));
      newClone.slug = slug;
      localStorage.setItem(`cms_event_${slug}_config`, JSON.stringify(newClone));
      return newClone;
    } catch (e) {
      return this.getMasterConfig();
    }
  }

  saveEventConfig(slug, config) {
    if (!slug || slug === 'default' || slug === 'master') slug = 'master_default';
    config.slug = slug;
    config.updatedAt = Date.now();
    
    // Save audio in dedicated storage key if present
    if (config.musicTrackUrl) {
      try {
        if (config.musicTrackUrl.startsWith('data:')) {
          sessionStorage.setItem(`cms_event_${slug}_audio`, config.musicTrackUrl);
        } else {
          localStorage.setItem(`cms_event_${slug}_audio`, config.musicTrackUrl);
        }
      } catch (errAudio) {
        console.warn('Could not store full base64 audio:', errAudio);
      }
    }

    try {
      const jsonStr = JSON.stringify(config);
      localStorage.setItem(`cms_event_${slug}_config`, jsonStr);
      if (slug === 'master_default') {
        localStorage.setItem('cms_master_config', jsonStr);
      }
    } catch (e) {
      console.warn('LocalStorage quota warning. Saving config without heavy embedded audio:', e);
      try {
        const lightweightConfig = Object.assign({}, config);
        if (lightweightConfig.musicTrackUrl && lightweightConfig.musicTrackUrl.startsWith('data:')) {
          lightweightConfig.musicTrackUrl = 'session_audio';
        }
        const jsonStrLight = JSON.stringify(lightweightConfig);
        localStorage.setItem(`cms_event_${slug}_config`, jsonStrLight);
      } catch (e2) {
        console.error('Failed to save lightweight config:', e2);
      }
    }
    try {
      this.saveToServer(slug, config);
    } catch (eServer) {}
    localStorage.setItem('cms_last_active_slug', slug);
  }

  getApiBaseUrl() {
    if (typeof window !== 'undefined') {
      if (window.CUSTOM_API_BASE_URL) return window.CUSTOM_API_BASE_URL;
      if (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000')) {
        return 'http://localhost:3000';
      }
    }
    return '';
  }

  async syncWithServer(slug) {
    if (!slug || slug === 'default') slug = 'master_default';
    try {
      const res = await fetch(`${this.getApiBaseUrl()}/api/events/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          const remoteConfig = data.config;
          const localRaw = localStorage.getItem(`cms_event_${slug}_config`);
          let shouldUpdateLocal = false;

          if (!localRaw) {
            shouldUpdateLocal = true;
          } else {
            try {
              const localParsed = JSON.parse(localRaw);
              const localTime = new Date(localParsed.updatedAt || 0).getTime() || (typeof localParsed.updatedAt === 'number' ? localParsed.updatedAt : 0);
              const remoteTime = new Date(remoteConfig.updatedAt || 0).getTime() || (typeof remoteConfig.updatedAt === 'number' ? remoteConfig.updatedAt : 0);
              if (remoteTime > localTime) {
                shouldUpdateLocal = true;
              }
            } catch (eP) {
              shouldUpdateLocal = true;
            }
          }

          if (shouldUpdateLocal) {
            localStorage.setItem(`cms_event_${slug}_config`, JSON.stringify(remoteConfig));
            if (slug === 'master_default') {
              localStorage.setItem('cms_master_config', JSON.stringify(remoteConfig));
            }
            return remoteConfig;
          }
        }
      }
    } catch (err) {}
    return null;
  }

  async syncAllEventsFromServer() {
    try {
      const res = await fetch(`${this.getApiBaseUrl()}/api/events`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.events) {
          const serverSlugs = Object.keys(data.events);
          let deletedSlugs = [];
          try {
            deletedSlugs = JSON.parse(localStorage.getItem('cms_deleted_slugs') || '[]');
          } catch (e) {}

          // 1. Sync & update server configs into local storage (skipping deleted ones)
          for (const slug of serverSlugs) {
            if (deletedSlugs.includes(slug)) {
              // Ensure server deletes it too if still present
              try {
                await fetch(`${this.getApiBaseUrl()}/api/events/${encodeURIComponent(slug)}`, { method: 'DELETE' });
              } catch (eDel) {}
              continue;
            }

            const serverConfig = data.events[slug];
            if (!serverConfig) continue;
            const localRaw = localStorage.getItem(`cms_event_${slug}_config`);
            let shouldUpdate = false;
            if (!localRaw) {
              shouldUpdate = true;
            } else {
              try {
                const localParsed = JSON.parse(localRaw);
                const localTime = new Date(localParsed.updatedAt || 0).getTime() || (typeof localParsed.updatedAt === 'number' ? localParsed.updatedAt : 0);
                const remoteTime = new Date(serverConfig.updatedAt || 0).getTime() || (typeof serverConfig.updatedAt === 'number' ? serverConfig.updatedAt : 0);
                if (remoteTime > localTime) shouldUpdate = true;
              } catch (e) {
                shouldUpdate = true;
              }
            }
            if (shouldUpdate) {
              localStorage.setItem(`cms_event_${slug}_config`, JSON.stringify(serverConfig));
            }
          }

          // 2. Clean up locally cached events that were permanently deleted on the server
          const localKeys = Object.keys(localStorage);
          localKeys.forEach(k => {
            if (k.startsWith('cms_event_') && k.endsWith('_config')) {
              const localSlug = k.replace('cms_event_', '').replace('_config', '');
              if (localSlug !== 'master_default' && (deletedSlugs.includes(localSlug) || !serverSlugs.includes(localSlug))) {
                localStorage.removeItem(k);
                localStorage.removeItem(`cms_event_${localSlug}_guests`);
                localStorage.removeItem(`cms_event_${localSlug}_audio`);
              }
            }
          });

          return serverSlugs.filter(s => !deletedSlugs.includes(s));
        }
      }
    } catch (err) {}
    return this.getAllEventSlugs();
  }

  async saveToServer(slug, config) {
    if (!slug || slug === 'default') slug = 'master_default';
    try {
      await fetch(`${this.getApiBaseUrl()}/api/events/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
    } catch (err) {}
  }

  async uploadFileToServer(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${this.getApiBaseUrl()}/api/upload`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
      }
    } catch (err) {
      console.warn('Server upload not reachable, using local storage fallback:', err);
    }
    return null;
  }

  async dispatchEmailInvite(inviteData) {
    try {
      const res = await fetch(`${this.getApiBaseUrl()}/api/dispatch-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Server email dispatch failed, using simulated preview:', err);
    }
    return { success: true, simulated: true };
  }

  async saveAudioTrack(slug, fileOrBlob, fileName = '') {
    if (!slug || slug === 'default') slug = 'master_default';
    
    // 1. Save in local IndexedDB for immediate playback
    const ok = await CelebrationAudioDB.setAudio(slug, fileOrBlob, fileName);
    
    // 2. Upload to server if online
    let serverUrl = null;
    if (fileOrBlob instanceof File || fileOrBlob instanceof Blob) {
      serverUrl = await this.uploadFileToServer(fileOrBlob);
    }

    const config = this.getEventConfig(slug) || {};
    config.hasCustomAudio = true;
    config.customAudioName = fileName || 'Uploaded Audio';
    if (serverUrl) config.musicTrackUrl = serverUrl;
    this.saveEventConfig(slug, config);
    return ok;
  }

  async getAudioTrack(slug) {
    if (!slug || slug === 'default') slug = 'master_default';
    return await CelebrationAudioDB.getAudio(slug);
  }

  async deleteAudioTrack(slug) {
    if (!slug || slug === 'default') slug = 'master_default';
    await CelebrationAudioDB.deleteAudio(slug);
    const config = this.getEventConfig(slug) || {};
    config.hasCustomAudio = false;
    config.customAudioName = '';
    delete config.musicTrackUrl;
    this.saveEventConfig(slug, config);
  }

  async deleteEvent(slug) {
    if (!slug || slug === 'master_default' || slug === 'default' || slug === 'master') {
      throw new Error('Master default template cannot be deleted.');
    }
    
    // 1. Mark in deleted list
    try {
      const deletedList = JSON.parse(localStorage.getItem('cms_deleted_slugs') || '[]');
      if (!deletedList.includes(slug)) {
        deletedList.push(slug);
        localStorage.setItem('cms_deleted_slugs', JSON.stringify(deletedList));
      }
    } catch (eDel) {}

    // 2. Delete from local storage
    localStorage.removeItem(`cms_event_${slug}_config`);
    localStorage.removeItem(`cms_event_${slug}_guests`);
    localStorage.removeItem(`cms_event_${slug}_audio`);
    sessionStorage.removeItem(`cms_event_${slug}_audio`);

    const authList = this.getAuthorizedOrganizers().filter(item => item.slug !== slug);
    localStorage.setItem('cms_authorized_organizers', JSON.stringify(authList));

    const admins = this.getAdmins().filter(a => !(a.assignedSlugs && a.assignedSlugs.includes(slug)));
    localStorage.setItem('cms_admins_db', JSON.stringify(admins));

    // 3. Delete from server database
    try {
      await fetch(`${this.getApiBaseUrl()}/api/events/${encodeURIComponent(slug)}`, {
        method: 'DELETE'
      });
    } catch (err) {}

    return true;
  }

  getAllEventSlugs() {
    const keys = Object.keys(localStorage);
    const slugs = new Set(['master_default', 'victoria-25']);
    let deletedSlugs = [];
    try {
      deletedSlugs = JSON.parse(localStorage.getItem('cms_deleted_slugs') || '[]');
    } catch (e) {}

    keys.forEach(k => {
      if (k.startsWith('cms_event_') && k.endsWith('_config')) {
        const slug = k.replace('cms_event_', '').replace('_config', '');
        if (!deletedSlugs.includes(slug)) {
          slugs.add(slug);
        }
      }
    });

    deletedSlugs.forEach(delSlug => {
      slugs.delete(delSlug);
    });

    return Array.from(slugs);
  }

  // --- Guests Management (Isolated per event slug) ---
  getGuests(slug) {
    if (!slug || slug === 'default') slug = 'master_default';
    try {
      const saved = localStorage.getItem(`cms_event_${slug}_guests`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  addGuest(slug, guestData) {
    if (!slug || slug === 'default') slug = 'master_default';
    const list = this.getGuests(slug);
    guestData.timestamp = guestData.timestamp || new Date().toISOString();
    guestData.checkedIn = false;
    guestData.passId = guestData.passId || 'AV25-' + Math.floor(1000 + Math.random() * 9000) + '-VIP';
    list.unshift(guestData);
    localStorage.setItem(`cms_event_${slug}_guests`, JSON.stringify(list));
    return guestData;
  }

  deleteGuest(slug, index) {
    if (!slug || slug === 'default') slug = 'master_default';
    const list = this.getGuests(slug);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      localStorage.setItem(`cms_event_${slug}_guests`, JSON.stringify(list));
    }
  }

  toggleGuestCheckIn(slug, index) {
    if (!slug || slug === 'default') slug = 'master_default';
    const list = this.getGuests(slug);
    if (index >= 0 && index < list.length) {
      list[index].checkedIn = !list[index].checkedIn;
      localStorage.setItem(`cms_event_${slug}_guests`, JSON.stringify(list));
      return list[index].checkedIn;
    }
    return false;
  }

  exportGuestsCSV(slug) {
    const list = this.getGuests(slug);
    if (!list || list.length === 0) {
      alert('No guest registrations found to export yet.');
      return;
    }

    const headers = ["Pass ID", "Guest Name", "Email", "Attendance", "Plus-Ones", "Companion Name", "Dinner Choice", "Cocktail Choice", "Song Request", "Personal Note", "Door Check-in", "Registered At"];
    const rows = list.map(g => [
      `"${g.passId || ''}"`,
      `"${g.name || ''}"`,
      `"${g.email || ''}"`,
      `"${g.attendance || ''}"`,
      `"${g.plusOneCount || '0'}"`,
      `"${g.plusOneName || ''}"`,
      `"${g.dietary || ''}"`,
      `"${g.cocktail || ''}"`,
      `"${(g.song || '').replace(/"/g, '""')}"`,
      `"${(g.message || '').replace(/"/g, '""')}"`,
      `"${g.checkedIn ? 'CHECKED IN' : 'PENDING'}"`,
      `"${g.timestamp || ''}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `VIP_Guests_${slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Super Admin Invite Token System ---
  createInviteToken(adminName, email, initialSlug) {
    const token = 'INV-' + Math.random().toString(36).substring(2, 8).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const tokenData = {
      token,
      adminName,
      email,
      initialSlug: (initialSlug || adminName.toLowerCase().replace(/\s+/g, '-') + '-25'),
      createdAt: new Date().toISOString(),
      used: false
    };

    const tokens = this.getInviteTokens();
    tokens.unshift(tokenData);
    localStorage.setItem('cms_tokens_db', JSON.stringify(tokens));
    return tokenData;
  }

  getInviteTokens() {
    try {
      const saved = localStorage.getItem('cms_tokens_db');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  verifyInviteToken(tokenStr) {
    const tokens = this.getInviteTokens();
    return tokens.find(t => t.token === tokenStr && !t.used);
  }

  consumeInviteToken(tokenStr) {
    const tokens = this.getInviteTokens();
    const target = tokens.find(t => t.token === tokenStr);
    if (target) {
      target.used = true;
      target.usedAt = new Date().toISOString();
      localStorage.setItem('cms_tokens_db', JSON.stringify(tokens));
    }
  }

  // --- Auth & Admin Accounts ---
  getAdmins() {
    try {
      const saved = localStorage.getItem('cms_admins_db');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  registerAdmin({ name, email, password, slug, token }) {
    const tokenObj = this.verifyInviteToken(token);
    if (!tokenObj) {
      throw new Error('Invalid or already used invite registration token.');
    }

    const admins = this.getAdmins();
    if (admins.find(a => a.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An admin with this email is already registered.');
    }

    const finalSlug = slug || tokenObj.initialSlug;
    const newAdmin = {
      id: 'admin-' + Date.now(),
      name,
      email,
      password,
      role: 'admin',
      assignedSlugs: [finalSlug],
      createdAt: new Date().toISOString()
    };

    admins.push(newAdmin);
    localStorage.setItem('cms_admins_db', JSON.stringify(admins));
    this.consumeInviteToken(token);

    // Initialize custom event clone for this new admin
    this.getEventConfig(finalSlug);

    this.setCurrentSession(newAdmin);
    return newAdmin;
  }

  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Guaranteed Super Admin verification
    if (cleanEmail === '8vinokurova@gmail.com' && cleanPass === '1Lytham!') {
      const superAdmin = {
        id: 'admin-super',
        name: 'Super Admin',
        email: '8vinokurova@gmail.com',
        password: '1Lytham!',
        role: 'superadmin',
        assignedSlugs: ['*'],
        createdAt: new Date().toISOString()
      };
      this.setCurrentSession(superAdmin);
      return superAdmin;
    }

    const admins = this.getAdmins();
    const admin = admins.find(a => a.email.toLowerCase() === cleanEmail && a.password === cleanPass);
    if (!admin) {
      throw new Error('Invalid email or password credentials.');
    }
    this.setCurrentSession(admin);
    return admin;
  }

  // --- 5-Digit Email Verification Code Engine ---
  generateVerificationCode(email, purpose = 'rsvp') {
    if (!email) throw new Error('Email is required for verification.');
    const cleanEmail = email.trim().toLowerCase();
    // Generate secure 5-digit code: 10000 - 99999
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    
    const verifications = this.getVerifications();
    verifications[cleanEmail] = {
      code,
      purpose,
      email: cleanEmail,
      createdAt: Date.now(),
      expiresAt: Date.now() + 15 * 60 * 1000 // 15 minutes validity
    };
    localStorage.setItem('cms_email_verifications', JSON.stringify(verifications));
    return code;
  }

  getVerifications() {
    try {
      const saved = localStorage.getItem('cms_email_verifications');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  verifyCode(email, codeToVerify) {
    if (!email || !codeToVerify) return false;
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = codeToVerify.toString().trim();
    const verifications = this.getVerifications();
    const record = verifications[cleanEmail];
    
    if (!record) return false;
    if (Date.now() > record.expiresAt) return false;
    
    if (record.code === cleanCode) {
      delete verifications[cleanEmail];
      localStorage.setItem('cms_email_verifications', JSON.stringify(verifications));
      return true;
    }
    return false;
  }

  getLatestCodeForEmail(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const verifications = this.getVerifications();
    return verifications[cleanEmail] ? verifications[cleanEmail].code : null;
  }

  // --- Multi-Tenant Organizer Authorization Engine ---
  createEventWithOrganizer({ slug, eventName, organizerEmail, protagonistName, organizerName, organizerPassword }) {
    if (!slug) throw new Error('Event slug is required.');
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    const cleanEmail = (organizerEmail || '').trim().toLowerCase();
    const initialPass = (organizerPassword || 'VIP2026!').trim();

    // 1. Create customized event config
    const master = this.getMasterConfig();
    const newConfig = JSON.parse(JSON.stringify(master));
    newConfig.slug = cleanSlug;

    const ageMatch = (eventName || '').match(/\b(\d{1,3})\b/) || (cleanSlug || '').match(/\b(\d{1,3})\b/);
    const detectedAge = ageMatch ? ageMatch[1] : '';

    if (eventName) {
      newConfig.eventName = eventName;
      newConfig.milestoneTitle = eventName.toUpperCase();
      newConfig.heroTitleMain = eventName.toUpperCase();
      newConfig.vipPassOccasion = eventName;
      newConfig.footerTitle = eventName.toUpperCase();
    }
    if (protagonistName) {
      newConfig.protagonistName = protagonistName;
      newConfig.protagonistMonogram = protagonistName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      newConfig.vipPassProtagonist = protagonistName;
      newConfig.envelopeMonogram = newConfig.protagonistMonogram;
      newConfig.footerCopyright = `© 2026 ${protagonistName}. All Rights Reserved.`;
      newConfig.milestoneSubtitle = `An Exclusive Celebration of ${protagonistName}`;
      newConfig.envelopeLetterSubtitle = `The Celebration of ${protagonistName}`;
    }
    if (detectedAge) {
      newConfig.milestoneAge = detectedAge;
      newConfig.heroBadgeSparkle = `EXCLUSIVE ${detectedAge}TH MILESTONE CELEBRATION`;
      newConfig.aboutSectionTitle = `${detectedAge} Years of Elegance & Pure Radiance`;
      newConfig.envelopeSealNumeral = `${detectedAge}`;
      newConfig.vipPassOccasion = `${detectedAge}th Milestone Celebration`;
    } else {
      newConfig.milestoneAge = 'VIP';
      newConfig.heroBadgeSparkle = 'EXCLUSIVE PRIVATE CELEBRATION';
      newConfig.aboutSectionTitle = 'An Evening of Elegance & Pure Radiance';
      newConfig.envelopeSealNumeral = newConfig.protagonistMonogram || 'VIP';
    }

    this.saveEventConfig(cleanSlug, newConfig);

    // 2. Pre-authorize organizer email, generate Magic Link & register direct credentials
    let inviteToken = 'inv_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);

    if (cleanEmail) {
      const authorizedList = this.getAuthorizedOrganizers();
      const existingIdx = authorizedList.findIndex(item => (item.email || '').toLowerCase() === cleanEmail);
      const authRecord = {
        email: cleanEmail,
        slug: cleanSlug,
        organizerName: organizerName || protagonistName || 'Event Organizer',
        eventName: eventName || newConfig.eventName,
        inviteToken,
        initialPassword: initialPass,
        authorizedAt: new Date().toISOString(),
        registered: true
      };
      if (existingIdx >= 0) {
        authorizedList[existingIdx] = authRecord;
      } else {
        authorizedList.unshift(authRecord);
      }
      localStorage.setItem('cms_authorized_organizers', JSON.stringify(authorizedList));

      // Direct admin registration in admins database
      const admins = this.getAdmins();
      const existingAdminIdx = admins.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);
      const adminRecord = {
        id: existingAdminIdx >= 0 ? admins[existingAdminIdx].id : 'admin-' + Date.now(),
        name: organizerName || protagonistName || 'Event Organizer',
        email: cleanEmail,
        password: initialPass,
        role: 'admin',
        assignedSlugs: [cleanSlug],
        createdAt: new Date().toISOString()
      };
      if (existingAdminIdx >= 0) {
        admins[existingAdminIdx] = adminRecord;
      } else {
        admins.push(adminRecord);
      }
      localStorage.setItem('cms_admins_db', JSON.stringify(admins));
    }

    return { slug: cleanSlug, config: newConfig, inviteToken, initialPassword: initialPass, email: cleanEmail };
  }

  getEventOrganizerAccess(slug) {
    if (!slug) return null;
    const authList = this.getAuthorizedOrganizers();
    const auth = authList.find(item => item.slug === slug);
    const admins = this.getAdmins();
    const admin = admins.find(a => (a.assignedSlugs || []).includes(slug));

    return {
      slug,
      email: auth?.email || admin?.email || 'organizer@luxury.com',
      organizerName: auth?.organizerName || admin?.name || 'Event Organizer',
      eventName: auth?.eventName || slug,
      password: admin?.password || auth?.initialPassword || 'VIP2026!',
      inviteToken: auth?.inviteToken || ('inv_' + slug)
    };
  }

  getAuthorizedOrganizers() {
    try {
      const saved = localStorage.getItem('cms_authorized_organizers');
      return saved ? JSON.parse(saved) : [
        { email: 'victoria@sterling.com', slug: 'victoria-25', organizerName: 'Victoria Sterling', eventName: "Victoria's 25th Diamond Gala", inviteToken: 'inv_demo_victoria', registered: true }
      ];
    } catch (e) {
      return [];
    }
  }

  findOrganizerAuthorization(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const list = this.getAuthorizedOrganizers();
    return list.find(item => (item.email || '').toLowerCase() === cleanEmail);
  }

  findOrganizerAuthorizationByInviteToken(token) {
    if (!token) return null;
    const cleanToken = token.trim();
    const list = this.getAuthorizedOrganizers();
    return list.find(item => item.inviteToken === cleanToken);
  }

  activateAdminWithPassword({ token, name, password }) {
    const auth = this.findOrganizerAuthorizationByInviteToken(token);
    if (!auth) {
      throw new Error('Invalid or expired Magic Invite link. Please ask Super Admin for a fresh link.');
    }

    const cleanEmail = (auth.email || '').toLowerCase();
    const admins = this.getAdmins();
    const existingIdx = admins.findIndex(a => (a.email || '').toLowerCase() === cleanEmail);

    const adminRecord = {
      id: existingIdx >= 0 ? admins[existingIdx].id : 'admin-' + Date.now(),
      name: name || auth.organizerName || 'Event Organizer',
      email: cleanEmail,
      password,
      role: 'admin',
      assignedSlugs: [auth.slug],
      createdAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      admins[existingIdx] = adminRecord;
    } else {
      admins.push(adminRecord);
    }
    localStorage.setItem('cms_admins_db', JSON.stringify(admins));

    // Mark authorization as registered
    auth.registered = true;
    localStorage.setItem('cms_authorized_organizers', JSON.stringify(this.getAuthorizedOrganizers()));

    this.setCurrentSession(adminRecord);
    return adminRecord;
  }

  resetAdminPassword(slug, newPassword) {
    if (!slug) throw new Error('Event slug required.');
    const auth = this.getAuthorizedOrganizers().find(item => item.slug === slug);
    if (!auth) throw new Error('Organizer not found for this event.');

    const cleanEmail = (auth.email || '').toLowerCase();
    const admins = this.getAdmins();
    const targetAdmin = admins.find(a => (a.email || '').toLowerCase() === cleanEmail);

    if (targetAdmin) {
      targetAdmin.password = newPassword;
      localStorage.setItem('cms_admins_db', JSON.stringify(admins));
    }

    // Refresh token
    auth.inviteToken = 'inv_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
    localStorage.setItem('cms_authorized_organizers', JSON.stringify(this.getAuthorizedOrganizers()));

    return { email: cleanEmail, newPassword, newInviteToken: auth.inviteToken };
  }

  // --- Verified Guest RSVP Registration ---
  completeGuestRSVP(slug, guestData, code) {
    if (!slug || slug === 'default') slug = 'master_default';
    const cleanEmail = (guestData.email || '').trim().toLowerCase();
    
    // Verify 5-digit code
    const isVerified = this.verifyCode(cleanEmail, code);
    if (!isVerified) {
      throw new Error('Invalid or expired 5-digit verification code. Please enter the correct code.');
    }

    guestData.verified = true;
    guestData.timestamp = new Date().toISOString();
    guestData.passId = guestData.passId || 'AV25-' + Math.floor(1000 + Math.random() * 9000) + '-VIP';

    const guests = this.getGuests(slug);
    const existingIdx = guests.findIndex(g => (g.email || '').toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      guests[existingIdx] = { ...guests[existingIdx], ...guestData };
    } else {
      guests.unshift(guestData);
    }
    localStorage.setItem(`cms_event_${slug}_guests`, JSON.stringify(guests));

    // Generate personalized email invitation
    const emailInvitation = this.generateEmailInvitation(slug, guestData);

    return { guest: guestData, emailInvitation };
  }

  generateEmailInvitation(slug, guest) {
    const config = this.getEventConfig(slug);
    return {
      to: guest.email,
      guestName: guest.name,
      subject: `✨ Your VIP Invitation & Digital Pass: ${config.eventName || '25th Celebration'}`,
      eventName: config.eventName || 'Chapter 25 Celebration',
      protagonistName: config.protagonistName || 'Aurelia Vance',
      dateText: config.eventDateText || 'Saturday, September 26, 2026',
      venueName: config.venueName || 'Villa Solaria Grand Estate',
      venueCity: config.venueCity || 'Milan, Italy',
      passId: guest.passId,
      plusOne: guest.plusOneCount === '1' ? (guest.plusOneName || '1 Distinguished Companion') : 'Solo VIP Pass',
      dietary: guest.dietary,
      cocktail: guest.cocktail,
      dispatchedAt: new Date().toISOString()
    };
  }

  setCurrentSession(admin) {
    sessionStorage.setItem('cms_current_session', JSON.stringify(admin));
  }

  getCurrentSession() {
    try {
      const saved = sessionStorage.getItem('cms_current_session');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  logout() {
    sessionStorage.removeItem('cms_current_session');
  }
}

window.CMSStorageEngine = CMSStorageEngine;
window.cmsStorage = new CMSStorageEngine();
