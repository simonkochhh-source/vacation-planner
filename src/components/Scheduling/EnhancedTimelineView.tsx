import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination, CreateDestinationData, DestinationStatus, DestinationCategory, TransportMode, Coordinates } from '../../types';
import OpenStreetMapAutocomplete from '../Forms/OpenStreetMapAutocomplete';
import { PlacePrediction } from '../../services/openStreetMapService';
import LeafletMapOnly from '../Maps/LeafletMapOnly';
import MapErrorBoundary from '../Maps/MapErrorBoundary';
import {
  Calendar,
  MapPin,
  Route,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  GripVertical,
  Plus,
  X,
  Check,
  Search,
  Car,
  Mountain,
  Bike,
  Edit,
  Save,
  Trash2
} from 'lucide-react';
import { 
  formatDate, 
  getCategoryIcon, 
  getCategoryLabel,
  formatCurrency,
  calculateDistance,
  getDestinationDuration,
  getDestinationBudget
} from '../../utils';

interface EnhancedTimelineViewProps {
  onDestinationClick?: (destination: Destination) => void;
  onEditDestination?: (destination: Destination) => void;
  onReorderDestinations?: (reorderedDestinations: Destination[]) => void;
}

interface TimelineDestination extends Destination {
  startTime?: string;
  endTime?: string;
  calculatedEndTime?: string;
}

interface TimelineDay {
  date: string;
  destinations: TimelineDestination[];
  dayStats: {
    totalDistance: number;
    totalTravelTime: number;
    totalCost: number;
  };
}

interface DragState {
  isDragging: boolean;
  draggedItem: TimelineDestination | null;
  dragOverDay: string | null;
  dragOverIndex: number | null;
}

