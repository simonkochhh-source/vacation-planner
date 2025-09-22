/**
 * Responsive Typography Utilities
 * Provides mobile-optimized text sizes based on design review recommendations
 */

export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';

/**
 * Gets the appropriate CSS variable for text size based on device type
 * @param size - The text size variant
 * @param isMobile - Whether the device is mobile
 * @returns CSS variable string for font size
 */
export const getResponsiveTextSize = (size: TextSize, isMobile: boolean): string => {
  const prefix = isMobile ? 'var(--text-mobile-' : 'var(--text-';
  return `${prefix}${size})`;
};

/**
 * Typography utility object with responsive text sizes
 * Usage: textSizes.responsive('lg', isMobile)
 */
export const textSizes = {
  responsive: (size: TextSize, isMobile: boolean) => getResponsiveTextSize(size, isMobile),
  
  // Desktop sizes (fallback)
  desktop: {
    xs: 'var(--text-xs)',
    sm: 'var(--text-sm)', 
    base: 'var(--text-base)',
    lg: 'var(--text-lg)',
    xl: 'var(--text-xl)',
    '2xl': 'var(--text-2xl)',
    '3xl': 'var(--text-3xl)'
  },
  
  // Mobile sizes
  mobile: {
    xs: 'var(--text-mobile-xs)',
    sm: 'var(--text-mobile-sm)',
    base: 'var(--text-mobile-base)',
    lg: 'var(--text-mobile-lg)',
    xl: 'var(--text-mobile-xl)',
    '2xl': 'var(--text-mobile-2xl)',
    '3xl': 'var(--text-mobile-3xl)'
  }
};

/**
 * Responsive style generator for typography
 * @param size - Text size variant
 * @param isMobile - Whether device is mobile
 * @returns Style object with responsive font size
 */
export const getResponsiveTextStyle = (size: TextSize, isMobile: boolean) => ({
  fontSize: getResponsiveTextSize(size, isMobile)
});

/**
 * Get responsive line height for better readability
 * Mobile gets slightly increased line height for better touch interaction
 */
export const getResponsiveLineHeight = (isMobile: boolean): string => {
  return isMobile ? '1.65' : '1.6'; // Slightly more spacing on mobile
};

/**
 * Complete responsive text style with size and line height
 */
export const getResponsiveTextStyles = (size: TextSize, isMobile: boolean) => ({
  fontSize: getResponsiveTextSize(size, isMobile),
  lineHeight: getResponsiveLineHeight(isMobile)
});