import React, { useState } from 'react';
import { Globe, MapPin, Compass } from 'lucide-react';
import DestinationDiscovery from '../Discovery/DestinationDiscovery';
import TripDiscovery from '../Discovery/TripDiscovery';
import Button from '../Common/Button';

type DiscoveryMode = 'trips' | 'destinations';

const DiscoveryView: React.FC = () => {
  const [mode, setMode] = useState<DiscoveryMode>('trips');

  return (
    <div style={{
      padding: 'var(--space-xl)',
      maxWidth: 'var(--container-max-width)',
      margin: '0 auto',
      minHeight: '100vh',
      background: 'var(--color-background)'
    }}>
      {/* Header with Mode Toggle */}
      <div style={{ 
        marginBottom: 'var(--space-xl)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-lg)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div style={{
              background: 'var(--color-primary-sage)',
              color: 'white',
              padding: 'var(--space-md)',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Compass size={24} />
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-text-primary)',
                margin: 0
              }}>
                Entdecken
              </h1>
              <p style={{
                fontSize: 'var(--text-base)',
                color: 'var(--color-text-secondary)',
                margin: 0
              }}>
                Finde inspirierende Reisen und neue Ziele
              </p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div style={{
            background: 'var(--color-neutral-mist)',
            padding: '4px',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            gap: '4px'
          }}>
            <Button
              variant={mode === 'trips' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMode('trips')}
              leftIcon={<Globe size={16} />}
              style={{
                background: mode === 'trips' ? 'var(--color-primary-sage)' : 'transparent',
                color: mode === 'trips' ? 'white' : 'var(--color-text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)'
              }}
            >
              Reisen
            </Button>
            <Button
              variant={mode === 'destinations' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setMode('destinations')}
              leftIcon={<MapPin size={16} />}
              style={{
                background: mode === 'destinations' ? 'var(--color-primary-ocean)' : 'transparent',
                color: mode === 'destinations' ? 'white' : 'var(--color-text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)'
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
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          opacity: 0.9
        }}>
          {mode === 'trips' ? (
            <>
              🌍 <strong>Reisen entdecken:</strong> Durchsuche öffentliche Reisen von anderen Nutzern und lass dich inspirieren. 
              Du kannst sie ansehen, aber nur deren Ersteller können sie bearbeiten.
            </>
          ) : (
            <>
              📍 <strong>Ziele entdecken:</strong> Finde interessante Orte und Sehenswürdigkeiten aus dem Web. 
              Füge sie direkt zu deinen Reisen hinzu.
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