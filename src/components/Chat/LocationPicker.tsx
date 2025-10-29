import React, { useState, useEffect } from 'react';
import { MapPin, X, ArrowUp, Loader, AlertCircle, Navigation } from 'lucide-react';

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface LocationData extends LocationCoordinates {
  address?: string;
  timestamp: number;
}

interface LocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSendLocation: (location: LocationData) => Promise<void>;
  disabled?: boolean;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  isOpen,
  onClose,
  onSendLocation,
  disabled = false
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [customLocation, setCustomLocation] = useState<LocationCoordinates | null>(null);
  const [address, setAddress] = useState<string>('');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'custom'>('current');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentLocation(null);
      setCustomLocation(null);
      setAddress('');
      setError(null);
      setActiveTab('current');
    }
  }, [isOpen]);

  // Get current location
  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation wird von diesem Browser nicht unterstützt');
      return;
    }

    setIsLoadingLocation(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      };

      setCurrentLocation(location);
      
      // Try to get address
      await getAddressFromCoordinates(location.latitude, location.longitude);

    } catch (error: any) {
      let errorMessage = 'Standort konnte nicht ermittelt werden';
      
      if (error.code === 1) {
        errorMessage = 'Standortzugriff wurde verweigert. Bitte erlauben Sie den Zugriff in den Browsereinstellungen.';
      } else if (error.code === 2) {
        errorMessage = 'Standort nicht verfügbar';
      } else if (error.code === 3) {
        errorMessage = 'Zeitüberschreitung beim Ermitteln des Standorts';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Get address from coordinates using Nominatim (OpenStreetMap)
  const getAddressFromCoordinates = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (error) {
      console.warn('Could not fetch address:', error);
      // Address fetching is optional, don't show error to user
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Handle sending current location
  const handleSendCurrentLocation = async () => {
    if (!currentLocation) return;

    try {
      const locationToSend: LocationData = {
        ...currentLocation,
        address: address || undefined
      };
      
      await onSendLocation(locationToSend);
      onClose();
    } catch (error) {
      console.error('Error sending location:', error);
      setError('Standort konnte nicht gesendet werden');
    }
  };

  // Handle custom location input
  const handleCustomLocationSubmit = async () => {
    if (!customLocation) return;

    try {
      const locationToSend: LocationData = {
        ...customLocation,
        timestamp: Date.now(),
        address: address || undefined
      };
      
      await onSendLocation(locationToSend);
      onClose();
    } catch (error) {
      console.error('Error sending custom location:', error);
      setError('Standort konnte nicht gesendet werden');
    }
  };

  // Parse coordinates from input
  const handleCoordinatesInput = (input: string) => {
    const coords = input.split(',').map(s => parseFloat(s.trim()));
    if (coords.length === 2 && !coords.some(isNaN)) {
      const [lat, lng] = coords;
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setCustomLocation({ latitude: lat, longitude: lng });
        getAddressFromCoordinates(lat, lng);
        setError(null);
        return;
      }
    }
    setCustomLocation(null);
    setAddress('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <MapPin style={{ color: '#2563eb', width: '20px', height: '20px' }} />
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827'
            }}>
              Standort teilen
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              border: 'none',
              background: '#f3f4f6',
              borderRadius: '8px',
              cursor: 'pointer',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          padding: '16px 24px 0'
        }}>
          <button
            onClick={() => setActiveTab('current')}
            style={{
              flex: 1,
              padding: '12px',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: `2px solid ${activeTab === 'current' ? '#2563eb' : 'transparent'}`,
              background: 'transparent',
              color: activeTab === 'current' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'current' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <Navigation size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Aktueller Standort
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            style={{
              flex: 1,
              padding: '12px',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: `2px solid ${activeTab === 'custom' ? '#2563eb' : 'transparent'}`,
              background: 'transparent',
              color: activeTab === 'custom' ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === 'custom' ? '600' : '400',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            <MapPin size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
            Koordinaten eingeben
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Error display */}
          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#dc2626'
            }}>
              <AlertCircle size={16} />
              <span style={{ fontSize: '14px' }}>{error}</span>
            </div>
          )}

          {/* Current Location Tab */}
          {activeTab === 'current' && (
            <div>
              {!currentLocation ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <p style={{
                    color: '#6b7280',
                    marginBottom: '20px',
                    fontSize: '14px'
                  }}>
                    Ihren aktuellen Standort ermitteln und teilen
                  </p>
                  <button
                    onClick={getCurrentLocation}
                    disabled={isLoadingLocation || disabled}
                    style={{
                      padding: '12px 24px',
                      background: isLoadingLocation ? '#e5e7eb' : '#2563eb',
                      color: isLoadingLocation ? '#9ca3af' : '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isLoadingLocation || disabled ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '0 auto'
                    }}
                  >
                    {isLoadingLocation ? (
                      <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Navigation size={16} />
                    )}
                    {isLoadingLocation ? 'Standort wird ermittelt...' : 'Standort ermitteln'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      <strong>Koordinaten:</strong> {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                    </div>
                    {currentLocation.accuracy && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        marginBottom: '8px'
                      }}>
                        Genauigkeit: ±{Math.round(currentLocation.accuracy)}m
                      </div>
                    )}
                    {isLoadingAddress ? (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Adresse wird geladen...
                      </div>
                    ) : address ? (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        <strong>Adresse:</strong> {address}
                      </div>
                    ) : null}
                  </div>
                  
                  <button
                    onClick={handleSendCurrentLocation}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: disabled ? '#e5e7eb' : '#2563eb',
                      color: disabled ? '#9ca3af' : '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowUp size={16} />
                    Standort senden
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Custom Location Tab */}
          {activeTab === 'custom' && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Koordinaten (Breite, Länge)
                </label>
                <input
                  type="text"
                  placeholder="z.B. 52.5200, 13.4050"
                  onChange={(e) => handleCoordinatesInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563eb';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                  }}
                />
                <p style={{
                  fontSize: '12px',
                  color: '#6b7280',
                  margin: '4px 0 0 0'
                }}>
                  Format: Breitengrad, Längengrad (z.B. Berlin: 52.5200, 13.4050)
                </p>
              </div>

              {customLocation && (
                <>
                  <div style={{
                    padding: '16px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      <strong>Koordinaten:</strong> {customLocation.latitude.toFixed(6)}, {customLocation.longitude.toFixed(6)}
                    </div>
                    {isLoadingAddress ? (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        Adresse wird geladen...
                      </div>
                    ) : address ? (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        <strong>Adresse:</strong> {address}
                      </div>
                    ) : null}
                  </div>

                  <button
                    onClick={handleCustomLocationSubmit}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: disabled ? '#e5e7eb' : '#2563eb',
                      color: disabled ? '#9ca3af' : '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <ArrowUp size={16} />
                    Standort senden
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationPicker;