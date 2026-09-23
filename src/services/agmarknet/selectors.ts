/**
 * Centralized AGMARKNET selectors and filter configuration.
 *
 * Live report:
 * https://agmarknet.gov.in/daily-price-and-arrival-report
 *
 * NOTE:
 * AGMARKNET currently uses custom dropdown controls instead of
 * normal HTML <select> elements.
 */

export const AGMARKNET_SELECTORS = {
  /**
   * Price / Arrivals
   *
   * Codegen confirmed:
   * .peer
   */
  priceArrivalsDropdown:
    ".peer >> nth=0",

  /**
   * Commodity Group
   *
   * Codegen confirmed selector.
   */
  commodityGroupDropdown:
    ".w-full.sm\\:w-\\[48\\%\\].md\\:w-\\[32\\%\\].lg\\:w-\\[15\\%\\] > .relative.flex > .relative > .peer",

  /**
   * Commodity
   *
   * Current order of custom dropdowns:
   * 0 = Price/Arrivals
   * 1 = Commodity Group
   * 2 = Commodity
   */
  commodityDropdown:
    ".peer >> nth=2",

  /**
   * State / UT
   *
   * Current order:
   * 3 = State/UT
   */
  stateDropdown:
    ".peer >> nth=3",

  /**
   * District
   *
   * Current order:
   * 4 = District
   */
  districtDropdown:
    ".peer >> nth=4",

  /**
   * Market
   *
   * Current order:
   * 5 = Market
   */
  marketDropdown:
    ".peer >> nth=5",

  /**
   * Variety
   *
   * Custom dropdown after Commodity.
   */
  varietyDropdown:
    ".peer >> nth=6",

  /**
   * Grade
   *
   * Custom dropdown after Variety.
   */
  gradeDropdown:
    ".peer >> nth=7",

  /**
   * From Date
   */
  fromDateInput:
    "input[type='date'] >> nth=0",

  /**
   * To Date
   */
  toDateInput:
    "input[type='date'] >> nth=1",

  /**
   * Go / Submit button.
   */
  submitButton:
    "#btnSubmit, button:has-text('Go'), input[type='submit'][value*='Go'], button[type='submit']",

  /**
   * Result table.
   */
  resultsTable:
    '#cphBody_GridView1, table:has-text("State/UT")',

  /**
   * Result rows.
   */
  resultsRow:
    '#cphBody_GridView1 tr.gridRow, #cphBody_GridView1 tr.gridAlternateRow, table:has-text("State/UT") tbody tr',

  /**
   * Pagination container.
   */
  paginationRow:
    "#cphBody_GridView1 tr.gridPager, nav, [aria-label*='pagination']",

  /**
   * Next page control.
   */
  nextPageLink:
    "a[href*='Page$Next'], a[aria-label*='next' i], button[aria-label*='next' i], button:has-text('Next'), button:has-text('›'), button:has-text('>')",

  /**
   * No-records message.
   */
  noRecordsMessage:
    "#cphBody_lblMessage",

  /**
   * CAPTCHA input.
   */
  captchaInput:
    "input[placeholder='Enter captcha'], input[placeholder*='captcha' i], input[name*='captcha' i], input[id*='captcha' i]",
} as const;


/**
 * Result table columns.
 *
 * State/UT
 * District
 * Market
 * Commodity Group
 * Commodity
 * Variety
 * Grade
 * Min Price
 * Max Price
 * Modal Price
 * Price Unit
 * Price Date
 */
export const AGMARKNET_TABLE_COLUMN_ORDER = [
  "state",
  "district",
  "market",
  "commodityGroup",
  "commodity",
  "variety",
  "grade",
  "minPrice",
  "maxPrice",
  "modalPrice",
  "unit",
  "arrivalDate",
] as const;


/**
 * AGMARKNET filter configuration.
 *
 * These values can be overridden through .env.
 */
export function getConfiguredFilters() {
  return {
    priceArrivals:
      process.env.AGMARKNET_PRICE_ARRIVALS || "Price",

    state:
      process.env.AGMARKNET_STATE || "Gujarat",

    commodityGroup:
      process.env.AGMARKNET_COMMODITY_GROUP || "Cereals",

    commodity:
      process.env.AGMARKNET_COMMODITY || "Wheat",

    variety:
      process.env.AGMARKNET_VARIETY || "All Varieties",

    grade:
      process.env.AGMARKNET_GRADE || "FAQ",

    district:
      process.env.AGMARKNET_DISTRICT || "All Districts",

    market:
      process.env.AGMARKNET_MARKET || "All Markets",
  };
}