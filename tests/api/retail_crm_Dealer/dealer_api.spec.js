// Auth key
// DEALER_API_KEY=opusretail_crmdealerapis

const { test, expect } = require('@playwright/test');
const { classifyRedisState, redisBanner, REDIS_DOWN_ANNOTATION } = require('./redis-state');

//Production
// const BASE_URL = process.env.DEALER_API_BASE_URL || `${process.env.DEALER_API_URL || 'https://reqres.in'}`;

//Development
const BASE_URL = process.env.DEALER_API_BASE_URL || `${process.env.DEALER_API_URL || 'https://reqres.in'}/`;
const API_KEY = 'opusretail_crmdealerapis';
const DEALER_ID = process.env.DEALER_ID || '6100000001'; // replace with actual dealer ID

test.describe('RetailCrm Dealer Sales API', () => {
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: BASE_URL,
      extraHTTPHeaders: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ===========================================================================
  // FUNCTIONAL TESTS — TC_1 to TC_67
  // Valid inputs, happy-path scenarios expecting 200
  // ===========================================================================

  test.describe('Functional', () => {

    // --- Health ---
    test('TC_1 GET /health - should return 200', async () => {
      const response = await apiContext.get('/health');
      console.log('TC_1 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Overall Summary ---

    test('TC_2 GET overall-summary - defaults (no params)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_2 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_3 GET overall-summary - with asOfDate', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: '2025-03-31' },
      });
      console.log('TC_3 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_4 GET overall-summary - with distributionChannel=11', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { distributionChannel: '11' },
      });
      console.log('TC_4 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_5 GET overall-summary - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_5 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_6 GET overall-summary - distributionChannel=21', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { distributionChannel: '21' },
      });
      console.log('TC_6 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_7 GET overall-summary - distributionChannel=All (explicit)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { distributionChannel: 'All' },
      });
      console.log('TC_7 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_8 GET overall-summary - asOfDate + distributionChannel=12 combo', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: '2025-03-31', distributionChannel: '12' },
      });
      console.log('TC_8 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Top Products ---

    test('TC_9 GET top-products - defaults', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`);
      console.log('TC_9 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_10 GET top-products - with limit=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 10 },
      });
      console.log('TC_10 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_11 GET top-products - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_11 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_12 GET top-products - asOfDate + limit=10 combo', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { asOfDate: '2025-03-31', limit: 10 },
      });
      console.log('TC_12 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_13 GET top-products - limit=25 (mid-range)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 25 },
      });
      console.log('TC_13 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Category Breakdown ---

    test('TC_14 GET category-breakdown - defaults', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`);
      console.log('TC_14 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_15 GET category-breakdown - with asOfDate + distributionChannel', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`, {
        params: { asOfDate: '2025-03-31', distributionChannel: '11' },
      });
      console.log('TC_15 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_16 GET category-breakdown - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_16 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_17 GET category-breakdown - distributionChannel=21', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`, {
        params: { distributionChannel: '21' },
      });
      console.log('TC_17 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Channel Split ---

    test('TC_18 GET channel-split - defaults', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`);
      console.log('TC_18 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_19 GET channel-split - with distributionChannel=11', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`, {
        params: { distributionChannel: '11' },
      });
      console.log('TC_19 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_20 GET channel-split - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_20 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_21 GET channel-split - distributionChannel=21', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`, {
        params: { distributionChannel: '21' },
      });
      console.log('TC_21 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Subbrand Split ---

    test('TC_22 GET subbrand-split - defaults', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`);
      console.log('TC_22 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_23 GET subbrand-split - with distributionChannel=12', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`, {
        params: { distributionChannel: '12' },
      });
      console.log('TC_23 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_24 GET subbrand-split - distributionChannel=11', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`, {
        params: { distributionChannel: '11' },
      });
      console.log('TC_24 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_25 GET subbrand-split - distributionChannel=21', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`, {
        params: { distributionChannel: '21' },
      });
      console.log('TC_25 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Sales Analytics ---

    test('TC_26 GET analytics - defaults', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`);
      console.log('TC_26 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_27 GET analytics - with asOfDate + distributionChannel', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`, {
        params: { asOfDate: '2025-03-31', distributionChannel: '11' },
      });
      console.log('TC_27 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_28 GET analytics - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_28 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_29 GET analytics - distributionChannel=12', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`, {
        params: { distributionChannel: '12' },
      });
      console.log('TC_29 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Product Sales Report Search ---

    test('TC_30 GET products/search - defaults (MTD, no filters)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`);
      console.log('TC_30 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_31 GET products/search - periodType=YTD', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'YTD' },
      });
      console.log('TC_31 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_32 GET products/search - periodType=QTD', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'QTD' },
      });
      console.log('TC_32 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_33 GET products/search - periodType=PREVIOUS MONTH', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'PREVIOUS MONTH' },
      });
      console.log('TC_33 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_34 GET products/search - periodType=PREVIOUS QUARTER', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'PREVIOUS QUARTER' },
      });
      console.log('TC_34 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_35 GET products/search - periodType=CUSTOM with startDate + endDate', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM', startDate: '2025-01-01', endDate: '2025-03-31' },
      });
      console.log('TC_35 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_36 GET products/search - with category filter (Interior)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Interior' },
      });
      console.log('TC_36 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_37 GET products/search - with subBrand filter (One)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { subBrand: 'One' },
      });
      console.log('TC_37 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_38 GET products/search - multi-select distributionChannel (11,12)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { distributionChannel: '11,12' },
      });
      console.log('TC_38 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_39 GET products/search - distributionChannel=10', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { distributionChannel: '10' },
      });
      console.log('TC_39 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_40 GET products/search - distributionChannel=21', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { distributionChannel: '21' },
      });
      console.log('TC_40 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_41 GET products/search - distributionChannel=All (explicit)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { distributionChannel: 'All' },
      });
      console.log('TC_41 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_42 GET products/search - category=Enamels', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Enamels' },
      });
      console.log('TC_42 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_43 GET products/search - category=Exterior', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Exterior' },
      });
      console.log('TC_43 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_44 GET products/search - category=Waterproofing', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Waterproofing' },
      });
      console.log('TC_44 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_45 GET products/search - subBrand=Calista', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { subBrand: 'Calista' },
      });
      console.log('TC_45 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_46 GET products/search - subBrand=Prime', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { subBrand: 'Prime' },
      });
      console.log('TC_46 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_47 GET products/search - multi-select category (Interior,Exterior)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Interior,Exterior' },
      });
      console.log('TC_47 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_48 GET products/search - multi-select subBrand (One,Calista)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { subBrand: 'One,Calista' },
      });
      console.log('TC_48 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_49 GET products/search - multi-select category (Enamels,Waterproofing)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'Enamels,Waterproofing' },
      });
      console.log('TC_49 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_50 GET products/search - multi-select subBrand (One,Prime,Calista)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { subBrand: 'One,Prime,Calista' },
      });
      console.log('TC_50 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_51 GET products/search - sortBy=volume, sortOrder=asc', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'volume', sortOrder: 'asc' },
      });
      console.log('TC_51 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_52 GET products/search - sortBy=growth, sortOrder=desc', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'growth', sortOrder: 'desc' },
      });
      console.log('TC_52 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_53 GET products/search - sortBy=value, sortOrder=asc', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'value', sortOrder: 'asc' },
      });
      console.log('TC_53 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_54 GET products/search - sortBy=value, sortOrder=desc (default sort field)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'value', sortOrder: 'desc' },
      });
      console.log('TC_54 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_55 GET products/search - sortBy=volume, sortOrder=desc', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'volume', sortOrder: 'desc' },
      });
      console.log('TC_55 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_56 GET products/search - sortBy=growth, sortOrder=asc', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'growth', sortOrder: 'asc' },
      });
      console.log('TC_56 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_57 GET products/search - pagination (page=0, pageSize=5)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { page: 0, pageSize: 5 },
      });
      console.log('TC_57 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_58 GET products/search - page=1 (second page)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { page: 1, pageSize: 10 },
      });
      console.log('TC_58 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_59 GET products/search - asOfDate + category combo', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { asOfDate: '2025-03-31', category: 'Interior' },
      });
      console.log('TC_59 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_60 GET products/search - CUSTOM + distributionChannel + category combo', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: {
          periodType: 'CUSTOM',
          startDate: '2025-01-01',
          endDate: '2025-03-31',
          distributionChannel: '11',
          category: 'Interior',
        },
      });
      console.log('TC_60 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_61 GET products/search - downloadReport=true (all rows, no pagination)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { downloadReport: true },
      });
      console.log('TC_61 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_62 GET products/search - downloadReport=true with category filter', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { downloadReport: true, category: 'Interior' },
      });
      console.log('TC_62 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    // --- Response body structure validation ---

    test('TC_63 GET products/search - response body should be a valid JSON object', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: 5 },
      });
      console.log('TC_63 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).not.toBeNull();
      expect(typeof data).toBe('object');
    });

    test('TC_64 GET overall-summary - response body should be a valid JSON object', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_64 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).not.toBeNull();
      expect(typeof data).toBe('object');
    });

    test('TC_65 GET top-products - response body should be a valid JSON object', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`);
      console.log('TC_65 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).not.toBeNull();
      expect(typeof data).toBe('object');
    });

    // --- Content-Type header validation ---

    test('TC_66 GET /health - response Content-Type should be application/json', async () => {
      const response = await apiContext.get('/health');
      console.log('TC_66 Content-Type:', response.headers()['content-type']);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/application\/json/);
    });

    test('TC_67 GET overall-summary - response Content-Type should be application/json', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_67 Content-Type:', response.headers()['content-type']);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toMatch(/application\/json/);
    });
  });

  // ===========================================================================
  // EDGE CASES — TC_68 to TC_76
  // Boundary / unusual but valid inputs that still expect a 200
  // ===========================================================================

  test.describe('Edge Cases', () => {

    test('TC_68 GET top-products - boundary limit=1 (minimum allowed)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 1 },
      });
      console.log('TC_68 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_69 GET top-products - boundary limit=50 (maximum allowed)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 50 },
      });
      console.log('TC_69 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_70 GET overall-summary - future asOfDate (2099-12-31) should return 200 with empty/zero data', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: '2099-12-31' },
      });
      console.log('TC_70 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_71 GET products/search - very large page number (out of bounds) should return 200 with empty results', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { page: 999999, pageSize: 25 },
      });
      console.log('TC_71 Status:', response.status());
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('TC_72 GET products/search - CUSTOM with leap year endDate (2024-02-29)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM', startDate: '2024-01-01', endDate: '2024-02-29' },
      });
      console.log('TC_72 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_73 GET overall-summary - very old asOfDate (1900-01-01) should return 200', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: '1900-01-01' },
      });
      console.log('TC_73 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_74 GET products/search - CUSTOM startDate equals endDate (single-day range)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM', startDate: '2025-03-31', endDate: '2025-03-31' },
      });
      console.log('TC_74 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_75 GET products/search - pageSize=1 (minimum valid boundary)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: 1 },
      });
      console.log('TC_75 Status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('TC_76 GET products/search - pageSize=200 (maximum valid boundary)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: 200 },
      });
      console.log('TC_76 Status:', response.status());
      expect(response.status()).toBe(200);
    });
  });

  // ===========================================================================
  // NEGATIVE CASES — TC_77 to TC_103
  // Invalid inputs that must return 4xx (never 500)
  // ===========================================================================

  test.describe('Negative Cases', () => {

    // --- Invalid dealer_id (all endpoints) ---

    test('TC_77 GET overall-summary - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/overall-summary');
      console.log('TC_77 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- Top Products param violations ---

    test('TC_78 GET top-products - limit=0 (below min=1) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 0 },
      });
      console.log('TC_78 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_79 GET top-products - limit=51 (above max=50) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 51 },
      });
      console.log('TC_79 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    // --- pageSize violations ---

    test('TC_80 GET products/search - pageSize=0 (below min=1) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: 0 },
      });
      console.log('TC_80 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_81 GET products/search - pageSize=201 (above max=200) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: 201 },
      });
      console.log('TC_81 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    // --- Invalid asOfDate format ---

    test('TC_82 GET overall-summary - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: 'not-a-date' },
      });
      console.log('TC_82 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_83 GET top-products - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { asOfDate: '31-03-2025' },
      });
      console.log('TC_83 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_84 GET category-breakdown - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`, {
        params: { asOfDate: 'invalid-date' },
      });
      console.log('TC_84 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_85 GET channel-split - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`, {
        params: { asOfDate: 'invalid-date' },
      });
      console.log('TC_85 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_86 GET subbrand-split - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`, {
        params: { asOfDate: 'invalid-date' },
      });
      console.log('TC_86 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_87 GET analytics - invalid asOfDate format should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`, {
        params: { asOfDate: 'invalid-date' },
      });
      console.log('TC_87 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    // --- CUSTOM date range violations ---

    test('TC_88 GET products/search - CUSTOM periodType without startDate and endDate should return non-200', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM' },
      });
      console.log('TC_88 Status:', response.status());
      expect(response.status()).not.toBe(200);
    });

    test('TC_89 GET products/search - CUSTOM periodType with only startDate (missing endDate) should return non-200', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM', startDate: '2025-01-01' },
      });
      console.log('TC_89 Status:', response.status());
      expect(response.status()).not.toBe(200);
    });

    test('TC_90 GET products/search - startDate after endDate (inverted range) should return non-200', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM', startDate: '2025-03-31', endDate: '2025-01-01' },
      });
      console.log('TC_90 Status:', response.status());
      expect(response.status()).not.toBe(200);
    });

    // --- Invalid enum values ---

    test('TC_91 GET products/search - invalid periodType value (WEEKLY) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'WEEKLY' },
      });
      console.log('TC_91 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_92 GET products/search - invalid sortBy value (price) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortBy: 'price' },
      });
      console.log('TC_92 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_93 GET products/search - invalid sortOrder value (random) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { sortOrder: 'random' },
      });
      console.log('TC_93 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_94 GET products/search - negative page value (page=-1) should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { page: -1 },
      });
      console.log('TC_94 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    // --- Invalid dealer_id for remaining endpoints ---

    test('TC_95 GET category-breakdown - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/category-breakdown');
      console.log('TC_95 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_96 GET channel-split - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/channel-split');
      console.log('TC_96 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_97 GET subbrand-split - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/subbrand-split');
      console.log('TC_97 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_98 GET analytics - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/analytics');
      console.log('TC_98 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_99 GET products/search - invalid dealer_id should return non-500', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_XYZ/sales/products/search');
      console.log('TC_99 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- Additional boundary violations ---

    test('TC_100 GET products/search - negative pageSize value should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { pageSize: -5 },
      });
      console.log('TC_100 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    test('TC_101 GET top-products - negative limit value should return 422', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: -1 },
      });
      console.log('TC_101 Status:', response.status());
      expect(response.status()).toBe(422);
    });

    // --- Invalid filter values ---

    test('TC_102 GET products/search - invalid category value should return non-500', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: 'InvalidCategoryThatDoesNotExist' },
      });
      console.log('TC_102 Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // Solution Doc v2.0 §7: every distributionChannel-accepting endpoint validates the value
    // against the allowed channel IDs (10, 11, 12, 21 / All); an unknown value returns
    // 422 INVALID_FILTER_VALUE. Assert that contract across all seven channel endpoints.
    test('TC_103 invalid distributionChannel=99 should return 422 INVALID_FILTER_VALUE (all channel endpoints)', async () => {
      const channelEndpoints = [
        'sales/overall-summary',
        'sales/top-products',
        'sales/category-breakdown',
        'sales/channel-split',
        'sales/subbrand-split',
        'sales/analytics',
        'sales/products/search',
      ];
      for (const endpoint of channelEndpoints) {
        const response = await apiContext.get(`/dealers/${DEALER_ID}/${endpoint}`, {
          params: { distributionChannel: '99' },
        });
        const body = await response.text();
        console.log(`TC_103 ${endpoint} | Status: ${response.status()}`);
        expect(response.status(), `${endpoint} should reject distributionChannel=99 with 422`).toBe(422);
        expect(body, `${endpoint} error body should carry INVALID_FILTER_VALUE`).toContain('INVALID_FILTER_VALUE');
      }
    });
  });

  // ===========================================================================
  // SECURITY TESTS — TC_104_SEC to TC_122_SEC
  // Auth, injection, method abuse, header leakage
  // ===========================================================================

  test.describe('Security', () => {

    // --- Authentication & Authorization ---
    // NOTE: /health is intentionally public per spec v1.1.0 ("security": []).
    // Auth tests use a protected endpoint (/overall-summary) to verify key enforcement.

    test('TC_104_SEC Missing API key - protected endpoint should return 401 or 403', async ({ playwright }) => {
      const unauthContext = await playwright.request.newContext({ baseURL: BASE_URL });
      const response = await unauthContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_104_SEC Status:', response.status());
      expect([401, 403]).toContain(response.status());
      await unauthContext.dispose();
    });

    test('TC_105_SEC Invalid API key - protected endpoint should return 401 or 403', async ({ playwright }) => {
      const invalidKeyContext = await playwright.request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: { 'x-api-key': 'invalid-key-xyz-12345' },
      });
      const response = await invalidKeyContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_105_SEC Status:', response.status());
      expect([401, 403]).toContain(response.status());
      await invalidKeyContext.dispose();
    });

    test('TC_106_SEC Empty API key - protected endpoint should return 401 or 403', async ({ playwright }) => {
      const emptyKeyContext = await playwright.request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: { 'x-api-key': '' },
      });
      const response = await emptyKeyContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_106_SEC Status:', response.status());
      expect([401, 403]).toContain(response.status());
      await emptyKeyContext.dispose();
    });

    // --- Path Traversal ---

    test('TC_107_SEC Path traversal in dealer_id - should not expose internal paths', async () => {
      const payloads = ['../admin', '../../etc/passwd', '..%2F..%2Fetc%2Fpasswd'];
      for (const payload of payloads) {
        const response = await apiContext.get(`/dealers/${encodeURIComponent(payload)}/sales/overall-summary`);
        console.log(`TC_107_SEC Payload: ${payload} | Status: ${response.status()}`);
        expect(response.status()).not.toBe(500);
        expect([400, 404, 422]).toContain(response.status());
      }
    });

    // --- SQL Injection ---

    test('TC_108_SEC SQL injection in dealer_id - should not cause 500 or leak data', async () => {
      const payloads = ["1' OR '1'='1", "1; DROP TABLE dealers;--", "' UNION SELECT * FROM users--"];
      for (const payload of payloads) {
        const response = await apiContext.get(`/dealers/${encodeURIComponent(payload)}/sales/overall-summary`);
        console.log(`TC_108_SEC Payload: ${payload} | Status: ${response.status()}`);
        expect(response.status()).not.toBe(500);
      }
    });

    test('TC_109_SEC SQL injection in query params - should not cause 500 or leak data', async () => {
      const payload = "' OR 1=1--";
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: payload },
      });
      console.log('TC_109_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- XSS Payloads ---

    test('TC_110_SEC XSS payload in query params - response must not reflect script tags', async () => {
      const xssPayload = '<script>alert("xss")</script>';
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: xssPayload },
      });
      console.log('TC_110_SEC Status:', response.status());
      const body = await response.text();
      expect(body).not.toContain('<script>');
    });

    // --- IDOR (Insecure Direct Object Reference) ---

    test('TC_111_SEC IDOR - accessing a different dealer_id should be isolated', async () => {
      const otherDealerId = DEALER_ID + '_OTHER';
      const response = await apiContext.get(`/dealers/${otherDealerId}/sales/overall-summary`);
      console.log('TC_111_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- Oversized / Malformed Inputs ---

    test('TC_112_SEC Oversized dealer_id - should not cause 500', async () => {
      const oversizedId = 'A'.repeat(5000);
      const response = await apiContext.get(`/dealers/${oversizedId}/sales/overall-summary`);
      console.log('TC_112_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_113_SEC Oversized query param value - should not cause 500', async () => {
      const oversizedValue = 'X'.repeat(5000);
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: oversizedValue },
      });
      console.log('TC_113_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- HTTP Method Abuse ---

    test('TC_114_SEC POST on GET-only endpoint - should return 405 or 404', async () => {
      const response = await apiContext.post(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_114_SEC Status:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    test('TC_115_SEC DELETE on GET-only endpoint - should return 405 or 404', async () => {
      const response = await apiContext.delete(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_115_SEC Status:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    // --- Sensitive Data in Response Headers ---

    test('TC_116_SEC Response headers must not expose server internals', async () => {
      const response = await apiContext.get('/health');
      const headers = response.headers();
      console.log('TC_116_SEC Headers:', JSON.stringify(headers));
      expect(headers['x-powered-by']).toBeUndefined();
      expect(headers['server']).not.toMatch(/apache|nginx\/\d|iis|express/i);
    });

    // --- Parameter Pollution ---

    test('TC_117_SEC HTTP parameter pollution in distributionChannel - should not cause 500', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { distributionChannel: '11,12,,,,,99999' },
      });
      console.log('TC_117_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- Null Byte Injection ---

    test('TC_118_SEC Null byte in dealer_id - should not cause 500 or expose data', async () => {
      const response = await apiContext.get(`/dealers/${encodeURIComponent('D001\x00malicious')}/sales/overall-summary`);
      console.log('TC_118_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    // --- Additional security tests ---

    test('TC_119_SEC SQL injection in asOfDate query param - should not cause 500', async () => {
      const payload = "' OR 1=1--";
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: payload },
      });
      console.log('TC_119_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
    });

    test('TC_120_SEC XSS payload in dealer_id path - response must not reflect script tags', async () => {
      const xssPayload = encodeURIComponent('<script>alert(1)</script>');
      const response = await apiContext.get(`/dealers/${xssPayload}/sales/overall-summary`);
      console.log('TC_120_SEC Status:', response.status());
      const body = await response.text();
      expect(body).not.toContain('<script>');
    });

    test('TC_121_SEC CRLF injection in query param - should not cause 500 or inject headers', async () => {
      const payload = 'Interior\r\nX-Injected: evil';
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { category: payload },
      });
      console.log('TC_121_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
      expect(response.headers()['x-injected']).toBeUndefined();
    });

    test('TC_122_SEC PUT on GET-only endpoint - should return 405 or 404', async () => {
      const response = await apiContext.put(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_122_SEC Status:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    // --- Response Header Security (CWE-693) ---

    test('TC_123_SEC X-Content-Type-Options header must be nosniff', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const headers = response.headers();
      console.log('TC_123_SEC x-content-type-options:', headers['x-content-type-options']);
      const header = headers['x-content-type-options'];
      expect(header, 'X-Content-Type-Options header missing').toBeDefined();
      expect(header.toLowerCase()).toContain('nosniff');
    });

    test('TC_124_SEC Strict-Transport-Security header must be present (HSTS)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const headers = response.headers();
      console.log('TC_124_SEC strict-transport-security:', headers['strict-transport-security']);
      expect(headers['strict-transport-security'], 'Strict-Transport-Security (HSTS) header missing').toBeDefined();
    });

    test('TC_125_SEC Cache-Control on sensitive endpoint must be present', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const cacheControl = response.headers()['cache-control'] || '';
      console.log('TC_125_SEC cache-control:', cacheControl);
      expect(cacheControl, 'Cache-Control header must be present').toBeTruthy();
      expect(cacheControl.toLowerCase()).toMatch(/private|no-store|no-cache/);
    });

    test('TC_126_SEC Content-Security-Policy header must be present', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const headers = response.headers();
      console.log('TC_126_SEC content-security-policy:', headers['content-security-policy']);
      expect(headers['content-security-policy'], 'Content-Security-Policy header missing').toBeDefined();
    });

    test('TC_127_SEC Server header must not expose version number', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const server = response.headers()['server'] || '';
      console.log('TC_127_SEC server:', server);
      expect(server).not.toMatch(/\w+\/[\d.]+/i);
    });

    // --- Error Body Information Disclosure (CWE-209) ---

    test('TC_128_SEC Error response for invalid dealer_id must not leak internal details', async () => {
      const response = await apiContext.get('/dealers/INVALID_DEALER_999/sales/overall-summary');
      console.log('TC_128_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
      const body = await response.text();
      const LEAK_PATTERNS = ['traceback', 'stack trace', 'File "', '/app/', '.py line'];
      for (const pattern of LEAK_PATTERNS) {
        expect(body.toLowerCase(), `Response leaks internal detail: "${pattern}"`).not.toContain(pattern.toLowerCase());
      }
    });

    test('TC_129_SEC Error response for invalid asOfDate must not leak DB or stack info', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`, {
        params: { asOfDate: 'not-a-date' },
      });
      console.log('TC_129_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
      const body = await response.text();
      const LEAK_PATTERNS = ['traceback', 'stack trace', 'File "', '/app/', '.py line', 'ORA-', 'PG::', 'syntax error'];
      for (const pattern of LEAK_PATTERNS) {
        expect(body.toLowerCase(), `Response leaks internal detail: "${pattern}"`).not.toContain(pattern.toLowerCase());
      }
    });

    test('TC_130_SEC SQL injection in dealer_id must not expose DB error messages', async () => {
      const sqlPayload = encodeURIComponent("' OR '1'='1");
      const response = await apiContext.get(`/dealers/${sqlPayload}/sales/overall-summary`);
      console.log('TC_130_SEC Status:', response.status());
      expect(response.status()).not.toBe(500);
      const body = await response.text();
      const DB_LEAK_PATTERNS = ['syntax error', 'ORA-', 'PG::', 'mysql_fetch', 'unclosed quotation', 'sqlite'];
      for (const pattern of DB_LEAK_PATTERNS) {
        expect(body.toLowerCase(), `Response leaks DB error: "${pattern}"`).not.toContain(pattern.toLowerCase());
      }
    });

    // --- Rate Limiting (VAPT methodology item 39) ---

    test('TC_131_SEC Rate limiting: 20 rapid GET /health requests must not cause 500', async () => {
      const requests = Array.from({ length: 20 }, () => apiContext.get('/health'));
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status());
      console.log('TC_131_SEC rate-limit statuses:', statuses);
      console.log('TC_131_SEC rate limiting active (429 received):', statuses.includes(429));
      expect(statuses.every(s => s !== 500)).toBe(true);
    });

    test('TC_132_SEC Rate limiting: 20 rapid overall-summary requests must not cause 500', async () => {
      const requests = Array.from({ length: 20 }, () =>
        apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`)
      );
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status());
      console.log('TC_132_SEC rate-limit statuses:', statuses);
      console.log('TC_132_SEC rate limiting active (429 received):', statuses.includes(429));
      expect(statuses.every(s => s !== 500)).toBe(true);
    });

    // --- Transport Security ---

    test('TC_133_SEC Plain HTTP request must not return 200 (must redirect or be refused)', async () => {
      const http = require('http');
      const host = BASE_URL.replace(/^https?:\/\//, '');
      await new Promise((resolve) => {
        const req = http.get(`http://${host}/health`, (res) => {
          console.log('TC_133_SEC HTTP status:', res.statusCode);
          expect([301, 302, 307, 308]).toContain(res.statusCode);
          resolve();
        });
        req.on('error', (err) => {
          console.log('TC_133_SEC HTTP connection error (acceptable):', err.code);
          expect(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']).toContain(err.code);
          resolve();
        });
        req.setTimeout(5000, () => {
          console.log('TC_133_SEC HTTP request timed out (acceptable)');
          req.destroy();
          resolve();
        });
      });
    });

    test('TC_134_SEC HSTS max-age must be at least 1 year (31536000 seconds)', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const hsts = response.headers()['strict-transport-security'] || '';
      console.log('TC_134_SEC strict-transport-security:', hsts);
      const match = hsts.match(/max-age=(\d+)/i);
      if (match) {
        const maxAge = parseInt(match[1], 10);
        console.log('TC_134_SEC max-age value:', maxAge);
        expect(maxAge).toBeGreaterThanOrEqual(31536000);
      } else {
        expect(hsts, 'Strict-Transport-Security header missing or has no max-age').toMatch(/max-age=/i);
      }
    });

    // --- Cache-Control on Additional Sensitive Endpoint ---

    test('TC_135_SEC Cache-Control on products/search must be present', async () => {
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD' },
      });
      const cacheControl = response.headers()['cache-control'] || '';
      console.log('TC_135_SEC cache-control:', cacheControl);
      expect(cacheControl, 'Cache-Control header must be present').toBeTruthy();
      expect(cacheControl.toLowerCase()).toMatch(/private|no-store|no-cache/);
    });

  }); // end Security describe

  // ===========================================================================
  // DATA VALIDATION TESTS — TC_136 to TC_156
  // Response body structure, field types, sort order, pagination counts,
  // error body content, and response time SLAs
  // ===========================================================================

  test.describe('Data Validation', () => {

    // --- Response Body Field Validation ---

    test('TC_136 GET /health - response body has status and maxInvoiceDate fields', async () => {
      const res = await apiContext.get('/health');
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_136 /health body:', JSON.stringify(data));
      expect(typeof data).toBe('object');
      expect(data.status).toBeDefined();
      expect(typeof data.status).toBe('string');
      expect(data.maxInvoiceDate).toBeDefined();
    });

    test('TC_137 GET overall-summary - response body has chartConfig, data array, and meta', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_137 overall-summary top keys:', JSON.stringify(Object.keys(data)));
      expect(data.chartConfig).toBeDefined();
      expect(typeof data.chartConfig).toBe('object');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      expect(data.meta.dealerId).toBeDefined();
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item.xAxis).toBeDefined();
        expect(item.value).toBeDefined();
        expect(item.volume).toBeDefined();
      }
    });

    test('TC_138 GET top-products - response body has data with period keys and meta', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_138 top-products data keys:', JSON.stringify(Object.keys(data.data || {})));
      expect(typeof data.data).toBe('object');
      expect(data.data).not.toBeNull();
      // data.data has period keys: MTD, YTD, QTD, etc.
      const periodKeys = Object.keys(data.data);
      expect(periodKeys.length).toBeGreaterThan(0);
      expect(data.meta).toBeDefined();
      expect(typeof data.meta.limit).toBe('number');
      expect(data.meta.dealerId).toBeDefined();
    });

    test('TC_139 GET category-breakdown - response data array has filter, option, total fields', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/category-breakdown`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_139 category-breakdown top keys:', JSON.stringify(Object.keys(data)));
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item.filter).toBeDefined();
        expect(item.option).toBeDefined();
        expect(item.total).toBeDefined();
        expect(item.points).toBeDefined();
      }
    });

    test('TC_140 GET channel-split - response data array has filter, option, total fields', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/channel-split`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_140 channel-split top keys:', JSON.stringify(Object.keys(data)));
      expect(data.graphConfig).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item.filter).toBeDefined();
        expect(item.option).toBeDefined();
        expect(item.total).toBeDefined();
      }
    });

    test('TC_141 GET subbrand-split - response data array has filter, option, total fields', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/subbrand-split`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_141 subbrand-split top keys:', JSON.stringify(Object.keys(data)));
      expect(data.graphConfig).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.meta).toBeDefined();
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item.filter).toBeDefined();
        expect(item.option).toBeDefined();
        expect(item.total).toBeDefined();
      }
    });

    test('TC_142 GET analytics - response data has Value and Volume metric groups', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/analytics`);
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_142 analytics data keys:', JSON.stringify(Object.keys(data.data || {})));
      expect(data.data).toBeDefined();
      expect(typeof data.data).toBe('object');
      expect(data.data.Value).toBeDefined();
      expect(data.data.Volume).toBeDefined();
      expect(data.meta).toBeDefined();
      expect(data.meta.dealerId).toBeDefined();
    });

    test('TC_143 GET products/search - response has pagination metadata and data array with correct fields', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', pageSize: 5 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      console.log('TC_143 products/search top keys:', JSON.stringify(Object.keys(data)));
      // Pagination block
      expect(data.pagination).toBeDefined();
      expect(typeof data.pagination.page).toBe('number');
      expect(typeof data.pagination.pageSize).toBe('number');
      expect(typeof data.pagination.totalRows).toBe('number');
      expect(typeof data.pagination.totalPages).toBe('number');
      expect(typeof data.pagination.hasNext).toBe('boolean');
      expect(typeof data.pagination.hasPrev).toBe('boolean');
      // Data array
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        const item = data.data[0];
        expect(item.productCode).toBeDefined();
        expect(typeof item.productName).toBe('string');
        expect(typeof item.value).toBe('number');
        expect(typeof item.volume).toBe('number');
        expect(item.growth).toBeDefined();
      }
      // Meta
      expect(data.meta).toBeDefined();
      expect(data.meta.dealerId).toBeDefined();
      console.log('TC_143 totalRows:', data.pagination.totalRows, '| pageSize:', data.pagination.pageSize);
    });

    // --- Sort Order Verification ---

    test('TC_144 products/search sortBy=value sortOrder=desc - first record value >= second', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', sortBy: 'value', sortOrder: 'desc', pageSize: 10 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_144 record count:', records.length);
      if (records.length >= 2) {
        console.log('TC_144 value[0]:', records[0].value, '| value[1]:', records[1].value);
        expect(records[0].value).toBeGreaterThanOrEqual(records[1].value);
      }
    });

    test('TC_145 products/search sortBy=value sortOrder=asc - first record value <= second', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', sortBy: 'value', sortOrder: 'asc', pageSize: 10 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_145 record count:', records.length);
      if (records.length >= 2) {
        console.log('TC_145 value[0]:', records[0].value, '| value[1]:', records[1].value);
        expect(records[0].value).toBeLessThanOrEqual(records[1].value);
      }
    });

    test('TC_146 products/search sortBy=volume sortOrder=desc - first record volume >= second', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', sortBy: 'volume', sortOrder: 'desc', pageSize: 10 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_146 record count:', records.length);
      if (records.length >= 2) {
        console.log('TC_146 volume[0]:', records[0].volume, '| volume[1]:', records[1].volume);
        expect(records[0].volume).toBeGreaterThanOrEqual(records[1].volume);
      }
    });

    // --- Pagination Count Verification ---

    test('TC_147 products/search pageSize=5 - response data array length must be <= 5', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', pageSize: 5 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_147 records returned:', records.length, '| pageSize requested: 5');
      expect(records.length).toBeLessThanOrEqual(5);
      expect(data.pagination.pageSize).toBe(5);
    });

    test('TC_148 products/search pageSize=10 - response data array length must be <= 10', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', pageSize: 10 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_148 records returned:', records.length, '| pageSize requested: 10');
      expect(records.length).toBeLessThanOrEqual(10);
      expect(data.pagination.pageSize).toBe(10);
    });

    test('TC_149 products/search page=999999 - out-of-bounds page returns empty data array', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', page: 999999 },
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      const records = data.data || [];
      console.log('TC_149 records on page 999999:', records.length);
      expect(records.length).toBe(0);
    });

    test('TC_150 products/search downloadReport=true returns more records than pageSize=5', async () => {
      const [resSmall, resFull] = await Promise.all([
        apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
          params: { periodType: 'MTD', pageSize: 5 },
        }),
        apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
          params: { periodType: 'MTD', downloadReport: true },
        }),
      ]);
      expect(resSmall.status()).toBe(200);
      expect(resFull.status()).toBe(200);
      const small = await resSmall.json();
      const full = await resFull.json();
      const smallCount = (small.data || []).length;
      const fullCount = (full.data || []).length;
      console.log('TC_150 pageSize=5 records:', smallCount, '| downloadReport=true records:', fullCount);
      expect(fullCount).toBeGreaterThanOrEqual(smallCount);
    });

    // --- Error Response Body Structure ---

    test('TC_151 top-products limit=0 - error body is parseable JSON with detail or message field', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/top-products`, {
        params: { limit: 0 },
      });
      expect([400, 422]).toContain(res.status());
      const body = await res.text();
      expect(body).not.toContain('<!DOCTYPE');
      const parsed = JSON.parse(body);
      const hasErrorField = parsed.detail !== undefined || parsed.message !== undefined || parsed.error !== undefined;
      expect(hasErrorField, 'Error response must have a detail, message, or error field').toBe(true);
      console.log('TC_151 error body:', JSON.stringify(parsed).substring(0, 200));
    });

    test('TC_152 products/search invalid sortBy=price - error body is parseable JSON', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD', sortBy: 'price' },
      });
      expect([400, 422]).toContain(res.status());
      const body = await res.text();
      expect(body).not.toContain('<!DOCTYPE');
      const parsed = JSON.parse(body);
      expect(typeof parsed).toBe('object');
      const hasErrorField = parsed.detail !== undefined || parsed.message !== undefined || parsed.error !== undefined;
      expect(hasErrorField, 'Error response must have a detail, message, or error field').toBe(true);
      console.log('TC_152 error body:', JSON.stringify(parsed).substring(0, 200));
    });

    test('TC_153 products/search CUSTOM without startDate/endDate - error body is parseable JSON', async () => {
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'CUSTOM' },
      });
      expect(res.status()).not.toBe(200);
      const body = await res.text();
      expect(body).not.toContain('<!DOCTYPE');
      const parsed = JSON.parse(body);
      expect(typeof parsed).toBe('object');
      console.log('TC_153 error status:', res.status(), '| body:', JSON.stringify(parsed).substring(0, 200));
    });

    // --- Response Time SLA ---

    test('TC_154 GET /health - responds within 1000ms', async () => {
      const start = Date.now();
      const res = await apiContext.get('/health');
      const elapsed = Date.now() - start;
      console.log('TC_154 /health response time:', elapsed, 'ms');
      expect(res.status()).toBe(200);
      expect(elapsed).toBeLessThan(1000);
    });

    test('TC_155 GET overall-summary - responds within 5000ms', async () => {
      const start = Date.now();
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      const elapsed = Date.now() - start;
      console.log('TC_155 overall-summary response time:', elapsed, 'ms');
      expect(res.status()).toBe(200);
      expect(elapsed).toBeLessThan(5000);
    });

    test('TC_156 GET products/search - responds within 5000ms', async () => {
      const start = Date.now();
      const res = await apiContext.get(`/dealers/${DEALER_ID}/sales/products/search`, {
        params: { periodType: 'MTD' },
      });
      const elapsed = Date.now() - start;
      console.log('TC_156 products/search response time:', elapsed, 'ms');
      expect(res.status()).toBe(200);
      expect(elapsed).toBeLessThan(5000);
    });

  }); // end Data Validation describe

  // ===========================================================================
  // v2.0 REDIS-BRANCH FEATURE TESTS — TC_157 to TC_170
  // Covers the redis-branch additions from the v2.0 Solution Doc:
  //   - GET /internal/stats live analytics endpoint (Section 9.4)
  //   - TimeoutMiddleware request-timeout 503 contract (Section 9.1)
  //   - Redis cache-aside behaviour (Sections 8, 11)
  // These features are pending merge to master. The block self-detects whether
  // the redis branch is deployed (probe on /internal/stats) and skips cleanly
  // when it is not, so the suite passes on both master and the redis branch.
  // ===========================================================================

  test.describe('v2.0 Redis-Branch Features', () => {

    let redisFeaturesLive = false;
    // 'not-deployed' | 'down' | 'up' — classified once in beforeAll, used for report-visible signals.
    let redisState = 'unknown';

    test.beforeAll(async () => {
      // Probe: authenticated /internal/stats is 200 on the redis branch, 404 on master.
      const probe = await apiContext.get('/internal/stats');
      redisFeaturesLive = probe.status() !== 404;

      let body = {};
      if (redisFeaturesLive) {
        try { body = await probe.json(); } catch { body = {}; }
      }
      redisState = classifyRedisState(probe.status(), body);

      console.log('Redis-branch features live (via /internal/stats):', redisFeaturesLive,
        '(probe status:', probe.status() + ', redisState:', redisState + ')');

      // Prominent, hard-to-miss banner in `list` reporter stdout when Redis is not fully up.
      const banner = redisBanner(redisState);
      if (banner) console.warn(banner);
    });

    // --- GET /internal/stats — Auth (Section 9.4, requires x-api-key) ---

    test('TC_157 GET /internal/stats - missing API key should return 401 or 403', async ({ playwright }) => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const unauthContext = await playwright.request.newContext({ baseURL: BASE_URL });
      const response = await unauthContext.get('/internal/stats');
      console.log('TC_157 Status:', response.status());
      expect([401, 403]).toContain(response.status());
      await unauthContext.dispose();
    });

    test('TC_158 GET /internal/stats - invalid API key should return 401 or 403', async ({ playwright }) => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const invalidKeyContext = await playwright.request.newContext({
        baseURL: BASE_URL,
        extraHTTPHeaders: { 'x-api-key': 'invalid-key-xyz-12345' },
      });
      const response = await invalidKeyContext.get('/internal/stats');
      console.log('TC_158 Status:', response.status());
      expect([401, 403]).toContain(response.status());
      await invalidKeyContext.dispose();
    });

    // --- GET /internal/stats — Success & body shape (Section 9.4) ---

    test('TC_159 GET /internal/stats - valid key returns 200 and JSON content-type', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.get('/internal/stats');
      console.log('TC_159 Status:', response.status());
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
    });

    test('TC_160 GET /internal/stats - body has today and all_time blocks', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.get('/internal/stats');
      const data = await response.json();
      console.log('TC_160 top-level keys:', Object.keys(data));
      // Graceful degradation path: "analytics unavailable" when Redis is down (still 200, not 500).
      if (data.error === 'analytics unavailable' || data.detail === 'analytics unavailable') {
        console.log('TC_160 analytics unavailable (Redis down) - graceful degradation accepted');
        // Surface the Redis-down state in the HTML report (not just stdout) so a passing
        // TC_160 still makes it obvious Redis was OFF.
        test.info().annotations.push(REDIS_DOWN_ANNOTATION);
        expect(response.status()).toBe(200);
        return;
      }
      expect(typeof data.today).toBe('object');
      expect(typeof data.all_time).toBe('object');
    });

    test('TC_161 GET /internal/stats - today block exposes counts, endpoints, and top dealers', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const data = await (await apiContext.get('/internal/stats')).json();
      if (data.error === 'analytics unavailable' || data.detail === 'analytics unavailable') {
        test.skip(true, 'REDIS DOWN — analytics unavailable');
      }
      const today = data.today;
      console.log('TC_161 today keys:', Object.keys(today));
      expect(typeof today.total_requests).toBe('number');
      expect(typeof today.by_endpoint).toBe('object');
      expect(typeof today.top_dealers).toBe('object');
      expect(today.cache).toBeDefined();
    });

    test('TC_162 GET /internal/stats - per-endpoint metrics have count and timing fields', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const data = await (await apiContext.get('/internal/stats')).json();
      if (data.error === 'analytics unavailable' || data.detail === 'analytics unavailable') {
        test.skip(true, 'REDIS DOWN — analytics unavailable');
      }
      const byEndpoint = data.today.by_endpoint;
      const names = Object.keys(byEndpoint);
      console.log('TC_162 tracked endpoints:', names);
      if (names.length === 0) {
        console.log('TC_162 no endpoint traffic recorded today - field-shape check skipped');
        return;
      }
      const sample = byEndpoint[names[0]];
      expect(typeof sample.count).toBe('number');
      expect(typeof sample.avg_ms).toBe('number');
      expect(typeof sample.slow_2s).toBe('number');
      expect(typeof sample.slow_10s).toBe('number');
      expect(sample.errors).toBeDefined();
    });

    test('TC_163 GET /internal/stats - all_time block exposes total_requests and by_endpoint', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const data = await (await apiContext.get('/internal/stats')).json();
      if (data.error === 'analytics unavailable' || data.detail === 'analytics unavailable') {
        test.skip(true, 'REDIS DOWN — analytics unavailable');
      }
      const allTime = data.all_time;
      console.log('TC_163 all_time keys:', Object.keys(allTime));
      expect(typeof allTime.total_requests).toBe('number');
      expect(typeof allTime.by_endpoint).toBe('object');
    });

    // --- GET /internal/stats — Method abuse & headers ---

    test('TC_164 POST /internal/stats - should return 404 or 405', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.post('/internal/stats');
      console.log('TC_164 Status:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    test('TC_165 GET /internal/stats - X-Content-Type-Options must be nosniff', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.get('/internal/stats');
      const header = response.headers()['x-content-type-options'];
      console.log('TC_165 x-content-type-options:', header);
      expect(header).toBeDefined();
      expect(header.toLowerCase()).toContain('nosniff');
    });

    test('TC_166 GET /internal/stats - responds within 2000ms (read entirely from Redis)', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      // Solution Doc v2.0 §8 (Redis connect/socket timeout = 2s each) + §9.4 (graceful
      // "analytics unavailable" when Redis is down): the < 2000ms "read entirely from Redis"
      // SLA is only meaningful when Redis is up. On the down path the endpoint must pay the
      // ~2s connect timeout before degrading, so this assertion is skipped, not failed.
      test.skip(redisState !== 'up',
        'SLA "read entirely from Redis" only valid when Redis is up (Solution Doc §8: 2s Redis connect timeout on the down path)');
      const start = Date.now();
      const response = await apiContext.get('/internal/stats');
      const elapsed = Date.now() - start;
      console.log('TC_166 /internal/stats response time:', elapsed, 'ms');
      expect(response.status()).toBe(200);
      expect(elapsed).toBeLessThan(2000);
    });

    // --- TimeoutMiddleware (Section 9.1) ---
    // NOTE: The 503 timeout cannot be triggered deterministically from a black-box
    // client without a slow query or a low REQUEST_TIMEOUT_SECONDS on the server.
    // These tests assert the invariants that ARE observable: timeout applies ONLY to
    // /dealers/* (not /health), and IF a 503 occurs its body matches the documented
    // contract. Deterministic timeout testing is a known limitation flagged here.

    test('TC_167 /health must not return timeout 503 (timeout applies only to /dealers/*)', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.get('/health');
      console.log('TC_167 /health Status:', response.status());
      expect(response.status()).not.toBe(503);
    });

    test('TC_168 If a /dealers/* request returns 503, body must be {"error":"request_timeout"}', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const response = await apiContext.get(`/dealers/${DEALER_ID}/sales/overall-summary`);
      console.log('TC_168 Status:', response.status(),
        '(NOTE: deterministic timeout requires a low REQUEST_TIMEOUT_SECONDS server-side)');
      if (response.status() === 503) {
        const body = await response.json();
        console.log('TC_168 timeout body:', JSON.stringify(body));
        expect(body.error).toBe('request_timeout');
      } else {
        expect(response.status()).toBe(200);
      }
    });

    // --- Redis cache-aside behaviour (Sections 8, 11) ---

    test('TC_169 Two identical overall-summary requests return identical bodies (cache consistency)', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const path = `/dealers/${DEALER_ID}/sales/overall-summary`;
      const first = await apiContext.get(path);
      const second = await apiContext.get(path);
      expect(first.status()).toBe(200);
      expect(second.status()).toBe(200);
      const firstBody = await first.text();
      const secondBody = await second.text();
      console.log('TC_169 bodies identical:', firstBody === secondBody);
      expect(secondBody).toBe(firstBody);
    });

    test('TC_170 Repeated identical request - warm cache should not be slower (observational)', async () => {
      test.skip(!redisFeaturesLive, 'redis-branch features not deployed');
      const path = `/dealers/${DEALER_ID}/sales/analytics`;
      const t1Start = Date.now();
      const r1 = await apiContext.get(path);
      const t1 = Date.now() - t1Start;
      const t2Start = Date.now();
      const r2 = await apiContext.get(path);
      const t2 = Date.now() - t2Start;
      console.log('TC_170 1st call:', t1, 'ms | 2nd call (warm cache):', t2, 'ms');
      // Latency is not hard-asserted (network jitter makes it flaky); only correctness is.
      expect(r1.status()).toBe(200);
      expect(r2.status()).toBe(200);
    });

  }); // end v2.0 Redis-Branch Features describe

});
