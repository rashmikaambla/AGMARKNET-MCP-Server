import {
  chromium,
  type Browser,
  type Locator,
  type Page,
} from "playwright";

import { createInterface } from "node:readline";

import { logger } from "../../utils/logger.js";
import type { RawMarketRow } from "../../utils/normalization.js";
import { AGMARKNET_SELECTORS } from "./selectors.js";
import type {
  FetchOptions,
  FetchResult,
  MarketDataSource,
} from "./marketDataSource.js";

// ============================================================
// STRUCTURE CHANGED ERROR
// ============================================================

export class AgmarknetStructureChangedError extends Error {
  constructor(detail: string) {
    super(
      `AGMARKNET page structure may have changed: ${detail}`
    );

    this.name = "AgmarknetStructureChangedError";
  }
}

// ============================================================
// SERVICE
// ============================================================

export class AgmarknetService implements MarketDataSource {
  readonly sourceName = "AGMARKNET" as const;

  readonly sourceUrl: string;

  private readonly timeoutMs: number;

  private readonly maxPages: number;

  // ==========================================================
  // CONSTRUCTOR
  // ==========================================================

  constructor() {
    this.sourceUrl =
      process.env.AGMARKNET_URL ||
      "https://agmarknet.gov.in/daily-price-and-arrival-report";

    this.timeoutMs = Number(
      process.env.AGMARKNET_TIMEOUT_MS || 60000
    );

    this.maxPages = Number(
      process.env.AGMARKNET_MAX_PAGES || 5000
    );
  }

  // ============================================================
  // DAILY DATA
  // ============================================================

  async fetchDailyData(
    date: string,
    options: FetchOptions
  ): Promise<FetchResult> {
    return this.fetchHistoricalData(
      date,
      date,
      options
    );
  }

  // ============================================================
  // HISTORICAL DATA
  // ============================================================

  async fetchHistoricalData(
    startDate: string,
    endDate: string,
    options: FetchOptions
  ): Promise<FetchResult> {
    let browser: Browser | null = null;

    try {
      logger.info(
        "AGMARKNET: launching Playwright browser..."
      );

      browser = await chromium.launch({
        headless: false,
        timeout: this.timeoutMs,
      });

      const page = await browser.newPage();

      page.setDefaultTimeout(this.timeoutMs);

      logger.info(
        "AGMARKNET: opening report page",
        {
          url: this.sourceUrl,
          startDate,
          endDate,
        }
      );

      await page.goto(this.sourceUrl, {
        waitUntil: "networkidle",
        timeout: this.timeoutMs,
      });

      logger.info(
        "AGMARKNET: page loaded successfully"
      );

      // --------------------------------------------------------
      // APPLY FILTERS
      // --------------------------------------------------------

      await this.applyFilters(
        page,
        options
      );

      // --------------------------------------------------------
      // MANUAL DATE + CAPTCHA + GO
      // --------------------------------------------------------

      await this.waitForManualDateCaptchaAndClickGo(
        page,
        startDate,
        endDate
      );

      // --------------------------------------------------------
      // EXTRACT ALL PAGES
      // --------------------------------------------------------

      const result =
        await this.extractAllPages(page);

      logger.info(
        "AGMARKNET: scraping completed",
        {
          totalRows: result.rows.length,
          pagesProcessed: result.pagesProcessed,
        }
      );

      return result;

    } catch (error) {
      if (
        error instanceof
        AgmarknetStructureChangedError
      ) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      logger.error(
        "AGMARKNET scraping failed",
        {
          error: message,
        }
      );

      throw new AgmarknetStructureChangedError(
        message
      );

    } finally {
      if (browser) {
        await browser.close().catch(
          (error) => {
            logger.warn(
              "Could not close browser cleanly",
              {
                error:
                  error instanceof Error
                    ? error.message
                    : String(error),
              }
            );
          }
        );
      }
    }
  }

  // ============================================================
  // APPLY FILTERS
  // ============================================================

