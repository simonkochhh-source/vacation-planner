import React, { useState } from 'react';
import { MapPin, Navigation, Copy, Check } from 'lucide-react';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  address?: string;
  timestamp: number;
}

interface LocationMessageProps {
  location: LocationData;
  isOwnMessage?: boolean;
  senderName?: string;
}

const LocationMessage: React.FC<LocationMessageProps> = ({
  location,
  isOwnMessage = false,
  senderName
}) => {
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  // Static map URL using OpenStreetMap tiles via MapTiler or similar service
  const getStaticMapUrl = (lat: number, lng: number, zoom: number = 15, width: number = 300, height: number = 200) => {
    // Using a static map service that doesn't require API key
    // Alternative: Use MapTiler, Mapbox, or Google Maps with proper API key
    return `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
  };


  // Copy coordinates to clipboard
  const copyCoordinates = async () => {
    try {
      const coords = `${location.latitude}, ${location.longitude}`;
      await navigator.clipboard.writeText(coords);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy coordinates:', error);
    }
  };

  // Open in maps app
  const openInMaps = () => {
    const coords = `${location.latitude},${location.longitude}`;
    
    // Try to detect user's device/browser
    const userAgent = navigator.userAgent;
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      // iOS - try Apple Maps first, fallback to Google Maps
      window.open(`maps://maps.apple.com/?q=${coords}`, '_blank') || 
      window.open(`https://maps.google.com/maps?q=${coords}`, '_blank');
    } else if (/Android/.test(userAgent)) {
      // Android - use Google Maps
      window.open(`geo:${coords}?q=${coords}`, '_blank') ||
      window.open(`https://maps.google.com/maps?q=${coords}`, '_blank');
    } else {
      // Desktop/Other - use Google Maps web
      window.open(`https://maps.google.com/maps?q=${coords}`, '_blank');
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Gerade eben';
    } else if (diffInMinutes < 60) {
      return `vor ${diffInMinutes}min`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `vor ${hours}h`;
    } else {
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div style={{
      maxWidth: '300px',
      background: isOwnMessage ? '#dbeafe' : '#ffffff',
      border: `1px solid ${isOwnMessage ? '#bfdbfe' : '#e5e7eb'}`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
        background: isOwnMessage ? '#eff6ff' : '#f8fafc'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px'
        }}>
          <MapPin style={{
            width: '16px',
            height: '16px',
            color: '#2563eb'
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#111827'
          }}>
            {isOwnMessage ? 'Mein Standort' : `${senderName || 'Standort'}`}
          </span>
        </div>
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{formatTimestamp(location.timestamp)}</span>
          {location.accuracy && (
            <span>• ±{Math.round(location.accuracy)}m</span>
          )}
        </div>
      </div>

      {/* Map Preview */}
      <div style={{
        position: 'relative',
        height: '160px',
        background: '#f3f4f6'
      }}>
        {!imageError ? (
          <iframe
            src={getStaticMapUrl(location.latitude, location.longitude)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none'
            }}
            onLoad={() => setImageError(false)}
            onError={() => setImageError(true)}
            title="Standort Karte"
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            <MapPin size={32} style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '14px', textAlign: 'center' }}>
              Karte nicht verfügbar
            </div>
          </div>
        )}
        
        {/* Overlay with coordinates */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#ffffff',
          padding: '6px 8px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace',
          textAlign: 'center'
        }}>
          {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
        </div>
      </div>

      {/* Address/Location Info */}
      {location.address && (
        <div style={{
          padding: '12px 16px',
          fontSize: '13px',
          color: '#374151',
          lineHeight: '1.4',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {location.address}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: '8px'
      }}>
        <button
          onClick={openInMaps}
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#2563eb';
          }}
        >
          <Navigation size={12} />
          Route
        </button>
        
        <button
          onClick={copyCoordinates}
          style={{
            padding: '8px 12px',
            background: copied ? '#10b981' : '#f3f4f6',
            color: copied ? '#ffffff' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            minWidth: '80px'
          }}
        >
          {copied ? (
            <>
              <Check size={12} />
              Kopiert
            </>
          ) : (
            <>
              <Copy size={12} />
              Kopieren
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LocationMessage;