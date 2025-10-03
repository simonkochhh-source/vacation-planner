import React, { useState } from 'react';
import { Globe, MapPin, Compass } from 'lucide-react';
import { useResponsive } from '../../hooks/useResponsive';
import DestinationDiscovery from '../Discovery/DestinationDiscovery';
import TripDiscovery from '../Discovery/TripDiscovery';
import Button from '../Common/Button';

type DiscoveryMode = 'trips' | 'destinations';

const DiscoveryView: React.FC = () => {
  const [mode, setMode] = useState<DiscoveryMode>('trips');
  const { isMobile } = useResponsive();

  return (
    <div style={{
      padding: isMobile ? 'var(--space-md)' : 'var(--space-xl)',
      // iPhone safe area support
      paddingLeft: isMobile ? 'max(var(--space-md), env(safe-area-inset-left))' : 'var(--space-xl)',
      paddingRight: isMobile ? 'max(var(--space-md), env(safe-area-inset-right))' : 'var(--space-xl)',
      paddingBottom: isMobile ? 'max(var(--space-md), env(safe-area-inset-bottom))' : 'var(--space-xl)',
      maxWidth: 'var(--container-max-width)',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }}>
      {/* Header with Mode Toggle */}
      <div style={{ 
        marginBottom: isMobile ? 'var(--space-lg)' : 'var(--space-xl)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-lg)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-lg)',
          gap: isMobile ? 'var(--space-lg)' : 0
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 'var(--space-md)',
            width: isMobile ? '100%' : 'auto'
          }}>
            <div style={{
              background: 'var(--color-primary-sage)',
              color: 'white',
              padding: isMobile ? 'var(--space-sm)' : 'var(--space-md)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Compass size={isMobile ? 20 : 24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: isMobile ? 'var(--text-2xl)' : 'var(--text-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Entdecken
              </h1>
              <p style={{
                fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                margin: 0,
                lineHeight: 1.4
              }}>
                {isMobile ? 'Reisen und Ziele entdecken' : 'Finde inspirierende Reisen und neue Ziele'}
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{
            background: 'var(--color-neutral-mist)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '4px',
            width: isMobile ? '100%' : 'auto'
          }}>
            <Button
              variant={mode === 'trips' ? 'primary' : 'ghost'}
              size={isMobile ? 'md' : 'sm'}
              onClick={() => setMode('trips')}
              leftIcon={<Globe size={16} />}
              style={{
                background: mode === 'trips' ? 'var(--color-primary-sage)' : 'transparent',
                color: mode === 'trips' ? 'white' : 'var(--color-text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                flex: isMobile ? 1 : 'none',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                fontSize: isMobile ? '16px' : 'inherit', // Prevent zoom on iOS
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              Reisen
            </Button>
            <Button
              variant={mode === 'destinations' ? 'primary' : 'ghost'}
              size={isMobile ? 'md' : 'sm'}
              onClick={() => setMode('destinations')}
              leftIcon={<MapPin size={16} />}
              style={{
                background: mode === 'destinations' ? 'var(--color-primary-ocean)' : 'transparent',
                color: mode === 'destinations' ? 'white' : 'var(--color-text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                flex: isMobile ? 1 : 'none',
                minHeight: isMobile ? '48px' : 'auto', // Touch target
                fontSize: isMobile ? '16px' : 'inherit', // Prevent zoom on iOS
                // iOS Safari optimizations
                WebkitTapHighlightColor: 'transparent',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              Ziele
            </Button>
          </div>
        </div>

        {/* Mode Description */}
        <div style={{
          background: mode === 'trips' ? 'var(--color-primary-sage)' : 'var(--color-primary-ocean)',
          color: 'white',
          padding: isMobile ? 'var(--space-md)' : 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          fontSize: isMobile ? 'var(--text-xs)' : 'var(--text-sm)',
          opacity: 0.9,
          lineHeight: 1.4
        }}>
          {mode === 'trips' ? (
            <>
              🌍 <strong>Reisen entdecken:</strong> {isMobile ? 'Öffentliche Reisen durchsuchen und inspirieren lassen.' : 'Durchsuche öffentliche Reisen von anderen Nutzern und lass dich inspirieren. Du kannst sie ansehen, aber nur deren Ersteller können sie bearbeiten.'}
            </>
          ) : (
            <>
              📍 <strong>Ziele entdecken:</strong> {isMobile ? 'Interessante Orte finden und zu Reisen hinzufügen.' : 'Finde interessante Orte und Sehenswürdigkeiten aus dem Web. Füge sie direkt zu deinen Reisen hinzu.'}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        animation: 'fadeIn 0.3s ease-in-out',
        minHeight: '500px'
      }}>
        {mode === 'trips' ? (
          <TripDiscovery 
            onOpenTrip={(trip) => {
              console.log('Opening discovered trip:', trip.name);
            }}
          />
        ) : (
          <DestinationDiscovery 
            onAddDestination={(destination) => {
              console.log('Adding discovered destination:', destination.name);
            }}
          />
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default DiscoveryView;