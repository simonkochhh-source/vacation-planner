import { test, expect } from '@playwright/test';

/**
 * Screenshot Generator für alle App Views
 * Navigiert durch alle verfügbaren Views und erstellt mobile Screenshots
 */

// Configure for iPhone 14
test.use({ 
  ...require('@playwright/test').devices['iPhone 14'],
  viewport: { width: 390, height: 844 }
});

test.describe('Mobile View Screenshots', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the app with authentication bypass
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Extra time for React components
  });

  const views = [
    { name: 'landing', label: 'Landing Page', navigation: 'Home' },
    { name: 'trips', label: 'Trips View', navigation: 'Trips' },
    { name: 'search', label: 'Search Page', navigation: 'Entdecken' },
    { name: 'my-profile', label: 'My Profile', navigation: 'Profil' },
    // Views accessible through direct navigation
    { name: 'map', label: 'Map View', direct: true },
    { name: 'budget', label: 'Budget View', direct: true },
    { name: 'settings', label: 'Settings View', direct: true },
    { name: 'discovery', label: 'Discovery View', direct: true },
    { name: 'photos', label: 'Photos View', direct: true },
    { name: 'list', label: 'Timeline View', direct: true },
    { name: 'place-search-demo', label: 'Place Search Demo', direct: true },
    { name: 'design-demo', label: 'Design Demo', direct: true },
    { name: 'inline-demo', label: 'Inline Demo', direct: true }
  ];

  for (const view of views) {
    test(`📱 ${view.label} Screenshot`, async ({ page }) => {
      try {
        if (view.navigation) {
          // Navigate using mobile navigation
          const navButton = page.locator(`button[aria-label="${view.navigation}"]`);
          await navButton.click({ force: true });
          await page.waitForTimeout(1500);
        } else if (view.direct) {
          // Navigate directly via URL parameter or JavaScript
          await page.evaluate((viewName) => {
            // Try to trigger view change directly
            window.dispatchEvent(new CustomEvent('navigate-to-view', { detail: viewName }));
          }, view.name);
          await page.waitForTimeout(1000);
          
          // Fallback: navigate via URL
          await page.goto(`/?view=${view.name}`);
          await page.waitForLoadState('networkidle');
        }

        // Wait for content to load
        await page.waitForTimeout(2000);

        // Take screenshot
        await page.screenshot({ 
          path: `screenshots/mobile-view-${view.name}.png`,
          fullPage: true 
        });

        console.log(`✅ Screenshot created for ${view.label}`);

      } catch (error) {
        console.log(`⚠️ Could not capture ${view.label}: ${error.message}`);
        
        // Take screenshot anyway to see what's displayed
        await page.screenshot({ 
          path: `screenshots/mobile-view-${view.name}-error.png`,
          fullPage: true 
        });
      }
    });
  }

  test('📱 Create Button Modal Screenshot', async ({ page }) => {
    try {
      // Click create button to open modal
      const createButton = page.locator('button[aria-label="Erstellen"]');
      await createButton.click({ force: true });
      
      // Wait for modal to appear
      await page.waitForTimeout(1000);
      await expect(page.locator('text=Erstellen')).toBeVisible();
      
      // Take screenshot of modal
      await page.screenshot({ 
        path: `screenshots/mobile-create-modal.png`,
        fullPage: true 
      });

      console.log(`✅ Screenshot created for Create Modal`);
    } catch (error) {
      console.log(`⚠️ Could not capture Create Modal: ${error.message}`);
    }
  });
});