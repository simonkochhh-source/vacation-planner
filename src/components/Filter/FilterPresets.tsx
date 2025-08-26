import React, { useState, useMemo } from 'react';
import { useApp } from '../../stores/AppContext';
import { 
  Bookmark, 
  BookmarkCheck,
  Plus,
  Edit,
  Trash2,
  Star,
  MapPin,
  Calendar,
  Clock,
  DollarSign,
  Filter
} from 'lucide-react';
import { DestinationFilters, DestinationCategory, DestinationStatus } from '../../types';

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: DestinationFilters;
  icon: string;
  color: string;
  isBuiltIn: boolean;
  createdAt: string;
}

interface FilterPresetsProps {
  onApplyPreset?: (filters: DestinationFilters) => void;
}

const FilterPresets: React.FC<FilterPresetsProps> = ({ onApplyPreset }) => {
  const { uiState, updateUIState } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');
  const [savedPresets, setSavedPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('vacation-planner-filter-presets');
    return saved ? JSON.parse(saved) : [];
  });

  // Built-in presets
  const builtInPresets: FilterPreset[] = [
    {
      id: 'today',
      name: 'Heute',
      description: 'Alle Aktivitäten für heute',
      filters: {
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      },
      icon: '📅',
      color: '#3b82f6',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'free-activities',
      name: 'Kostenlos',
      description: 'Aktivitäten ohne Budget',
      filters: {
        budgetRange: { min: 0, max: 0 }
      },
      icon: '🆓',
      color: '#10b981',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'museums',
      name: 'Museen',
      description: 'Alle Museen und kulturelle Stätten',
      filters: {
        category: [DestinationCategory.MUSEUM, DestinationCategory.CULTURAL]
      },
      icon: '🏛️',
      color: '#8b5cf6',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'food-drink',
      name: 'Essen & Trinken',
      description: 'Restaurants und Cafés',
      filters: {
        category: [DestinationCategory.RESTAURANT]
      },
      icon: '🍽️',
      color: '#f59e0b',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'outdoor',
      name: 'Outdoor',
      description: 'Natur und Outdoor-Aktivitäten',
      filters: {
        category: [DestinationCategory.NATURE, DestinationCategory.SPORTS]
      },
      icon: '🌳',
      color: '#059669',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'planned',
      name: 'Geplant',
      description: 'Noch nicht besuchte Ziele',
      filters: {
        status: [DestinationStatus.PLANNED]
      },
      icon: '⏳',
      color: '#3b82f6',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    },
    {
      id: 'completed',
      name: 'Erledigt',
      description: 'Bereits besuchte Ziele',
      filters: {
        status: [DestinationStatus.VISITED]
      },
      icon: '✅',
      color: '#10b981',
      isBuiltIn: true,
      createdAt: '2024-08-20'
    }
  ];

  const allPresets = [...builtInPresets, ...savedPresets];

  // Get current filter fingerprint for matching
  const currentFilterFingerprint = useMemo(() => {
    return JSON.stringify(uiState.filters);
  }, [uiState.filters]);

  const savePresets = (presets: FilterPreset[]) => {
    setSavedPresets(presets);
    localStorage.setItem('vacation-planner-filter-presets', JSON.stringify(presets));
  };

  const handleSaveCurrentFilter = () => {
    if (!newPresetName.trim()) return;

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      description: newPresetDescription.trim(),
      filters: { ...uiState.filters },
      icon: '🔖',
      color: '#6b7280',
      isBuiltIn: false,
      createdAt: new Date().toISOString()
    };

    savePresets([...savedPresets, newPreset]);
    setNewPresetName('');
    setNewPresetDescription('');
    setShowCreateModal(false);
  };

  const handleDeletePreset = (presetId: string) => {
    if (window.confirm('Diesen Filter-Preset löschen?')) {
      savePresets(savedPresets.filter(p => p.id !== presetId));
    }
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    updateUIState({ filters: preset.filters });
    onApplyPreset?.(preset.filters);
  };

  const isCurrentlyActive = (preset: FilterPreset) => {
    return JSON.stringify(preset.filters) === currentFilterFingerprint;
  };

  const hasActiveFilters = Object.keys(uiState.filters).some(key => {
    const value = (uiState.filters as any)[key];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #f3f4f6',
        background: '#fafafa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bookmark size={18} color="#6b7280" />
          <span style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
            Filter-Presets
          </span>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
          >
            <Plus size={14} />
            Speichern
          </button>
        )}
      </div>

      {/* Presets Grid */}
      <div style={{ padding: '1rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '0.75rem'
        }}>
          {allPresets.map((preset) => {
            const isActive = isCurrentlyActive(preset);
            
            return (
              <div
                key={preset.id}
                style={{
                  background: isActive ? `${preset.color}15` : 'white',
                  border: isActive ? `2px solid ${preset.color}` : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1rem',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s',
                  minHeight: '100px'
                }}
                onClick={() => handleApplyPreset(preset)}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Preset Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>{preset.icon}</span>
                    {isActive && <BookmarkCheck size={16} color={preset.color} />}
                  </div>

                  {!preset.isBuiltIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePreset(preset.id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        opacity: 0.7,
                        transition: 'opacity 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '0.7'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Preset Content */}
                <div>
                  <h4 style={{
                    margin: '0 0 0.25rem 0',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: isActive ? preset.color : '#374151'
                  }}>
                    {preset.name}
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    lineHeight: '1.4'
                  }}>
                    {preset.description}
                  </p>
                </div>

                {/* Filter Summary */}
                <div style={{
                  marginTop: '0.75rem',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.25rem'
                }}>
                  {Object.entries(preset.filters).map(([key, value]) => {
                    if (!value || (Array.isArray(value) && value.length === 0)) return null;
                    
                    const getFilterIcon = () => {
                      switch (key) {
                        case 'category': return <Filter size={10} />;
                        case 'status': return <Clock size={10} />;
                        case 'dateRange': return <Calendar size={10} />;
                        case 'budgetRange': return <DollarSign size={10} />;
                        case 'tags': return <MapPin size={10} />;
                        default: return <Filter size={10} />;
                      }
                    };

                    return (
                      <span
                        key={key}
                        style={{
                          background: isActive ? preset.color : '#f3f4f6',
                          color: isActive ? 'white' : '#6b7280',
                          borderRadius: '8px',
                          padding: '0.125rem 0.375rem',
                          fontSize: '0.65rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {getFilterIcon()}
                        {key === 'dateRange' ? 'Datum' :
                         key === 'budgetRange' ? 'Budget' :
                         key === 'category' ? 'Kategorie' :
                         key === 'status' ? 'Status' :
                         key === 'tags' ? 'Tags' : key}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Preset Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '400px',
            padding: '1.5rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Filter-Preset speichern
            </h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Name *
              </label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="z.B. Meine Lieblingsmuseen"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Beschreibung
              </label>
              <textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                placeholder="Kurze Beschreibung des Filters..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveCurrentFilter}
                disabled={!newPresetName.trim()}
                style={{
                  background: newPresetName.trim() ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  cursor: newPresetName.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterPresets;