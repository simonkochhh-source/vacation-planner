const { chromium } = require('playwright');

async function conductChatDesignReview() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();

  try {
    console.log('🚀 Starting chat interface design review...');
    
    // Navigate to the app
    console.log('📱 Navigating to the vacation planner app...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // Wait for the app to fully load
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    console.log('📸 Taking initial app screenshot...');
    await page.screenshot({ 
      path: 'design-review-1-app-initial.png', 
      fullPage: true 
    });
    
    // Look for chat-related buttons or navigation elements
    console.log('🔍 Looking for chat interface triggers...');
    
    // Check for common chat button selectors
    const chatSelectors = [
      'button[aria-label*="chat" i]',
      'button[title*="chat" i]',
      '[data-testid*="chat"]',
      '.chat-button',
      'button:has-text("Chat")',
      'button:has-text("💬")',
      '[aria-label*="nachricht" i]',
      '[aria-label*="unterhaltung" i]'
    ];
    
    let chatButton = null;
    for (const selector of chatSelectors) {
      try {
        chatButton = await page.locator(selector).first();
        if (await chatButton.isVisible()) {
          console.log(`✅ Found chat button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no specific chat button found, look for any button that might open chat
    if (!chatButton || !(await chatButton.isVisible())) {
      console.log('🔍 No specific chat button found, looking for all buttons...');
      const allButtons = await page.locator('button').all();
      console.log(`Found ${allButtons.length} buttons on the page`);
      
      // Check each button's text content and attributes
      for (let i = 0; i < allButtons.length; i++) {
        const button = allButtons[i];
        try {
          const textContent = await button.textContent();
          const ariaLabel = await button.getAttribute('aria-label');
          const title = await button.getAttribute('title');
          
          console.log(`Button ${i}: text="${textContent}", aria-label="${ariaLabel}", title="${title}"`);
          
          // Look for chat-related terms
          const chatTerms = ['chat', 'message', 'nachricht', 'unterhaltung', '💬'];
          const allText = `${textContent || ''} ${ariaLabel || ''} ${title || ''}`.toLowerCase();
          
          if (chatTerms.some(term => allText.includes(term))) {
            chatButton = button;
            console.log(`✅ Found potential chat button: ${textContent || ariaLabel || title}`);
            break;
          }
        } catch (e) {
          // Skip this button
        }
      }
    }
    
    // Try to click the chat button if found
    if (chatButton && await chatButton.isVisible()) {
      console.log('🖱️ Clicking chat button...');
      await chatButton.click();
      await page.waitForTimeout(2000);
      
      // Take screenshot after clicking chat button
      console.log('📸 Taking screenshot after opening chat...');
      await page.screenshot({ 
        path: 'design-review-2-chat-opened.png', 
        fullPage: true 
      });
    } else {
      console.log('❌ No chat button found. Taking screenshot of current state...');
      await page.screenshot({ 
        path: 'design-review-2-no-chat-button.png', 
        fullPage: true 
      });
    }
    
    // Check for any elements with dark theme
    console.log('🌙 Checking for dark mode elements...');
    const darkThemeElements = await page.locator('[data-theme="dark"]').all();
    console.log(`Found ${darkThemeElements.length} elements with data-theme="dark"`);
    
    // Check for any chat-related elements in the DOM
    const chatElements = await page.locator('[class*="chat"], [id*="chat"]').all();
    console.log(`Found ${chatElements.length} elements with chat-related classes/IDs`);
    
    // Check console for errors
    console.log('🔍 Checking browser console for errors...');
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Console Error: ${msg.text()}`);
      }
    });
    
    // Test responsive behavior - tablet view
    console.log('📱 Testing tablet viewport (768px)...');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'design-review-3-tablet-view.png', 
      fullPage: true 
    });
    
    // Test responsive behavior - mobile view
    console.log('📱 Testing mobile viewport (375px)...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: 'design-review-4-mobile-view.png', 
      fullPage: true 
    });
    
    // Return to desktop view
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(1000);
    
    console.log('✅ Design review screenshots captured successfully!');
    
  } catch (error) {
    console.error('❌ Error during design review:', error);
  } finally {
    await browser.close();
  }
}

// Run the design review
conductChatDesignReview().catch(console.error);