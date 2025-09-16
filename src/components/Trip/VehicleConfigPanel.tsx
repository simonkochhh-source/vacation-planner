import React, { useState, useEffect, useMemo } from 'react';
import { Car, Fuel, Gauge, MapPin, RefreshCw, AlertCircle } from 'lucide-react';
import { VehicleConfig, FuelType, Coordinates } from '../../types';
import { fuelPriceService, FuelPriceService } from '../../services/fuelPriceService';

interface VehicleConfigPanelProps {
  vehicleConfig?: VehicleConfig;
  onChange: (config: VehicleConfig) => void;
  tripCoordinates?: Coordinates; // For fuel price lookup
}

const VehicleConfigPanel: React.FC<VehicleConfigPanelProps> = ({
  vehicleConfig,
  onChange,
  tripCoordinates
}) => {
  const [config, setConfig] = useState<VehicleConfig>(vehicleConfig || {
    fuelType: FuelType.DIESEL,
    fuelConsumption: 9.0,
    fuelPrice: 1.65,
    lastPriceUpdate: undefined
  });
  
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [priceError, setPriceError] = useState<string>('');

  // Update local state when prop changes
  useEffect(() => {
    if (vehicleConfig) {
      setConfig(vehicleConfig);
    }
  }, [vehicleConfig]);

  // Automatically fetch fuel price when fuel type or coordinates change
  useEffect(() => {
    if (tripCoordinates) {
      fetchFuelPrice();
    }
  }, [config.fuelType, tripCoordinates]);

  const fetchFuelPrice = async () => {
    if (!tripCoordinates) return;

    setIsLoadingPrice(true);
    setPriceError('');

    try {
      const avgPrice = await fuelPriceService.getAverageFuelPrice(
        tripCoordinates,
        config.fuelType,
        25 // 25km radius
      );

      const updatedConfig = {
        ...config,
        fuelPrice: avgPrice,
        lastPriceUpdate: new Date().toISOString()
      };
      
      setConfig(updatedConfig);
      onChange(updatedConfig);

    } catch (error) {
      setPriceError('Spritpreise konnten nicht abgerufen werden');
      console.error('Error fetching fuel price:', error);
    } finally {
      setIsLoadingPrice(false);
    }
  };

  const handleFuelTypeChange = (fuelType: FuelType) => {
    const updatedConfig = { ...config, fuelType };
    setConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleConsumptionChange = (consumption: number) => {
    const updatedConfig = { ...config, fuelConsumption: consumption };
    setConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const handleManualPriceChange = (price: number) => {
    const updatedConfig = { 
      ...config, 
      fuelPrice: price,
      lastPriceUpdate: new Date().toISOString()
    };
    setConfig(updatedConfig);
    onChange(updatedConfig);
  };

  const formatLastUpdate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Aktualisiert: ${date.toLocaleString('de-DE')}`;
  };

  const isApiConfigured = fuelPriceService.isConfigured();
  const apiStatus = fuelPriceService.getConfigurationStatus();
  const isUsingDemo = fuelPriceService.isUsingDemoKey();

  const estimatedCostPer100km = useMemo(() => {
    return (config.fuelConsumption * (config.fuelPrice || 0)).toFixed(2);
  }, [config.fuelConsumption, config.fuelPrice]);

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '2px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-xl)',
      marginBottom: 'var(--space-lg)',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.5rem'
      }}>
        <Car size={20} style={{ color: 'var(--color-primary-ocean)' }} />
        <h3 style={{
          margin: 0,
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)'
        }}>
          Fahrzeug-Konfiguration
        </h3>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Fuel Type Selection */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            <Fuel size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Kraftstoffart
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {Object.values(FuelType).map(type => (
              <button
                key={type}
                onClick={() => handleFuelTypeChange(type)}
                style={{
                  background: config.fuelType === type ? '#3b82f6' : 'white',
                  color: config.fuelType === type ? 'white' : '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {FuelPriceService.getFuelTypeDisplayName(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Fuel Consumption */}
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            <Gauge size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
            Verbrauch (L/100km)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            step="0.1"
            value={config.fuelConsumption}
            onChange={(e) => handleConsumptionChange(Number(e.target.value))}
            className="input"
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-body)'
            }}
          />
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            Durchschnittlicher Kraftstoffverbrauch
          </div>
        </div>

        {/* Fuel Price */}
        <div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            <span>
              <MapPin size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />
              Spritpreis (€/L)
            </span>
            {tripCoordinates && (
              <button
                onClick={fetchFuelPrice}
                disabled={isLoadingPrice}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#3b82f6',
                  cursor: isLoadingPrice ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.75rem',
                  padding: '0.25rem'
                }}
              >
                <RefreshCw 
                  size={12} 
                  style={{ 
                    animation: isLoadingPrice ? 'spin 1s linear infinite' : 'none'
                  }} 
                />
                Aktualisieren
              </button>
            )}
          </label>
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.001"
            value={config.fuelPrice || 0}
            onChange={(e) => handleManualPriceChange(Number(e.target.value))}
            className="input"
            style={{
              width: '100%',
              padding: 'var(--space-md)',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-base)',
              fontFamily: 'var(--font-body)'
            }}
          />
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '0.25rem'
          }}>
            {config.lastPriceUpdate ? formatLastUpdate(config.lastPriceUpdate) : 'Manuell eingegeben'}
          </div>
          
          {priceError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.75rem',
              color: '#dc2626',
              marginTop: '0.25rem'
            }}>
              <AlertCircle size={12} />
              {priceError}
            </div>
          )}
        </div>
      </div>

      {/* Cost Estimation */}
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        marginTop: '1.5rem'
      }}>
        <h4 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Kostenschätzung
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Pro 100km
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {estimatedCostPer100km} €
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
              Kraftstoffart
            </div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {FuelPriceService.getFuelTypeDisplayName(config.fuelType)}
            </div>
          </div>
        </div>
      </div>

      {/* API Configuration Info */}
      <div style={{
        background: isApiConfigured ? 'var(--color-accent-moss)' : (isUsingDemo ? 'var(--color-secondary-sky)' : 'var(--color-secondary-sunset)'),
        color: 'white',
        border: '2px solid rgba(255, 255, 255, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        marginTop: 'var(--space-lg)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-sm)'
        }}>
          <AlertCircle size={18} />
          <span style={{ 
            fontSize: 'var(--text-sm)', 
            fontWeight: 'var(--font-weight-semibold)',
            fontFamily: 'var(--font-body)'
          }}>
            {isApiConfigured ? '✅ Tankerkönig API aktiv' : '⚠️ Tankerkönig API Status'}
          </span>
        </div>
        <p style={{
          margin: 0,
          fontSize: 'var(--text-sm)',
          lineHeight: 1.5,
          fontFamily: 'var(--font-body)'
        }}>
          {apiStatus}
          {!isApiConfigured && (
            <>
              <br /><br />
              <strong>So erhältst du einen kostenlosen API-Schlüssel:</strong>
              <br />1. Besuche{' '}
              <a 
                href="https://creativecommons.tankerkoenig.de" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  color: 'white', 
                  textDecoration: 'underline',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                creativecommons.tankerkoenig.de
              </a>
              <br />2. Registriere dich kostenlos
              <br />3. Füge den API-Key in die .env.local Datei ein
              <br />4. Starte die App neu
            </>
          )}
        </p>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default VehicleConfigPanel;