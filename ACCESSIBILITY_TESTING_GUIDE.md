# Accessibility Testing Guide

## WCAG 2.2 AA Compliance Testing

This guide provides comprehensive testing procedures to verify WCAG 2.2 AA compliance for the vacation planning React application.

## Automated Testing Tools

### 1. axe-core Integration
```bash
# Install axe-core for automated testing
npm install --save-dev @axe-core/react axe-playwright

# Run automated accessibility tests
npm run test:a11y
```

### 2. ESLint Plugin
```bash
# Install accessibility linting
npm install --save-dev eslint-plugin-jsx-a11y

# Add to .eslintrc.js
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"]
}
```

## Screen Reader Testing

### macOS (VoiceOver)
```bash
# Enable VoiceOver
⌘ + F5

# Navigate through components
- VO + Right Arrow: Next item
- VO + Left Arrow: Previous item
- VO + Space: Activate
- VO + U: Open rotor menu
```

**Test Checklist:**
- [ ] All form controls have proper labels
- [ ] Error messages are announced immediately
- [ ] Loading states are communicated
- [ ] Card interactions are properly described
- [ ] Navigation landmarks are identified

### Windows (NVDA/JAWS)
```bash
# NVDA shortcuts
- Insert + Down Arrow: Read next item
- Insert + F7: List all elements
- Insert + F5: Refresh virtual buffer
```

### Testing Protocol:
1. Navigate entire application using only screen reader
2. Verify all content is accessible via keyboard
3. Test form validation announcements
4. Confirm focus management during interactions
5. Validate skip link functionality

## Keyboard Navigation Testing

### Universal Navigation Keys
- `Tab`: Move forward through focusable elements
- `Shift + Tab`: Move backward through focusable elements
- `Enter`: Activate buttons and links
- `Space`: Activate buttons, toggle checkboxes
- `Escape`: Close modals and dropdowns
- `Arrow Keys`: Navigate within components (when applicable)

### Component-Specific Testing

#### ModernButton
- [ ] Focus visible indicator appears on tab
- [ ] Both Enter and Space activate button
- [ ] Loading state prevents activation
- [ ] Disabled state cannot receive focus
- [ ] Tooltip content available to screen readers

#### ModernInput
- [ ] Label properly associated with input
- [ ] Required fields announced to screen readers
- [ ] Error messages announced immediately
- [ ] Password toggle accessible via keyboard
- [ ] Helper text read by screen readers

#### ModernCard
- [ ] Interactive cards focusable via keyboard
- [ ] Enter and Space activate card actions
- [ ] Focus indicator clearly visible
- [ ] Semantic content structure maintained
- [ ] ARIA attributes properly applied

#### ModernNavigation
- [ ] Skip link appears on first Tab
- [ ] All navigation items keyboard accessible
- [ ] Current page indicated to screen readers
- [ ] Mobile and desktop navigation both accessible
- [ ] Focus management consistent across views

## Color Contrast Testing

### Tools
- **WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/
- **Colour Contrast Analyser**: https://www.tpgi.com/color-contrast-checker/
- **Browser DevTools**: Accessibility panel

### Standards
- **Normal text**: 4.5:1 minimum ratio
- **Large text** (18px+ or 14px+ bold): 3:1 minimum ratio
- **UI components**: 3:1 minimum ratio for focus indicators

### Test Cases
1. Primary button text on primary background
2. Error text on light backgrounds
3. Form labels and helper text
4. Navigation items in active/inactive states
5. Focus indicators against all backgrounds

## Focus Management Testing

### Visual Focus Indicators
- [ ] Focus rings visible on all interactive elements
- [ ] Focus rings have minimum 2px width
- [ ] Focus rings contrast 3:1 against background
- [ ] Focus rings don't overlap content
- [ ] High contrast mode properly supported

### Focus Flow
- [ ] Logical tab order throughout application
- [ ] Focus never trapped unintentionally
- [ ] Focus moves predictably between sections
- [ ] Skip links allow bypassing repetitive content
- [ ] Modal focus management working properly

## Mobile Accessibility Testing

### Touch Targets (WCAG 2.2 AA - Target Size)
- [ ] All interactive elements minimum 44px × 44px
- [ ] Sufficient spacing between touch targets
- [ ] Small targets have adequate spacing exception
- [ ] No overlapping interactive areas

