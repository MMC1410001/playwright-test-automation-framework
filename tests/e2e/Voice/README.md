# Jasmine Labs — Playwright E2E Test Suite

Automated end-to-end tests for **[https://the-internet.herokuapp.com](https://the-internet.herokuapp.com)** covering
UI validation, navigation, performance, security, accessibility, SEO, and contact form behaviour.

---

## Folder Structure

```
tests/e2e/Voice Platform/
├── pages/
│   ├── BasePage.js          # Shared page interactions (nav, footer, scroll, assertions)
│   ├── HomePage.js          # Homepage-specific locators and composed actions
│   ├── AboutPage.js         # /about page locators and section assertions
│   └── ContactPage.js       # /contact form locators, fill, submit, and validation helpers
├── helpers/
│   ├── navigationHelper.js      # Click→URL assertions, console error capture, broken image check
│   ├── performanceHelper.js     # Navigation Timing, FCP, LCP, network request counter
│   ├── securityHelper.js        # HTTPS, response headers, mixed content, link safety, secrets scan
│   ├── accessibilityHelper.js   # Alt text, H1 count, lang attr, ARIA landmarks, label check
│   └── seoHelper.js             # Meta description, OG tags, canonical URL, robots meta, JSON-LD
├── utils/
│   └── constants.js         # All selectors, text patterns, thresholds, URLs, test data
├── homepage.spec.js          # 47 test cases — TC-001 → TC-047
├── about.spec.js             # 10 test cases — TC-048 → TC-057
├── contact.spec.js           # 12 test cases — TC-058 → TC-069
└── README.md                 # This file
```

---

## Test Coverage — 69 Test Cases

### Homepage Core (TC-001 → TC-015)

| ID | Test | Type |
|----|------|------|
| TC-001 | Page load & HTTP status < 400, title contains "Jasmine" | Smoke |
| TC-002 | Hero heading and sub-heading visible | Functional |
| TC-003 | Key metrics displayed (45M+, 15+, 500ms) | Functional |
| TC-004 | Hero "Get Started" CTA navigates to `/contact` | Navigation |
| TC-005 | Header nav "Blogs" navigates to `/resources` | Navigation |
| TC-006 | Header nav "About Us" navigates to `/about` | Navigation |
| TC-007 | Header nav "Get Started" navigates to `/contact` | Navigation |
| TC-008 | Logo click from `/about` returns to homepage | Navigation |
| TC-009 | FAQ accordion expands on click | Interaction |
| TC-010 | Integration partner logos present in DOM (carousel) | Functional |
| TC-011 | Footer "Privacy Policy" navigates to `/privacy` | Navigation |
| TC-012 | Footer "Terms of Service" navigates to `/terms` | Navigation |
| TC-013 | Footer "About Us" navigates to `/about` | Navigation |
| TC-014 | No broken images (`naturalWidth === 0`) | Asset |
| TC-015 | No critical JS console errors on load | Diagnostic |

---

### UI Validation (TC-016 → TC-022)

| ID | Test | What Is Verified |
|----|------|-----------------|
| TC-016 | Header sticky after scroll to bottom | `nav` has `position: fixed` |
| TC-017 | CTA "Get Started" has pointer cursor | `cursor: pointer` computed style |
| TC-018 | Mobile viewport (375px) — no horizontal overflow | `scrollWidth <= clientWidth` |
| TC-019 | Tablet viewport (768px) — nav and hero heading visible | Layout at 768×1024 |
| TC-020 | Footer copyright text contains current year | `©` symbol + year 2025–2030 |
| TC-021 | Favicon configured in `<head>` | `<link rel="icon">` present |
| TC-022 | All anchors have a non-empty `href` | No `href=""` or missing href |

---

### Performance (TC-023 → TC-027)

| ID | Test | Threshold |
|----|------|-----------|
| TC-023 | Total page load time | < 5 000 ms |
| TC-024 | DOM interactive time | < 3 000 ms |
| TC-025 | First Contentful Paint (FCP) | < 2 500 ms |
| TC-026 | Largest Contentful Paint (LCP) | < 4 000 ms |
| TC-027 | Total network requests during load | ≤ 150 |

> Performance metrics are captured via the **Navigation Timing API** and **PerformanceObserver**
> (with `buffered: true` for LCP). FCP/LCP skip with a warning if the browser does not support
> the entry type, rather than failing.

---

### Security (TC-028 → TC-033)

| ID | Test | Result |
|----|------|--------|
| TC-028 | Site served over HTTPS | Pass |
| TC-029 | `x-content-type-options` & `x-frame-options` headers present | **Expected failure** — known finding |
| TC-030 | No mixed content (HTTP resources on HTTPS page) | Pass |
| TC-031 | External `target="_blank"` links have `rel="noopener noreferrer"` | Pass |
| TC-032 | No API keys / bearer tokens / private key blocks in HTML | Pass |
| TC-033 | Cookies set by homepage include `SameSite` attribute | Pass |

---

### Accessibility — Homepage (TC-034 → TC-040)

| ID | Test | WCAG Reference |
|----|------|----------------|
| TC-034 | All `<img>` have non-empty `alt` attributes | WCAG 1.1.1 |
| TC-035 | Page has exactly one `<h1>` | WCAG 1.3.1 |
| TC-036 | `<html lang>` attribute is set and starts with `"en"` | WCAG 3.1.1 |
| TC-037 | ARIA landmarks present: `nav`, `main`, `footer` | WCAG 1.3.6 |
| TC-038 | No links with non-descriptive text ("click here", "read more") | WCAG 2.4.6 |
| TC-039 | All visible form inputs have accessible labels | WCAG 1.3.1 |
| TC-040 | No elements have a positive `tabindex` (tab-order anti-pattern) | WCAG 2.4.3 |

---

### SEO (TC-041 → TC-047)

| ID | Test | Result |
|----|------|--------|
| TC-041 | Meta description is present and ≥ 50 characters | Pass |
| TC-042 | `og:title` Open Graph tag is present | **Expected failure** — tag missing |
| TC-043 | `og:description` Open Graph tag is present | **Expected failure** — tag missing |
| TC-044 | `og:image` Open Graph tag is present | **Expected failure** — tag missing |
| TC-045 | Canonical `<link>` is set | **Expected failure** — tag missing |
| TC-046 | `robots` meta does not block indexing | Pass |
| TC-047 | JSON-LD structured data block is present | **Expected failure** — no JSON-LD found |

---

### About Page (TC-048 → TC-057)

| ID | Test | Type |
|----|------|------|
| TC-048 | About page loads with HTTP 200 | Smoke |
| TC-049 | H1 heading "About Jasmine Labs" is visible | Functional |
| TC-050 | "Our Vision" section is visible | Functional |
| TC-051 | "Why Jasmine Labs" section is visible | Functional |
| TC-052 | All four value proposition cards are visible | Functional |
| TC-053 | Office locations section is present | Functional |
| TC-054 | Nav "About Us" link works from homepage | Navigation |
| TC-055 | Footer link on About page navigates to `/contact` | Navigation |
| TC-056 | No broken images on About page | Asset |
| TC-057 | About page has a meta description | SEO / Smoke |

---

### Contact Page (TC-058 → TC-069)

| ID | Test | Type |
|----|------|------|
| TC-058 | Contact page loads with HTTP 200 | Smoke |
| TC-059 | H1 heading "Create Voice Agents" is visible | Functional |
| TC-060 | Contact form `<form>` element is present | Functional |
| TC-061 | All required fields visible (Name, Email, Phone, Service) | Functional |
| TC-062 | Service dropdown contains "Inbound" and "Outbound" options | Functional |
| TC-063 | Submit button is visible and enabled | Functional |
| TC-064 | Empty form submit — page stays at `/contact` (validation fires) | Validation |
| TC-065 | Email field rejects invalid format (`not-an-email`) | Validation |
| TC-066 | All fields accept typed values (smoke fill) | Functional |
| TC-067 | All form inputs have accessible labels | **Expected failure** — A11Y finding |
| TC-068 | Phone country code selector is visible | Functional |
| TC-069 | Optional fields (Company, Message textarea) are present | Functional |

---

## Running the Tests

### Run all 69 tests
```bash
npx playwright test tests/e2e/Voice Platform/
```

### Run a single spec file
```bash
npx playwright test tests/e2e/Voice Platform/homepage.spec.js
npx playwright test tests/e2e/Voice Platform/about.spec.js
npx playwright test tests/e2e/Voice Platform/contact.spec.js
```

### Run a specific suite by describe label
```bash
npx playwright test tests/e2e/Voice Platform/ --grep "UI Validation"
npx playwright test tests/e2e/Voice Platform/ --grep "Performance"
npx playwright test tests/e2e/Voice Platform/ --grep "Security"
npx playwright test tests/e2e/Voice Platform/ --grep "Accessibility"
npx playwright test tests/e2e/Voice Platform/ --grep "SEO"
npx playwright test tests/e2e/Voice Platform/ --grep "About Page"
npx playwright test tests/e2e/Voice Platform/ --grep "Contact Page"
```

### Run a specific test case by ID
```bash
npx playwright test tests/e2e/Voice Platform/ --grep "TC-065"
```

### Run headed (see the browser)
```bash
npx playwright test tests/e2e/Voice Platform/ --headed
```

### Limit parallel workers
```bash
npx playwright test tests/e2e/Voice Platform/ --workers=2
```

### View the HTML report after a run
```bash
npx playwright show-report
```

---

## Architecture

### Page Object Model

All page interactions go through POM classes — tests never contain raw selectors or URLs.

```
BasePage.js
  ├── goto(path)             Navigate relative to BASE_URL
  ├── gotoFull(url)          Navigate to full URL, returns Response
  ├── expectURL(pattern)     Assert current URL
  ├── expectTitle(pattern)   Assert page <title>
  ├── scrollTo(locator)      Scroll element into viewport
  ├── scrollToBottom()       Scroll to page bottom
  ├── navBar                 Locator → <nav>
  ├── clickNavLink(label)    Click a nav link by label
  ├── logoLink               Locator → logo <a> (a:has(img[alt="Jasmine Labs"]))
  ├── clickLogo()            Click the site logo
  ├── footer                 Locator → <footer>
  └── clickFooterLink(label) Scroll footer into view + click link

HomePage.js  (extends BasePage)
  ├── open()                          goto('/')
  ├── heroHeading                     Locator → <h1>
  ├── heroSubHeading                  Locator → hero description paragraph
  ├── heroGetStartedButton            Locator → first "Get Started" CTA link
  ├── metricCalls/Languages/Response  Locators → stat badge elements
  ├── expectHeroVisible()             Assert heading + sub-heading visible
  ├── expectMetricsVisible()          Assert all three metrics visible
  ├── clickHeroGetStarted()           Click hero CTA
  ├── firstFaqQuestion                Locator → first FAQ accordion trigger
  ├── faqAnswerText                   Locator → expanded FAQ answer
  ├── expandFirstFaq()                Scroll + click first FAQ item
  ├── integrationLogos                Locator → partner logo <img> elements
  ├── expectIntegrationLogosVisible() Assert logos attached in DOM (carousel-safe)
  ├── header                          Locator → <nav> (site's fixed nav bar)
  ├── getHeaderPosition()             Returns computed CSS position of nav
  ├── hasHorizontalScroll()           Returns true if page overflows horizontally
  ├── getCursorStyle(selector)        Returns computed cursor value
  ├── faviconLink                     Locator → <link rel="icon">
  └── getEmptyLinks()                 Returns anchors with empty/missing href

AboutPage.js  (extends BasePage)
  ├── open()                          goto('/about')
  ├── h1                              Locator → <h1>
  ├── visionSection                   Locator → "Our Vision" heading/section
  ├── whySection                      Locator → "Why Jasmine Labs" heading/section
  ├── valueProps                      Array of 4 Locators → value proposition cards
  ├── expectH1Visible()               Assert H1 visible
  ├── expectValuePropsVisible()       Assert all 4 cards visible
  └── expectOfficeLocationsVisible()  Assert India + Oman office sections visible

ContactPage.js  (extends BasePage)
  ├── open()                    goto('/contact')
  ├── h1                        Locator → <h1>
  ├── form                      Locator → <form>
  ├── nameInput                 Locator → Name field
  ├── emailInput                Locator → Email field
  ├── phoneInput                Locator → Phone field
  ├── serviceSelect             Locator → Service <select>
  ├── companyInput              Locator → Company field
  ├── messageTextarea           Locator → Message <textarea>
  ├── submitButton              Locator → "Send Message" button
  ├── fillForm({...})           Fill all form fields from data object
  ├── submit()                  Click submit button
  ├── getServiceOptions()       Returns array of <option> text values
  ├── getValidationMessage(loc) Returns HTML5 validationMessage string
  └── isInvalid(loc)            Returns true if element fails HTML5 validity
```

### Helpers

| File | Exports | Used By |
|------|---------|---------|
| `navigationHelper.js` | `attachConsoleErrorListener`, `navigateAndAssertURL`, `clickAndAssertURL`, `getBrokenImages`, `assertSuccessfulResponse` | Core, TC-014, TC-015, TC-056 |
| `performanceHelper.js` | `getNavigationTimings`, `getFirstContentfulPaint`, `getLargestContentfulPaint`, `attachRequestCounter` | TC-023 → TC-027 |
| `securityHelper.js` | `isHTTPS`, `getResponseHeaders`, `getMixedContentUrls`, `getUnsafeExternalLinks`, `detectExposedSecrets`, `getCookiesMissingSameSite` | TC-028 → TC-033 |
| `accessibilityHelper.js` | `getImagesWithoutAlt`, `getH1Count`, `getHTMLLang`, `getMissingAriaLandmarks`, `getLinksWithPoorText`, `getInputsWithoutLabel`, `getPositiveTabindexElements` | TC-034 → TC-040, TC-067 |
| `seoHelper.js` | `getMetaDescription`, `getOgTag`, `getCanonicalUrl`, `getRobotsMeta`, `getJsonLdScripts`, `getPageTitle` | TC-041 → TC-047, TC-057 |

### Constants (`utils/constants.js`)

All magic values are centralised here. Change once, applies everywhere.

| Export | Purpose |
|--------|---------|
| `BASE_URL` | `https://the-internet.herokuapp.com` |
| `ROUTES` | Path map: `home`, `about`, `contact`, `resources`, `privacy`, `terms` |
| `TIMEOUTS` | `navigation` (30 s), `element` (10 s), `animation` (5 s) |
| `HERO` | Heading / sub-heading text patterns, metric regexes, CTA label |
| `NAV` | Navigation link labels |
| `FOOTER` | Footer link labels |
| `INTEGRATIONS` | Partner logo alt text list |
| `IGNORED_CONSOLE_ERRORS` | Non-critical console error strings to suppress |
| `PERFORMANCE` | Threshold values for TC-023 → TC-027 |
| `VIEWPORTS` | `mobile` (375×812), `tablet` (768×1024), `desktop` (1920×1080) |
| `SECURITY` | Required response headers, external link rel values |
| `A11Y` | Expected HTML lang, required landmark roles |
| `SEO` | Required OG tags list, min description length, blocked robots values |
| `ABOUT` | H1 text, section headings, value prop patterns, office section labels |
| `CONTACT` | H1 text, service options, submit button label, valid/invalid test data |

---

## Known Issues / Findings

| TC | Status | Finding |
|----|--------|---------|
| TC-029 | Expected failure | Server does not send `x-content-type-options` or `x-frame-options`. Add via Next.js `headers()` config or CDN/proxy rules. |
| TC-042 | Expected failure | `og:title` Open Graph meta tag is missing from the homepage `<head>`. |
| TC-043 | Expected failure | `og:description` Open Graph meta tag is missing from the homepage `<head>`. |
| TC-044 | Expected failure | `og:image` Open Graph meta tag is missing from the homepage `<head>`. |
| TC-045 | Expected failure | No `<link rel="canonical">` tag found on the homepage. |
| TC-047 | Expected failure | No JSON-LD structured data (`<script type="application/ld+json">`) on the homepage. |
| TC-067 | Expected failure | All 5 contact form inputs (name, email, phone, company, message) lack associated `<label>`, `aria-label`, or `aria-labelledby`. Placeholder text alone does not meet WCAG 1.3.1. |

> All `test.fail()` entries are **intentional** — they document real site findings and will
> automatically turn green once the corresponding fix is deployed.

---

## Playwright Configuration

The suite inherits settings from the root `playwright.config.js`:

| Setting | Value |
|---------|-------|
| Browser | Chromium |
| Headless | `false` (browser visible) |
| Viewport | 1920 × 1080 |
| Test timeout | 60 s |
| Assertion timeout | 10 s |
| Video | Recorded on every run |
| Trace | Recorded on every run |
| Screenshot | On failure only |
| Retries | 0 (local), 2 (CI) |
| Parallelism | Full parallel (local), 1 worker (CI) |
