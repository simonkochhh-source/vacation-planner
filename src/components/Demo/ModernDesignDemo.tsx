import React, { useState } from 'react';
import { 
  Star, 
  Heart, 
  MapPin, 
  Calendar,
  User,
  Search,
  Settings,
  Plus,
  Download,
  Share,
  Check
} from 'lucide-react';
import ModernButton from '../UI/ModernButton';
import ModernCard from '../UI/ModernCard';
import ModernInput from '../UI/ModernInput';
import ModernNavigation from '../Navigation/ModernNavigation';

const ModernDesignDemo: React.FC = React.memo(() => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Static arrays for demo
  const primaryShades = [40, 50, 60, 80, 90];
  const neutralShades = [10, 30, 50, 70, 90];
  const spacingArray = [1, 2, 3, 4, 6, 8, 10, 12];

  const handleLoadingDemo = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-surface)' }}>
      {/* Desktop Navigation */}
      <div className="hidden lg:block">
        <ModernNavigation 
          currentView={currentView}
          onViewChange={setCurrentView}
          isMobile={false}
        />
      </div>

      {/* Main Content */}
      <main 
        style={{ 
          flex: 1, 
          padding: 'var(--space-6)',
          paddingBottom: 'var(--space-16)', // Space for mobile nav
          overflow: 'auto'
        }}
      >
        {/* Skip Link for Accessibility */}
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>

        <div id="main-content" className="container" style={{ maxWidth: '1200px' }}>
          {/* Header with Theme Toggle */}
          <header style={{ marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 className="text-display-medium" style={{ marginBottom: 'var(--space-2)' }}>
                Modern Design System
              </h1>
              <p className="text-body-large text-muted">
                Silicon Valley Standard - Material 3, Apple HIG, and Fluent 2 principles
              </p>
            </div>
            <ModernButton variant="outlined" onClick={toggleTheme} leftIcon={theme === 'light' ? <Settings size={20} /> : <Check size={20} />}>
              {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
            </ModernButton>
          </header>

          {/* Design Principles */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Design Principles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'var(--space-4)' }}>
              <ModernCard variant="outlined">
                <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)',
                    color: 'var(--color-on-primary)'
                  }}>
                    <User size={24} />
                  </div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-2)' }}>
                    Accessibility First
                  </h3>
                  <p className="text-body-medium text-muted">
                    WCAG 2.2 AA compliant, with proper focus management and screen reader support
                  </p>
                </div>
              </ModernCard>

              <ModernCard variant="outlined">
                <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)',
                    color: 'var(--color-on-primary)'
                  }}>
                    <Settings size={24} />
                  </div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-2)' }}>
                    Platform Native
                  </h3>
                  <p className="text-body-medium text-muted">
                    Respects iOS, Android, and Windows design patterns with 44pt/48dp touch targets
                  </p>
                </div>
              </ModernCard>

              <ModernCard variant="outlined">
                <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: 'var(--color-primary)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto var(--space-3)',
                    color: 'var(--color-on-primary)'
                  }}>
                    <Star size={24} />
                  </div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-2)' }}>
                    Token-Based
                  </h3>
                  <p className="text-body-medium text-muted">
                    DTCG-compatible design tokens for consistent colors, spacing, and typography
                  </p>
                </div>
              </ModernCard>
            </div>
          </section>

          {/* Typography Section */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Typography Scale
            </h2>
            
            <ModernCard className="mb-6">
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div>
                  <h3 className="text-display-large">Display Large</h3>
                  <p className="text-body-small text-muted">Clamp(36px, 4vw, 57px) • -0.25px letter-spacing</p>
                </div>
                <div>
                  <h3 className="text-display-medium">Display Medium</h3>
                  <p className="text-body-small text-muted">Clamp(32px, 3.5vw, 45px) • 0px letter-spacing</p>
                </div>
                <div>
                  <h3 className="text-headline-large">Headline Large</h3>
                  <p className="text-body-small text-muted">32px • Semibold weight</p>
                </div>
                <div>
                  <h4 className="text-headline-medium">Headline Medium</h4>
                  <p className="text-body-small text-muted">24px • Semibold weight</p>
                </div>
                <div>
                  <h5 className="text-title-large">Title Large</h5>
                  <p className="text-body-small text-muted">18px • Semibold weight</p>
                </div>
                <div>
                  <p className="text-body-large">Body Large - Primary reading text optimized for content consumption</p>
                  <p className="text-body-small text-muted">16px • 1.625 line-height</p>
                </div>
                <div>
                  <p className="text-body-medium">Body Medium - Secondary text for descriptions and supporting content</p>
                  <p className="text-body-small text-muted">14px • 1.5 line-height</p>
                </div>
                <div>
                  <p className="text-label-large">Label Large - Button and form labels</p>
                  <p className="text-body-small text-muted">14px • Medium weight</p>
                </div>
              </div>
            </ModernCard>
          </section>

          {/* Button System */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Button System
            </h2>
            
            <ModernCard>
              <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
                {/* Button Variants */}
                <div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-3)' }}>
                    Material 3 Button Variants
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <ModernButton variant="filled" leftIcon={<Plus size={20} />}>
                      Filled (Primary)
                    </ModernButton>
                    <ModernButton variant="outlined" leftIcon={<Star size={20} />}>
                      Outlined
                    </ModernButton>
                    <ModernButton variant="text" leftIcon={<Heart size={20} />}>
                      Text
                    </ModernButton>
                    <ModernButton variant="tonal" leftIcon={<Download size={20} />}>
                      Tonal
                    </ModernButton>
                  </div>
                </div>

                {/* Touch Targets */}
                <div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-3)' }}>
                    Platform Touch Targets
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <ModernButton size="sm" leftIcon={<Settings size={16} />}>
                      32px (Compact)
                    </ModernButton>
                    <ModernButton leftIcon={<User size={20} />}>
                      48dp (Comfortable)
                    </ModernButton>
                    <ModernButton size="lg" leftIcon={<Share size={24} />}>
                      56px (Large)
                    </ModernButton>
                  </div>
                  <p className="text-body-small text-muted" style={{ marginTop: 'var(--space-2)' }}>
                    Touch targets meet iOS (44pt) and Android (48dp) accessibility standards
                  </p>
                </div>

                {/* Button States */}
                <div>
                  <h3 className="text-title-large" style={{ marginBottom: 'var(--space-3)' }}>
                    Interactive States
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <ModernButton loading={loading} onClick={handleLoadingDemo}>
                      {loading ? 'Loading...' : 'Click for Loading'}
                    </ModernButton>
                    <ModernButton disabled>
                      Disabled State
                    </ModernButton>
                    <ModernButton variant="outlined" fullWidth style={{ maxWidth: '200px' }}>
                      Focus Management
                    </ModernButton>
                  </div>
                </div>
              </div>
            </ModernCard>
          </section>

          {/* Form Elements */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Form System
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-6)' }}>
              <ModernCard>
                <h3 className="text-title-large" style={{ marginBottom: 'var(--space-4)' }}>
                  Input Variants
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <ModernInput
                    label="Destination Name"
                    placeholder="Enter destination name"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    leftIcon={<MapPin size={20} />}
                    helperText="This will be visible to other travelers"
                    required
                  />
                  
                  <ModernInput
                    label="Email Address"
                    type="email"
                    placeholder="Enter your email"
                    leftIcon={<User size={20} />}
                    error={inputValue === 'error' ? 'Please enter a valid email address' : undefined}
                  />
                  
                  <ModernInput
                    label="Search with Icons"
                    placeholder="Type to search..."
                    leftIcon={<Search size={20} />}
                    rightIcon={<Calendar size={20} />}
                  />
                </div>
              </ModernCard>

              <ModernCard>
                <h3 className="text-title-large" style={{ marginBottom: 'var(--space-4)' }}>
                  Advanced Features
                </h3>
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <ModernInput
                    label="Password"
                    type="password"
                    placeholder="Enter secure password"
                    showPasswordToggle
                    helperText="Password must be at least 8 characters"
                  />
                  
                  <ModernInput
                    label="Error State Demo"
                    placeholder="Type 'error' to see error state"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    error={inputValue === 'error' ? 'This demonstrates error handling with proper ARIA support' : undefined}
                  />
                  
                  <ModernInput
                    label="Full Width Input"
                    placeholder="This input spans the full width"
                    fullWidth
                    leftIcon={<Settings size={20} />}
                  />
                </div>
              </ModernCard>
            </div>
          </section>

          {/* Color System */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Material 3 Color System
            </h2>
            
            <ModernCard>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 'var(--space-6)' }}>
                <div>
                  <h3 className="text-title-medium" style={{ marginBottom: 'var(--space-3)' }}>
                    Primary Colors
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {primaryShades.map(shade => (
                      <div
                        key={shade}
                        style={{
                          width: '100%',
                          height: '40px',
                          backgroundColor: `var(--color-primary-${shade})`,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: shade < 60 ? 'white' : 'black',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)'
                        }}
                      >
                        Primary-{shade}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-title-medium" style={{ marginBottom: 'var(--space-3)' }}>
                    Neutral Colors
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    {neutralShades.map(shade => (
                      <div
                        key={shade}
                        style={{
                          width: '100%',
                          height: '40px',
                          backgroundColor: `var(--color-neutral-${shade})`,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: shade < 60 ? 'white' : 'black',
                          fontSize: 'var(--font-size-xs)',
                          fontWeight: 'var(--font-weight-medium)',
                          border: shade > 85 ? '1px solid var(--color-outline-variant)' : 'none'
                        }}
                      >
                        Neutral-{shade}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-title-medium" style={{ marginBottom: 'var(--space-3)' }}>
                    Semantic Colors
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div
                      style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: 'var(--color-error-50)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}
                    >
                      Error
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: 'var(--color-success-50)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}
                    >
                      Success
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '40px',
                        backgroundColor: 'var(--color-warning-50)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-medium)'
                      }}
                    >
                      Warning
                    </div>
                  </div>
                </div>
              </div>
            </ModernCard>
          </section>

          {/* 8dp Grid System */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              8dp Grid System
            </h2>
            
            <ModernCard>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <p className="text-body-medium text-muted">
                  All spacing follows the 8dp/pt rhythm for consistency across platforms.
                </p>
                {spacingArray.map(space => (
                  <div key={space} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span className="text-label-medium" style={{ minWidth: '100px', fontFamily: 'var(--font-family-mono)' }}>
                      --space-{space}
                    </span>
                    <div
                      style={{
                        width: `var(--space-${space})`,
                        height: '24px',
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: 'var(--radius-sm)',
                        flexShrink: 0
                      }}
                    />
                    <span className="text-body-small text-muted">
                      {space === 1 ? '4px' : `${space * 8}px`}
                    </span>
                  </div>
                ))}
              </div>
            </ModernCard>
          </section>

          {/* Performance & Accessibility */}
          <section style={{ marginBottom: 'var(--space-8)' }}>
            <h2 className="text-headline-large" style={{ marginBottom: 'var(--space-4)' }}>
              Performance & Accessibility
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-4)' }}>
              <ModernCard variant="outlined">
                <div style={{ padding: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <Check size={24} style={{ color: 'var(--color-success-50)' }} />
                    <h3 className="text-title-large">WCAG 2.2 AA</h3>
                  </div>
                  <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, listStyle: 'disc' }}>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      4.5:1 contrast ratio for text
                    </li>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      Focus indicators on all interactive elements
                    </li>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      Proper ARIA labels and roles
                    </li>
                    <li className="text-body-medium">
                      Keyboard navigation support
                    </li>
                  </ul>
                </div>
              </ModernCard>

              <ModernCard variant="outlined">
                <div style={{ padding: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                    <Star size={24} style={{ color: 'var(--color-primary)' }} />
                    <h3 className="text-title-large">Core Web Vitals</h3>
                  </div>
                  <ul style={{ paddingLeft: 'var(--space-4)', margin: 0, listStyle: 'disc' }}>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      INP target: ≤ 200ms (p75)
                    </li>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      Optimized for 60fps animations
                    </li>
                    <li className="text-body-medium" style={{ marginBottom: 'var(--space-1)' }}>
                      GPU-accelerated transforms
                    </li>
                    <li className="text-body-medium">
                      Reduced motion support
                    </li>
                  </ul>
                </div>
              </ModernCard>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <ModernNavigation 
          currentView={currentView}
          onViewChange={setCurrentView}
          isMobile={true}
        />
      </div>
    </div>
  );
});

ModernDesignDemo.displayName = 'ModernDesignDemo';

export default ModernDesignDemo;