### iOS Testing (VoiceOver)
```bash
# Enable VoiceOver on iOS
Settings > Accessibility > VoiceOver > On

# Navigate
- Swipe right: Next element
- Swipe left: Previous element
- Double-tap: Activate
- Two-finger double-tap: Play/pause
```

### Android Testing (TalkBack)
```bash
# Enable TalkBack
Settings > Accessibility > TalkBack > On

# Navigate
- Swipe right: Next element
- Swipe left: Previous element
- Double-tap: Activate
- Swipe down then right: Read by paragraphs
```

## Form Accessibility Testing

### Required Field Testing
- [ ] Required fields clearly marked visually
- [ ] Required fields announced by screen readers
- [ ] Form cannot be submitted with empty required fields
- [ ] Clear error messages for required fields

### Error Handling
- [ ] Errors announced immediately (aria-live)
- [ ] Error messages descriptive and helpful
- [ ] Focus moves to first error field
- [ ] Errors associated with form controls (aria-describedby)
- [ ] Error styling maintains accessibility contrast

### Input Types and Attributes
- [ ] Appropriate input types used (email, tel, etc.)
- [ ] autocomplete attributes for common fields
- [ ] inputMode attributes for virtual keyboards
- [ ] Labels properly associated (aria-labelledby)

## Testing Checklist by Component

### Header/Navigation
- [ ] Skip link functional and visible on focus
- [ ] Logo/brand has appropriate heading level
- [ ] Navigation role and aria-label present
- [ ] Current page indicated (aria-current)
- [ ] Mobile hamburger menu accessible

### Main Content
- [ ] Main landmark role present
- [ ] Heading hierarchy logical (h1, h2, h3...)
- [ ] No heading levels skipped
- [ ] Content sections have appropriate landmarks
- [ ] Reading order logical without CSS

### Forms
- [ ] All form controls have labels
- [ ] Fieldsets group related controls
- [ ] Error summary links to fields
- [ ] Success messages announced
- [ ] Form validation accessible

### Interactive Elements
- [ ] All buttons have accessible names
- [ ] Links have descriptive text
- [ ] Images have appropriate alt text
- [ ] Icons have text alternatives
- [ ] Custom controls have proper roles

## Browser Testing Matrix

Test across multiple browsers and assistive technologies:

| Browser | Screen Reader | Operating System |
|---------|---------------|------------------|
| Chrome | NVDA | Windows |
| Firefox | JAWS | Windows |
| Safari | VoiceOver | macOS |
| Chrome | VoiceOver | macOS |
| Safari | VoiceOver | iOS |
| Chrome | TalkBack | Android |

## Performance Impact Testing

### JavaScript Accessibility APIs
- [ ] ARIA attributes don't impact performance
- [ ] Screen reader announcements don't cause lag
- [ ] Focus management smooth and responsive
- [ ] Large DOM trees don't break AT navigation

### Reduced Motion
- [ ] prefers-reduced-motion media query respected
- [ ] Essential animations still functional
- [ ] Alternative interaction patterns available
- [ ] No motion-triggered seizures possible

## Automated Testing Integration

### CI/CD Pipeline
```yaml
# .github/workflows/accessibility.yml
name: Accessibility Tests
on: [push, pull_request]
jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Run accessibility tests
        run: npm run test:a11y
      - name: Run axe-playwright tests
        run: npm run test:axe
```

### Test Commands
```json
{
  "scripts": {
    "test:a11y": "jest --testMatch='**/*.a11y.test.js'",
    "test:axe": "playwright test accessibility",
    "test:lighthouse": "lighthouse http://localhost:3000 --preset=desktop --chrome-flags='--headless'",
    "test:pa11y": "pa11y-ci --sitemap http://localhost:3000/sitemap.xml"
  }
}
```

## Reporting and Documentation

### Test Results Documentation
- Record all test results with screenshots
- Document any accessibility issues found
- Track remediation progress
- Maintain testing schedule and ownership

### User Testing
- Include users with disabilities in testing process
- Document feedback and implement improvements
- Regular accessibility user testing sessions
- Accessibility feedback collection system

## Compliance Verification

### WCAG 2.2 Success Criteria Coverage
- Level A: All criteria met
- Level AA: All criteria met
- Enhanced features: Some AAA criteria implemented
- Documentation: All decisions and implementations documented

### Legal Compliance
- ADA Section 508 compliance verified
- European Accessibility Act considerations
- Regular compliance audits scheduled
- Legal review of accessibility statements