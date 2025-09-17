import React, { useState, useMemo } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { Trip, Destination, DestinationStatus } from '../../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  ArrowLeft,
  MapPin,
  Calendar,
  Euro,
  Users,
  Clock,
  Route,
  Star,
  Download,
  Plus,
  Eye,
  Globe,
  Heart,
  Share,
  CheckCircle,
  AlertCircle,
  List,
  Map
} from 'lucide-react';
import { 
  formatDate, 
  formatCurrency,
  getCategoryIcon,
  getCategoryLabel,
  calculateDistance 
} from '../../utils';

// Fix Leaflet default markers in React
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple Trip Map Component
interface TripMapViewProps {
  trip: Trip;
  destinations: Destination[];
}

const TripMapView: React.FC<TripMapViewProps> = ({ trip, destinations }) => {
  // Check if we have destinations with coordinates
  const destinationsWithCoords = useMemo(() => {
    return destinations.filter(dest => dest.coordinates);
  }, [destinations]);

  if (destinationsWithCoords.length === 0) {
    return (
      <div style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <MapPin size={48} style={{ color: '#9ca3af', margin: '0 auto 16px' }} />
        <h3 style={{ margin: '0 0 8px 0', color: '#6b7280' }}>Keine Koordinaten verfügbar</h3>
        <p style={{ margin: '0', color: '#9ca3af' }}>
          Für diese Reise sind keine Kartenkoordinaten hinterlegt.
        </p>
      </div>
    );
  }

  // Calculate center point for the map
  const center = useMemo(() => {
    const lats = destinationsWithCoords.map(dest => dest.coordinates!.lat);
    const lngs = destinationsWithCoords.map(dest => dest.coordinates!.lng);
    
    return {
      lat: lats.reduce((sum, lat) => sum + lat, 0) / lats.length,
      lng: lngs.reduce((sum, lng) => sum + lng, 0) / lngs.length
    };
  }, [destinationsWithCoords]);

  // Create route polyline coordinates
  const routeCoordinates: LatLngExpression[] = destinationsWithCoords.map(dest => [
    dest.coordinates!.lat,
    dest.coordinates!.lng
  ]);

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      height: '400px'
    }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={8}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route Polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#3b82f6"
            weight={3}
            opacity={0.8}
          />
        )}
        
        {/* Destination Markers */}
        {destinationsWithCoords.map((destination, index) => (
          <Marker
            key={destination.id}
            position={[destination.coordinates!.lat, destination.coordinates!.lng]}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '600' }}>
                  {index + 1}. {destination.name}
                </h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  📍 {destination.location}
                </p>
                {destination.budget && (
                  <p style={{ margin: '0', fontSize: '0.875rem', color: '#10b981' }}>
                    💰 Budget: {destination.budget}€
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

interface PublicTripViewProps {
  trip: Trip;
  onBack: () => void;
  onImportTrip: (trip: Trip) => void;
}

const PublicTripView: React.FC<PublicTripViewProps> = ({ trip, onBack, onImportTrip }) => {
  const { destinations } = useSupabaseApp();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'map'>('list');

  // Get trip destinations
  const tripDestinations = useMemo(() => {
    return destinations.filter(dest => trip.destinations.includes(dest.id));
  }, [destinations, trip.destinations]);

  // Calculate trip statistics
  const tripStats = useMemo(() => {
    const totalBudget = tripDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
    const completedDestinations = tripDestinations.filter(dest => dest.status === DestinationStatus.VISITED).length;
    
    const tripDuration = Math.ceil(
      (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    // Calculate total distance (simplified - between consecutive destinations)
    let totalDistance = 0;
    for (let i = 0; i < tripDestinations.length - 1; i++) {
      const current = tripDestinations[i];
      const next = tripDestinations[i + 1];
      if (current.coordinates && next.coordinates) {
        totalDistance += calculateDistance(current.coordinates, next.coordinates);
      }
    }

    return {
      destinationCount: tripDestinations.length,
      totalBudget,
      completedDestinations,
      completionRate: tripDestinations.length > 0 ? (completedDestinations / tripDestinations.length) * 100 : 0,
      duration: tripDuration,
      totalDistance: Math.round(totalDistance),
      avgBudgetPerDay: tripDuration > 0 ? (totalBudget || trip.budget || 0) / tripDuration : 0
    };
  }, [tripDestinations, trip]);

  const handleImport = async () => {
    setIsImporting(true);
    try {
      await onImportTrip(trip);
      setShowImportDialog(false);
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const DestinationCard: React.FC<{ destination: Destination; index: number }> = ({ destination, index }) => (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.2s',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{
          background: '#3b82f6',
          color: 'white',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.875rem',
          fontWeight: '600',
          flexShrink: 0
        }}>
          {index + 1}
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h4 style={{ 
              margin: 0,
              fontSize: '1rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {destination.name}
            </h4>
            
            <div style={{
              background: '#f3f4f6',
              borderRadius: '6px',
              padding: '4px',
              color: '#6b7280'
            }}>
              {getCategoryIcon(destination.category)}
            </div>
            
            {destination.status === DestinationStatus.VISITED && (
              <CheckCircle size={16} style={{ color: '#10b981' }} />
            )}
          </div>
          
          <div style={{ 
            fontSize: '0.875rem',
            color: '#6b7280',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <MapPin size={14} />
            {destination.location}
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '12px',
            fontSize: '0.875rem'
          }}>
            <div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Datum</div>
              <div style={{ fontWeight: '500', color: '#1f2937' }}>
                {formatDate(destination.startDate)}
                {destination.endDate !== destination.startDate && (
                  <span> - {formatDate(destination.endDate)}</span>
                )}
              </div>
            </div>
            
            {destination.budget && (
              <div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Budget</div>
                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                  €{destination.budget}
                </div>
              </div>
            )}
            
            <div>
              <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Kategorie</div>
              <div style={{ fontWeight: '500', color: '#1f2937' }}>
                {getCategoryLabel(destination.category)}
              </div>
            </div>
          </div>
          
          {destination.notes && (
            <div style={{ 
              marginTop: '12px',
              padding: '8px',
              background: '#f9fafb',
              borderRadius: '6px',
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.4'
            }}>
              {destination.notes}
            </div>
          )}
          
          {destination.tags.length > 0 && (
            <div style={{ 
              marginTop: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px'
            }}>
              {destination.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.75rem',
                    fontWeight: '500'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ 
      minHeight: '100vh',
      background: '#f9fafb'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '24px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            >
              <ArrowLeft size={20} />
            </button>
            
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h1 style={{ 
                  margin: 0,
                  fontSize: '2rem',
                  fontWeight: '700'
                }}>
                  {trip.name}
                </h1>
                
                <div style={{
                  background: 'rgba(16, 185, 129, 0.9)',
                  borderRadius: '8px',
                  padding: '4px 12px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Globe size={16} />
                  Öffentliche Reise
                </div>
              </div>
              
              {trip.description && (
                <p style={{ 
                  margin: 0,
                  fontSize: '1.125rem',
                  opacity: 0.9,
                  lineHeight: '1.5'
                }}>
                  {trip.description}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                title="Zu Favoriten hinzufügen"
              >
                <Heart size={20} />
              </button>
              
              <button
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                title="Teilen"
              >
                <Share size={20} />
              </button>
              
              <button
                onClick={() => setShowImportDialog(true)}
                style={{
                  background: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                <Download size={18} />
                In meine Sammlung
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Reisedauer
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  {tripStats.duration} Tag{tripStats.duration !== 1 ? 'e' : ''}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#f0fdf4',
                color: '#15803d',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <MapPin size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Ziele
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  {tripStats.destinationCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {tripStats.completedDestinations} besucht ({Math.round(tripStats.completionRate)}%)
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#fef3c7',
                color: '#d97706',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Euro size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Budget
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  €{tripStats.totalBudget || trip.budget || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Geplantes Gesamtbudget
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                background: '#fce7f3',
                color: '#be185d',
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Route size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280', fontWeight: '500' }}>
                  Geschätzte Strecke
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  {tripStats.totalDistance} km
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Zwischen Zielen
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Destinations */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px' 
          }}>
            <h2 style={{ 
              margin: '0',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              Reiseziele ({tripDestinations.length})
            </h2>
            
            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '4px'
            }}>
              <button
                onClick={() => setActiveTab('list')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeTab === 'list' ? 'white' : 'transparent',
                  color: activeTab === 'list' ? '#1f2937' : '#6b7280',
                  boxShadow: activeTab === 'list' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
                }}
              >
                <List size={16} />
                Liste
              </button>
              <button
                onClick={() => setActiveTab('map')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeTab === 'map' ? 'white' : 'transparent',
                  color: activeTab === 'map' ? '#1f2937' : '#6b7280',
                  boxShadow: activeTab === 'map' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
                }}
              >
                <Map size={16} />
                Karte
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'list' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {tripDestinations.map((destination, index) => (
                <DestinationCard 
                  key={destination.id} 
                  destination={destination} 
                  index={index}
                />
              ))}
            </div>
          )}

          {activeTab === 'map' && (
            <TripMapView trip={trip} destinations={tripDestinations} />
          )}
        </div>

        {/* Additional Info */}
        {(trip.participants?.length > 0 || trip.tags?.length > 0) && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Zusätzliche Informationen
            </h3>
            
            {trip.participants?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Teilnehmer ({trip.participants.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {trip.participants.map((participant, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#f3f4f6',
                        color: '#374151',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {trip.tags?.length > 0 && (
              <div>
                <div style={{ 
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '8px'
                }}>
                  Tags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {trip.tags.map((tag, index) => (
                    <span
                      key={index}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.875rem',
                        fontWeight: '500'
                      }}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
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
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Reise importieren
            </h3>
            
            <p style={{ 
              margin: '0 0 20px 0',
              fontSize: '0.875rem',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Möchtest du "{trip.name}" zu deiner persönlichen Reisesammlung hinzufügen? 
              Die Reise wird als private Kopie mit allen Zielen importiert.
            </p>
            
            <div style={{
              background: '#f9fafb',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                <strong>Wird importiert:</strong>
                <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                  <li>{tripStats.destinationCount} Ziele</li>
                  <li>Alle Termine und Budgets</li>
                  <li>Notizen und Tags</li>
                  <li>Kategorie-Zuordnungen</li>
                </ul>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowImportDialog(false)}
                disabled={isImporting}
                style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  opacity: isImporting ? 0.5 : 1
                }}
              >
                Abbrechen
              </button>
              
              <button
                onClick={handleImport}
                disabled={isImporting}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isImporting ? 0.5 : 1
                }}
              >
                {isImporting ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff40',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Importiere...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Jetzt importieren
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTripView;