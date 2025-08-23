import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Edit3, 
  Copy, 
  X
} from 'lucide-react';
import { Destination, DestinationStatus, DestinationCategory } from '../../types';
import { getCategoryLabel } from '../../utils';

interface BatchActionsProps {
  selectedDestinations: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  destinations: Destination[];
  onBatchComplete: () => void;
}

const BatchActions: React.FC<BatchActionsProps> = ({
  selectedDestinations,
  onSelectionChange,
  destinations,
  onBatchComplete
}) => {
  const { updateDestination, deleteDestination, createDestination } = useApp();
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [batchEditData, setBatchEditData] = useState({
    status: '' as DestinationStatus | '',
    category: '' as DestinationCategory | '',
    priority: '',
    tags: ''
  });

  const selectedCount = selectedDestinations.length;
  const allSelected = destinations.length > 0 && selectedDestinations.length === destinations.length;
  const someSelected = selectedDestinations.length > 0 && selectedDestinations.length < destinations.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(destinations.map(dest => dest.id));
    }
  };

  const handleBatchDelete = async () => {
    if (window.confirm(`Möchten Sie wirklich ${selectedCount} Ziele löschen?`)) {
      try {
        for (const destId of selectedDestinations) {
          await deleteDestination(destId);
        }
        onSelectionChange([]);
        onBatchComplete();
      } catch (error) {
        console.error('Batch delete failed:', error);
        alert('Fehler beim Löschen der Ziele');
      }
    }
  };

  const handleBatchStatusChange = async (newStatus: DestinationStatus) => {
    try {
      for (const destId of selectedDestinations) {
        await updateDestination(destId, { status: newStatus });
      }
      onSelectionChange([]);
      onBatchComplete();
    } catch (error) {
      console.error('Batch status change failed:', error);
      alert('Fehler beim Ändern des Status');
    }
  };

  const handleBatchEdit = async () => {
    try {
      const updates: Partial<Destination> = {};
      
      if (batchEditData.status) updates.status = batchEditData.status;
      if (batchEditData.category) updates.category = batchEditData.category;
      if (batchEditData.priority) updates.priority = parseInt(batchEditData.priority);
      if (batchEditData.tags) {
        const newTags = batchEditData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        updates.tags = newTags;
      }

      for (const destId of selectedDestinations) {
        await updateDestination(destId, updates);
      }
      
      onSelectionChange([]);
      setShowBatchEdit(false);
      setBatchEditData({ status: '', category: '', priority: '', tags: '' });
      onBatchComplete();
    } catch (error) {
      console.error('Batch edit failed:', error);
      alert('Fehler beim Bearbeiten der Ziele');
    }
  };

  const handleDuplicateDestinations = async () => {
    try {
      const selectedDests = destinations.filter(dest => selectedDestinations.includes(dest.id));
      
      for (const dest of selectedDests) {
        const duplicateData = {
          name: `${dest.name} (Kopie)`,
          location: dest.location,
          coordinates: dest.coordinates,
          startDate: dest.startDate,
          endDate: dest.endDate,
          startTime: dest.startTime,
          endTime: dest.endTime,
          category: dest.category,
          priority: dest.priority,
          budget: dest.budget,
          notes: dest.notes,
          tags: [...dest.tags],
          color: dest.color
        };
        
        await createDestination(duplicateData);
      }
      
      onSelectionChange([]);
      onBatchComplete();
    } catch (error) {
      console.error('Duplicate destinations failed:', error);
      alert('Fehler beim Duplizieren der Ziele');
    }
  };

  if (selectedCount === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        marginBottom: '1rem'
      }}>
        <button
          onClick={handleSelectAll}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}
        >
          <Square size={16} />
          Alle auswählen ({destinations.length})
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: '#dbeafe',
      border: '1px solid #3b82f6',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: showBatchEdit ? '1rem' : 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleSelectAll}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: '#1f2937',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            {allSelected ? <CheckSquare size={16} /> : <Square size={16} />}
            {selectedCount} von {destinations.length} ausgewählt
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Quick Status Change Buttons */}
          <button
            onClick={() => handleBatchStatusChange(DestinationStatus.PLANNED)}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#374151'
            }}
            title="Als geplant markieren"
          >
            Geplant
          </button>
          
          <button
            onClick={() => handleBatchStatusChange(DestinationStatus.VISITED)}
            style={{
              background: '#dcfce7',
              border: '1px solid #16a34a',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '500',
              color: '#16a34a'
            }}
            title="Als besucht markieren"
          >
            Besucht
          </button>

          <button
            onClick={() => setShowBatchEdit(!showBatchEdit)}
            style={{
              background: '#fbbf24',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'white'
            }}
            title="Batch bearbeiten"
          >
            <Edit3 size={14} />
          </button>

          <button
            onClick={handleDuplicateDestinations}
            style={{
              background: '#8b5cf6',
              border: '1px solid #7c3aed',
              borderRadius: '6px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'white'
            }}
            title="Duplizieren"
          >
            <Copy size={14} />
          </button>

          <button
            onClick={handleBatchDelete}
            style={{
              background: '#ef4444',
              border: '1px solid #dc2626',
              borderRadius: '6px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'white'
            }}
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>

          <button
            onClick={() => onSelectionChange([])}
            style={{
              background: 'transparent',
              border: '1px solid #9ca3af',
              borderRadius: '6px',
              padding: '0.5rem',
              cursor: 'pointer',
              color: '#6b7280'
            }}
            title="Auswahl aufheben"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {showBatchEdit && (
        <div style={{
          background: 'white',
          borderRadius: '6px',
          padding: '1rem',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            margin: '0 0 1rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Batch-Bearbeitung ({selectedCount} Ziele)
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* Status */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Status
              </label>
              <select
                value={batchEditData.status}
                onChange={(e) => setBatchEditData(prev => ({ ...prev, status: e.target.value as DestinationStatus }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Nicht ändern</option>
                <option value={DestinationStatus.PLANNED}>Geplant</option>
                <option value={DestinationStatus.VISITED}>Besucht</option>
                <option value={DestinationStatus.SKIPPED}>Übersprungen</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Kategorie
              </label>
              <select
                value={batchEditData.category}
                onChange={(e) => setBatchEditData(prev => ({ ...prev, category: e.target.value as DestinationCategory }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Nicht ändern</option>
                {Object.values(DestinationCategory).map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Priorität
              </label>
              <select
                value={batchEditData.priority}
                onChange={(e) => setBatchEditData(prev => ({ ...prev, priority: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              >
                <option value="">Nicht ändern</option>
                <option value="1">1 - Niedrig</option>
                <option value="2">2</option>
                <option value="3">3 - Mittel</option>
                <option value="4">4</option>
                <option value="5">5 - Hoch</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Tags (ersetzen)
              </label>
              <input
                type="text"
                value={batchEditData.tags}
                onChange={(e) => setBatchEditData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Tag1, Tag2, Tag3"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              onClick={() => setShowBatchEdit(false)}
              style={{
                background: 'transparent',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}
            >
              Abbrechen
            </button>
            
            <button
              onClick={handleBatchEdit}
              style={{
                background: '#3b82f6',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: 'white'
              }}
            >
              Änderungen anwenden
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchActions;