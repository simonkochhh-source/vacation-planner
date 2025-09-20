import React from 'react';
import { useSupabaseApp } from '../../stores/SupabaseAppContext';
import { X, RotateCcw, Star, Tag, Calendar, DollarSign } from 'lucide-react';
import { 
  DestinationCategory, 
  DestinationStatus,
  DestinationFilters 
} from '../../types';
import { getCategoryIcon, getCategoryLabel, formatCurrency, formatDate } from '../../utils';

interface FilterSummaryProps {
  showClearAll?: boolean;
  compact?: boolean;
}

const FilterSummary: React.FC<FilterSummaryProps> = ({ 
  showClearAll = true,
  compact = false
}) => {
  const { uiState, updateUIState } = useSupabaseApp();

  const removeFilter = (filterType: keyof DestinationFilters, value?: any) => {
    const currentFilters = uiState.filters;
    let newFilters = { ...currentFilters };

    if (Array.isArray(currentFilters[filterType]) && value !== undefined) {
      // Remove specific value from array filter
      const currentArray = currentFilters[filterType] as any[];
      const filteredArray = currentArray.filter((item: any) => item !== value);
      
      // Remove empty arrays or set the filtered array
      if (filteredArray.length === 0) {
        delete newFilters[filterType];
      } else {
        (newFilters as any)[filterType] = filteredArray;
      }
    } else {
      // Remove entire filter
      delete newFilters[filterType];
    }

    updateUIState({ filters: newFilters });
  };

  const clearSearchQuery = () => {
    updateUIState({ searchQuery: '' });
  };

  const clearAllFilters = () => {
    updateUIState({ 
      filters: {},
      searchQuery: ''
    });
  };

  // Generate filter chips
  const filterChips: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    color: string;
    onRemove: () => void;
  }> = [];

  // Search query chip
  if (uiState.searchQuery) {
    filterChips.push({
      id: 'search',
      label: `"${uiState.searchQuery}"`,
      icon: <span style={{ fontSize: '0.75rem' }}>🔍</span>,
      color: '#3b82f6',
      onRemove: clearSearchQuery
    });
  }

  // Category filters
  if (uiState.filters.category?.length) {
    uiState.filters.category.forEach(category => {
      filterChips.push({
        id: `category-${category}`,
        label: getCategoryLabel(category),
        icon: <span style={{ fontSize: '0.75rem' }}>{getCategoryIcon(category)}</span>,
        color: '#8b5cf6',
        onRemove: () => removeFilter('category', category)
      });
    });
  }

  // Status filters
  if (uiState.filters.status?.length) {
    const statusConfig = {
      [DestinationStatus.PLANNED]: { label: 'Geplant', emoji: '⏳', color: '#3b82f6' },
      [DestinationStatus.VISITED]: { label: 'Besucht', emoji: '✅', color: '#10b981' },
      [DestinationStatus.SKIPPED]: { label: 'Übersprungen', emoji: '❌', color: '#ef4444' },
      [DestinationStatus.IN_PROGRESS]: { label: 'In Bearbeitung', emoji: '🔄', color: '#f59e0b' }
    };

    uiState.filters.status.forEach(status => {
      const config = statusConfig[status];
      filterChips.push({
        id: `status-${status}`,
        label: config.label,
        icon: <span style={{ fontSize: '0.75rem' }}>{config.emoji}</span>,
        color: config.color,
        onRemove: () => removeFilter('status', status)
      });
    });
  }


  // Tag filters
  if (uiState.filters.tags?.length) {
    uiState.filters.tags.forEach(tag => {
      filterChips.push({
        id: `tag-${tag}`,
        label: tag,
        icon: <Tag size={12} />,
        color: '#0891b2',
        onRemove: () => removeFilter('tags', tag)
      });
    });
  }

  // Date range filter
  if (uiState.filters.dateRange) {
    const { start, end } = uiState.filters.dateRange;
    filterChips.push({
      id: 'dateRange',
      label: `${formatDate(start)} - ${formatDate(end)}`,
      icon: <Calendar size={12} />,
      color: '#dc2626',
      onRemove: () => removeFilter('dateRange')
    });
  }

  // Budget range filter
  if (uiState.filters.budgetRange) {
    const { min, max } = uiState.filters.budgetRange;
    filterChips.push({
      id: 'budgetRange',
      label: `${formatCurrency(min)} - ${formatCurrency(max)}`,
      icon: <DollarSign size={12} />,
      color: '#059669',
      onRemove: () => removeFilter('budgetRange')
    });
  }

  if (filterChips.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      gap: compact ? '0.5rem' : '0.75rem',
      padding: compact ? '0.5rem' : '1rem',
      background: '#fefce8',
      border: '1px solid #fbbf24',
      borderRadius: '12px',
      marginBottom: '1rem'
    }}>
      
      {/* Header */}
      {!compact && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem'
        }}>
          <span style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🎯 Aktive Filter ({filterChips.length})
          </span>
          
          {showClearAll && (
            <button
              onClick={clearAllFilters}
              style={{
                background: 'transparent',
                border: '1px solid #d97706',
                borderRadius: '6px',
                padding: '0.25rem 0.5rem',
                cursor: 'pointer',
                color: '#d97706',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#d97706';
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#d97706';
              }}
            >
              <RotateCcw size={12} />
              Alle zurücksetzen
            </button>
          )}
        </div>
      )}

      {/* Filter Chips */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center'
      }}>
        {filterChips.map(chip => (
          <div
            key={chip.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              background: 'white',
              border: `1px solid ${chip.color}`,
              borderRadius: '20px',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              color: chip.color,
              fontWeight: '500',
              maxWidth: compact ? '120px' : 'none',
              overflow: 'hidden'
            }}
          >
            {chip.icon && (
              <span style={{ 
                display: 'flex', 
                alignItems: 'center', 
                flexShrink: 0 
              }}>
                {chip.icon}
              </span>
            )}
            
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1
            }}>
              {chip.label}
            </span>
            
            <button
              onClick={chip.onRemove}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'inherit',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                flexShrink: 0,
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = chip.color;
                e.currentTarget.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = chip.color;
              }}
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* Clear All button for compact mode */}
        {compact && showClearAll && filterChips.length > 1 && (
          <button
            onClick={clearAllFilters}
            style={{
              background: '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: '600',
              flexShrink: 0,
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#b45309'}
            onMouseOut={(e) => e.currentTarget.style.background = '#d97706'}
            title="Alle Filter zurücksetzen"
          >
            <RotateCcw size={12} />
          </button>
        )}
      </div>

      {/* Results count */}
      {!compact && (
        <div style={{
          fontSize: '0.75rem',
          color: '#92400e',
          fontStyle: 'italic',
          marginTop: '0.5rem'
        }}>
          Filter werden auf alle Ansichten angewendet (Liste, Karte, Timeline)
        </div>
      )}
    </div>
  );
};

export default FilterSummary;