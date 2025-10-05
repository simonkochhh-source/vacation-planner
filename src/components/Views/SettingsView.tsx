import React, { useState } from 'react';
import { useUIContext } from '../../contexts/UIContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResponsive } from '../../hooks/useResponsive';
import { AppSettings, TransportMode, FuelType, Coordinates } from '../../types';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import { enhancedOpenStreetMapService } from '../../services/enhancedOpenStreetMapService';
import UserProfileManager from '../User/UserProfileManager';
import {
  Settings, Globe, Palette, MapPin, Car,
  Shield, HardDrive, RotateCcw, AlertTriangle,
  Moon, Sun, Monitor, Languages, DollarSign, Clock, Home, User, Power
} from 'lucide-react';

// Mobile Components need to be defined before SettingsView

// Mobile settings content renderer
const renderMobileSettingsContent = (
  activeTab: string,
  settings: AppSettings,
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void,
  user: any,
  signOut: () => void,
  showResetConfirm: boolean,
  setShowResetConfirm: (show: boolean) => void,
  resetToDefaults: () => void
) => {
  const mobileStyle = {
    input: {
      width: '100%',
      padding: '0.875rem',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      background: 'var(--color-background)',
      fontSize: '1rem',
      minHeight: '48px',
      color: 'var(--color-text-primary)'
    },
    select: {
      width: '100%',
      padding: '0.875rem',
      borderRadius: '8px',
      border: '1px solid var(--color-border)',
      background: 'var(--color-background)',
      fontSize: '1rem',
      minHeight: '48px',
      color: 'var(--color-text-primary)'
    },
    label: {
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: '0.75rem',
      fontSize: '1rem',
      fontWeight: '500',
      marginBottom: '0.75rem',
      color: 'var(--color-text-primary)'
    },
    section: {
      display: 'flex' as const,
      flexDirection: 'column' as const,
      gap: '1.5rem'
    },
    buttonGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '0.75rem'
    },
    button: {
      padding: '0.875rem',
      borderRadius: '8px',
      border: '2px solid var(--color-border)',
      background: 'var(--color-background)',
      color: 'var(--color-text-primary)',
      cursor: 'pointer' as const,
      fontSize: '0.875rem',
      fontWeight: '500',
      minHeight: '48px',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: '0.5rem',
      transition: 'all 0.2s'
    }
  };

  switch (activeTab) {
    case 'account':
      return (
        <div style={mobileStyle.section}>
          {/* User Info Card */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary-sage) 0%, var(--color-secondary-forest) 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'white'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {user?.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Avatar"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.3)'
                  }}
                />
              ) : (
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(255, 255, 255, 0.3)'
                }}>
                  <User size={24} />
                </div>
              )}
              <div>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  margin: '0 0 0.25rem 0'
                }}>
                  {user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Benutzer'}
                </h3>
                {user?.email && (
                  <p style={{
                    margin: 0,
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.875rem'
                  }}>
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', textTransform: 'uppercase' }}>
                  Angemeldet seit
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: 'white', fontSize: '0.875rem' }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}
                </p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.9)', textTransform: 'uppercase' }}>
                  Provider
                </p>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: '600', color: 'white', fontSize: '0.875rem' }}>
                  {user?.app_metadata?.provider === 'google' ? 'Google' : user?.app_metadata?.provider || 'E-Mail'}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={signOut}
            style={{
              background: 'var(--color-error)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              width: '100%',
              minHeight: '48px'
            }}
          >
            <Power size={18} />
            Abmelden
          </button>
        </div>
      );

    case 'general':
      return (
        <div style={mobileStyle.section}>
          {/* Language Setting */}
          <div>
            <label style={mobileStyle.label}>
              <Languages size={18} />
              Sprache
            </label>
            <select
              value={settings.language}
              onChange={(e) => onSettingChange('language', e.target.value as 'de' | 'en')}
              style={mobileStyle.select}
            >
              <option value="de">Deutsch</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Theme Setting */}
          <div>
            <label style={mobileStyle.label}>
              <Palette size={18} />
              Design
            </label>
            <div style={mobileStyle.buttonGrid}>
              {[
                { value: 'light', label: 'Hell', icon: Sun },
                { value: 'dark', label: 'Dunkel', icon: Moon },
                { value: 'auto', label: 'System', icon: Monitor }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => onSettingChange('theme', value as any)}
                  style={{
                    ...mobileStyle.button,
                    border: `2px solid ${settings.theme === value ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                    background: settings.theme === value ? 'var(--color-primary-ocean)' : 'var(--color-background)',
                    color: settings.theme === value ? 'white' : 'var(--color-text-primary)'
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
            <label style={mobileStyle.label}>
              <DollarSign size={18} />
              Währung
            </label>
            <select
              value={settings.currency}
              onChange={(e) => onSettingChange('currency', e.target.value)}
              style={mobileStyle.select}
            >
              <option value="EUR">Euro (EUR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="GBP">Britisches Pfund (GBP)</option>
              <option value="CHF">Schweizer Franken (CHF)</option>
            </select>
          </div>

          {/* Time Format Setting */}
          <div>
            <label style={mobileStyle.label}>
              <Clock size={18} />
              Zeitformat
            </label>
            <div style={mobileStyle.buttonGrid}>
              {[
                { value: '24h', label: '24h (14:30)' },
                { value: '12h', label: '12h (2:30 PM)' }
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onSettingChange('timeFormat', value as any)}
                  style={{
                    ...mobileStyle.button,
                    border: `2px solid ${settings.timeFormat === value ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                    background: settings.timeFormat === value ? 'var(--color-primary-ocean)' : 'var(--color-background)',
                    color: settings.timeFormat === value ? 'white' : 'var(--color-text-primary)'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'map':
      return (
        <div style={mobileStyle.section}>
          {/* Map Provider */}
          <div>
            <label style={mobileStyle.label}>
              <Globe size={18} />
              Kartenanbieter
            </label>
            <select
              value={settings.defaultMapProvider}
              onChange={(e) => onSettingChange('defaultMapProvider', e.target.value as any)}
              style={mobileStyle.select}
            >
              <option value="osm">OpenStreetMap</option>
              <option value="google">Google Maps</option>
              <option value="mapbox">Mapbox</option>
            </select>
          </div>

          {/* Default Zoom */}
          <div>
            <label style={mobileStyle.label}>
              <MapPin size={18} />
              Standard-Zoom: {settings.defaultMapZoom}
            </label>
            <input
              type="range"
              min="5"
              max="18"
              value={settings.defaultMapZoom}
              onChange={(e) => onSettingChange('defaultMapZoom', parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '48px',
                background: 'var(--color-surface)',
                borderRadius: '8px',
                appearance: 'none',
                outline: 'none',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Map Features */}
          <div>
            <label style={mobileStyle.label}>
              <Settings size={18} />
              Kartenfeatures
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.showTraffic}
                  onChange={(e) => onSettingChange('showTraffic', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                Verkehrsinformationen anzeigen
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.showPublicTransport}
                  onChange={(e) => onSettingChange('showPublicTransport', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                Öffentliche Verkehrsmittel anzeigen
              </label>
            </div>
          </div>
        </div>
      );

    case 'travel':
      return (
        <div style={mobileStyle.section}>
          {/* Default Transport Mode */}
          <div>
            <label style={mobileStyle.label}>
              <Car size={18} />
              Standard-Transportmittel
            </label>
            <select
              value={settings.defaultTransportMode}
              onChange={(e) => onSettingChange('defaultTransportMode', e.target.value as any)}
              style={mobileStyle.select}
            >
              <option value="WALKING">Zu Fuß</option>
              <option value="DRIVING">Auto</option>
              <option value="PUBLIC_TRANSPORT">Öffentliche Verkehrsmittel</option>
              <option value="BICYCLE">Fahrrad</option>
              <option value="FLIGHT">Flugzeug</option>
              <option value="TRAIN">Zug</option>
            </select>
          </div>

          {/* Fuel Type */}
          <div>
            <label style={mobileStyle.label}>
              <DollarSign size={18} />
              Kraftstoffart
            </label>
            <select
              value={settings.fuelType}
              onChange={(e) => onSettingChange('fuelType', e.target.value as any)}
              style={mobileStyle.select}
            >
              <option value="DIESEL">Diesel</option>
              <option value="E5">Super E5</option>
              <option value="E10">Super E10</option>
            </select>
          </div>

          {/* Fuel Consumption */}
          <div>
            <label style={mobileStyle.label}>
              <Car size={18} />
              Kraftstoffverbrauch (L/100km)
            </label>
            <input
              type="number"
              value={settings.fuelConsumption}
              onChange={(e) => onSettingChange('fuelConsumption', parseFloat(e.target.value) || 0)}
              min="1"
              max="30"
              step="0.1"
              style={mobileStyle.input}
              placeholder="9.0"
            />
          </div>

          {/* Home Point Status */}
          <div>
            <label style={mobileStyle.label}>
              <Home size={18} />
              Home-Point
            </label>
            {settings.homePoint ? (
              <div style={{
                background: 'rgba(139, 195, 143, 0.2)',
                border: '2px solid var(--color-success)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--color-text-primary)'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  {settings.homePoint.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                  {settings.homePoint.address}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  📍 {settings.homePoint.coordinates.lat.toFixed(4)}, {settings.homePoint.coordinates.lng.toFixed(4)}
                </div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(204, 139, 101, 0.2)',
                border: '2px solid var(--color-warning)',
                borderRadius: '8px',
                padding: '1rem',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem'
              }}>
                ℹ️ Kein Home-Point konfiguriert
              </div>
            )}
          </div>
        </div>
      );



    case 'privacy':
      return (
        <div style={mobileStyle.section}>
          {/* Privacy Settings */}
          <div>
            <label style={mobileStyle.label}>
              <Shield size={18} />
              Datenschutzeinstellungen
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.shareLocation}
                  onChange={(e) => onSettingChange('shareLocation', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                Standort teilen
              </label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.trackVisitHistory}
                  onChange={(e) => onSettingChange('trackVisitHistory', e.target.checked)}
                  style={{ width: '20px', height: '20px' }}
                />
                Besuchshistorie verfolgen
              </label>
            </div>
          </div>
        </div>
      );


    default:
      return <div>Einstellungen für {activeTab} werden noch entwickelt...</div>;
  }
};

// First, define the mobile settings list component
const MobileSettingsList: React.FC<{
  setActiveTab: (tab: 'list' | 'account' | 'general' | 'map' | 'travel' | 'privacy') => void;
}> = ({ setActiveTab }) => {
  const tabs = [
    { id: 'account', label: 'Account', icon: User, description: 'Profile und Anmeldung' },
    { id: 'general', label: 'Allgemein', icon: Settings, description: 'Sprache, Design, Währung' },
    { id: 'map', label: 'Karte', icon: MapPin, description: 'Kartenanbieter, Zoom, Features' },
    { id: 'travel', label: 'Reise', icon: Car, description: 'Transport, Kraftstoff, Home-Point' },
    { id: 'privacy', label: 'Datenschutz', icon: Shield, description: 'Standort und Tracking' }
  ];

  return (
    <div style={{
      background: 'var(--color-background)',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '0 0.5rem'
      }}>
        <Settings size={28} style={{ color: 'var(--color-primary-ocean)' }} />
        <div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '600', 
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            Einstellungen
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)',
            margin: '0.25rem 0 0 0',
            fontSize: '0.875rem'
          }}>
            App-Konfiguration
          </p>
        </div>
      </div>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {tabs.map(({ id, label, icon: Icon, description }, index) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              border: 'none',
              background: 'transparent',
              textAlign: 'left',
              cursor: 'pointer',
              borderBottom: index < tabs.length - 1 ? '1px solid var(--color-border)' : 'none',
              minHeight: '48px',
              transition: 'background-color var(--transition-fast)'
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
            }}
            onTouchEnd={(e) => {
              setTimeout(() => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }, 150);
            }}
          >
            <div style={{
              background: 'var(--color-primary-sage)',
              color: 'white',
              padding: '0.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '40px',
              minHeight: '40px'
            }}>
              <Icon size={20} />
            </div>
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '1rem',
                fontWeight: '500',
                color: 'var(--color-text-primary)',
                marginBottom: '0.25rem',
                lineHeight: 1.2
              }}>
                {label}
              </div>
              <div style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.3
              }}>
                {description}
              </div>
            </div>
            
            <div style={{
              color: 'var(--color-text-secondary)',
              display: 'flex',
              alignItems: 'center'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Mobile settings category component  
const MobileSettingsCategory: React.FC<{
  activeTab: string;
  setActiveTab: (tab: 'list' | 'account' | 'general' | 'map' | 'travel' | 'privacy') => void;
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  user: any;
  signOut: () => void;
  showResetConfirm: boolean;
  setShowResetConfirm: (show: boolean) => void;
  resetToDefaults: () => void;
}> = ({ 
  activeTab, 
  setActiveTab, 
  settings, 
  onSettingChange, 
  user, 
  signOut,
  showResetConfirm,
  setShowResetConfirm,
  resetToDefaults
}) => {
  const categoryInfo = {
    account: { title: 'Account', icon: User },
    general: { title: 'Allgemein', icon: Settings },
    map: { title: 'Karte', icon: MapPin },
    travel: { title: 'Reise', icon: Car },
    privacy: { title: 'Datenschutz', icon: Shield }
  };

  const currentCategory = categoryInfo[activeTab as keyof typeof categoryInfo];

  return (
    <div style={{
      background: 'var(--color-background)',
      minHeight: '100vh',
      padding: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '0 0.5rem'
      }}>
        <button
          onClick={() => setActiveTab('list')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--color-text-primary)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15,18 9,12 15,6" />
          </svg>
        </button>
        
        {currentCategory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <currentCategory.icon size={24} style={{ color: 'var(--color-primary-ocean)' }} />
            <h1 style={{ 
              fontSize: '1.5rem', 
              fontWeight: '600', 
              margin: 0,
              color: 'var(--color-text-primary)'
            }}>
              {currentCategory.title}
            </h1>
          </div>
        )}
      </div>

      <div style={{
        background: 'var(--color-surface)',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {renderMobileSettingsContent(activeTab, settings, onSettingChange, user, signOut, showResetConfirm, setShowResetConfirm, resetToDefaults)}
      </div>
    </div>
  );
};

const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useUIContext();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'list' | 'account' | 'general' | 'map' | 'travel' | 'privacy'>('list');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleSettingChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    console.log('⚙️ Settings: Changing', key, 'to', value);
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
    { id: 'account', label: 'Account', icon: User },
    { id: 'general', label: 'Allgemein', icon: Settings },
    { id: 'map', label: 'Karte', icon: MapPin },
    { id: 'travel', label: 'Reise', icon: Car },
    { id: 'privacy', label: 'Datenschutz', icon: Shield }
  ];

  // Responsive design is now handled by useResponsive hook
  const { isMobile } = useResponsive();

  // Handle desktop vs mobile initial state
  React.useEffect(() => {
    if (!isMobile && activeTab === 'list') {
      // If switching to desktop view, show account tab instead of list
      setActiveTab('account');
    }
  }, [isMobile, activeTab]);

  // Mobile view - show category list or specific category
  if (isMobile) {
    if (activeTab === 'list') {
      return <MobileSettingsList setActiveTab={setActiveTab} />;
    } else {
      return (
        <MobileSettingsCategory 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          settings={settings}
          onSettingChange={handleSettingChange}
          user={user}
          signOut={signOut}
          showResetConfirm={showResetConfirm}
          setShowResetConfirm={setShowResetConfirm}
          resetToDefaults={resetToDefaults}
        />
      );
    }
  }

  // Desktop view - existing layout
  return (
    <div className="settings-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <Settings size={32} style={{ color: 'var(--color-primary-ocean)' }} />
        <div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold', 
            margin: 0,
            color: 'var(--color-text-primary)'
          }}>
            Einstellungen
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)',
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
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '1.5rem',
          height: 'fit-content',
          border: '1px solid var(--color-border)'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            margin: '0 0 1rem 0',
            color: 'var(--color-text-primary)'
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
                  background: activeTab === id ? 'var(--color-primary-ocean)' : 'transparent',
                  color: activeTab === id ? 'white' : 'var(--color-text-primary)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: activeTab === id ? '600' : '400',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (activeTab !== id) {
                    e.currentTarget.style.background = 'var(--color-neutral-mist)';
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
            borderTop: '1px solid var(--color-border)'
          }}>
            <button
              onClick={() => setShowResetConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: '1px solid var(--color-error)',
                background: 'transparent',
                color: 'var(--color-error)',
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
          background: 'var(--color-surface)',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--color-border)'
        }}>
          {activeTab === 'account' && (
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <User size={24} />
                Account-Informationen
              </h2>

              {/* User Profile Manager */}
              <UserProfileManager 
                onProfileUpdate={(profile) => {
                  console.log('Profile updated:', profile);
                  // Optionally refresh auth context
                }}
              />
            </div>
          )}

          {activeTab === 'general' && (
            <GeneralSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'map' && (
            <MapSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'travel' && (
            <TravelSettings settings={settings} onSettingChange={handleSettingChange} />
          )}
          {activeTab === 'privacy' && (
            <PrivacySettings settings={settings} onSettingChange={handleSettingChange} />
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
            background: 'var(--color-neutral-cream)',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
              <h3 style={{ margin: 0, color: 'var(--color-text-primary)' }}>Einstellungen zurücksetzen</h3>
            </div>
            
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
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
                  background: 'var(--color-neutral-cream)',
                  color: 'var(--color-text-primary)',
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
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
                border: `2px solid ${settings.theme === value ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                background: settings.theme === value ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
                color: settings.theme === value ? 'white' : 'var(--color-text-primary)',
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
                border: `2px solid ${settings.timeFormat === value ? 'var(--color-primary-ocean)' : 'var(--color-border)'}`,
                background: settings.timeFormat === value ? 'var(--color-primary-ocean)' : 'var(--color-surface)',
                color: settings.timeFormat === value ? 'white' : 'var(--color-text-primary)',
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
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
        <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
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
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
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
            background: 'var(--color-neutral-cream)',
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
          color: 'var(--color-text-primary)'
        }}>
          <Home size={18} />
          Home-Point
        </label>
        
        {settings.homePoint ? (
          <div style={{
            background: 'rgba(139, 195, 143, 0.2)',
            border: '1px solid var(--color-success)',
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
                <div style={{ fontWeight: '600', color: 'var(--color-text-primary)' }}>
                  {settings.homePoint.name}
                </div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                  {settings.homePoint.address}
                </div>
              </div>
              <button
                onClick={() => onSettingChange('homePoint', undefined)}
                style={{
                  background: 'var(--color-error)',
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
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              📍 {settings.homePoint.coordinates.lat.toFixed(4)}, {settings.homePoint.coordinates.lng.toFixed(4)}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(204, 139, 101, 0.2)',
            border: '1px solid var(--color-warning)',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.875rem',
            color: 'var(--color-text-primary)'
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



const PrivacySettings: React.FC<{
  settings: AppSettings;
  onSettingChange: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}> = ({ settings, onSettingChange }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', color: 'var(--color-text-primary)' }}>
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

  const handlePlaceSelect = (place: any) => {
    setHomePointForm({
      name: 'Home', // Always name homepoint as "Home" for privacy
      address: place.formattedAddress || place.display_name,
      coordinates: place.coordinates
    });
  };

  const handleSave = () => {
    if (homePointForm.address && homePointForm.coordinates) {
      onHomePointChange({
        name: 'Home', // Always set as "Home" for privacy
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
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '1rem',
      marginTop: '1rem'
    }}>
      <h4 style={{ margin: '0 0 1rem 0', color: 'var(--color-text-primary)' }}>
        Home-Point {currentHomePoint ? 'bearbeiten' : 'definieren'}
      </h4>
      
      {/* Info about automatic naming */}
      <div style={{
        background: 'var(--color-info)',
        color: 'white',
        padding: '0.5rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Home size={16} />
        <span>Ihr Homepoint wird automatisch als "Home" bezeichnet, um Ihre Privatsphäre zu schützen.</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--color-text-primary)',
          marginBottom: '0.5rem'
        }}>
          Adresse oder Ort suchen
        </label>
        <EnhancedPlaceSearch
          value={homePointForm.address}
          onChange={(value) => setHomePointForm(prev => ({ ...prev, address: value }))}
          onPlaceSelect={handlePlaceSelect}
          placeholder="Suche nach Ihrer Adresse..."
          showCategories={false}
          className="w-full"
        />
      </div>

      {homePointForm.coordinates && (
        <div style={{
          background: 'var(--color-success)',
          border: '1px solid var(--color-success)',
          borderRadius: '6px',
          padding: '0.5rem',
          marginBottom: '1rem',
          fontSize: '0.75rem',
          color: 'white',
          opacity: 0.9
        }}>
          📍 Koordinaten: {homePointForm.coordinates.lat.toFixed(4)}, {homePointForm.coordinates.lng.toFixed(4)}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={handleCancel}
          style={{
            background: 'var(--color-text-secondary)',
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
          disabled={!homePointForm.address || !homePointForm.coordinates}
          style={{
            background: (!homePointForm.address || !homePointForm.coordinates) 
              ? 'var(--color-text-secondary)' : 'var(--color-success)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            cursor: (!homePointForm.address || !homePointForm.coordinates) 
              ? 'not-allowed' : 'pointer',
            opacity: (!homePointForm.address || !homePointForm.coordinates) 
              ? 0.6 : 1
          }}
        >
          Speichern
        </button>
      </div>
    </div>
  );
};

// Remove duplicate mobile components - they are now defined before SettingsView

export default SettingsView;