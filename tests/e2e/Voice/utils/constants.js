// ============================================================
// constants.js — All static values used across Voice tests
// ============================================================

export const BASE_URL = `${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}`;

export const ROUTES = {
  home:      '/',
  about:     '/about',
  contact:   '/contact',
  resources: '/resources',
  privacy:   '/privacy',
  terms:     '/terms',
};

export const TIMEOUTS = {
  navigation: 30_000,   // ms — full page load
  element:    10_000,   // ms — element visibility
  animation:   5_000,   // ms — accordion / CSS transitions
};

export const HERO = {
  headingText:    /Voice AI Agents/i,
  // Actual page text: "Deploy enterprise grade AI voice agents that handle real customer conversations"
  subHeadingText: /enterprise.grade AI voice agents/i,
  metrics: {
    calls:    /45M\+/i,
    languages:/15\+/i,
    response: /500ms/i,
  },
  ctaLabel: /get started/i,
};

export const NAV = {
  blogs:      /blogs/i,
  aboutUs:    /about us/i,
  getStarted: /get started/i,
};

export const FAQ = {
  sectionLabel:   /frequently asked questions/i,
  questionPattern:/what|how|why|when|which|is |can /i,
};

export const INTEGRATIONS = {
  logoAlts: ['Twilio', 'WhatsApp', 'ElevenLabs', 'Exotel'],
};

export const FOOTER = {
  privacyPolicy:    /privacy policy/i,
  termsOfService:   /terms of service/i,
  aboutUs:          /about us/i,
  contact:          /contact/i,
};

// Console errors that are acceptable / not test-critical
export const IGNORED_CONSOLE_ERRORS = [
  'favicon',
  'ERR_BLOCKED_BY_CLIENT',
];

// ── Performance thresholds (milliseconds) ──────────────────────────────────
export const PERFORMANCE = {
  pageLoadMs:       5_000,  // Total page load (loadEventEnd - navigationStart)
  domInteractiveMs: 3_000,  // DOM becomes interactive
  fcpMs:            2_500,  // First Contentful Paint
  lcpMs:            4_000,  // Largest Contentful Paint
  maxRequests:        150,  // Maximum network requests during load
};

// ── Viewport sizes ──────────────────────────────────────────────────────────
export const VIEWPORTS = {
  mobile:  { width: 375,  height: 812  },
  tablet:  { width: 768,  height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

// ── Security ────────────────────────────────────────────────────────────────
export const SECURITY = {
  // Response headers that MUST be present
  requiredHeaders: [
    'x-content-type-options',
    'x-frame-options',
  ],
  // rel values required on external _blank links
  externalLinkRel: ['noopener', 'noreferrer'],
};

// ── Accessibility ───────────────────────────────────────────────────────────
export const A11Y = {
  expectedHtmlLang: 'en',
  requiredLandmarks: ['navigation', 'main', 'contentinfo'],
};

// ── SEO ──────────────────────────────────────────────────────────────────────
export const SEO = {
  // OG tags expected on every public page
  requiredOgTags: ['og:title', 'og:description', 'og:image'],
  // Meta description must be at least this many characters
  minDescriptionLength: 50,
  // Robots content values that indicate the page is intentionally hidden
  blockedRobotsValues: ['noindex', 'none'],
};

// ── About page ───────────────────────────────────────────────────────────────
export const ABOUT = {
  h1Text:         /About Jasmine Labs/i,
  visionSection:  /Our Vision/i,
  whySection:     /Why Jasmine Labs/i,
  valueProps: [
    /Autonomous Voice Agents/i,
    /Seamless Integrations/i,
    /Industry.Ready/i,
    /Actionable Insights/i,
  ],
  indiaOffice: /Our Office in India/i,
  omanOffice:  /Our Office in Oman/i,
};

// ── Contact page / form ───────────────────────────────────────────────────────
export const CONTACT = {
  h1Text:         /Create Voice Agents/i,
  formHeading:    /transform your customer experience/i,
  serviceOptions: ['Inbound', 'Outbound'],
  submitButton:   /send message/i,
  // Validation test data
  validData: {
    name:    'Test User',
    email:   'testuser@example.com',
    phone:   '9876543210',
    service: 'Inbound',
    company: 'Acme Corp',
    message: 'This is an automated test message.',
  },
  invalidEmail: 'not-an-email',
};
