import React, { useState } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { AppSettings, TransportMode, FuelType, Coordinates } from '../../types';
import OpenStreetMapAutocomplete from '../Forms/OpenStreetMapAutocomplete';
import { PlacePrediction } from '../../services/openStreetMapService';
import {
  Settings, Globe, Palette, MapPin, Car, Bell, Download,
  Shield, HardDrive, RotateCcw, AlertTriangle,
  Moon, Sun, Monitor, Languages, DollarSign, Clock, Home
} from 'lucide-react';

const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useSupabaseApp();
  const [activeTab, setActiveTab] = useState<'general' | 'map' | 'travel' | 'notifications' | 'export' | 'privacy' | 'backup'>('general');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    updateSettings({ [key]: value });
  };

  const resetToDefaults = () => {
    const defaultSettings: AppSettings = {
      // General Settings
      language: 'de',
      theme: 'auto',
      currency: 'EUR',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: '24h',
      
      // Map Settings
      defaultMapProvider: 'osm',
      defaultMapZoom: 10,
      showTraffic: false,
      showPublicTransport: true,
      
      // Travel Settings
      defaultTransportMode: TransportMode.DRIVING,
      fuelType: FuelType.E10,
      fuelConsumption: 9.0,
      
      // Notification Settings
      enableNotifications: true,
      reminderTime: 30,
      
      // Export Settings
      defaultExportFormat: 'json',
      includePhotosInExport: true,
      includeNotesInExport: true,
      
      // Privacy Settings
      shareLocation: false,
      trackVisitHistory: true,
      
      // Backup Settings
      autoBackup: true,
      backupInterval: 24
    };
    
    updateSettings(defaultSettings);
    setShowResetConfirm(false);
  };

  const tabs = [
    { id: 'general', label: 'Allgemein', icon: Settings },
    { id: 'map', label: 'Karte', icon: MapPin },
    { id: 'travel', label: 'Reise', icon: Car },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'privacy', label: 'Datenschutz', icon: Shield },
    { id: 'backup', label: 'Backup', icon: HardDrive }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Settings size={32} color="#3b82f6" />
        <div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            margin: 0,
            color: '#1f2937'
          }}>
            Einstellungen
          </h1>
          <p style={{ 
            color: '#6b7280',
            margin: '0.5rem 0 0 0',
            fontSize: '1rem'
          }}>
            Passen Sie die App nach Ihren Wünschen an
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '300px 1fr',
        gap: '2rem',
        minHeight: '600px'
      }}>
        {/* Sidebar Navigation */}
        <div style={{
          background: '#f9fafb',
          borderRadius: '12px',
          padding: '1.5rem',
          height: 'fit-content'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            margin: '0 0 1rem 0',
            color: '#374151'
          }}>
            Kategorien
          </h3>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeTab === id ? '#3b82f6' : 'transparent',
                  color: activeTab === id ? 'white' : '#374151',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: activeTab === id ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== id) {
                    e.currentTarget.style.background = '#e5e7eb';
                  }
                }}
                onMouseOut={(e) => {
                  if (activeTab !== id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </nav>

          <div style={{
            marginTop: '2rem',
            padding: '1rem 0',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid #dc2626',
                background: 'transparent',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '0.875rem',
                width: '100%'
              }}
            >
              <RotateCcw size={16} />
              Zurücksetzen
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          {activeTab === 'general' && (
            <GeneralSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'map' && (
            <MapSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'travel' && (
            <TravelSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'notifications' && (
            <NotificationSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'export' && (
            <ExportSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'privacy' && (
            <PrivacySettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'backup' && (
            <BackupSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
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
          zIndex: 1000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} color="#dc2626" />
              <h3 style={{ margin: 0, color: '#1f2937' }}>Einstellungen zurücksetzen</h3>
            </div>
            
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
              Sind Sie sicher, dass Sie alle Einstellungen auf die Standardwerte zurücksetzen möchten? 
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowResetConfirm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={resetToDefaults}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#dc2626',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Sections Components
const GeneralSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Allgemeine Einstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Language Setting */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Languages size={18} />
          Sprache
        </label>
        <select
          value={settings.language}
          onChange={(e) => onSettingChange('language', e.target.value as 'de' | 'en')}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
      </div>

      {/* Theme Setting */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Palette size={18} />
          Design
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { value: 'light', label: 'Hell', icon: Sun },
            { value: 'dark', label: 'Dunkel', icon: Moon },
            { value: 'auto', label: 'System', icon: Monitor }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onSettingChange('theme', value as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${settings.theme === value ? '#3b82f6' : '#e5e7eb'}`,
                background: settings.theme === value ? '#eff6ff' : 'white',
                color: settings.theme === value ? '#3b82f6' : '#374151',
                cursor: 'pointer'
              }}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Currency Setting */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <DollarSign size={18} />
          Währung
        </label>
        <select
          value={settings.currency}
          onChange={(e) => onSettingChange('currency', e.target.value)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value="EUR">Euro (EUR)</option>
          <option value="USD">US Dollar (USD)</option>
          <option value="GBP">Britisches Pfund (GBP)</option>
          <option value="CHF">Schweizer Franken (CHF)</option>
        </select>
      </div>

      {/* Date Format Setting */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Clock size={18} />
          Datumsformat
        </label>
        <select
          value={settings.dateFormat}
          onChange={(e) => onSettingChange('dateFormat', e.target.value as any)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value="dd.MM.yyyy">DD.MM.YYYY (31.12.2023)</option>
          <option value="MM/dd/yyyy">MM/DD/YYYY (12/31/2023)</option>
          <option value="yyyy-MM-dd">YYYY-MM-DD (2023-12-31)</option>
        </select>
      </div>

      {/* Time Format Setting */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Clock size={18} />
          Zeitformat
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {[
            { value: '24h', label: '24 Stunden (14:30)' },
            { value: '12h', label: '12 Stunden (2:30 PM)' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onSettingChange('timeFormat', value as any)}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: `2px solid ${settings.timeFormat === value ? '#3b82f6' : '#e5e7eb'}`,
                background: settings.timeFormat === value ? '#eff6ff' : 'white',
                color: settings.timeFormat === value ? '#3b82f6' : '#374151',
                cursor: 'pointer'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const MapSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Karteneinstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Map Provider */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Globe size={18} />
          Kartenanbieter
        </label>
        <select
          value={settings.defaultMapProvider}
          onChange={(e) => onSettingChange('defaultMapProvider', e.target.value as any)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value="osm">OpenStreetMap</option>
          <option value="google">Google Maps</option>
          <option value="mapbox">Mapbox</option>
        </select>
      </div>

      {/* Default Zoom */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Standard-Zoom: {settings.defaultMapZoom}
        </label>
        <input
          type="range"
          min="5"
          max="18"
          value={settings.defaultMapZoom}
          onChange={(e) => onSettingChange('defaultMapZoom', parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* Map Features */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem', color: '#374151' }}>
          Kartenfeatures
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.showTraffic}
              onChange={(e) => onSettingChange('showTraffic', e.target.checked)}
            />
            Verkehrsinformationen anzeigen
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.showPublicTransport}
              onChange={(e) => onSettingChange('showPublicTransport', e.target.checked)}
            />
            Öffentliche Verkehrsmittel anzeigen
          </label>
        </div>
      </div>
    </div>
  </div>
);

const TravelSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Reiseeinstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Default Transport Mode */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          <Car size={18} />
          Standard-Transportmittel
        </label>
        <select
          value={settings.defaultTransportMode}
          onChange={(e) => onSettingChange('defaultTransportMode', e.target.value as TransportMode)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value={TransportMode.WALKING}>Zu Fuß</option>
          <option value={TransportMode.DRIVING}>Auto</option>
          <option value={TransportMode.PUBLIC_TRANSPORT}>Öffentliche Verkehrsmittel</option>
          <option value={TransportMode.BICYCLE}>Fahrrad</option>
          <option value={TransportMode.FLIGHT}>Flugzeug</option>
          <option value={TransportMode.TRAIN}>Zug</option>
        </select>
      </div>

      {/* Fuel Type */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Kraftstoffart
        </label>
        <select
          value={settings.fuelType}
          onChange={(e) => onSettingChange('fuelType', e.target.value as FuelType)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value={FuelType.DIESEL}>Diesel</option>
          <option value={FuelType.E5}>Super E5</option>
          <option value={FuelType.E10}>Super E10</option>
        </select>
      </div>

      {/* Fuel Consumption */}
      <div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151'
        }}>
          Kraftstoffverbrauch (L/100km)
        </label>
        <input
          type="number"
          value={settings.fuelConsumption}
          onChange={(e) => onSettingChange('fuelConsumption', parseFloat(e.target.value) || 0)}
          min="1"
          max="30"
          step="0.1"
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        />
      </div>

      {/* Home Point Configuration */}
      <div style={{
        borderTop: '1px solid #e5e7eb',
        paddingTop: '1.5rem',
        marginTop: '1.5rem'
      }}>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '1rem',
          color: '#374151'
        }}>
          <Home size={18} />
          Home-Point (Zuhause)
        </label>
        
        {settings.homePoint ? (
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#166534' }}>
                  {settings.homePoint.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#16a34a' }}>
                  {settings.homePoint.address}
                </div>
              </div>
              <button
                onClick={() => onSettingChange('homePoint', undefined)}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Entfernen
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
              📍 {settings.homePoint.coordinates.lat.toFixed(4)}, {settings.homePoint.coordinates.lng.toFixed(4)}
            </div>
          </div>
        ) : (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            ℹ️ Kein Home-Point konfiguriert. Definieren Sie Ihren Wohnort für eine einfachere Zielauswahl.
          </div>
        )}

        <HomePointConfigurator 
          currentHomePoint={settings.homePoint}
          onHomePointChange={(homePoint) => onSettingChange('homePoint', homePoint)}
        />
      </div>
    </div>
  </div>
);

const NotificationSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Benachrichtigungseinstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={settings.enableNotifications}
          onChange={(e) => onSettingChange('enableNotifications', e.target.checked)}
        />
        Benachrichtigungen aktivieren
      </label>
      
      {settings.enableNotifications && (
        <div>
          <label style={{ 
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#374151',
            display: 'block'
          }}>
            Erinnerungszeit (Minuten vor Termin)
          </label>
          <input
            type="number"
            value={settings.reminderTime}
            onChange={(e) => onSettingChange('reminderTime', parseInt(e.target.value) || 0)}
            min="0"
            max="120"
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: 'white',
              minWidth: '200px'
            }}
          />
        </div>
      )}
    </div>
  </div>
);

const ExportSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Export-Einstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Default Export Format */}
      <div>
        <label style={{ 
          fontSize: '1rem',
          fontWeight: '500',
          marginBottom: '0.5rem',
          color: '#374151',
          display: 'block'
        }}>
          Standard-Exportformat
        </label>
        <select
          value={settings.defaultExportFormat}
          onChange={(e) => onSettingChange('defaultExportFormat', e.target.value as any)}
          style={{
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white',
            minWidth: '200px'
          }}
        >
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="gpx">GPX</option>
          <option value="kml">KML</option>
        </select>
      </div>

      {/* Export Options */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem', color: '#374151' }}>
          Export-Optionen
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.includePhotosInExport}
              onChange={(e) => onSettingChange('includePhotosInExport', e.target.checked)}
            />
            Fotos in Export einschließen
          </label>
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={settings.includeNotesInExport}
              onChange={(e) => onSettingChange('includeNotesInExport', e.target.checked)}
            />
            Notizen in Export einschließen
          </label>
        </div>
      </div>
    </div>
  </div>
);

const PrivacySettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Datenschutzeinstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={settings.shareLocation}
          onChange={(e) => onSettingChange('shareLocation', e.target.checked)}
        />
        Standort teilen
      </label>
      
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={settings.trackVisitHistory}
          onChange={(e) => onSettingChange('trackVisitHistory', e.target.checked)}
        />
        Besuchshistorie verfolgen
      </label>
    </div>
  </div>
);

const BackupSettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: '#1f2937' }}>
      Backup-Einstellungen
    </h2>
    
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input
          type="checkbox"
          checked={settings.autoBackup}
          onChange={(e) => onSettingChange('autoBackup', e.target.checked)}
        />
        Automatische Backups aktivieren
      </label>
      
      {settings.autoBackup && (
        <div>
          <label style={{ 
            fontSize: '1rem',
            fontWeight: '500',
            marginBottom: '0.5rem',
            color: '#374151',
            display: 'block'
          }}>
            Backup-Intervall (Stunden)
          </label>
          <input
            type="number"
            value={settings.backupInterval}
            onChange={(e) => onSettingChange('backupInterval', parseInt(e.target.value) || 1)}
            min="1"
            max="168"
            style={{
              padding: '0.5rem',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: 'white',
              minWidth: '200px'
            }}
          />
        </div>
      )}
    </div>
  </div>
);

// Home Point Configurator Component
const HomePointConfigurator: React.FC<{
  currentHomePoint?: { name: string; address: string; coordinates: Coordinates };
  onHomePointChange: (homePoint?: { name: string; address: string; coordinates: Coordinates }) => void;
}> = ({ currentHomePoint, onHomePointChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [homePointForm, setHomePointForm] = useState({
    name: currentHomePoint?.name || '',
    address: currentHomePoint?.address || '',
    coordinates: currentHomePoint?.coordinates
  });

  const handlePlaceSelect = (place: PlacePrediction) => {
    setHomePointForm({
      name: place.structured_formatting?.main_text || place.display_name,
      address: place.display_name,
      coordinates: place.coordinates
    });
  };

  const handleSave = () => {
    if (homePointForm.name && homePointForm.address && homePointForm.coordinates) {
      onHomePointChange({
        name: homePointForm.name,
        address: homePointForm.address,
        coordinates: homePointForm.coordinates
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setHomePointForm({
      name: currentHomePoint?.name || '',
      address: currentHomePoint?.address || '',
      coordinates: currentHomePoint?.coordinates
    });
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        style={{
          background: currentHomePoint ? '#f3f4f6' : '#3b82f6',
          color: currentHomePoint ? '#374151' : 'white',
          border: currentHomePoint ? '1px solid #d1d5db' : 'none',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}
      >
        <Home size={16} />
        {currentHomePoint ? 'Home-Point ändern' : 'Home-Point definieren'}
      </button>
    );
  }

  return (
    <div style={{
      background: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '1rem'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>
        Home-Point {currentHomePoint ? 'bearbeiten' : 'definieren'}
      </h4>
      
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          Name (z.B. "Zuhause", "Wohnung")
        </label>
        <input
          type="text"
          value={homePointForm.name}
          onChange={(e) => setHomePointForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Zuhause"
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            background: 'white'
          }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '0.5rem'
        }}>
          Adresse oder Ort suchen
        </label>
        <OpenStreetMapAutocomplete
          value={homePointForm.address}
          onChange={(value) => setHomePointForm(prev => ({ ...prev, address: value }))}
          onPlaceSelect={handlePlaceSelect}
          placeholder="Suche nach Ihrer Adresse..."
          style={{ width: '100%' }}
        />
      </div>

      {homePointForm.coordinates && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #d1fae5',
          borderRadius: '6px',
          padding: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.75rem',
          color: '#065f46'
        }}>
          📍 Koordinaten: {homePointForm.coordinates.lat.toFixed(4)}, {homePointForm.coordinates.lng.toFixed(4)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleCancel}
          style={{
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: 'pointer'
          }}
        >
          Abbrechen
        </button>
        <button
          onClick={handleSave}
          disabled={!homePointForm.name || !homePointForm.address || !homePointForm.coordinates}
          style={{
            background: (!homePointForm.name || !homePointForm.address || !homePointForm.coordinates) 
              ? '#9ca3af' : '#16a34a',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: (!homePointForm.name || !homePointForm.address || !homePointForm.coordinates) 
              ? 'not-allowed' : 'pointer'
          }}
        >
          Speichern
        </button>
      </div>
    </div>
  );
};

export default SettingsView;