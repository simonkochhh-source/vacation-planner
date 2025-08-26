import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, Search, Crosshair } from 'lucide-react';
import { Coordinates } from '../../types';
import { googleMapsService } from '../../services/googleMapsService';

interface GoogleMapPickerProps {
  coordinates?: Coordinates;
  onLocationSelect: (coordinates: Coordinates, address?: string) => void;
  onClose: () => void;
  isVisible: boolean;
  title?: string;
}

const GoogleMapPicker: React.FC<GoogleMapPickerProps> = ({
  coordinates,
  onLocationSelect,
  onClose,
  isVisible,
  title = 'Ort auf der Karte auswählen'
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Coordinates | null>(coordinates || null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  // Initialize Google Map
  const initializeMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      await googleMapsService.loadGoogleMapsAPI();
      
      if (!window.google || !window.google.maps) {
        console.warn('Google Maps API not available');
        return;
      }

      const center = coordinates || selectedLocation || { lat: 52.5200, lng: 13.4050 }; // Berlin default

      // Create map
      const map = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: coordinates || selectedLocation ? 15 : 6,
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      mapInstanceRef.current = map;
      geocoderRef.current = new window.google.maps.Geocoder();

      // Create marker
      const marker = new window.google.maps.Marker({
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP
      });

      markerRef.current = marker;

      // Set initial marker position if coordinates exist
      if (coordinates || selectedLocation) {
        const position = coordinates || selectedLocation!;
        marker.setPosition(position);
        marker.setVisible(true);
        
        // Get address for initial position
        reverseGeocode(position);
      }

      // Map click handler
      const handleMapClick = (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const clickedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          
          setSelectedLocation(clickedLocation);
          marker.setPosition(clickedLocation);
          marker.setVisible(true);
          
          // Get address for clicked location
          reverseGeocode(clickedLocation);
        }
      };
      
      map.addListener('click', handleMapClick);

      // Marker drag handler
      marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const draggedLocation = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          
          setSelectedLocation(draggedLocation);
          reverseGeocode(draggedLocation);
        }
      });

    } catch (error) {
      console.error('Failed to initialize Google Map:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordinates, selectedLocation]);

  // Reverse geocoding to get address from coordinates
  const reverseGeocode = useCallback(async (location: Coordinates) => {
    if (!geocoderRef.current) return;

    try {
      geocoderRef.current.geocode(
        { location: { lat: location.lat, lng: location.lng }, language: 'de' },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            setSelectedAddress(results[0].formatted_address);
          }
        }
      );
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  }, []);

  // Search for location
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    setIsLoadingLocation(true);
    try {
      const location = await googleMapsService.geocodeAddress(searchQuery);
      
      if (location) {
        setSelectedLocation(location);
        setSelectedAddress(searchQuery);
        
        // Update map center and marker
        mapInstanceRef.current.setCenter(location);
        mapInstanceRef.current.setZoom(15);
        
        if (markerRef.current) {
          markerRef.current.setPosition(location);
          markerRef.current.setVisible(true);
        }
        
        // Clear search after successful search
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, [searchQuery]);

  // Handle clicks on fallback map (when Google Maps is not available)
  const handleFallbackMapClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Only handle clicks if Google Maps is not loaded (fallback mode)
    if (mapInstanceRef.current) {
      return; // Let Google Maps handle the click
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convert click position to approximate coordinates
    // Center around Berlin (default) or provided coordinates
    const centerLat = coordinates?.lat || 52.5200;
    const centerLng = coordinates?.lng || 13.4050;
    
    // Simple conversion: map area represents roughly 0.1 degree in each direction
    const lng = centerLng + ((x - rect.width / 2) / rect.width) * 0.2;
    const lat = centerLat - ((y - rect.height / 2) / rect.height) * 0.2;
    
    const clickedLocation = { lat, lng };
    setSelectedLocation(clickedLocation);
    
    // Generate a mock address for the location
    const mockAddress = `Ausgewählter Standort (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    setSelectedAddress(mockAddress);
  }, [coordinates]);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation wird von diesem Browser nicht unterstützt');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        setSelectedLocation(location);
        setSelectedAddress(`Aktueller Standort (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})`);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(location);
          mapInstanceRef.current.setZoom(15);
          
          if (markerRef.current) {
            markerRef.current.setPosition(location);
            markerRef.current.setVisible(true);
          }
          
          // Use real reverse geocoding if available
          reverseGeocode(location);
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation failed:', error);
        alert('Standort konnte nicht ermittelt werden');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }, [reverseGeocode]);

  // Confirm location selection
  const handleConfirmLocation = useCallback(() => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation, selectedAddress);
      onClose();
    }
  }, [selectedLocation, selectedAddress, onLocationSelect, onClose]);

  // Initialize map when component becomes visible
  useEffect(() => {
    if (isVisible) {
      // Small delay to ensure DOM is ready, then try to initialize Google Maps
      const timer = setTimeout(async () => {
        await initializeMap();
        
        // If Google Maps failed to load after 2 seconds, we're in fallback mode
        setTimeout(() => {
          if (!mapInstanceRef.current) {
            console.info('Google Maps not available - using interactive mock map');
          }
        }, 2000);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, initializeMap]);

  // Handle Enter key in search
  const handleSearchKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90vw',
        maxWidth: '800px',
        height: '80vh',
        maxHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem',
              borderRadius: '4px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: 'white'
        }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <div style={{
              flex: 1,
              position: 'relative'
            }}>
              <Search 
                size={18} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6b7280'
                }}
              />
              <input
                type="text"
                placeholder="Adresse oder Ort suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isLoadingLocation}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                cursor: searchQuery.trim() && !isLoadingLocation ? 'pointer' : 'not-allowed',
                opacity: searchQuery.trim() && !isLoadingLocation ? 1 : 0.5,
                fontSize: '0.875rem',
                fontWeight: '500'
              }}
            >
              {isLoadingLocation ? 'Suche...' : 'Suchen'}
            </button>
            <button
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem',
                cursor: isLoadingLocation ? 'not-allowed' : 'pointer',
                opacity: isLoadingLocation ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Aktueller Standort"
            >
              <Crosshair size={16} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ 
          flex: 1, 
          position: 'relative',
          backgroundColor: '#f3f4f6'
        }}>
          <div
            ref={mapRef}
            onClick={handleFallbackMapClick}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '0',
              cursor: !mapInstanceRef.current ? 'crosshair' : 'default',
              background: !mapInstanceRef.current ? `
                linear-gradient(45deg, #f0f9ff 25%, transparent 25%), 
                linear-gradient(-45deg, #f0f9ff 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #f0f9ff 75%), 
                linear-gradient(-45deg, transparent 75%, #f0f9ff 75%)
              ` : 'transparent',
              backgroundSize: !mapInstanceRef.current ? '20px 20px' : 'auto',
              backgroundPosition: !mapInstanceRef.current ? '0 0, 0 10px, 10px -10px, -10px 0px' : 'auto'
            }}
          />
          
          {/* Fallback message and interactive mock map */}
          {!mapInstanceRef.current && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}>
              <div style={{
                textAlign: 'center',
                color: '#6b7280',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                maxWidth: '300px'
              }}>
                <MapPin size={32} style={{ margin: '0 auto 1rem', color: '#3b82f6' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500' }}>
                  Mock-Karte (Demo-Modus)<br />
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    Klicken Sie auf die Karte um einen Punkt zu setzen
                  </span>
                </p>
              </div>
            </div>
          )}
          
          {/* Show selected marker on fallback map */}
          {!mapInstanceRef.current && selectedLocation && (
            <div style={{
              position: 'absolute',
              left: `${50 + (selectedLocation.lng - (coordinates?.lng || 13.4050)) * 500}%`,
              top: `${50 - (selectedLocation.lat - (coordinates?.lat || 52.5200)) * 500}%`,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10
            }}>
              <MapPin size={24} style={{ color: '#dc2626', fill: '#dc2626' }} />
            </div>
          )}
        </div>

        {/* Selected Location Info */}
        {selectedLocation && (
          <div style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#f0f9ff',
            borderTop: '1px solid #e5e7eb'
          }}>
            <div style={{
              fontSize: '0.875rem',
              color: '#1e40af'
            }}>
              <strong>Ausgewählter Standort:</strong>
              {selectedAddress && (
                <div style={{ marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  📍 {selectedAddress}
                </div>
              )}
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
                Koordinaten: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.75rem',
          padding: '1.5rem',
          justifyContent: 'flex-end',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              color: '#6b7280',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
            style={{
              background: selectedLocation ? '#3b82f6' : '#9ca3af',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: selectedLocation ? 'pointer' : 'not-allowed'
            }}
          >
            Standort bestätigen
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapPicker;