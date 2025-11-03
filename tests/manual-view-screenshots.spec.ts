import { test, expect } from '@playwright/test';

// Configure for iPhone 14
test.use({ 
  ...require('@playwright/test').devices['iPhone 14'],
  viewport: { width: 390, height: 844 }
});

test.describe('Mobile View Screenshots - Manual Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('📱 Screenshots aller Navigation Views', async ({ page }) => {
    // 1. Landing Page (Home)
    console.log('📸 Taking Landing Page screenshot...');
    await page.screenshot({ 
      path: `screenshots/view-01-landing.png`,
      fullPage: true 
    });

    // 2. Navigate to Trips
    console.log('📸 Navigating to Trips...');
    await page.locator('button[aria-label="Trips"]').click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: `screenshots/view-02-trips.png`,
      fullPage: true 
    });

    // 3. Navigate to Entdecken (Search)
    console.log('📸 Navigating to Search...');
    await page.locator('button[aria-label="Entdecken"]').click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: `screenshots/view-03-search.png`,
      fullPage: true 
    });

    // 4. Navigate to Profile
    console.log('📸 Navigating to Profile...');
    await page.locator('button[aria-label="Profil"]').click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: `screenshots/view-04-profile.png`,
      fullPage: true 
    });

    // 5. Test Create Modal
    console.log('📸 Opening Create Modal...');
    await page.locator('button[aria-label="Erstellen"]').click({ force: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: `screenshots/view-05-create-modal.png`,
      fullPage: true 
    });

    // Close modal
    await page.locator('div[style*="position: fixed"][style*="rgba(0, 0, 0, 0.5)"]').click({ force: true });
    await page.waitForTimeout(500);

    console.log('✅ All navigation screenshots completed!');
  });

  test('📱 Direct View Navigation via JavaScript', async ({ page }) => {
    // Test direct navigation to different views via JavaScript
    const views = [
      'map', 'budget', 'settings', 'discovery', 'photos', 'list'
    ];

    for (const viewName of views) {
      console.log(`📸 Navigating to ${viewName} view...`);
      
      try {
        // Try to navigate via JavaScript
        await page.evaluate((view) => {
          // Access the React context to change view
          const event = new CustomEvent('app-navigate', { detail: { view } });
          window.dispatchEvent(event);
        }, viewName);
        
        await page.waitForTimeout(2000);
        
        await page.screenshot({ 
          path: `screenshots/view-direct-${viewName}.png`,
          fullPage: true 
        });
        
        console.log(`✅ Screenshot for ${viewName} completed`);
      } catch (error) {
        console.log(`⚠️ Could not navigate to ${viewName}: ${error.message}`);
      }
    }
  });
});