import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import TripForm from '../Forms/TripForm';
import ProgressRing from '../UI/ProgressRing';
import { 
  Plus,
  MapPin, 
  Calendar, 
  Filter, 
  Download,
  Plane,
  ChevronDown,
  ChevronRight,
  DollarSign,
  X,
  Edit3,
  Compass
} from 'lucide-react';
import { DestinationCategory, DestinationStatus, SortField, SortDirection } from '../../types';
import { getCategoryIcon, getCategoryLabel, formatCurrency } from '../../utils';

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
    uiState, 
    updateUIState, 
    setCurrentTrip 
  } = useApp();

  const [showFilters, setShowFilters] = useState(false);
  const [showTrips, setShowTrips] = useState(true);
  const [showTripForm, setShowTripForm] = useState(false);
  const [showEditTripForm, setShowEditTripForm] = useState(false);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Calculate stats
  const stats = {
    total: currentDestinations.length,
    visited: currentDestinations.filter(d => d.status === DestinationStatus.VISITED).length,
    planned: currentDestinations.filter(d => d.status === DestinationStatus.PLANNED).length,
    budget: currentDestinations.reduce((sum, d) => sum + (d.budget || 0), 0),
    actualCost: currentDestinations.reduce((sum, d) => sum + (d.actualCost || 0), 0)
  };

  const handleFilterChange = (filterType: string, value: any) => {
    const currentFilters = uiState.filters;
    const newFilters = {
      ...currentFilters,
      [filterType]: Array.isArray(currentFilters[filterType as keyof typeof currentFilters])
        ? (currentFilters[filterType as keyof typeof currentFilters] as any[]).includes(value)
          ? (currentFilters[filterType as keyof typeof currentFilters] as any[]).filter((item: any) => item !== value)
          : [...(currentFilters[filterType as keyof typeof currentFilters] as any[]), value]
        : [value]
    };
    updateUIState({ filters: newFilters });
  };

  const handleSortChange = (field: SortField) => {
    const currentSort = uiState.sortOptions;
    const newSort = {
      field,
      direction: currentSort.field === field && currentSort.direction === SortDirection.ASC
        ? SortDirection.DESC
        : SortDirection.ASC
    };
    updateUIState({ sortOptions: newSort });
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
        maxWidth: isMobile ? '90vw' : '320px'
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
          <button
            onClick={() => updateUIState({ activeView: 'discovery' })}
            style={{
              width: '100%',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '0.875rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            <Compass size={18} />
            Ziele entdecken
          </button>
        </div>
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
            
            {trips.map((trip) => (
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
            ))}
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
              progress={stats.total > 0 ? (stats.visited / stats.total) * 100 : 0}
              size={80}
              color="#10b981"
              text={`${stats.visited}/${stats.total}`}
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
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Geplant</div>
            </div>
            
            <div style={{ 
              textAlign: 'center', 
              padding: '0.75rem', 
              background: '#ecfdf5', 
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                {stats.visited}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Besucht</div>
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
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#dc2626' }}>
                {formatCurrency(stats.actualCost)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Ausgaben</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ padding: '0 1.5rem 1rem' }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
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
            <Filter size={16} />
            Filter & Sortierung
          </span>
          {showFilters ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {showFilters && (
          <div style={{ marginTop: '1rem' }}>
            {/* Sort Options */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                SORTIERUNG
              </div>
              {[
                { field: SortField.START_DATE, label: 'Datum', icon: Calendar },
                { field: SortField.NAME, label: 'Name', icon: MapPin },
                { field: SortField.BUDGET, label: 'Budget', icon: DollarSign }
              ].map(({ field, label, icon: Icon }) => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  style={{
                    width: '100%',
                    background: uiState.sortOptions.field === field ? '#e0f2fe' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: uiState.sortOptions.field === field ? '#0891b2' : '#6b7280',
                    marginBottom: '0.25rem'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={14} />
                    {label}
                  </span>
                  {uiState.sortOptions.field === field && (
                    <span style={{ fontSize: '0.75rem' }}>
                      {uiState.sortOptions.direction === SortDirection.ASC ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                KATEGORIEN
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                {Object.values(DestinationCategory).slice(0, 6).map((category) => (
                  <button
                    key={category}
                    onClick={() => handleFilterChange('category', category)}
                    style={{
                      background: uiState.filters.category?.includes(category) ? '#e0f2fe' : 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: uiState.filters.category?.includes(category) ? '#0891b2' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      justifyContent: 'center'
                    }}
                  >
                    <span>{getCategoryIcon(category)}</span>
                    <span>{getCategoryLabel(category).slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                STATUS
              </div>
              {Object.values(DestinationStatus).map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange('status', status)}
                  style={{
                    width: '100%',
                    background: uiState.filters.status?.includes(status) ? '#e0f2fe' : 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    color: uiState.filters.status?.includes(status) ? '#0891b2' : '#6b7280',
                    marginBottom: '0.25rem',
                    textAlign: 'left'
                  }}
                >
                  {status === DestinationStatus.PLANNED && '⏳ Geplant'}
                  {status === DestinationStatus.VISITED && '✅ Besucht'}
                  {status === DestinationStatus.SKIPPED && '❌ Übersprungen'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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