const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({
  onDestinationClick,
  onEditDestination,
  onReorderDestinations
}) => {
  const { currentTrip, destinations, createDestination, updateDestination, deleteDestination } = useApp();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    dragOverDay: null,
    dragOverIndex: null
  });
  const [creatingDestination, setCreatingDestination] = useState<{
    dayDate: string;
    position: 'before' | 'after' | 'initial';
    destinationIndex?: number;
  } | null>(null);
  const [editingDestination, setEditingDestination] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    location: string;
    coordinates?: Coordinates;
    category: DestinationCategory;
    transportMode: TransportMode;
    actualCost?: number;
    isPaid: boolean;
  }>({
    name: '',
    location: '',
    coordinates: undefined,
    category: DestinationCategory.ATTRACTION,
    transportMode: TransportMode.DRIVING,
    actualCost: undefined,
    isPaid: false
  });
  const [newDestinationForm, setNewDestinationForm] = useState<{
    name: string;
    location: string;
    coordinates?: Coordinates;
    endDate: string;
    transportMode: TransportMode;
    category: DestinationCategory;
    actualCost?: number;
    isPaid: boolean;
  }>({ 
    name: '', 
    location: '', 
    coordinates: undefined,
    endDate: '',
    transportMode: TransportMode.DRIVING,
    category: DestinationCategory.ATTRACTION,
    actualCost: undefined,
    isPaid: false
  });

  const [showMapPicker, setShowMapPicker] = useState(false);

  // Removed complex search functionality - now using simple OpenStreetMapAutocomplete

  // Enhanced time calculations
  const calculateTimeFromDuration = useCallback((startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  }, []);

  const calculateTravelTime = useCallback((from: Destination, to: Destination): number => {
    if (from.coordinates && to.coordinates) {
      const distance = calculateDistance(from.coordinates, to.coordinates) * 1.4;
      let averageSpeed: number;
      if (distance < 5) averageSpeed = 30;
      else if (distance < 50) averageSpeed = 60;
      else if (distance < 200) averageSpeed = 80;
      else averageSpeed = 90;
      
      const timeInHours = distance / averageSpeed;
      return Math.max(10, Math.round(timeInHours * 60));
    }
    return 30;
  }, []);

  // Enhanced timeline data with time calculations
  const enhancedTimelineData = useMemo((): TimelineDay[] => {
    const currentDestinations = currentTrip 
      ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
      : [];
    
    const grouped = new Map<string, TimelineDestination[]>();
    
    // Group destinations by day
    currentDestinations.forEach(dest => {
      const enhancedDest: TimelineDestination = {
        ...dest,
        startTime: dest.startTime || '09:00',
        endTime: dest.endTime
      };

      // Calculate end time if not provided
      if (!enhancedDest.endTime) {
        const durationData = getDestinationDuration(dest);
        enhancedDest.calculatedEndTime = calculateTimeFromDuration(
          enhancedDest.startTime!,
          durationData.value
        );
      }

      if (dest.category === 'hotel' && dest.startDate !== dest.endDate) {
        // Multi-day accommodation logic
        const startDate = new Date(dest.startDate);
        const endDate = new Date(dest.endDate);
        
        for (let current = new Date(startDate); current <= endDate; current.setDate(current.getDate() + 1)) {
          const dateKey = current.toISOString().split('T')[0];
          if (!grouped.has(dateKey)) grouped.set(dateKey, []);
          
          const exists = grouped.get(dateKey)!.some(existing => existing.id === dest.id);
          if (!exists) {
            grouped.get(dateKey)!.push(enhancedDest);
          }
        }
      } else {
        const dateKey = dest.startDate;
        if (!grouped.has(dateKey)) grouped.set(dateKey, []);
        grouped.get(dateKey)!.push(enhancedDest);
      }
    });

    // Process each day
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dests]) => {
        // Sort destinations by time
        const sortedDests = [...dests].sort((a, b) => {
          if (a.category === 'hotel' && b.category !== 'hotel') return -1;
          if (a.category !== 'hotel' && b.category === 'hotel') return 1;
          return (a.startTime || '09:00').localeCompare(b.startTime || '09:00');
        });

        // Calculate day statistics
        let totalDistance = 0;
        let totalTravelTime = 0;
        let totalCost = 0;

        // Calculate travel between destinations
        for (let i = 0; i < sortedDests.length - 1; i++) {
          const current = sortedDests[i];
          const next = sortedDests[i + 1];
          
          if (current.coordinates && next.coordinates) {
            const distance = calculateDistance(current.coordinates, next.coordinates) * 1.4;
            const travelTime = calculateTravelTime(current, next);
            
            totalDistance += distance;
            totalTravelTime += travelTime;

            // Calculate travel cost
            if (currentTrip?.vehicleConfig) {
              const { fuelConsumption, fuelPrice } = currentTrip.vehicleConfig;
              totalCost += (distance / 100) * (fuelConsumption || 9.0) * (fuelPrice || 1.65);
            } else {
              totalCost += distance * 0.30;
            }
          }
        }

        return {
          date,
          destinations: sortedDests,
          dayStats: {
            totalDistance,
            totalTravelTime,
            totalCost
          }
        };
      });
  }, [destinations, currentTrip, calculateTimeFromDuration, calculateTravelTime]);

  // Drag and drop handlers
  const handleDragStart = useCallback((dest: TimelineDestination, e: React.DragEvent) => {
    setDragState({
      isDragging: true,
      draggedItem: dest,
      dragOverDay: null,
      dragOverIndex: null
    });
    
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dayDate: string, index: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    
    setDragState(prev => ({
      ...prev,
      dragOverDay: dayDate,
      dragOverIndex: index
    }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDay: string, targetIndex: number) => {
    e.preventDefault();
    
    if (!dragState.draggedItem) return;

    // Implementation for reordering would go here
    // This is a complex feature that requires careful state management
    console.log('Drop:', dragState.draggedItem.name, 'to', targetDay, 'at index', targetIndex);
    
    setDragState({
      isDragging: false,
      draggedItem: null,
      dragOverDay: null,
      dragOverIndex: null
    });
  }, [dragState.draggedItem]);

  // Mobile navigation
  const currentDayIndex = useMemo(() => {
    if (!selectedDay) return 0;
    return enhancedTimelineData.findIndex(day => day.date === selectedDay);
  }, [enhancedTimelineData, selectedDay]);

  const navigateDay = useCallback((direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' ? currentDayIndex - 1 : currentDayIndex + 1;
    if (newIndex >= 0 && newIndex < enhancedTimelineData.length) {
      setSelectedDay(enhancedTimelineData[newIndex].date);
    }
  }, [currentDayIndex, enhancedTimelineData]);

  // Statistics
  // Inline destination creation handlers
  const handleCreateDestination = useCallback(async () => {
    if (!creatingDestination || !currentTrip) return;

    try {
      const destinationData: CreateDestinationData = {
        name: newDestinationForm.name,
        location: newDestinationForm.location,
        coordinates: newDestinationForm.coordinates,
        startDate: creatingDestination.dayDate,
        endDate: newDestinationForm.category === DestinationCategory.HOTEL ? newDestinationForm.endDate : creatingDestination.dayDate,
        category: newDestinationForm.category,
        budget: 0,
        status: DestinationStatus.PLANNED,
        notes: newDestinationForm.transportMode !== TransportMode.DRIVING 
          ? `Transportmodus: ${getTransportModeLabel(newDestinationForm.transportMode)}` 
          : '',
        tags: newDestinationForm.transportMode !== TransportMode.DRIVING 
          ? [getTransportModeLabel(newDestinationForm.transportMode).toLowerCase()]
          : []
      };

      const createdDestination = await createDestination(destinationData);
      
      // Update the destination with additional fields that aren't in CreateDestinationData
      if (createdDestination) {
        await updateDestination(createdDestination.id, {
          actualCost: newDestinationForm.isPaid ? newDestinationForm.actualCost : undefined
        });
      }
      
      setCreatingDestination(null);
      resetForm();
    } catch (error) {
      console.error('Failed to create destination:', error);
    }
  }, [creatingDestination, currentTrip, newDestinationForm, createDestination, updateDestination]);

  // Handle place selection from autocomplete
  const handlePlaceSelect = useCallback((place: PlacePrediction) => {
    setNewDestinationForm(prev => ({
      ...prev,
      name: place.structured_formatting.main_text,
      location: place.display_name,
      coordinates: place.coordinates
    }));
  }, []);

  const resetForm = useCallback(() => {
    setNewDestinationForm({ 
      name: '', 
      location: '', 
      coordinates: undefined,
      endDate: '',
      transportMode: TransportMode.DRIVING,
      category: DestinationCategory.ATTRACTION,
      actualCost: undefined,
      isPaid: false
    });
  }, []);

  // Edit destination handlers
  const handleStartEdit = useCallback((destination: Destination) => {
    setEditingDestination(destination.id);
    setEditForm({
      name: destination.name,
      location: destination.location,
      coordinates: destination.coordinates,
      category: destination.category,
      transportMode: destination.transportToNext?.mode || TransportMode.DRIVING,
      actualCost: destination.actualCost,
      isPaid: !!destination.actualCost
    });
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editingDestination) return;
    
    try {
      await updateDestination(editingDestination, {
        name: editForm.name,
        location: editForm.location,
        coordinates: editForm.coordinates,
        category: editForm.category,
        actualCost: editForm.isPaid ? editForm.actualCost : undefined,
        transportToNext: editForm.transportMode ? {
          mode: editForm.transportMode,
          duration: 0,
          distance: 0
        } : undefined
      });
      
      setEditingDestination(null);
    } catch (error) {
      console.error('Failed to update destination:', error);
    }
  }, [editingDestination, editForm, updateDestination]);

  const handleCancelEdit = useCallback(() => {
    setEditingDestination(null);
  }, []);

  const handleDeleteDestination = useCallback(async (destinationId: string) => {
    if (!window.confirm('Möchten Sie dieses Ziel wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      await deleteDestination(destinationId);
      // Close any open forms related to this destination
      if (editingDestination === destinationId) {
        setEditingDestination(null);
      }
    } catch (error) {
      console.error('Failed to delete destination:', error);
      alert('Fehler beim Löschen des Ziels. Bitte versuchen Sie es erneut.');
    }
  }, [deleteDestination, editingDestination]);

  const handleEditPlaceSelect = useCallback((place: PlacePrediction) => {
    setEditForm(prev => ({
      ...prev,
      name: place.structured_formatting.main_text,
      location: place.display_name,
      coordinates: place.coordinates
    }));
  }, []);

  // Map picker handlers
  const handleOpenMapPicker = useCallback(() => {
    console.log('🗺️ Opening map picker, showMapPicker will be:', true);
    setShowMapPicker(true);
    console.log('🗺️ Map picker state set to:', true);
  }, []);

  const handleCloseMapPicker = useCallback(() => {
    setShowMapPicker(false);
  }, []);

  const handleMapLocationSelect = useCallback((coordinates: Coordinates, address?: string) => {
    if (editingDestination) {
      // If editing, update the edit form
      setEditForm(prev => ({
        ...prev,
        coordinates,
        location: address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
      }));
    } else {
      // If creating new, update the new destination form
      setNewDestinationForm(prev => ({
        ...prev,
        coordinates,
        location: address || `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`
      }));
    }
  }, [editingDestination]);

  const getTransportModeLabel = (mode: TransportMode): string => {
    switch (mode) {
      case TransportMode.DRIVING: return 'Auto';
      case TransportMode.WALKING: return 'Wanderung';
      case TransportMode.BICYCLE: return 'Fahrrad';
      case TransportMode.PUBLIC_TRANSPORT: return 'Öffentlich';
      default: return 'Auto';
    }
  };


  const handleCancelCreation = useCallback(() => {
    setCreatingDestination(null);
    resetForm();
  }, [resetForm]);

  const handleStartCreation = useCallback((dayDate: string, position: 'before' | 'after' | 'initial', destinationIndex?: number) => {
    setCreatingDestination({ dayDate, position, destinationIndex });
    setNewDestinationForm(prev => ({ 
      ...prev, 
      endDate: dayDate
    }));
  }, []);

  const overallStats = useMemo(() => {
    let hasReferenceBudgets = false;

    const totalStats = enhancedTimelineData.reduce((acc, day) => {
      // Check for reference values in this day's destinations
      day.destinations.forEach(dest => {
        if (getDestinationBudget(dest).isReference) {
          hasReferenceBudgets = true;
        }
      });

      return {
        destinations: acc.destinations + day.destinations.length,
        days: acc.days + 1,
        distance: acc.distance + day.dayStats.totalDistance,
        travelTime: acc.travelTime + day.dayStats.totalTravelTime,
        cost: acc.cost + day.dayStats.totalCost
      };
    }, {
      destinations: 0,
      days: 0,
      distance: 0,
      travelTime: 0,
      cost: 0
    });

    return {
      ...totalStats,
      hasReferenceBudgets
    };
  }, [enhancedTimelineData]);

  if (!currentTrip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <Calendar size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um die erweiterte Zeitplanung anzuzeigen.
        </p>
      </div>
    );
  }

  return (
    <>
    <div style={{ padding: '1.5rem' }}>
      {/* Enhanced Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            📅 Erweiterte Timeline
          </h1>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '1rem'
          }}>
            {currentTrip.name} • {formatDate(currentTrip.startDate)} - {formatDate(currentTrip.endDate)}
          </p>
        </div>

      </div>

      {/* Enhanced Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          background: '#f0f9ff',
          border: '1px solid #bae6fd',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <MapPin size={16} style={{ color: '#0891b2' }} />
            <span style={{ fontSize: '0.875rem', color: '#0891b2', fontWeight: '600' }}>
              Ziele
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e' }}>
            {overallStats.destinations}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0891b2', marginTop: '0.25rem' }}>
            über {overallStats.days} Tage
          </div>
        </div>


        <div style={{
          background: '#f0f9ff',
          border: '1px solid #7dd3fc',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <Route size={16} style={{ color: '#0284c7' }} />
            <span style={{ fontSize: '0.875rem', color: '#0284c7', fontWeight: '600' }}>
              Fahrtstrecke
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0c4a6e' }}>
            {Math.round(overallStats.distance)}km
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0284c7', marginTop: '0.25rem' }}>
            ~{Math.floor(overallStats.travelTime / 60)}h {overallStats.travelTime % 60}min
          </div>
        </div>

        <div style={{
          background: '#f0fdf4',
          border: '1px solid #bbf7d0',
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.5rem'
          }}>
            <DollarSign size={16} style={{ color: '#16a34a' }} />
            <span style={{ fontSize: '0.875rem', color: '#16a34a', fontWeight: '600' }}>
              Fahrtkosten
            </span>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#14532d' }}>
            {formatCurrency(overallStats.cost)}
            {overallStats.hasReferenceBudgets && (
              <span style={{ 
                marginLeft: '0.5rem', 
                color: '#f59e0b',
                fontSize: '1rem',
                fontWeight: 'bold'
              }} title="Beinhaltet Referenzwerte für fehlende Budget-Angaben">⚠️</span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.25rem' }}>
            basierend auf Fahrzeugconfig
          </div>
        </div>

      </div>

      {/* Timeline Content */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {enhancedTimelineData.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <Calendar size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>
              Keine Ziele geplant
            </h3>
            <p style={{ margin: '0 0 2rem 0' }}>
              Erstellen Sie Ihr erstes Reiseziel, um mit der Planung zu beginnen.
            </p>
            
            {/* Initial destination creation */}
            {!creatingDestination ? (
              <button
                onClick={() => handleStartCreation(currentTrip!.startDate, 'initial')}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  margin: '0 auto',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <Plus size={20} />
                Erstes Ziel erstellen
              </button>
            ) : (
              <div style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '600px',
                margin: '0 auto'
              }}>
                <h4 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  textAlign: 'center'
                }}>
                  Neues Ziel erstellen
                </h4>
                
                {/* Simplified Search Description */}
                <div style={{
                  background: '#f0f9ff',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  textAlign: 'center'
                }}>
                  <p style={{
                    margin: 0,
                    color: '#1e40af',
                    fontSize: '0.875rem'
                  }}>
                    ✨ Verwenden Sie die erweiterte Ortssuche unten für präzise Ergebnisse und Karten-Integration
                  </p>
                </div>

                {/* Manual Input Fields */}
                <div style={{
                  display: 'grid',
                  gap: '1rem',
                  gridTemplateColumns: '1fr 1fr',
                  marginBottom: '1rem'
                }}>
                  <OpenStreetMapAutocomplete
                    value={newDestinationForm.name}
                    onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                    onPlaceSelect={handlePlaceSelect}
                    placeholder="Suche nach Zielen (z.B. 'Brandenburger Tor')"
                    style={{
                      gridColumn: '1 / -1'
                    }}
                  />
                  
                  <div style={{
                    gridColumn: '1 / -1',
                    position: 'relative'
                  }}>
                    <input
                      type="text"
                      placeholder="Adresse (wird automatisch gefüllt)"
                      value={newDestinationForm.location}
                      onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        paddingRight: '3rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                        borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                      }}
                      readOnly={!!newDestinationForm.coordinates}
                    />
                    <button
                      type="button"
                      onClick={handleOpenMapPicker}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.375rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Ort auf Karte auswählen"
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                      }}
                    >
                      <MapPin size={16} />
                    </button>
                  </div>
                </div>

                {/* Date Options */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  {newDestinationForm.category === DestinationCategory.HOTEL ? (
                    // Hotel mode: Always show end date as required
                    <div>
                      <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.75rem'
                      }}>
                        Abreisedatum *
                      </label>
                      <input
                        type="date"
                        value={newDestinationForm.endDate}
                        onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '0.875rem'
                        }}
                        required
                      />
                    </div>
                  ) : (
                    // Non-hotel mode: End date is hidden but automatically set
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      fontStyle: 'italic',
                      marginBottom: '0.5rem'
                    }}>
                      Enddatum wird automatisch auf das gleiche Datum gesetzt
                    </div>
                  )}
                </div>

                {/* Transport Mode */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Transportmodus
                  </label>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.5rem'
                  }}>
                    {[
                      { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={16} /> },
                      { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={16} /> },
                      { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={16} /> },
                      { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={16} /> }
                    ].map(({ mode, label, icon }) => (
                      <button
                        key={mode}
                        onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                        style={{
                          background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                          border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                          transition: 'all 0.2s'
                        }}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category Selection */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Kategorie
                  </label>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '0.5rem',
                    marginBottom: '0.75rem'
                  }}>
                    {Object.values(DestinationCategory).map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setNewDestinationForm(prev => ({ 
                            ...prev, 
                            category: category,
                            // Set endDate for hotels, keep current day date for others
                            endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                          }));
                        }}
                        style={{
                          background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                          border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '0.75rem 0.5rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.75rem',
                          fontWeight: '500',
                          color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                          transition: 'all 0.2s',
                          minHeight: '70px'
                        }}
                        onMouseOver={(e) => {
                          if (newDestinationForm.category !== category) {
                            e.currentTarget.style.background = '#f3f4f6';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (newDestinationForm.category !== category) {
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        <span style={{ fontSize: '1.5rem' }}>
                          {getCategoryIcon(category)}
                        </span>
                        <span style={{ textAlign: 'center', lineHeight: '1.2' }}>
                          {getCategoryLabel(category)}
                        </span>
                      </button>
                    ))}
                  </div>
                  
                  {newDestinationForm.category === DestinationCategory.HOTEL && (
                    <div style={{
                      marginTop: '0.75rem',
                      padding: '0.75rem',
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      color: '#0891b2'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🏨</span>
                        <span>Bei Hotels ist ein Abreisedatum erforderlich</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kosten & Bezahlt-Status */}
                <div style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.75rem'
                  }}>
                    Kosten & Bezahlung
                  </label>
                  
                  <div style={{
                    marginBottom: '1rem'
                  }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginBottom: '0.25rem'
                    }}>
                      Kosten (€)
                    </label>
                    <input
                      type="number"
                      placeholder="0"
                      value={newDestinationForm.actualCost || ''}
                      onChange={(e) => setNewDestinationForm(prev => ({ 
                        ...prev, 
                        actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '1rem'
                      }}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <input
                      type="checkbox"
                      id="isPaid-main"
                      checked={newDestinationForm.isPaid}
                      onChange={(e) => setNewDestinationForm(prev => ({ 
                        ...prev, 
                        isPaid: e.target.checked
                      }))}
                      style={{
                        width: '18px',
                        height: '18px'
                      }}
                    />
                    <label htmlFor="isPaid-main" style={{
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      color: '#374151'
                    }}>
                      Bereits bezahlt
                    </label>
                    {newDestinationForm.isPaid && (
                      <span style={{
                        fontSize: '0.75rem',
                        color: '#059669',
                        fontWeight: '500'
                      }}>
                        ✓ Bezahlt
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  marginTop: '1.5rem'
                }}>
                  <button
                    onClick={handleCreateDestination}
                    disabled={
                      !newDestinationForm.name || 
                      !newDestinationForm.location ||
                      (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                    }
                    style={{
                      background: (
                        !newDestinationForm.name || 
                        !newDestinationForm.location ||
                        (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                      ) ? '#9ca3af' : '#16a34a',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: (
                        !newDestinationForm.name || 
                        !newDestinationForm.location ||
                        (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                      ) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Check size={16} />
                    Erstellen
                  </button>
                  
                  <button
                    onClick={handleCancelCreation}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <X size={16} />
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          enhancedTimelineData.map((day, dayIndex) => (
            <div key={day.date} style={{
              borderBottom: dayIndex < enhancedTimelineData.length - 1 ? '1px solid #e5e7eb' : 'none'
            }}>
              {/* Day Header */}
              <div style={{
                background: '#f8fafc',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    📅 {formatDate(day.date)}
                  </h3>
                  <span style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {day.destinations.length} Ziele
                  </span>
                </div>

                {/* Day Statistics */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  <span>
                    <Route size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {Math.round(day.dayStats.totalDistance)}km
                  </span>
                  <span>
                    <DollarSign size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                    {formatCurrency(day.dayStats.totalCost)}
                  </span>
                </div>
              </div>

              {/* Day Timeline */}
              <div style={{ padding: '1rem 1.5rem' }}>
                {/* Add first destination button */}
                {!creatingDestination && day.destinations.length > 0 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '0.5rem'
                  }}>
                    <button
                      onClick={() => handleStartCreation(day.date, 'before', 0)}
                      style={{
                        background: 'white',
                        color: '#3b82f6',
                        border: '1px dashed #3b82f6',
                        borderRadius: '20px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'scale(1.02)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <Plus size={14} />
                      Ziel hinzufügen
                    </button>
                  </div>
                )}
                
                {day.destinations.map((dest, destIndex) => (
                  <div key={dest.id}>
                    {/* Add Destination Button - Between destinations only (not before first) */}
                    {!creatingDestination && destIndex > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '0.5rem'
                      }}>
                        <button
                          onClick={() => handleStartCreation(day.date, 'before', destIndex)}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px dashed #3b82f6',
                            borderRadius: '20px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Plus size={14} />
                          Ziel hinzufügen
                        </button>
                      </div>
                    )}

                    {/* Inline Creation Form - Before */}
                    {creatingDestination?.dayDate === day.date && 
                     creatingDestination?.position === 'before' && 
                     creatingDestination?.destinationIndex === destIndex && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Plus size={16} style={{ color: '#3b82f6' }} />
                          Neues Ziel vor "{dest.name}"
                        </h4>
                        
                        {/* Simplified Search Info */}
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.5rem'
                          }}>
                            <Search size={16} style={{ color: '#6b7280', marginRight: '0.5rem' }} />
                            <input
                              type="text"
                              placeholder="Ziel suchen..."
                              value={newDestinationForm.name}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, name: e.target.value }))}
                              style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontSize: '0.875rem',
                                background: 'transparent'
                              }}
                              autoFocus
                            />
                          </div>
                          
                          {/* Search Results Removed - Using OpenStreetMapAutocomplete below */}
                          {false && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              borderRadius: '0 0 6px 6px',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
                            }}>
                              {[].map((result, index) => (
                                <button
                                  key={index}
                                  onClick={() => {}}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    borderBottom: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ fontSize: '1rem' }}>
                                      {'📍'}
                                    </div>
                                    <div>
                                      <div style={{
                                        fontWeight: '500',
                                        color: '#1f2937'
                                      }}>
                                        {'Placeholder'}
                                      </div>
                                      <div style={{
                                        color: '#6b7280',
                                        fontSize: '0.7rem'
                                      }}>
                                        {'Not used'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Manual Input Fields */}
                        <div style={{
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: '1fr 1fr',
                          marginBottom: '0.75rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={newDestinationForm.name}
                            onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handlePlaceSelect}
                            placeholder="Ziel suchen (z.B. 'Brandenburger Tor')"
                            style={{
                              gridColumn: '1 / -1',
                              marginBottom: '0.75rem'
                            }}
                          />

                          {/* Location/Address Field with Map Picker */}
                          <div style={{ 
                            position: 'relative',
                            gridColumn: '1 / -1',
                            marginBottom: '0.75rem'
                          }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse (optional - aus Suche übernommen oder Karte nutzen)"
                              value={newDestinationForm.location}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem 3rem 0.75rem 0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!newDestinationForm.coordinates}
                            />
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2rem',
                                height: '2rem'
                              }}
                              title="Standort auf Karte auswählen"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Date Options */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                Abreisedatum
                              </label>
                              <input
                                type="date"
                                value={newDestinationForm.endDate}
                                onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={14} /> },
                              { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={14} /> },
                              { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={14} /> },
                              { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={14} /> }
                            ].map(({ mode, label, icon }) => (
                              <button
                                key={mode}
                                onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                                  border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kategorie
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            {Object.values(DestinationCategory).map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => {
                                  setNewDestinationForm(prev => ({ 
                                    ...prev, 
                                    category: category,
                                    // Set endDate for hotels, keep current day date for others
                                    endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                                  }));
                                }}
                                style={{
                                  background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                                  border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s',
                                  minHeight: '60px'
                                }}
                                onMouseOver={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = 'white';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.2rem' }}>
                                  {getCategoryIcon(category)}
                                </span>
                                <span>{getCategoryLabel(category)}</span>
                              </button>
                            ))}
                          </div>
                          
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              color: '#0c4a6e'
                            }}>
                              ℹ️ Hotels benötigen ein Abreisedatum
                            </div>
                          )}
                        </div>

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={newDestinationForm.actualCost || ''}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-before"
                              checked={newDestinationForm.isPaid}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '14px',
                                height: '14px'
                              }}
                            />
                            <label htmlFor="isPaid-before" style={{
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {newDestinationForm.isPaid && (
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end',
                          marginTop: '1rem'
                        }}>
                          <button
                            onClick={handleCreateDestination}
                            disabled={
                              !newDestinationForm.name || 
                              !newDestinationForm.location ||
                              (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                            }
                            style={{
                              background: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? '#9ca3af' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={14} />
                            Erstellen
                          </button>
                          
                          <button
                            onClick={handleCancelCreation}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Destination Block */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(dest, e)}
                      onDragOver={(e) => handleDragOver(e, day.date, destIndex)}
                      onDrop={(e) => handleDrop(e, day.date, destIndex)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1rem',
                        background: dragState.dragOverDay === day.date && dragState.dragOverIndex === destIndex 
                          ? '#f0f9ff' : '#fafafa',
                        borderRadius: '8px',
                        marginBottom: '0.5rem',
                        cursor: dragState.isDragging ? 'move' : 'pointer',
                        border: dragState.draggedItem?.id === dest.id ? '2px dashed #3b82f6' : '1px solid #e5e7eb',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => onDestinationClick?.(dest)}
                    >
                      {/* Drag Handle */}
                      <div style={{
                        marginRight: '1rem',
                        color: '#9ca3af',
                        cursor: 'move'
                      }}>
                        <GripVertical size={16} />
                      </div>


                      {/* Category Icon */}
                      <div style={{
                        fontSize: '1.25rem',
                        marginRight: '1rem'
                      }}>
                        {getCategoryIcon(dest.category)}
                      </div>

                      {/* Destination Info */}
                      <div style={{ flex: 1 }}>
                        <h4 style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937'
                        }}>
                          {dest.name}
                        </h4>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <span>{getCategoryLabel(dest.category)}</span>
                          <span>{dest.location}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {!editingDestination && !creatingDestination && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '0.5rem' }}>
                          {/* Edit Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(dest);
                            }}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px solid #3b82f6',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#3b82f6';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#3b82f6';
                          }}
                        >
                          <Edit size={14} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteDestination(dest.id);
                            }}
                          style={{
                            background: 'white',
                            color: '#dc2626',
                            border: '1px solid #dc2626',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#dc2626';
                            e.currentTarget.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.color = '#dc2626';
                          }}
                        >
                          <Trash2 size={14} />
                          </button>
                        </div>
                      )}

                    </div>

                    {/* Travel Time to Next Destination */}
                    {destIndex < day.destinations.length - 1 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0.5rem 0',
                        color: '#6b7280',
                        fontSize: '0.875rem'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#f9fafb',
                          padding: '0.5rem 1rem',
                          borderRadius: '20px',
                          border: '1px solid #e5e7eb'
                        }}>
                          <ArrowRight size={14} />
                          <span>
                            {calculateTravelTime(dest, day.destinations[destIndex + 1])}min Fahrt
                          </span>
                          {dest.coordinates && day.destinations[destIndex + 1].coordinates && (
                            <span>
                              • {Math.round(calculateDistance(dest.coordinates, day.destinations[destIndex + 1].coordinates!) * 1.4)}km
                            </span>
                          )}
                        </div>
                      </div>
                    )}


                    {/* Inline Edit Form */}
                    {editingDestination === dest.id && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '2px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        margin: '1rem 0',
                        marginLeft: '6rem'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Edit size={16} style={{ color: '#3b82f6' }} />
                          {dest.name} bearbeiten
                        </h4>

                        {/* Name and Location */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={editForm.name}
                            onChange={(value) => setEditForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handleEditPlaceSelect}
                            placeholder="Ziel-Name"
                            style={{ gridColumn: '1 / -1' }}
                          />
                          
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse"
                              value={editForm.location}
                              onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                paddingRight: '3rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: editForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: editForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!editForm.coordinates}
                            />
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.375rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Ort auf Karte auswählen"
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = '#2563eb';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = '#3b82f6';
                              }}
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Time and Duration */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto auto auto 1fr',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>

                          <div>
                            <label style={{
                              display: 'block',
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kategorie
                            </label>
                            <select
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as DestinationCategory }))}
                              style={{
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                background: 'white'
                              }}
                            >
                              <option value={DestinationCategory.ATTRACTION}>Sehenswürdigkeit</option>
                              <option value={DestinationCategory.RESTAURANT}>Restaurant</option>
                              <option value={DestinationCategory.HOTEL}>Hotel</option>
                              <option value={DestinationCategory.MUSEUM}>Museum</option>
                              <option value={DestinationCategory.NATURE}>Natur</option>
                              <option value={DestinationCategory.ENTERTAINMENT}>Unterhaltung</option>
                            </select>
                          </div>
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '1rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus zum nächsten Ziel
                          </label>
                          <div style={{
                            display: 'flex',
                            gap: '0.5rem',
                            flexWrap: 'wrap'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, icon: <Car size={16} />, label: 'Auto' },
                              { mode: TransportMode.WALKING, icon: <Mountain size={16} />, label: 'Wandern' },
                              { mode: TransportMode.BICYCLE, icon: <Bike size={16} />, label: 'Fahrrad' },
                              { mode: TransportMode.PUBLIC_TRANSPORT, icon: <Route size={16} />, label: 'Öffentlich' }
                            ].map(({ mode, icon, label }) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => setEditForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.5rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #e5e7eb',
                                  background: editForm.transportMode === mode ? '#3b82f6' : 'white',
                                  color: editForm.transportMode === mode ? 'white' : '#6b7280',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '1rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6b7280',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={editForm.actualCost || ''}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-edit"
                              checked={editForm.isPaid}
                              onChange={(e) => setEditForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '16px',
                                height: '16px'
                              }}
                            />
                            <label htmlFor="isPaid-edit" style={{
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {editForm.isPaid && (
                              <span style={{
                                fontSize: '0.75rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓ Bezahlt
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '0.75rem',
                          justifyContent: 'flex-end'
                        }}>
                          <button
                            onClick={handleCancelEdit}
                            style={{
                              background: '#f3f4f6',
                              color: '#6b7280',
                              border: '1px solid #e5e7eb',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            style={{
                              background: '#10b981',
                              color: 'white',
                              border: '1px solid #10b981',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = '#059669';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = '#10b981';
                            }}
                          >
                            <Save size={14} />
                            Speichern
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add Destination Button - Only after the last destination */}
                    {!creatingDestination && destIndex === day.destinations.length - 1 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        margin: '0.5rem 0'
                      }}>
                        <button
                          onClick={() => handleStartCreation(day.date, 'after', destIndex)}
                          style={{
                            background: 'white',
                            color: '#3b82f6',
                            border: '1px dashed #3b82f6',
                            borderRadius: '20px',
                            padding: '0.5rem 1rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = '#eff6ff';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'scale(1)';
                          }}
                        >
                          <Plus size={14} />
                          Ziel hinzufügen
                        </button>
                      </div>
                    )}

                    {/* Inline Creation Form - After */}
                    {creatingDestination?.dayDate === day.date && 
                     creatingDestination?.position === 'after' && 
                     creatingDestination?.destinationIndex === destIndex && (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #3b82f6',
                        borderRadius: '12px',
                        padding: '1rem',
                        margin: '1rem 0'
                      }}>
                        <h4 style={{
                          margin: '0 0 1rem 0',
                          fontSize: '1rem',
                          fontWeight: '600',
                          color: '#1f2937',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <Plus size={16} style={{ color: '#3b82f6' }} />
                          Neues Ziel nach "{dest.name}"
                        </h4>
                        
                        {/* Simplified Search Info */}
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            padding: '0.5rem'
                          }}>
                            <Search size={16} style={{ color: '#6b7280', marginRight: '0.5rem' }} />
                            <input
                              type="text"
                              placeholder="Ziel suchen..."
                              value={newDestinationForm.name}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, name: e.target.value }))}
                              style={{
                                border: 'none',
                                outline: 'none',
                                flex: 1,
                                fontSize: '0.875rem',
                                background: 'transparent'
                              }}
                              autoFocus
                            />
                          </div>
                          
                          {/* Search Results Removed - Using OpenStreetMapAutocomplete below */}
                          {false && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'white',
                              border: '1px solid #e5e7eb',
                              borderTop: 'none',
                              borderRadius: '0 0 6px 6px',
                              maxHeight: '150px',
                              overflowY: 'auto',
                              zIndex: 10,
                              boxShadow: '0 2px 4px rgb(0 0 0 / 0.1)'
                            }}>
                              {[].map((result, index) => (
                                <button
                                  key={index}
                                  onClick={() => {}}
                                  style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    textAlign: 'left',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    borderBottom: 'none',
                                    fontSize: '0.75rem'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                  }}
                                >
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                  }}>
                                    <div style={{ fontSize: '1rem' }}>
                                      {'📍'}
                                    </div>
                                    <div>
                                      <div style={{
                                        fontWeight: '500',
                                        color: '#1f2937'
                                      }}>
                                        {'Placeholder'}
                                      </div>
                                      <div style={{
                                        color: '#6b7280',
                                        fontSize: '0.7rem'
                                      }}>
                                        {'Not used'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Manual Input Fields */}
                        <div style={{
                          display: 'grid',
                          gap: '0.75rem',
                          gridTemplateColumns: '1fr 1fr',
                          marginBottom: '0.75rem'
                        }}>
                          <OpenStreetMapAutocomplete
                            value={newDestinationForm.name}
                            onChange={(value) => setNewDestinationForm(prev => ({ ...prev, name: value }))}
                            onPlaceSelect={handlePlaceSelect}
                            placeholder="Ziel suchen (z.B. 'Brandenburger Tor')"
                            style={{
                              gridColumn: '1 / -1',
                              marginBottom: '0.75rem'
                            }}
                          />

                          {/* Location/Address Field with Map Picker */}
                          <div style={{ 
                            position: 'relative',
                            gridColumn: '1 / -1',
                            marginBottom: '0.75rem'
                          }}>
                            <input
                              type="text"
                              placeholder="Ort/Adresse (optional - aus Suche übernommen oder Karte nutzen)"
                              value={newDestinationForm.location}
                              onChange={(e) => setNewDestinationForm(prev => ({ ...prev, location: e.target.value }))}
                              style={{
                                width: '100%',
                                padding: '0.75rem 3rem 0.75rem 0.75rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: newDestinationForm.coordinates ? '#f0f9ff' : 'white',
                                borderColor: newDestinationForm.coordinates ? '#0ea5e9' : '#e5e7eb'
                              }}
                              readOnly={!!newDestinationForm.coordinates}
                            />
                            <button
                              type="button"
                              onClick={handleOpenMapPicker}
                              style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.25rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '2rem',
                                height: '2rem'
                              }}
                              title="Standort auf Karte auswählen"
                            >
                              <MapPin size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Date Options */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{ marginBottom: '0.5rem' }}>
                              <label style={{
                                display: 'block',
                                fontSize: '0.7rem',
                                color: '#6b7280',
                                marginBottom: '0.25rem'
                              }}>
                                Abreisedatum
                              </label>
                              <input
                                type="date"
                                value={newDestinationForm.endDate}
                                onChange={(e) => setNewDestinationForm(prev => ({ ...prev, endDate: e.target.value }))}
                                style={{
                                  width: '100%',
                                  padding: '0.5rem',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Transport Mode */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Transportmodus
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '0.5rem'
                          }}>
                            {[
                              { mode: TransportMode.DRIVING, label: 'Auto', icon: <Car size={14} /> },
                              { mode: TransportMode.WALKING, label: 'Wanderung', icon: <Mountain size={14} /> },
                              { mode: TransportMode.BICYCLE, label: 'Fahrrad', icon: <Bike size={14} /> },
                              { mode: TransportMode.PUBLIC_TRANSPORT, label: 'Öffentlich', icon: <Route size={14} /> }
                            ].map(({ mode, label, icon }) => (
                              <button
                                key={mode}
                                onClick={() => setNewDestinationForm(prev => ({ ...prev, transportMode: mode }))}
                                style={{
                                  background: newDestinationForm.transportMode === mode ? '#eff6ff' : 'white',
                                  border: newDestinationForm.transportMode === mode ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  fontSize: '0.75rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.transportMode === mode ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s'
                                }}
                              >
                                {icon}
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kategorie
                          </label>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '0.5rem',
                            marginBottom: '0.5rem'
                          }}>
                            {Object.values(DestinationCategory).map((category) => (
                              <button
                                key={category}
                                type="button"
                                onClick={() => {
                                  setNewDestinationForm(prev => ({ 
                                    ...prev, 
                                    category: category,
                                    // Set endDate for hotels, keep current day date for others
                                    endDate: category === DestinationCategory.HOTEL ? '' : (creatingDestination?.dayDate || prev.endDate)
                                  }));
                                }}
                                style={{
                                  background: newDestinationForm.category === category ? '#dbeafe' : 'white',
                                  border: newDestinationForm.category === category ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                  borderRadius: '6px',
                                  padding: '0.5rem 0.25rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '0.2rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '500',
                                  color: newDestinationForm.category === category ? '#1e40af' : '#374151',
                                  transition: 'all 0.2s',
                                  minHeight: '60px'
                                }}
                                onMouseOver={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = '#f3f4f6';
                                  }
                                }}
                                onMouseOut={(e) => {
                                  if (newDestinationForm.category !== category) {
                                    e.currentTarget.style.background = 'white';
                                  }
                                }}
                              >
                                <span style={{ fontSize: '1.2rem' }}>
                                  {getCategoryIcon(category)}
                                </span>
                                <span>{getCategoryLabel(category)}</span>
                              </button>
                            ))}
                          </div>
                          
                          {newDestinationForm.category === DestinationCategory.HOTEL && (
                            <div style={{
                              marginTop: '0.5rem',
                              padding: '0.5rem',
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              color: '#0c4a6e'
                            }}>
                              ℹ️ Hotels benötigen ein Abreisedatum
                            </div>
                          )}
                        </div>

                        {/* Kosten und Bezahlt-Status */}
                        <div style={{
                          background: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.75rem',
                          marginBottom: '0.75rem'
                        }}>
                          <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                          }}>
                            Kosten & Bezahlung
                          </label>
                          
                          <div style={{
                            marginBottom: '0.75rem'
                          }}>
                            <label style={{
                              display: 'block',
                              fontSize: '0.7rem',
                              color: '#6b7280',
                              marginBottom: '0.25rem'
                            }}>
                              Kosten (€)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={newDestinationForm.actualCost || ''}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                actualCost: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                              min="0"
                              step="0.01"
                            />
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <input
                              type="checkbox"
                              id="isPaid-after"
                              checked={newDestinationForm.isPaid}
                              onChange={(e) => setNewDestinationForm(prev => ({ 
                                ...prev, 
                                isPaid: e.target.checked,
                                actualCost: e.target.checked ? (prev.actualCost || 0) : prev.actualCost
                              }))}
                              style={{
                                width: '14px',
                                height: '14px'
                              }}
                            />
                            <label htmlFor="isPaid-after" style={{
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: '#374151'
                            }}>
                              Bereits bezahlt
                            </label>
                            {newDestinationForm.isPaid && (
                              <span style={{
                                fontSize: '0.7rem',
                                color: '#059669',
                                fontWeight: '500'
                              }}>
                                ✓
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div style={{
                          display: 'flex',
                          gap: '0.5rem',
                          justifyContent: 'flex-end',
                          marginTop: '1rem'
                        }}>
                          <button
                            onClick={handleCreateDestination}
                            disabled={
                              !newDestinationForm.name || 
                              !newDestinationForm.location ||
                              (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                            }
                            style={{
                              background: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? '#9ca3af' : '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: (
                                !newDestinationForm.name || 
                                !newDestinationForm.location ||
                                (newDestinationForm.category === DestinationCategory.HOTEL && !newDestinationForm.endDate)
                              ) ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={14} />
                            Erstellen
                          </button>
                          
                          <button
                            onClick={handleCancelCreation}
                            style={{
                              background: '#6b7280',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.5rem 1rem',
                              fontSize: '0.875rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={14} />
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Mobile Navigation */}
      <div style={{
        display: window.innerWidth < 768 ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        marginTop: '2rem',
        padding: '1rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <button
          onClick={() => navigateDay('prev')}
          disabled={currentDayIndex <= 0}
          style={{
            background: currentDayIndex <= 0 ? '#f3f4f6' : '#3b82f6',
            color: currentDayIndex <= 0 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            cursor: currentDayIndex <= 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ChevronLeft size={16} />
          Voriger Tag
        </button>

        <span style={{
          fontSize: '0.875rem',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          {currentDayIndex + 1} von {enhancedTimelineData.length}
        </span>

        <button
          onClick={() => navigateDay('next')}
          disabled={currentDayIndex >= enhancedTimelineData.length - 1}
          style={{
            background: currentDayIndex >= enhancedTimelineData.length - 1 ? '#f3f4f6' : '#3b82f6',
            color: currentDayIndex >= enhancedTimelineData.length - 1 ? '#9ca3af' : 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '0.75rem',
            cursor: currentDayIndex >= enhancedTimelineData.length - 1 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Nächster Tag
          <ChevronRight size={16} />
        </button>
      </div>
    </div>

    {/* Map Picker Modal - Outside main container to avoid nesting issues */}
    {showMapPicker && (
      <div style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        zIndex: 9999
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
          width: '90vw', 
          maxWidth: '800px',
          maxHeight: '90vh', 
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Header */}
          <div style={{ 
            padding: '1.5rem', 
            borderBottom: '1px solid #e5e7eb', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                📍 Standort auswählen
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>
                Klicken Sie auf die Karte, um einen genauen Standort auszuwählen
              </p>
            </div>
            <button
              onClick={handleCloseMapPicker}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#6b7280', 
                fontSize: '1.5rem', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                padding: '0.5rem',
                borderRadius: '4px',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#374151';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              ✕
            </button>
          </div>

          {/* Interactive Map */}
          <div style={{ height: '500px', position: 'relative' }}>
            <MapErrorBoundary>
              <LeafletMapOnly
                coordinates={
                  editingDestination ? 
                    (editForm.coordinates || { lat: 50.1109, lng: 8.6821 }) : 
                    (newDestinationForm.coordinates || { lat: 50.1109, lng: 8.6821 })
                }
                onLocationSelect={(coords) => {
                  console.log('🗺️ Map location selected:', coords);
                  handleMapLocationSelect(coords);
                  setShowMapPicker(false);
                }}
                height="500px"
                zoom={6}
              />
            </MapErrorBoundary>
          </div>

          {/* Footer */}
          <div style={{ 
            padding: '1.5rem', 
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc'
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🗺️ OpenStreetMap Integration
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                Kostenlos, datenschutzfreundlich und Open Source
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleCloseMapPicker}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                  e.currentTarget.style.borderColor = '#9ca3af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default EnhancedTimelineView;