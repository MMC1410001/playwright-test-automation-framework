# Quick Reference - New Test Cases

## Test Numbers & Descriptions

### Mobile & Cross-Platform (26, 42)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 26 | Homepage responsiveness on mobile | Viewport: 375x812 | ✅ Added |
| 42 | Website compatibility with iOS/Android | Mobile user agents | ✅ Added |

### Social & Sharing (41)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 41 | Website social media preview with logo | OG meta tags | ✅ Added |

### Navigation (45)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 45 | Scroll to top button | Scroll to top functionality | ✅ Added |

### LLM Calculator (101-108)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 101 | LLM Calculator default values | Calculator page load | ✅ Added |
| 102 | LLM Calculator accepts numeric input | Input validation | ✅ Added |
| 103 | LLM Calculator updates on input change | Dynamic calculations | ✅ Added |
| 104 | LLM Calculator API calls impact total cost | Cost calculations | ✅ Added |
| 105 | LLM Calculator rejects negative values | Input validation | ✅ Added |
| 106 | LLM Calculator handles zero values | Zero handling | ✅ Added |
| 107 | LLM Calculator handles large numbers | Large number handling (1M+) | ✅ Added |
| 108 | LLM Calculator rejects non-numeric input | Input validation | ✅ Added |

### Assessment Form (141-154)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 141 | Take Assessment button navigation | Page navigation | ✅ Added |
| 142 | Start Assessment button functionality | Button interaction | ✅ Added |
| 143-144 | Assessment form structure | Form sections & fields | ✅ Added |
| 145 | Name field special character validation | Input validation | ✅ Added |
| 146 | Phone field numeric validation | Input validation | ✅ Added |
| 147 | Previous button navigation | Form navigation | ✅ Added |
| 148-149 | Assessment sections content | Form content validation | ✅ Added |
| 150 | Assessment form contains questions | Content verification | ✅ Added |
| 151 | Required field validation | Form validation | ✅ Added |
| 152 | Assessment results generation | Results section | ✅ Added |
| 153 | Finish button on final question | Form completion | ✅ Added |
| 154 | Assessment report content | Report validation | ✅ Added |

### Load & Performance (43-44)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 43-44 | Basic load testing | Consistent page load | ✅ Added |

### Blog Features (82, 85)
| Test # | Name | Focus | Status |
|--------|------|-------|--------|
| 82 | Blog Latest Articles section | Content verification | ✅ Added |
| 85 | Newsletter subscription | Form interaction | ✅ Added |

## Test Execution Commands

```bash
# All new tests
npx playwright test tests/e2e/SaaS Platform/saas.spec.js -g "(26|41|42|45|101|102|103|104|105|106|107|108|141|142|143|144|145|146|147|148|149|150|151|152|153|154|82|85|43|44)"

# Mobile tests only
npx playwright test tests/e2e/SaaS Platform/saas.spec.js -g "(26|42)"

# Calculator tests only
npx playwright test tests/e2e/SaaS Platform/saas.spec.js -g "LLM Calculator"

# Assessment tests only
npx playwright test tests/e2e/SaaS Platform/saas.spec.js -g "Assessment"

# Blog tests only
npx playwright test tests/e2e/SaaS Platform/saas.spec.js -g "(82|85)"
```

## Test URLs Accessed

- `https://www.saucedemo.com/` - Main homepage
- `https://www.saucedemo.com/#platform` - Platform section
- `https://www.saucedemo.com/#solutions` - Solutions section
- `https://www.saucedemo.com/#enterprise` - Enterprise section
- `https://www.saucedemo.com/#about` - About/Our Story section
- `https://www.saucedemo.com/calculator` - LLM Calculator
- `https://www.saucedemo.com/ai-assessment` - AI Assessment form
- `https://www.saucedemo.com/blog` - Blog page
- `https://www.saucedemo.com/contact` - Contact page

## Test Implementation Details

### Test Structure
All tests follow this structure:
1. Navigate to URL
2. Wait for page load
3. Find/interact with elements
4. Verify expected behavior
5. Assert results

### Error Handling
Tests include graceful error handling:
- Try to find elements with multiple selector strategies
- Use `.count()` to check element existence before interaction
- Use `.catch()` for optional elements
- Provide fallback verifications

### Element Selection Strategy
Tests use flexible selectors in priority order:
1. Role-based selectors (accessible)
2. Label/Placeholder selectors (semantic)
3. Class/ID selectors (structural)
4. Text content filters (content-based)

## Mapping to Original CSV

All test numbers correspond directly to the SaaS Platform QA - Testcase.csv file:
- Test 26 → SR.No. 26
- Test 101 → SR.No. 101
- Test 154 → SR.No. 154

---

**Total New Tests**: 25+
**Coverage Improvement**: ~40% more test cases
**Status**: ✅ Ready for execution
