import React, { useState, useMemo } from 'react';
import { useApp } from '../../stores/AppContext';
import { 
  Filter, 
  Calendar,
  DollarSign,
  Star,
  Tag,
  MapPin,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';
import { 
  DestinationCategory, 
  DestinationStatus, 
  DestinationFilters,
  SortField,
  SortDirection
} from '../../types';
import { getCategoryIcon, getCategoryLabel, formatCurrency } from '../../utils';

interface AdvancedFiltersProps {
  isCompact?: boolean;
  showHeader?: boolean;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ 
  isCompact = false,
  showHeader = true
}) => {
  const { 
    currentTrip,
    destinations, 
    uiState, 
    updateUIState 
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(!isCompact);
  const [showDateRange, setShowDateRange] = useState(false);
  const [showBudgetRange, setShowBudgetRange] = useState(false);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const [showTagsFilter, setShowTagsFilter] = useState(false);

  // Get current trip destinations for filter calculations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Calculate filter statistics
  const filterStats = useMemo(() => {
    const allTags = new Set<string>();
    let minBudget = Infinity;
    let maxBudget = 0;
    let minDate = '';
    let maxDate = '';

    currentDestinations.forEach(dest => {
      dest.tags.forEach(tag => allTags.add(tag));
      if (dest.budget && dest.budget > 0) {
        minBudget = Math.min(minBudget, dest.budget);
        maxBudget = Math.max(maxBudget, dest.budget);
      }
      if (!minDate || dest.startDate < minDate) minDate = dest.startDate;
      if (!maxDate || dest.endDate > maxDate) maxDate = dest.endDate;
    });

    return {
      availableTags: Array.from(allTags).sort(),
      budgetRange: minBudget === Infinity ? { min: 0, max: 100 } : { min: minBudget, max: maxBudget },
      dateRange: { min: minDate, max: maxDate }
    };
  }, [currentDestinations]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (uiState.filters.category?.length) count++;
    if (uiState.filters.status?.length) count++;
    if (uiState.filters.priority?.length) count++;
    if (uiState.filters.tags?.length) count++;
    if (uiState.filters.dateRange) count++;
    if (uiState.filters.budgetRange) count++;
    return count;
  }, [uiState.filters]);

  const handleFilterChange = (filterType: keyof DestinationFilters, value: any) => {
    const currentFilters = uiState.filters;
    let newFilters = { ...currentFilters };

    if (Array.isArray(currentFilters[filterType])) {
      const currentArray = (currentFilters[filterType] as any[]) || [];
      const updatedArray = currentArray.includes(value)
        ? currentArray.filter((item: any) => item !== value)
        : [...currentArray, value];
      
      (newFilters as any)[filterType] = updatedArray;
    } else {
      (newFilters as any)[filterType] = value;
    }

    updateUIState({ filters: newFilters });
  };

  const handleDateRangeChange = (start: string, end: string) => {
    updateUIState({
      filters: {
        ...uiState.filters,
        dateRange: start && end ? { start, end } : undefined
      }
    });
  };

  const handleBudgetRangeChange = (min: number, max: number) => {
    updateUIState({
      filters: {
        ...uiState.filters,
        budgetRange: { min, max }
      }
    });
  };

  const handleSortChange = (field: SortField) => {
    const currentSort = uiState.sortOptions;
    const newDirection = currentSort.field === field && currentSort.direction === SortDirection.ASC
      ? SortDirection.DESC
      : SortDirection.ASC;
    
    updateUIState({
      sortOptions: { field, direction: newDirection }
    });
  };

  const clearAllFilters = () => {
    updateUIState({
      filters: {},
      searchQuery: ''
    });
  };

  const hasActiveFilters = activeFiltersCount > 0 || uiState.searchQuery;

  if (!currentTrip) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        Wählen Sie eine Reise aus, um Filter anzuzeigen.
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      {showHeader && (
        <div
          onClick={() => isCompact && setIsExpanded(!isExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #f3f4f6',
            cursor: isCompact ? 'pointer' : 'default',
            background: hasActiveFilters ? '#fef3c7' : 'transparent'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} color={hasActiveFilters ? '#d97706' : '#6b7280'} />
            <span style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: hasActiveFilters ? '#d97706' : '#374151'
            }}>
              Erweiterte Filter
            </span>
            {activeFiltersCount > 0 && (
              <span style={{
                background: '#fbbf24',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}>
                {activeFiltersCount}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {hasActiveFilters && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearAllFilters();
                }}
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
                  gap: '0.25rem'
                }}
              >
                <RotateCcw size={12} />
                Zurücksetzen
              </button>
            )}
            
            {isCompact && (
              isExpanded ? <ChevronUp size={18} color="#6b7280" /> : <ChevronDown size={18} color="#6b7280" />
            )}
          </div>
        </div>
      )}

      {/* Filter Content */}
      {isExpanded && (
        <div style={{ padding: '1.25rem' }}>
          
          {/* Quick Sort */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Sortierung
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '0.5rem'
            }}>
              {[
                { field: SortField.START_DATE, label: 'Datum', icon: Calendar },
                { field: SortField.NAME, label: 'Name', icon: MapPin },
                { field: SortField.PRIORITY, label: 'Priorität', icon: Star },
                { field: SortField.BUDGET, label: 'Budget', icon: DollarSign }
              ].map(({ field, label, icon: Icon }) => (
                <button
                  key={field}
                  onClick={() => handleSortChange(field)}
                  style={{
                    background: uiState.sortOptions.field === field ? '#dbeafe' : '#f9fafb',
                    border: uiState.sortOptions.field === field ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.875rem',
                    color: uiState.sortOptions.field === field ? '#3b82f6' : '#6b7280',
                    transition: 'all 0.2s'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon size={14} />
                    {label}
                  </span>
                  {uiState.sortOptions.field === field && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                      {uiState.sortOptions.direction === SortDirection.ASC ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Categories Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Kategorien
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.5rem'
            }}>
              {Object.values(DestinationCategory).map((category) => {
                const isSelected = uiState.filters.category?.includes(category);
                const count = currentDestinations.filter(d => d.category === category).length;
                
                return (
                  <button
                    key={category}
                    onClick={() => handleFilterChange('category', category)}
                    disabled={count === 0}
                    style={{
                      background: isSelected ? '#dbeafe' : count === 0 ? '#f9fafb' : 'white',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.75rem 0.5rem',
                      cursor: count === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      color: isSelected ? '#3b82f6' : count === 0 ? '#9ca3af' : '#6b7280',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.25rem',
                      transition: 'all 0.2s',
                      opacity: count === 0 ? 0.5 : 1
                    }}
                  >
                    <span style={{ fontSize: '1rem' }}>{getCategoryIcon(category)}</span>
                    <span style={{ fontWeight: '500' }}>{getCategoryLabel(category)}</span>
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Status
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.values(DestinationStatus).map((status) => {
                const isSelected = uiState.filters.status?.includes(status);
                const count = currentDestinations.filter(d => d.status === status).length;
                const statusConfig = {
                  [DestinationStatus.PLANNED]: { label: 'Geplant', emoji: '⏳', color: '#3b82f6' },
                  [DestinationStatus.VISITED]: { label: 'Besucht', emoji: '✅', color: '#10b981' },
                  [DestinationStatus.SKIPPED]: { label: 'Übersprungen', emoji: '❌', color: '#ef4444' }
                };
                const config = statusConfig[status];

                return (
                  <button
                    key={status}
                    onClick={() => handleFilterChange('status', status)}
                    disabled={count === 0}
                    style={{
                      background: isSelected ? `${config.color}15` : 'white',
                      border: isSelected ? `1px solid ${config.color}` : '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      cursor: count === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '0.875rem',
                      color: isSelected ? config.color : count === 0 ? '#9ca3af' : '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      opacity: count === 0 ? 0.5 : 1
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{config.emoji}</span>
                      <span>{config.label}</span>
                    </span>
                    <span style={{
                      background: isSelected ? config.color : '#e5e7eb',
                      color: isSelected ? 'white' : '#6b7280',
                      borderRadius: '12px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      minWidth: '24px',
                      textAlign: 'center'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Priority Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowPriorityFilter(!showPriorityFilter)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              <h4 style={{
                margin: '0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Priorität
              </h4>
              {showPriorityFilter ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showPriorityFilter && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[1, 2, 3, 4, 5].map((priority) => {
                  const isSelected = uiState.filters.priority?.includes(priority);
                  const count = currentDestinations.filter(d => d.priority === priority).length;
                  
                  return (
                    <button
                      key={priority}
                      onClick={() => handleFilterChange('priority', priority)}
                      disabled={count === 0}
                      style={{
                        background: isSelected ? '#fbbf24' : count === 0 ? '#f9fafb' : 'white',
                        border: isSelected ? '1px solid #fbbf24' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        cursor: count === 0 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        flex: 1,
                        opacity: count === 0 ? 0.5 : 1
                      }}
                    >
                      <div style={{ display: 'flex' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            style={{
                              color: star <= priority ? '#fbbf24' : '#d1d5db',
                              fill: star <= priority ? '#fbbf24' : 'transparent'
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>({count})</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags Filter */}
          {filterStats.availableTags.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                onClick={() => setShowTagsFilter(!showTagsFilter)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                  cursor: 'pointer',
                  marginBottom: '0.75rem'
                }}
              >
                <h4 style={{
                  margin: '0',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Tags ({filterStats.availableTags.length})
                </h4>
                {showTagsFilter ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showTagsFilter && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  padding: '0.5rem'
                }}>
                  {filterStats.availableTags.map((tag) => {
                    const isSelected = uiState.filters.tags?.includes(tag);
                    const count = currentDestinations.filter(d => d.tags.includes(tag)).length;
                    
                    return (
                      <button
                        key={tag}
                        onClick={() => handleFilterChange('tags', tag)}
                        style={{
                          background: isSelected ? '#e0f2fe' : 'white',
                          border: isSelected ? '1px solid #0891b2' : '1px solid #e5e7eb',
                          borderRadius: '16px',
                          padding: '0.375rem 0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          color: isSelected ? '#0891b2' : '#6b7280',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        <Tag size={10} />
                        {tag}
                        <span style={{
                          background: isSelected ? '#0891b2' : '#e5e7eb',
                          color: isSelected ? 'white' : '#6b7280',
                          borderRadius: '8px',
                          padding: '0.125rem 0.25rem',
                          fontSize: '0.65rem',
                          fontWeight: '600'
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Date Range Filter */}
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowDateRange(!showDateRange)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0',
                cursor: 'pointer',
                marginBottom: '0.75rem'
              }}
            >
              <h4 style={{
                margin: '0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Datumsbereich
              </h4>
              {showDateRange ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showDateRange && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                    Von:
                  </label>
                  <input
                    type="date"
                    min={filterStats.dateRange.min}
                    max={filterStats.dateRange.max}
                    value={uiState.filters.dateRange?.start || ''}
                    onChange={(e) => handleDateRangeChange(e.target.value, uiState.filters.dateRange?.end || '')}
                    style={{
                      width: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                    Bis:
                  </label>
                  <input
                    type="date"
                    min={filterStats.dateRange.min}
                    max={filterStats.dateRange.max}
                    value={uiState.filters.dateRange?.end || ''}
                    onChange={(e) => handleDateRangeChange(uiState.filters.dateRange?.start || '', e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget Range Filter */}
          {filterStats.budgetRange.max > 0 && (
            <div>
              <button
                onClick={() => setShowBudgetRange(!showBudgetRange)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0',
                  cursor: 'pointer',
                  marginBottom: '0.75rem'
                }}
              >
                <h4 style={{
                  margin: '0',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Budget-Bereich
                </h4>
                {showBudgetRange ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              
              {showBudgetRange && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatCurrency(uiState.filters.budgetRange?.min || filterStats.budgetRange.min)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatCurrency(uiState.filters.budgetRange?.max || filterStats.budgetRange.max)}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                        Min:
                      </label>
                      <input
                        type="number"
                        min={filterStats.budgetRange.min}
                        max={filterStats.budgetRange.max}
                        value={uiState.filters.budgetRange?.min || filterStats.budgetRange.min}
                        onChange={(e) => handleBudgetRangeChange(
                          Number(e.target.value),
                          uiState.filters.budgetRange?.max || filterStats.budgetRange.max
                        )}
                        style={{
                          width: '100%',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>
                        Max:
                      </label>
                      <input
                        type="number"
                        min={filterStats.budgetRange.min}
                        max={filterStats.budgetRange.max}
                        value={uiState.filters.budgetRange?.max || filterStats.budgetRange.max}
                        onChange={(e) => handleBudgetRangeChange(
                          uiState.filters.budgetRange?.min || filterStats.budgetRange.min,
                          Number(e.target.value)
                        )}
                        style={{
                          width: '100%',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;