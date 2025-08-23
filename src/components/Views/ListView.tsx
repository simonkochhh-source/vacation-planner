import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import DestinationForm from '../Forms/DestinationForm';
import StatusDropdown from '../UI/StatusDropdown';
import StatusBadge from '../UI/StatusBadge';
import { SearchBar, AdvancedFilters, FilterSummary, FilterPresets, FilterStats } from '../Filter';
import { BatchActions } from '../Batch';
import { ExportDialog } from '../Export';
import { WeatherWidget, WeatherForecast } from '../Weather';
import PhotoPreview from '../Photos/PhotoPreview';
import PhotoUpload from '../Photos/PhotoUpload';
import PhotoGallery from '../Photos/PhotoGallery';
import DraggableDestinationList from './DraggableDestinationList';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  Star, 
  Plus,
  Edit,
  Trash2,
  Plane,
  Filter,
  SlidersHorizontal,
  Move3D,
  Grid3X3,
  CheckSquare,
  Square,
  Download,
  Camera
} from 'lucide-react';
import { 
  getCategoryIcon, 
  getCategoryLabel, 
  formatDate, 
  formatTime
} from '../../utils';
import { Destination, DestinationStatus } from '../../types';

const ListView: React.FC = () => {
  const { 
    trips,
    currentTrip, 
    destinations, 
    uiState,
    updateDestination,
    deleteDestination
  } = useApp();

  const [showDestinationForm, setShowDestinationForm] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | undefined>();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showFilterPresets, setShowFilterPresets] = useState(false);
  const [showFilterStats, setShowFilterStats] = useState(false);
  const [isDragDropMode, setIsDragDropMode] = useState(false);
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [weatherForecastDest, setWeatherForecastDest] = useState<Destination | null>(null);
  const [photoUploadDest, setPhotoUploadDest] = useState<Destination | null>(null);
  const [photoGalleryDest, setPhotoGalleryDest] = useState<Destination | null>(null);

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Apply filters and search
  const filteredDestinations = currentDestinations.filter(dest => {
    // Search filter
    if (uiState.searchQuery) {
      const searchTerm = uiState.searchQuery.toLowerCase();
      const matchesSearch = 
        dest.name.toLowerCase().includes(searchTerm) ||
        dest.location.toLowerCase().includes(searchTerm) ||
        dest.notes?.toLowerCase().includes(searchTerm) ||
        dest.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (!matchesSearch) return false;
    }

    // Category filter
    if (uiState.filters.category && uiState.filters.category.length > 0) {
      if (!uiState.filters.category.includes(dest.category)) return false;
    }

    // Status filter
    if (uiState.filters.status && uiState.filters.status.length > 0) {
      if (!uiState.filters.status.includes(dest.status)) return false;
    }

    // Priority filter
    if (uiState.filters.priority && uiState.filters.priority.length > 0) {
      if (!uiState.filters.priority.includes(dest.priority)) return false;
    }

    // Tags filter
    if (uiState.filters.tags && uiState.filters.tags.length > 0) {
      const hasMatchingTag = uiState.filters.tags.some(tag => dest.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }

    // Date range filter
    if (uiState.filters.dateRange) {
      const { start, end } = uiState.filters.dateRange;
      if (dest.startDate < start || dest.endDate > end) return false;
    }

    // Budget range filter
    if (uiState.filters.budgetRange && dest.budget) {
      const { min, max } = uiState.filters.budgetRange;
      if (dest.budget < min || dest.budget > max) return false;
    }

    return true;
  });

  // Sort destinations - preserve trip order in drag & drop mode
  const sortedDestinations = isDragDropMode && currentTrip
    ? currentTrip.destinations
        .map(destId => filteredDestinations.find(dest => dest.id === destId))
        .filter(dest => dest) as Destination[]
    : [...filteredDestinations].sort((a, b) => {
        const { field, direction } = uiState.sortOptions;
        let aValue: any = a[field as keyof Destination];
        let bValue: any = b[field as keyof Destination];

        if (field === 'startDate') {
          aValue = new Date(`${a.startDate}T${a.startTime}`);
          bValue = new Date(`${b.startDate}T${b.startTime}`);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });

  const handleStatusChange = async (destId: string, newStatus: DestinationStatus) => {
    await updateDestination(destId, { status: newStatus });
  };

  const handleDelete = async (destId: string) => {
    if (window.confirm('Möchten Sie dieses Ziel wirklich löschen?')) {
      await deleteDestination(destId);
    }
  };

  const handleEdit = (destination: Destination) => {
    setEditingDestination(destination);
    setShowDestinationForm(true);
  };

  const handleCloseForm = () => {
    setShowDestinationForm(false);
    setEditingDestination(undefined);
  };

  const toggleDestinationSelection = (destId: string) => {
    setSelectedDestinations(prev => 
      prev.includes(destId) 
        ? prev.filter(id => id !== destId)
        : [...prev, destId]
    );
  };

  const handleBatchComplete = () => {
    setSelectedDestinations([]);
    setBatchMode(false);
  };

  // Show empty state if no trips exist at all
  if (trips.length === 0) {
    return (
      <div className="centered-empty-state" style={{ gap: '1.5rem', padding: '2rem' }}>
        <Plane size={64} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '2rem', textAlign: 'center' }}>Noch keine Ziele hinzugefügt</h2>
        <p style={{ margin: 0, textAlign: 'center', maxWidth: '500px', lineHeight: '1.6' }}>
          Beginnen Sie Ihre Reiseplanung, indem Sie Mock-Daten laden oder eine neue Reise erstellen.
          Verwenden Sie den blauen Button unten rechts, um Beispieldaten zu laden.
        </p>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="centered-empty-state">
        <Plane size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus der Sidebar aus oder erstellen Sie eine neue Reise.
        </p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{ overflow: 'auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        gap: '1rem'
      }}>
        <div>
          <h1 className="header-title">
            {currentTrip.name}
          </h1>
          <p className="header-subtitle">
            {formatDate(currentTrip.startDate)} - {formatDate(currentTrip.endDate)} • {currentDestinations.length} Ziele total, {sortedDestinations.length} angezeigt
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setBatchMode(!batchMode)}
            style={{
              background: batchMode ? '#fef3c7' : 'white',
              color: batchMode ? '#d97706' : '#6b7280',
              border: batchMode ? '1px solid #d97706' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            title={batchMode ? 'Batch-Modus beenden' : 'Mehrere Ziele auswählen'}
          >
            {batchMode ? <CheckSquare size={16} /> : <Square size={16} />}
            Auswählen
          </button>

          <button
            onClick={() => setIsDragDropMode(!isDragDropMode)}
            style={{
              background: isDragDropMode ? '#dcfce7' : 'white',
              color: isDragDropMode ? '#16a34a' : '#6b7280',
              border: isDragDropMode ? '1px solid #16a34a' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            title={isDragDropMode ? 'Zurück zur Grid-Ansicht' : 'Reihenfolge per Drag & Drop ändern'}
          >
            {isDragDropMode ? <Grid3X3 size={16} /> : <Move3D size={16} />}
            {isDragDropMode ? 'Grid' : 'Sortieren'}
          </button>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{
              background: showAdvancedFilters ? '#dbeafe' : 'white',
              color: showAdvancedFilters ? '#3b82f6' : '#6b7280',
              border: showAdvancedFilters ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <SlidersHorizontal size={16} />
            Filter
          </button>
          
          <button
            onClick={() => setShowFilterPresets(!showFilterPresets)}
            style={{
              background: showFilterPresets ? '#fef3c7' : 'white',
              color: showFilterPresets ? '#d97706' : '#6b7280',
              border: showFilterPresets ? '1px solid #d97706' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <Filter size={16} />
            Presets
          </button>
          
          <button
            onClick={() => setShowFilterStats(!showFilterStats)}
            style={{
              background: showFilterStats ? '#dcfce7' : 'white',
              color: showFilterStats ? '#16a34a' : '#6b7280',
              border: showFilterStats ? '1px solid #16a34a' : '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            <SlidersHorizontal size={16} />
            Stats
          </button>
          
          <button
            onClick={() => setShowExportDialog(true)}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
            title="Reise exportieren"
          >
            <Download size={16} />
            Exportieren
          </button>

          <button
            onClick={() => {
              console.log('Button clicked - opening destination form');
              setShowDestinationForm(true);
            }}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Plus size={16} />
            Ziel hinzufügen
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '1rem' }}>
        <SearchBar 
          onToggleFilters={() => setShowAdvancedFilters(!showAdvancedFilters)}
          size="md"
        />
      </div>

      {/* Filter Summary */}
      <FilterSummary />

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div style={{ marginBottom: '1.5rem' }}>
          <AdvancedFilters 
            isCompact={false}
            showHeader={true}
          />
        </div>
      )}

      {/* Filter Presets */}
      {showFilterPresets && (
        <div style={{ marginBottom: '1.5rem' }}>
          <FilterPresets />
        </div>
      )}

      {/* Filter Statistics */}
      {showFilterStats && (
        <div style={{ marginBottom: '1.5rem' }}>
          <FilterStats showDetailed={true} />
        </div>
      )}

      {/* Batch Actions */}
      {batchMode && (
        <BatchActions
          selectedDestinations={selectedDestinations}
          onSelectionChange={setSelectedDestinations}
          destinations={sortedDestinations}
          onBatchComplete={handleBatchComplete}
        />
      )}

      {/* Destinations List */}
      {sortedDestinations.length === 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{
            background: '#f9fafb',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <MapPin size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              Keine Ziele vorhanden
            </h3>
            <p style={{ margin: 0 }}>
              Fügen Sie Ihr erstes Reiseziel hinzu, um loszulegen.
            </p>
            <button
              onClick={() => setShowDestinationForm(true)}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginTop: '1rem'
              }}
            >
              <Plus size={16} style={{ marginRight: '0.5rem' }} />
              Erstes Ziel hinzufügen
            </button>
          </div>
        </div>
      ) : isDragDropMode ? (
        <DraggableDestinationList
          destinations={sortedDestinations}
          onEdit={handleEdit}
          onDelete={handleDelete}
          batchMode={batchMode}
          selectedDestinations={selectedDestinations}
          onToggleSelection={toggleDestinationSelection}
          onWeatherClick={setWeatherForecastDest}
          onPhotoUpload={setPhotoUploadDest}
          onPhotoGallery={setPhotoGalleryDest}
        />
      ) : (
        <div className="destination-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem'
        }}>
          {sortedDestinations.map((destination) => (
            <div
              key={destination.id}
              className="destination-card"
              style={{
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s',
                position: 'relative'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Batch Mode Checkbox */}
              {batchMode && (
                <div style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => toggleDestinationSelection(destination.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {selectedDestinations.includes(destination.id) ? (
                      <CheckSquare size={20} style={{ color: '#3b82f6' }} />
                    ) : (
                      <Square size={20} style={{ color: '#9ca3af' }} />
                    )}
                  </button>
                </div>
              )}

              <StatusDropdown 
                currentStatus={destination.status}
                onStatusChange={(newStatus) => handleStatusChange(destination.id, newStatus)}
                size="sm"
              />
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: destination.color || '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.25rem',
                  color: 'white',
                  flexShrink: 0
                }}>
                  {getCategoryIcon(destination.category)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#1f2937' }}>
                    {destination.name}
                  </h3>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                    <MapPin size={14} />
                    <span>{destination.location}</span>
                  </div>

                  <div style={{ display: 'inline-block', background: '#f3f4f6', color: '#374151', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '500' }}>
                    {getCategoryLabel(destination.category)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={14}
                      style={{
                        color: star <= destination.priority ? '#fbbf24' : '#d1d5db',
                        fill: star <= destination.priority ? '#fbbf24' : 'transparent'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <Calendar size={14} />
                    <span>Datum</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                    {formatDate(destination.startDate)}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {formatTime(destination.startTime)} - {formatTime(destination.endTime)}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                    <Clock size={14} />
                    <span>Dauer</span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1f2937' }}>
                    {Math.floor(destination.duration / 60)}h {destination.duration % 60}min
                  </div>
                </div>

                  {/* Weather Widget */}
                {destination.coordinates && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                      <span>Wetter</span>
                    </div>
                    <div 
                      onClick={() => setWeatherForecastDest(destination)}
                      style={{ cursor: 'pointer' }}
                      title="Klicken für detaillierte Wettervorhersage"
                    >
                      <WeatherWidget
                        coordinates={destination.coordinates}
                        date={destination.startDate}
                        size="sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Preview Section */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                  <Camera size={14} />
                  <span>Fotos</span>
                </div>
                <PhotoPreview
                  destinationId={destination.id}
                  maxPreview={3}
                  size="md"
                  onViewAll={() => setPhotoGalleryDest(destination)}
                  onUpload={() => setPhotoUploadDest(destination)}
                  className=""
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid #f3f4f6' }}>
                <StatusBadge status={destination.status} size="md" />
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleEdit(destination)} style={{ background: 'transparent', border: '1px solid #d1d5db', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', color: '#6b7280' }} title="Bearbeiten">
                    <Edit size={14} />
                  </button>
                  
                  <button onClick={() => handleDelete(destination.id)} style={{ background: 'transparent', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', color: '#ef4444' }} title="Löschen">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Destination Form */}
      <DestinationForm 
        isOpen={showDestinationForm}
        onClose={handleCloseForm}
        destination={editingDestination}
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* Weather Forecast Dialog */}
      {weatherForecastDest && (
        <WeatherForecast
          coordinates={weatherForecastDest.coordinates!}
          isOpen={!!weatherForecastDest}
          onClose={() => setWeatherForecastDest(null)}
          locationName={weatherForecastDest.name}
        />
      )}

      {/* Photo Upload Dialog */}
      {photoUploadDest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Fotos hochladen - {photoUploadDest.name}
              </h2>
              <button
                onClick={() => setPhotoUploadDest(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>
            
            <PhotoUpload
              destinationId={photoUploadDest.id}
              onPhotosUploaded={() => {
                // Photos uploaded, could trigger a refresh here if needed
                console.log('Photos uploaded successfully');
              }}
              maxPhotos={20}
            />
          </div>
        </div>
      )}

      {/* Photo Gallery Dialog */}
      {photoGalleryDest && (
        <PhotoGallery
          destinationId={photoGalleryDest.id}
          photos={[]} // Will be loaded by the component
          onPhotosChange={() => {
            // Photos changed, could trigger a refresh here if needed
            console.log('Photos changed');
          }}
          isOpen={!!photoGalleryDest}
          onClose={() => setPhotoGalleryDest(null)}
        />
      )}
    </div>
  );
};

export default ListView;