import { useEffect } from 'react';
import { useUIContext } from '../contexts/UIContext';

export const useTheme = () => {
  const { settings, updateSettings } = useUIContext();

  useEffect(() => {
    const applyTheme = (theme: 'light' | 'dark' | 'auto') => {
      console.log('🎨 Theme: Applying theme:', theme);
      console.log('🎨 Theme: Current HTML element:', document.documentElement);
      
      // Remove existing theme classes
      document.documentElement.removeAttribute('data-theme');
      
      // Apply new theme
      if (theme !== 'auto') {
        document.documentElement.setAttribute('data-theme', theme);
        console.log('🎨 Theme: Set data-theme attribute to:', theme);
        console.log('🎨 Theme: HTML data-theme value:', document.documentElement.getAttribute('data-theme'));
      } else {
        // For auto theme, let CSS media queries handle it
        document.documentElement.setAttribute('data-theme', 'auto');
        console.log('🎨 Theme: Set data-theme to auto, current system preference:', 
                   window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      }
      
      // Debug: Check computed styles
      const computedStyles = window.getComputedStyle(document.documentElement);
      console.log('🎨 Theme: Computed background color:', computedStyles.getPropertyValue('--color-background'));
      console.log('🎨 Theme: Computed text color:', computedStyles.getPropertyValue('--color-text-primary'));
    };

    // Apply current theme
    applyTheme(settings.theme);
  }, [settings.theme]);

  const setTheme = (theme: 'light' | 'dark' | 'auto') => {
    updateSettings({ theme });
  };

  return {
    currentTheme: settings.theme,
    setTheme,
    isDark: settings.theme === 'dark' || 
           (settings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  };
};