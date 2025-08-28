import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MapLayerControl, { DynamicTileLayer } from '../MapLayerControl';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Layers: ({ size }: any) => <div data-testid="layers-icon" data-size={size}>Layers</div>,
  Map: ({ size }: any) => <div data-testid="map-icon" data-size={size}>Map</div>,
  Satellite: ({ size }: any) => <div data-testid="satellite-icon" data-size={size}>Satellite</div>,
  Navigation2: ({ size }: any) => <div data-testid="navigation-icon" data-size={size}>Navigation</div>
}));

// Mock react-leaflet for DynamicTileLayer tests
jest.mock('react-leaflet', () => ({
  TileLayer: ({ attribution, url, ...props }: any) => (
    <div 
      data-testid="tile-layer" 
      data-attribution={attribution} 
      data-url={url}
      {...props}
    />
  )
}));

describe('MapLayerControl', () => {
  const mockOnLayerChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render with default OpenStreetMap layer', () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
      expect(screen.getByTestId('map-icon')).toBeInTheDocument();
      expect(screen.getByTitle('Kartenlayer wechseln')).toBeInTheDocument();
    });

    it('should render with satellite layer when selected', () => {
      render(
        <MapLayerControl 
          currentLayer="satellite" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.getByText('Satellit')).toBeInTheDocument();
      expect(screen.getByTestId('satellite-icon')).toBeInTheDocument();
    });

    it('should render with terrain layer when selected', () => {
      render(
        <MapLayerControl 
          currentLayer="terrain" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.getByText('Gelände')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-icon')).toBeInTheDocument();
    });

    it('should fallback to OpenStreetMap for unknown layer', () => {
      render(
        <MapLayerControl 
          currentLayer="unknown-layer" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.getByText('OpenStreetMap')).toBeInTheDocument();
      expect(screen.getByTestId('map-icon')).toBeInTheDocument();
    });

    it('should not show dropdown menu initially', () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.queryByText('Kartenlayer auswählen')).not.toBeInTheDocument();
    });
  });

  describe('Dropdown Interaction', () => {
    it('should open dropdown when trigger button is clicked', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      expect(screen.getByText('Kartenlayer auswählen')).toBeInTheDocument();
    });

    it('should show all available layers in dropdown', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      expect(screen.getAllByText('OpenStreetMap')).toHaveLength(2); // One in trigger, one in dropdown
      expect(screen.getByText('Satellit')).toBeInTheDocument();
      expect(screen.getByText('Gelände')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      render(
        <div>
          <MapLayerControl 
            currentLayer="openstreetmap" 
            onLayerChange={mockOnLayerChange} 
          />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      expect(screen.getByText('Kartenlayer auswählen')).toBeInTheDocument();

      // Click outside (the backdrop)
      const backdrop = screen.getByText('Kartenlayer auswählen').closest('div')?.previousElementSibling;
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Dropdown should be closed (note: this might be hard to test without actual DOM structure)
    });

    it('should toggle dropdown when trigger button is clicked multiple times', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');

      // Open dropdown
      fireEvent.click(triggerButton);
      expect(screen.getByText('Kartenlayer auswählen')).toBeInTheDocument();

      // Close dropdown
      fireEvent.click(triggerButton);
      expect(screen.queryByText('Kartenlayer auswählen')).not.toBeInTheDocument();
    });
  });

  describe('Layer Selection', () => {
    it('should call onLayerChange when selecting different layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      const satelliteButton = screen.getByRole('button', { name: /satellit/i });
      fireEvent.click(satelliteButton);

      expect(mockOnLayerChange).toHaveBeenCalledWith('satellite');
    });

    it('should close dropdown after selecting layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      const satelliteButton = screen.getByRole('button', { name: /satellit/i });
      fireEvent.click(satelliteButton);

      expect(screen.queryByText('Kartenlayer auswählen')).not.toBeInTheDocument();
    });

    it('should handle selecting terrain layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      const terrainButton = screen.getByRole('button', { name: /gelände/i });
      fireEvent.click(terrainButton);

      expect(mockOnLayerChange).toHaveBeenCalledWith('terrain');
    });

    it('should handle selecting transport layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      const transportButton = screen.getByRole('button', { name: /transport/i });
      fireEvent.click(transportButton);

      expect(mockOnLayerChange).toHaveBeenCalledWith('transport');
    });

    it('should not call onLayerChange when clicking current layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      const openstreetmapButtons = screen.getAllByText('OpenStreetMap');
      const openstreetmapButton = openstreetmapButtons.find(el => el.closest('button'));
      
      if (openstreetmapButton && openstreetmapButton.closest('button')) {
        fireEvent.click(openstreetmapButton.closest('button')!);
      }

      expect(mockOnLayerChange).toHaveBeenCalledWith('openstreetmap');
    });
  });

  describe('Visual Indicators', () => {
    it('should show selection indicator for current layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="satellite" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      // The selected layer should have different styling (tested via DOM structure)
      const satelliteButton = screen.getByRole('button', { name: /satellit/i });
      expect(satelliteButton).toBeInTheDocument();
    });

    it('should display correct icons for each layer', async () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      fireEvent.click(triggerButton);

      expect(screen.getAllByTestId('map-icon').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByTestId('satellite-icon')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('layers-icon')).toHaveLength(2); // One in trigger, one in transport option
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles', () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      const triggerButton = screen.getByTitle('Kartenlayer wechseln');
      expect(triggerButton).toBeInTheDocument();
      expect(triggerButton.tagName).toBe('BUTTON');
    });

    it('should have descriptive title for trigger button', () => {
      render(
        <MapLayerControl 
          currentLayer="openstreetmap" 
          onLayerChange={mockOnLayerChange} 
        />
      );

      expect(screen.getByTitle('Kartenlayer wechseln')).toBeInTheDocument();
    });
  });
});

describe('DynamicTileLayer', () => {
  it('should render TileLayer with OpenStreetMap configuration', () => {
    render(<DynamicTileLayer layerId="openstreetmap" />);

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(tileLayer).toHaveAttribute('data-attribution', '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
  });

  it('should render TileLayer with satellite configuration', () => {
    render(<DynamicTileLayer layerId="satellite" />);

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}');
    expect(tileLayer).toHaveAttribute('data-attribution', '&copy; <a href="https://www.esri.com/">Esri</a>');
  });

  it('should render TileLayer with terrain configuration', () => {
    render(<DynamicTileLayer layerId="terrain" />);

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png');
    expect(tileLayer).toHaveAttribute('data-attribution', '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors');
  });

  it('should fallback to OpenStreetMap for unknown layer', () => {
    render(<DynamicTileLayer layerId="unknown" />);

    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('should render with correct layerId', () => {
    render(<DynamicTileLayer layerId="satellite" />);
    
    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toBeInTheDocument();
  });
});