  private async applyFilters(
    page: Page,
    options: FetchOptions
  ): Promise<void> {
    try {
      logger.info(
        "================================================"
      );

      logger.info(
        "AGMARKNET: APPLYING FILTERS"
      );

      logger.info(
        "================================================"
      );

      // --------------------------------------------------------
      // 1. PRICE / ARRIVALS
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: Price/Arrivals"
      );

      await this.selectFilterByLabel(
        page,
        [
          "Price/Arrivals*",
          "Price/Arrivals",
        ],
        options.priceArrivals || "Price"
      );

      // --------------------------------------------------------
      // 2. COMMODITY GROUP
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: Commodity Group"
      );

      await this.selectFilterByLabel(
        page,
        [
          "Commodity Group*",
          "Commodity Group",
        ],
        options.commodityGroup || "Cereals"
      );

      // --------------------------------------------------------
      // 3. COMMODITY
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: waiting for Commodity..."
      );

      await this.waitForFilterByLabel(
        page,
        [
          "Commodity*",
          "Commodity",
        ]
      );

      await this.selectFilterByLabel(
        page,
        [
          "Commodity*",
          "Commodity",
        ],
        options.commodity || "Wheat"
      );

      // --------------------------------------------------------
      // 4. VARIETY
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: Variety"
      );

      logger.info(
        "AGMARKNET: leaving Variety as default: All Varieties"
      );

      await this.waitForFilterByLabel(
        page,
        [
          "Variety*",
          "Variety",
        ]
      );

      // --------------------------------------------------------
      // 5. GRADE
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: Grade"
      );

      await this.selectGradeFAQ(page);

      // --------------------------------------------------------
      // 6. STATE
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: State/UT"
      );

      await this.selectStateGujarat(page);

      // --------------------------------------------------------
      // 7. DISTRICT
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: District"
      );

      logger.info(
        "AGMARKNET: leaving District as default: All Districts"
      );

      // --------------------------------------------------------
      // 8. MARKET
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: Market"
      );

      logger.info(
        "AGMARKNET: leaving Market as default: All Markets"
      );

      // --------------------------------------------------------
      // 9. DATES
      // --------------------------------------------------------

      logger.info(
        "AGMARKNET: From Date and To Date will be entered manually."
      );

      logger.info(
        "================================================"
      );

      logger.info(
        "AGMARKNET: AUTOMATIC FILTERS COMPLETED"
      );

      logger.info(
        "================================================"
      );

    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      if (
        error instanceof
        AgmarknetStructureChangedError
      ) {
        throw error;
      }

      throw new AgmarknetStructureChangedError(
        `Unable to apply filters (${message}).`
      );
    }
  }

  // ============================================================
  // FIND FILTER USING LABEL
  // ============================================================

  private async findFilterByLabel(
    page: Page,
    labels: string[]
  ): Promise<Locator> {
    for (const labelText of labels) {
      const labelsLocator =
        page.locator(
          `//label[normalize-space()="${labelText}"]`
        );

      const count =
        await labelsLocator.count();

      for (let i = 0; i < count; i++) {
        const label =
          labelsLocator.nth(i);

        if (
          !await label
            .isVisible()
            .catch(() => false)
        ) {
          continue;
        }

        const parent =
          label.locator("..");

        const dropdown =
          parent
            .locator("div.cursor-pointer")
            .first();

        if (
          await dropdown.count() > 0 &&
          await dropdown
            .isVisible()
            .catch(() => false)
        ) {
          return dropdown;
        }
      }
    }

    throw new Error(
      `Filter dropdown not found: ${labels.join(" / ")}`
    );
  }

  // ============================================================
  // WAIT FOR FILTER
  // ============================================================

  private async waitForFilterByLabel(
    page: Page,
    labels: string[]
  ): Promise<void> {
    logger.info(
      `AGMARKNET: waiting for filter ${labels[0]}`
    );

    const dropdown =
      await this.findFilterByLabel(
        page,
        labels
      );

    await dropdown.waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });

    await dropdown.scrollIntoViewIfNeeded();

    await page.waitForTimeout(1000);
  }

  // ============================================================
  // OPEN FILTER
  // ============================================================

  private async openFilterByLabel(
    page: Page,
    labels: string[]
  ): Promise<Locator> {
    logger.info(
      `AGMARKNET: opening filter ${labels[0]}`
    );

    const dropdown =
      await this.findFilterByLabel(
        page,
        labels
      );

    await dropdown.waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });

    await dropdown.scrollIntoViewIfNeeded();

    await page.waitForTimeout(300);

    await dropdown.click();

    await page.waitForTimeout(700);

    logger.info(
      `AGMARKNET: ${labels[0]} dropdown opened`
    );

    return dropdown;
  }

  // ============================================================
  // FIND VISIBLE CUSTOM DROPDOWN OPTION
  // ============================================================

  private async findCustomOption(
    page: Page,
    optionText: string
  ): Promise<Locator | null> {
    const option =
      page.locator(
        `//span[normalize-space()="${optionText}"]` +
        `/ancestor::div[contains(@class,"cursor-pointer")][1]`
      ).last();

    const count =
      await option.count();

    if (count === 0) {
      return null;
    }

    if (
      !await option
        .isVisible()
        .catch(() => false)
    ) {
      return null;
    }

    return option;
  }

  // ============================================================
  // SELECT NORMAL FILTER
  // ============================================================

  private async selectFilterByLabel(
    page: Page,
    labels: string[],
    optionText: string
  ): Promise<void> {
    await this.openFilterByLabel(
      page,
      labels
    );

    let optionFound = false;

    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      const option =
        await this.findCustomOption(
          page,
          optionText
        );

      if (option) {
        optionFound = true;

        await option.scrollIntoViewIfNeeded();

        await page.waitForTimeout(300);

        await option.click();

        await page.waitForTimeout(1000);

        break;
      }

      await page.waitForTimeout(500);
    }

    if (!optionFound) {
      const elements =
        page.locator(
          `//*[normalize-space()="${optionText}"]`
        );

      const count =
        await elements.count();

      let clicked = false;

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const element =
          elements.nth(i);

        if (
          await element
            .isVisible()
            .catch(() => false)
        ) {
          await element.scrollIntoViewIfNeeded();

          await page.waitForTimeout(300);

          await element.click();

          await page.waitForTimeout(1000);

          clicked = true;

          break;
        }
      }

      if (!clicked) {
        throw new Error(
          `Option not found: ${optionText}`
        );
      }
    }

    logger.info(
      `AGMARKNET: ${labels[0]} selected: ${optionText}`
    );
  }

  // ============================================================
  // GRADE = FAQ
  // ============================================================

  private async selectGradeFAQ(
    page: Page
  ): Promise<void> {
    logger.info(
      "AGMARKNET: opening Grade dropdown..."
    );

    await this.openFilterByLabel(
      page,
      [
        "Grade*",
        "Grade",
      ]
    );

    logger.info(
      "AGMARKNET: searching All Grades..."
    );

    const allGrades =
      await this.findCustomOption(
        page,
        "All Grades"
      );

    if (!allGrades) {
      throw new Error(
        "All Grades option not found"
      );
    }

    await allGrades.scrollIntoViewIfNeeded();

    await page.waitForTimeout(300);

    await allGrades.click();

    await page.waitForTimeout(700);

    logger.info(
      "AGMARKNET: All Grades deselected"
    );

    logger.info(
      "AGMARKNET: selecting FAQ..."
    );

    const faq =
      await this.findCustomOption(
        page,
        "FAQ"
      );

    if (!faq) {
      throw new Error(
        "FAQ option not found"
      );
    }

    await faq.scrollIntoViewIfNeeded();

    await page.waitForTimeout(300);

    await faq.click();

    await page.waitForTimeout(800);

    logger.info(
      "AGMARKNET: FAQ selected"
    );
  }

  // ============================================================
  // STATE = GUJARAT
  // ============================================================

  private async selectStateGujarat(
    page: Page
  ): Promise<void> {
    logger.info(
      "AGMARKNET: opening State/UT dropdown..."
    );

    await this.openFilterByLabel(
      page,
      [
        "State/UT*",
        "State/UT",
      ]
    );

    logger.info(
      "AGMARKNET: searching All States/UT..."
    );

    const allStates =
      await this.findCustomOption(
        page,
        "All States/UT"
      );

    if (allStates) {
      await allStates.scrollIntoViewIfNeeded();

      await page.waitForTimeout(300);

      await allStates.click();

      await page.waitForTimeout(700);

      logger.info(
        "AGMARKNET: All States/UT deselected"
      );
    } else {
      logger.info(
        "AGMARKNET: All States/UT not selected or not visible."
      );
    }

    logger.info(
      "AGMARKNET: searching Gujarat..."
    );

    let gujarat: Locator | null = null;

    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      gujarat =
        await this.findCustomOption(
          page,
          "Gujarat"
        );

      if (gujarat) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!gujarat) {
      const visibleCursorItems =
        await page
          .locator(
            "div.cursor-pointer span"
          )
          .allTextContents()
          .catch(() => []);

      logger.error(
        "AGMARKNET: Gujarat option not found",
        {
          visibleOptions:
            visibleCursorItems
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 200),
        }
      );

      throw new Error(
        "Gujarat option not found in State/UT dropdown"
      );
    }

    await gujarat.scrollIntoViewIfNeeded();

    await page.waitForTimeout(300);

    await gujarat.click();

    await page.waitForTimeout(1000);

    logger.info(
      "AGMARKNET: Gujarat selected successfully"
    );
  }

  // ============================================================
  // MANUAL DATE + CAPTCHA + GO
  // ============================================================

  private async waitForManualDateCaptchaAndClickGo(
    page: Page,
    startDate: string,
    endDate: string
  ): Promise<void> {
    const goButton =
      page
        .locator(
          AGMARKNET_SELECTORS.submitButton
        )
        .first();

    await goButton.waitFor({
      state: "visible",
      timeout: this.timeoutMs,
    });

    logger.info(
      "================================================"
    );

    logger.info(
      "AGMARKNET: MANUAL INPUT REQUIRED"
    );

    logger.info(
      "================================================"
    );

    logger.info(
      "Please use the opened Chrome browser."
    );

    logger.info(
      `1. Select From Date manually: ${startDate}`
    );

    logger.info(
      `2. Select To Date manually: ${endDate}`
    );

    logger.info(
      "3. Enter CAPTCHA manually."
    );

    logger.info(
      "4. DO NOT click Go in browser."
    );

    logger.info(
      "5. Return to PowerShell terminal."
    );

    logger.info(
      "6. Type Y and press ENTER."
    );

    logger.info(
      "7. Playwright will click Go automatically."
    );

    logger.info(
      "================================================"
    );

    const readline =
      createInterface({
        input: process.stdin,
        output: process.stdout,
      });

    const answer =
      await new Promise<string>(
        (resolve) => {
          readline.question(
            "Enter Y after dates and CAPTCHA are completed: ",
            (input) => {
              readline.close();

              resolve(input);
            }
          );
        }
      );

    if (
      answer
        .trim()
        .toLowerCase() !== "y"
    ) {
      throw new Error(
        "Manual date/CAPTCHA confirmation cancelled by user."
      );
    }

    logger.info(
      "AGMARKNET: manual dates and CAPTCHA confirmed."
    );

    await page.waitForTimeout(500);

    logger.info(
      "AGMARKNET: clicking Go..."
    );

    await goButton.scrollIntoViewIfNeeded();

    await Promise.all([
      page
        .waitForLoadState(
          "networkidle",
          {
            timeout: this.timeoutMs,
          }
        )
        .catch(() => undefined),

      goButton.click(),
    ]);

    await page.waitForTimeout(1500);

    logger.info(
      "AGMARKNET: Go clicked successfully."
    );
  }

  // ============================================================
  // EXTRACT ALL PAGES
  //
  // Expected:
  //
  // Page 1 = 10
  // Page 2 = 10
  // Page 3 = 10
  // Page 4 = 1
  //
  // Total = 31
  //
  // IMPORTANT:
  // Pagination is BUTTON based.
  //
  // Example actual HTML:
  //
  // <button class="...">2</button>
  //
  // We click:
  //
  // 1 -> 2 -> 3 -> 4
  // ============================================================

  private async extractAllPages(
    page: Page
  ): Promise<{
    rows: RawMarketRow[];
    pagesProcessed: number;
  }> {
    const rows: RawMarketRow[] = [];

    let pagesProcessed = 0;

    let currentPageNumber = 1;

    const table =
      page
        .locator(
          AGMARKNET_SELECTORS.resultsTable
        )
        .first();

    try {
      await table.waitFor({
        state: "visible",
        timeout: this.timeoutMs,
      });
    } catch {
      const bodyText =
        await page
          .locator("body")
          .innerText()
          .catch(() => "");

      logger.warn(
        "AGMARKNET: result table not found",
        {
          text: bodyText.slice(-5000),
        }
      );

      throw new Error(
        "Result table did not appear after clicking Go."
      );
    }

    // ----------------------------------------------------------
    // Prevent duplicate pages
    // ----------------------------------------------------------

    const processedPageSignatures =
      new Set<string>();

    // ----------------------------------------------------------
    // Pagination loop
    // ----------------------------------------------------------

    for (
      let loop = 0;
      loop < this.maxPages;
      loop++
    ) {
      logger.info(
        `AGMARKNET: reading Page ${currentPageNumber}`
      );

      // --------------------------------------------------------
      // Extract current page
      // --------------------------------------------------------

      const pageRows =
        await this.extractRows(page);

      logger.info(
        `AGMARKNET: Page ${currentPageNumber} rows: ${pageRows.length}`
      );

      // --------------------------------------------------------
      // No rows
      // --------------------------------------------------------

      if (
        pageRows.length === 0
      ) {
        logger.info(
          "AGMARKNET: no rows on current page. Stopping."
        );

        break;
      }

      // --------------------------------------------------------
      // Complete page signature
      // --------------------------------------------------------

      const pageSignature =
        pageRows
          .map((row) =>
            this.createRowSignature(row)
          )
          .join("||");

      // --------------------------------------------------------
      // Duplicate page protection
      // --------------------------------------------------------

      if (
        processedPageSignatures.has(
          pageSignature
        )
      ) {
        logger.warn(
          `AGMARKNET: duplicate page detected at Page ${currentPageNumber}.`
        );

        logger.warn(
          "AGMARKNET: stopping pagination."
        );

        break;
      }

      processedPageSignatures.add(
        pageSignature
      );

      // --------------------------------------------------------
      // Store page
      // --------------------------------------------------------

      rows.push(...pageRows);

      pagesProcessed++;

      logger.info(
        `AGMARKNET: stored Page ${currentPageNumber}: ${pageRows.length} rows`
      );

      logger.info(
        `AGMARKNET: total rows collected so far: ${rows.length}`
      );

      // --------------------------------------------------------
      // FIND ACTUAL NEXT PAGE BUTTON
      // --------------------------------------------------------

      const nextPage =
        await this.findNextPage(
          page,
          currentPageNumber
        );

      // --------------------------------------------------------
      // NO NEXT PAGE
      // --------------------------------------------------------

      if (!nextPage) {
        logger.info(
          `AGMARKNET: Page ${currentPageNumber} is the last page.`
        );

        logger.info(
          `AGMARKNET: final rows collected: ${rows.length}`
        );

        break;
      }

      const nextPageNumber =
        currentPageNumber + 1;

      logger.info(
        `AGMARKNET: moving from Page ${currentPageNumber} to Page ${nextPageNumber}`
      );

      // --------------------------------------------------------
      // CLICK ACTUAL PAGE NUMBER BUTTON
      // --------------------------------------------------------

      try {
        await nextPage.scrollIntoViewIfNeeded();

        await page.waitForTimeout(300);

        logger.info(
          `AGMARKNET: clicking Page ${nextPageNumber} button...`
        );

        await nextPage.click({
          timeout: this.timeoutMs,
        });

        logger.info(
          `AGMARKNET: Page ${nextPageNumber} button clicked.`
        );

      } catch (error) {
        logger.warn(
          "AGMARKNET: unable to click actual next page button. Stopping pagination.",
          {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          }
        );

        break;
      }

      // --------------------------------------------------------
      // WAIT UNTIL TABLE CHANGES
      // --------------------------------------------------------

      const pageChanged =
        await this.waitForPageSignatureToChange(
          page,
          pageSignature
        );

      if (!pageChanged) {
        logger.warn(
          `AGMARKNET: Page ${nextPageNumber} did not load after clicking.`
        );

        logger.warn(
          "AGMARKNET: stopping pagination."
        );

        break;
      }

      // --------------------------------------------------------
      // Increment only after successful page change
      // --------------------------------------------------------

      currentPageNumber++;

      await page.waitForTimeout(500);
    }

    return {
      rows,
      pagesProcessed,
    };
  }

  // ============================================================
  // CREATE ROW SIGNATURE
  // ============================================================

  private createRowSignature(
    row: RawMarketRow | undefined
  ): string {
    if (!row) {
      return "";
    }

    return [
      row.state,
      row.district,
      row.market,
      row.commodityGroup,
      row.commodity,
      row.variety,
      row.grade,
      row.minPrice,
      row.maxPrice,
      row.modalPrice,
      row.unit,
      row.arrivalDate,
    ]
      .map((value) => value ?? "")
      .join("|");
  }

  // ============================================================
  // WAIT UNTIL COMPLETE TABLE DATA CHANGES
  // ============================================================

  private async waitForPageSignatureToChange(
    page: Page,
    oldPageSignature: string
  ): Promise<boolean> {
    const timeout =
      Math.min(
        this.timeoutMs,
        20000
      );

    const start =
      Date.now();

    while (
      Date.now() - start <
      timeout
    ) {
      await page.waitForTimeout(500);

      const currentRows =
        await this.extractRows(page);

      if (
        currentRows.length === 0
      ) {
        continue;
      }

      const currentSignature =
        currentRows
          .map((row) =>
            this.createRowSignature(row)
          )
          .join("||");

      if (
        currentSignature !==
        oldPageSignature
      ) {
        logger.info(
          "AGMARKNET: table changed successfully."
        );

        return true;
      }
    }

    return false;
  }

  // ============================================================
  // FIND ACTUAL NEXT PAGE BUTTON
  //
  // AGMARKNET CURRENT PAGINATION HTML:
  //
  // <button class="flex items-center ...">2</button>
  //
  // Therefore we search for an EXACT BUTTON whose visible
  // text is the next page number.
  //
  // Example:
  //
  // currentPage = 1
  // nextPage    = 2
  //
  // currentPage = 2
  // nextPage    = 3
  //
  // currentPage = 3
  // nextPage    = 4
  //
  // IMPORTANT:
  // We DO NOT use generic Next button.
  // ============================================================

  private async findNextPage(
    page: Page,
    currentPageNumber: number
  ): Promise<Locator | null> {
    const nextPageNumber =
      currentPageNumber + 1;

    const nextPageText =
      String(nextPageNumber);

    logger.info(
      `AGMARKNET: looking for actual page number ${nextPageText} button`
    );

    // ==========================================================
    // 1. PRIMARY METHOD
    //
    // Exact button text.
    //
    // Example:
    //
    // <button>2</button>
    // ==========================================================

    const exactButton =
      page.getByRole("button", {
        name: nextPageText,
        exact: true,
      });

    const exactButtonCount =
      await exactButton.count();

    logger.info(
      `AGMARKNET: exact Page ${nextPageText} button count: ${exactButtonCount}`
    );

    for (
      let i = 0;
      i < exactButtonCount;
      i++
    ) {
      const button =
        exactButton.nth(i);

      const visible =
        await button
          .isVisible()
          .catch(() => false);

      if (!visible) {
        continue;
      }

      const disabled =
        await this.isDisabledPaginationElement(
          button
        );

      if (disabled) {
        logger.info(
          `AGMARKNET: Page ${nextPageText} button is disabled.`
        );

        continue;
      }

      logger.info(
        `AGMARKNET: FOUND Page ${nextPageText} button.`
      );

      return button;
    }

    // ==========================================================
    // 2. FALLBACK
    //
    // Direct CSS button search with exact text.
    //
    // This is useful if Playwright role detection behaves
    // differently because of the page structure.
    // ==========================================================

    const buttonCandidates =
      page.locator("button");

    const buttonCount =
      await buttonCandidates.count();

    logger.info(
      `AGMARKNET: total buttons on page: ${buttonCount}`
    );

    for (
      let i = 0;
      i < buttonCount;
      i++
    ) {
      const button =
        buttonCandidates.nth(i);

      if (
        !await button
          .isVisible()
          .catch(() => false)
      ) {
        continue;
      }

      if (
        await this.isDisabledPaginationElement(
          button
        )
      ) {
        continue;
      }

      const text =
        (
          await button
            .innerText()
            .catch(() => "")
        )
          .replace(/\s+/g, " ")
          .trim();

      if (
        text !== nextPageText
      ) {
        continue;
      }

      logger.info(
        `AGMARKNET: FOUND Page ${nextPageText} using direct button search.`
      );

      return button;
    }

    // ==========================================================
    // 3. PAGINATION CONTAINER FALLBACK
    // ==========================================================

    const paginationContainers =
      page.locator(
        [
          "nav",
          '[class*="pagination"]',
          '[class*="Pagination"]',
          '[class*="pager"]',
          '[class*="Pager"]',
          '[aria-label*="pagination" i]',
        ].join(",")
      );

    const containerCount =
      await paginationContainers.count();

    for (
      let containerIndex = 0;
      containerIndex < containerCount;
      containerIndex++
    ) {
      const container =
        paginationContainers.nth(
          containerIndex
        );

      if (
        !await container
          .isVisible()
          .catch(() => false)
      ) {
        continue;
      }

      const buttons =
        container.locator("button");

      const count =
        await buttons.count();

      for (
        let i = 0;
        i < count;
        i++
      ) {
        const button =
          buttons.nth(i);

        if (
          !await button
            .isVisible()
            .catch(() => false)
        ) {
          continue;
        }

        if (
          await this.isDisabledPaginationElement(
            button
          )
        ) {
          continue;
        }

        const text =
          (
            await button
              .innerText()
              .catch(() => "")
          )
            .replace(/\s+/g, " ")
            .trim();

        if (
          text === nextPageText
        ) {
          logger.info(
            `AGMARKNET: FOUND Page ${nextPageText} button inside pagination container.`
          );

          return button;
        }
      }
    }

    // ==========================================================
    // 4. PAGE NOT FOUND
    // ==========================================================

    logger.info(
      `AGMARKNET: actual Page ${nextPageText} button does not exist or could not be identified.`
    );

    return null;
  }

  // ============================================================
  // CHECK PAGINATION ELEMENT DISABLED STATE
  // ============================================================

  private async isDisabledPaginationElement(
    element: Locator
  ): Promise<boolean> {
    const disabled =
      await element
        .getAttribute("disabled")
        .catch(() => null);
  
    const ariaDisabled =
      await element
        .getAttribute("aria-disabled")
        .catch(() => null);
  
    const className =
      (
        await element
          .getAttribute("class")
          .catch(() => null)
      ) || "";
  
    const style =
      (
        await element
          .getAttribute("style")
          .catch(() => null)
      ) || "";
  
    // Real HTML disabled attribute
    if (disabled !== null) {
      return true;
    }
  
    // Real aria-disabled attribute
    if (
      ariaDisabled &&
      ariaDisabled.toLowerCase() === "true"
    ) {
      return true;
    }
  
    // Check only an actual "disabled" class.
    // Do NOT treat Tailwind classes such as
    // "disabled:opacity-30" as disabled.
    const classTokens =
      className
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean);
  
    if (
      classTokens.includes("disabled")
    ) {
      return true;
    }
  
    // Pointer-events:none can indicate a disabled element
    if (
      /pointer-events\s*:\s*none/i.test(style)
    ) {
      return true;
    }
  
    return false;
  }

  // ============================================================
  // EXTRACT CURRENT TABLE ROWS
  // ============================================================

  private async extractRows(
    page: Page
  ): Promise<RawMarketRow[]> {
    const rowsLocator =
      page.locator(
        AGMARKNET_SELECTORS.resultsRow
      );

    const count =
      await rowsLocator.count();

    const result: RawMarketRow[] = [];

    for (
      let i = 0;
      i < count;
      i++
    ) {
      try {
        const row =
          rowsLocator.nth(i);

        const cells =
          (
            await row
              .locator("td")
              .allInnerTexts()
          )
            .map(
              (value) =>
                value
                  .replace(/\s+/g, " ")
                  .trim()
            );

        // ------------------------------------------------------
        // Expected:
        //
        // 0  State/UT
        // 1  District
        // 2  Market
        // 3  Commodity Group
        // 4  Commodity
        // 5  Variety
        // 6  Grade
        // 7  Min Price
        // 8  Max Price
        // 9  Modal Price
        // 10 Unit
        // 11 Arrival Date
        // ------------------------------------------------------

        if (
          cells.length < 12
        ) {
          continue;
        }

        const [
          state,
          district,
          market,
          commodityGroup,
          commodity,
          variety,
          grade,
          minPrice,
          maxPrice,
          modalPrice,
          unit,
          arrivalDateRaw,
        ] = cells;

        // ------------------------------------------------------
        // Skip header
        // ------------------------------------------------------

        if (
          state
            .toLowerCase() ===
          "state/ut"
        ) {
          continue;
        }

        if (
          district
            .toLowerCase() ===
          "district"
        ) {
          continue;
        }

        // ------------------------------------------------------
        // Basic validation
        // ------------------------------------------------------

        if (
          !state ||
          !district ||
          !market ||
          !commodityGroup ||
          !commodity ||
          !arrivalDateRaw
        ) {
          continue;
        }

        result.push({
          state,

          district,

          market,

          commodityGroup,

          commodity,

          variety:
            variety || null,

          grade:
            grade || null,

          minPrice:
            minPrice || null,

          maxPrice:
            maxPrice || null,

          modalPrice:
            modalPrice || null,

          arrivalQuantity:
            null,

          unit:
            unit || null,

          arrivalDate:
            this.fromDisplayDate(
              arrivalDateRaw
            ),
        });

      } catch (error) {
        logger.warn(
          "AGMARKNET: failed to process table row",
          {
            error:
              error instanceof Error
                ? error.message
                : String(error),
          }
        );
      }
    }

    return result;
  }

  // ============================================================
  // AGMARKNET DATE → ISO
  // ============================================================

  private fromDisplayDate(
    display: string
  ): string {
    const normalized =
      display
        .replace(/\s+/g, " ")
        .trim();

    // ----------------------------------------------------------
    // Already ISO
    // ----------------------------------------------------------

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(
        normalized
      )
    ) {
      return normalized;
    }

    // ----------------------------------------------------------
    // DD/MM/YYYY
    // ----------------------------------------------------------

    const slashMatch =
      normalized.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
      );

    if (slashMatch) {
      const [
        ,
        day,
        month,
        year,
      ] = slashMatch;

      return (
        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      );
    }

    // ----------------------------------------------------------
    // DD-MM-YYYY
    // ----------------------------------------------------------

    const dashNumericMatch =
      normalized.match(
        /^(\d{1,2})-(\d{1,2})-(\d{4})$/
      );

    if (dashNumericMatch) {
      const [
        ,
        day,
        month,
        year,
      ] = dashNumericMatch;

      return (
        `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      );
    }

    // ----------------------------------------------------------
    // DD-MMM-YYYY
    // ----------------------------------------------------------

    const match =
      normalized.match(
        /^(\d{1,2})[-\s]([A-Za-z]{3,9})[-\s](\d{4})$/
      );

    if (!match) {
      return normalized;
    }

    const [
      ,
      day,
      monthText,
      year,
    ] = match;

    const months: Record<
      string,
      string
    > = {
      jan: "01",
      january: "01",

      feb: "02",
      february: "02",

      mar: "03",
      march: "03",

      apr: "04",
      april: "04",

      may: "05",

      jun: "06",
      june: "06",

      jul: "07",
      july: "07",

      aug: "08",
      august: "08",

      sep: "09",
      sept: "09",
      september: "09",

      oct: "10",
      october: "10",

      nov: "11",
      november: "11",

      dec: "12",
      december: "12",
    };

    const month =
      months[
        monthText.toLowerCase()
      ];

    if (!month) {
      return normalized;
    }

    return (
      `${year}-${month}-${day.padStart(2, "0")}`
    );
  }
}