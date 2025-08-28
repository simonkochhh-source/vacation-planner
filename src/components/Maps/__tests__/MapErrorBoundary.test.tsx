import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// No need to import userEvent
import MapErrorBoundary from '../MapErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div data-testid="working-component">Component working</div>;
};

// Mock console methods to avoid noise in test output
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: jest.fn()
  },
  writable: true
});

describe('MapErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={false} />
        </MapErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Component working')).toBeInTheDocument();
    });

    it('should not display error UI when children render successfully', () => {
      render(
        <MapErrorBoundary>
          <div>Normal content</div>
        </MapErrorBoundary>
      );

      expect(screen.queryByText('Karte konnte nicht geladen werden')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /seite neu laden/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display default error UI when child component throws error', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Karte konnte nicht geladen werden')).toBeInTheDocument();
      expect(screen.getByText(/Es ist ein Fehler beim Laden der interaktiven Karte aufgetreten/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /seite neu laden/i })).toBeInTheDocument();
    });

    it('should display map emoji in error UI', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('🗺️')).toBeInTheDocument();
    });

    it('should log error to console when error is caught', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(console.warn).toHaveBeenCalledWith(
        'Map Error Boundary caught error:',
        expect.any(Error)
      );
      expect(console.error).toHaveBeenCalledWith(
        'Map Error Boundary caught error:',
        expect.any(Error),
        expect.any(Object)
      );
    });

    it('should reload page when reload button is clicked', async () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /seite neu laden/i });
      fireEvent.click(reloadButton);

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Fallback', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <MapErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      
      // Should not show default error UI
      expect(screen.queryByText('Karte konnte nicht geladen werden')).not.toBeInTheDocument();
    });

    it('should not render custom fallback when no error occurs', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;

      render(
        <MapErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={false} />
        </MapErrorBoundary>
      );

      expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('working-component')).toBeInTheDocument();
    });
  });

  describe('Error UI Styling', () => {
    it('should apply correct styling to error container', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const errorContainer = screen.getByText('Karte konnte nicht geladen werden').closest('div');
      
      expect(errorContainer).toHaveStyle({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px'
      });
    });

    it('should apply correct styling to reload button', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /seite neu laden/i });
      
      expect(reloadButton).toHaveStyle({
        color: 'white',
        cursor: 'pointer'
      });
    });
  });

  describe('Multiple Errors', () => {
    it('should maintain error state after initial error', () => {
      const { rerender } = render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Karte konnte nicht geladen werden')).toBeInTheDocument();

      // Rerender with non-throwing component
      rerender(
        <MapErrorBoundary>
          <ThrowError shouldThrow={false} />
        </MapErrorBoundary>
      );

      // Should still show error UI (error boundaries don't reset automatically)
      expect(screen.getByText('Karte konnte nicht geladen werden')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role for reload button', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      const reloadButton = screen.getByRole('button', { name: /seite neu laden/i });
      expect(reloadButton).toBeInTheDocument();
      expect(reloadButton.tagName).toBe('BUTTON');
    });

    it('should have readable text content', () => {
      render(
        <MapErrorBoundary>
          <ThrowError shouldThrow={true} />
        </MapErrorBoundary>
      );

      expect(screen.getByText('Karte konnte nicht geladen werden')).toBeInTheDocument();
      expect(screen.getByText(/Es ist ein Fehler beim Laden der interaktiven Karte aufgetreten/)).toBeInTheDocument();
      expect(screen.getByText(/Versuchen Sie, die Seite neu zu laden/)).toBeInTheDocument();
    });
  });
});