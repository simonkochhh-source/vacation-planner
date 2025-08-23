import React, { useEffect } from 'react';
import { useMapEvents } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import { geocodingService } from '../../services/geocoding';
import { Coordinates } from '../../types';

interface MapClickHandlerProps {
  onLocationSelect: (location: string, coordinates: Coordinates) => void;
  isActive: boolean;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ 
  onLocationSelect, 
  isActive 
}) => {
  useMapEvents({
    click: async (e) => {
      if (!isActive) return;

      const coordinates: Coordinates = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
      };

      try {
        // Perform reverse geocoding to get the address
        const result = await geocodingService.reverseGeocode(coordinates);
        
        if (result) {
          onLocationSelect(result.displayName, coordinates);
        } else {
          // Fallback if reverse geocoding fails
          const fallbackLocation = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
          onLocationSelect(fallbackLocation, coordinates);
        }
      } catch (error) {
        console.error('Reverse geocoding failed:', error);
        // Fallback to coordinates
        const fallbackLocation = `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}`;
        onLocationSelect(fallbackLocation, coordinates);
      }
    }
  });

  // Show cursor change when active
  useEffect(() => {
    const map = document.querySelector('.leaflet-container') as HTMLElement;
    if (map) {
      map.style.cursor = isActive ? 'crosshair' : '';
    }

    return () => {
      if (map) {
        map.style.cursor = '';
      }
    };
  }, [isActive]);

  return null;
};

export default MapClickHandler;