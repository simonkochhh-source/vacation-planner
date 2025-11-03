import { defineConfig, devices } from '@playwright/test';

/**
 * Mobile UI Testing Configuration für iPhone
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshots on failure */
    screenshot: 'only-on-failure',
    /* Record videos on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers and mobile devices */
  projects: [
    // Mobile Safari (iPhone)
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 14'],
        // Custom viewport for better testing
        viewport: { width: 390, height: 844 },
        // Enable touch events
        hasTouch: true,
        // Mobile user agent
        isMobile: true,
      },
    },
    
    // iPhone 14 Pro Max (larger screen)
    {
      name: 'iPhone 14 Pro Max',
      use: { 
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 430, height: 932 },
        hasTouch: true,
        isMobile: true,
      },
    },
    
    // iPhone SE (smaller screen)
    {
      name: 'iPhone SE',
      use: { 
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
    },

    // Mobile Chrome (Android comparison)
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 7'],
        viewport: { width: 412, height: 915 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
  },
});