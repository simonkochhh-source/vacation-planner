import React, { useState } from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import TripForm from '../Forms/TripForm';
import ProgressRing from '../UI/ProgressRing';
import { 
  Plus,
  Download,
  Plane,
  ChevronDown,
  ChevronRight,
  X,
  Edit3
} from 'lucide-react';
import { DestinationStatus } from '../../types';
import { getCategoryIcon, formatCurrency, calculateTravelCosts } from '../../utils';

interface SidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile = false, onClose }) => {
  const { 
    currentTrip, 
    destinations, 
    trips, 
 
    setCurrentTrip,
    settings 
  } = useSupabaseApp();

  const [showTrips, setShowTrips] = useState(true);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showEditTripForm, setShowEditTripForm] = useState(false);

  // Get current trip destinations - safely handle null/undefined destinations
  const currentDestinations = currentTrip && destinations && Array.isArray(destinations)
    ? destinations.filter(dest => currentTrip.destinations?.includes(dest.id))
    : [];

  // Calculate stats including travel costs
  const destinationCosts = currentDestinations.reduce((sum, d) => sum + (d.actualCost || 0), 0);
  const travelCosts = calculateTravelCosts(
    currentDestinations,
    settings?.fuelConsumption || 9.0,
    1.65 // Fallback fuel price
  );
  
  const stats = {
    total: currentDestinations.length,
    days: currentTrip ? Math.max(1, Math.ceil((new Date(currentTrip.endDate).getTime() - new Date(currentTrip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0,
    planned: currentDestinations.filter(d => d.status === DestinationStatus.PLANNED).length,
    budget: currentTrip?.budget || 0, // Use total trip budget instead of sum of individual destination budgets
    destinationCosts: destinationCosts,
    travelCosts: travelCosts,
    actualCost: destinationCosts + travelCosts // Total costs including travel
  };


  if (!isOpen && !isMobile) {
    return (
      <div style={{
        width: '60px',
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1rem 0.5rem',
        gap: '1rem'
      }}>
        <div style={{
          width: '100%',
          height: '1px',
          background: '#e2e8f0'
        }} />
        
        {currentDestinations.slice(0, 3).map((dest) => (
          <div
            key={dest.id}
            style={{
              width: '40px',
              height: '40px',
              background: dest.color || '#6b7280',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
            title={dest.name}
          >
            {getCategoryIcon(dest.category)}
          </div>
        ))}
      </div>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={{
        width: isMobile ? '100vw' : '320px',
        background: '#f8fafc',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: isMobile ? 'fixed' : 'relative',
        top: isMobile ? 0 : 'auto',
        left: isMobile ? 0 : 'auto',
        zIndex: isMobile ? 1000 : 'auto',
        maxWidth: isMobile ? '100vw' : '320px'
      }}>
      {/* Header */}
      <div style={{
        padding: '1.5rem',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '8px',
              color: '#6b7280',
              position: 'absolute',
              top: '1rem',
              right: '1rem'
            }}
          >
            <X size={20} />
          </button>
        )}
        <div style={{ width: '100%' }}>
        </div>
      </div>

      {/* Trip Selector */}
      <div style={{ padding: '1rem 1.5rem' }}>
        <button
          onClick={() => setShowTrips(!showTrips)}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.5rem 0',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plane size={16} />
            Meine Reisen ({trips.length})
          </span>
          {showTrips ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {showTrips && (
          <div style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
            <button
              onClick={() => setShowTripForm(true)}
              style={{
                width: '100%',
                background: '#f3f4f6',
                border: '1px dashed #9ca3af',
                borderRadius: '8px',
                padding: '0.75rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <Plus size={14} />
              Neue Reise erstellen
            </button>
            
            {trips && Array.isArray(trips) ? trips.map((trip) => (
              <div
                key={trip.id}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  background: currentTrip?.id === trip.id ? '#e0f2fe' : 'transparent',
                  color: currentTrip?.id === trip.id ? '#0891b2' : '#6b7280',
                  fontSize: '0.875rem',
                  marginBottom: '0.25rem',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
                onMouseOver={(e) => {
                  if (currentTrip?.id !== trip.id) {
                    e.currentTarget.style.background = '#f1f5f9';
                  }
                }}
                onMouseOut={(e) => {
                  if (currentTrip?.id !== trip.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div
                  onClick={() => setCurrentTrip(trip.id)}
                  style={{ 
                    flex: 1,
                    cursor: 'pointer'
                  }}
                >
                  {trip.name}
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>
                    {trip.destinations.length} Ziele
                  </div>
                </div>
                
                {currentTrip?.id === trip.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEditTripForm(true);
                    }}
                    style={{
                      background: 'rgba(8, 145, 178, 0.1)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '0.25rem',
                      color: '#0891b2',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '0.5rem'
                    }}
                    title="Reise bearbeiten"
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(8, 145, 178, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)'}
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>
            )) : null}
          </div>
        )}
      </div>

      {/* Trip Stats */}
      {currentTrip && (
        <div style={{
          margin: '0 1.5rem',
          padding: '1rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          marginBottom: '1rem'
        }}>
          <h3 style={{ 
            margin: '0 0 1rem 0', 
            fontSize: '1rem', 
            fontWeight: '600',
            color: '#374151'
          }}>
            Reise-Übersicht
          </h3>
          
          {/* Progress Ring */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <ProgressRing 
              progress={stats.budget > 0 ? (stats.actualCost / stats.budget) * 100 : 0}
              size={80}
              color={stats.budget > 0 && stats.actualCost > stats.budget ? "#dc2626" : "#10b981"}
              text={stats.budget > 0 ? `${Math.round((stats.actualCost / stats.budget) * 100)}%` : "0%"}
            />
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              background: '#f0f9ff', 
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0284c7' }}>
                {stats.planned}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ziele geplant</div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              background: '#fef3c7', 
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d97706' }}>
                {stats.days}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Tage</div>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '0.75rem'
          }}>
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              background: '#fffbeb', 
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#d97706' }}>
                {formatCurrency(stats.budget)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Budget</div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              background: '#fef2f2', 
              borderRadius: '8px',
              position: 'relative'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#dc2626' }}>
                {formatCurrency(stats.actualCost)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ausgaben</div>
              {stats.travelCosts > 0 && (
                <div style={{ 
                  fontSize: '0.625rem', 
                  color: '#9ca3af', 
                  marginTop: '0.25rem',
                  fontStyle: 'italic'
                }}>
                  {formatCurrency(stats.destinationCosts)} Ziele + {formatCurrency(stats.travelCosts)} Fahrt
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Export Actions */}
      <div style={{ 
        marginTop: 'auto', 
        padding: '1rem 1.5rem',
        borderTop: '1px solid #e2e8f0'
      }}>
        <button
          style={{
            width: '100%',
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.75rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}
          disabled={!currentTrip}
        >
          <Download size={16} />
          Reise exportieren
        </button>
      </div>

      {/* Forms */}
      <TripForm 
        isOpen={showTripForm}
        onClose={() => setShowTripForm(false)}
      />
      
      <TripForm 
        isOpen={showEditTripForm}
        onClose={() => setShowEditTripForm(false)}
        trip={currentTrip || undefined}
      />
    </div>
  );
};

export default Sidebar;