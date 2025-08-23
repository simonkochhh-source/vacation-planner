import React, { useMemo } from 'react';
import { useApp } from '../../stores/AppContext';
import { 
  BarChart3,
  TrendingUp,
  Calendar,
  MapPin,
  Star,
  DollarSign,
  Clock,
  Users,
  Target,
  Award,
  Activity,
  Zap
} from 'lucide-react';
import { DestinationCategory, DestinationStatus } from '../../types';
import { getCategoryLabel, getCategoryIcon, formatCurrency } from '../../utils';

interface FilterStatsProps {
  showDetailed?: boolean;
}

const FilterStats: React.FC<FilterStatsProps> = ({ showDetailed = false }) => {
  const { currentTrip, destinations, uiState } = useApp();

  // Get current trip destinations
  const currentDestinations = currentTrip 
    ? destinations.filter(dest => currentTrip.destinations.includes(dest.id))
    : [];

  // Apply current filters to get filtered destinations
  const filteredDestinations = useMemo(() => {
    return currentDestinations.filter(dest => {
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
      if (uiState.filters.category?.length) {
        if (!uiState.filters.category.includes(dest.category)) return false;
      }

      // Status filter
      if (uiState.filters.status?.length) {
        if (!uiState.filters.status.includes(dest.status)) return false;
      }

      // Priority filter
      if (uiState.filters.priority?.length) {
        if (!uiState.filters.priority.includes(dest.priority)) return false;
      }

      // Tags filter
      if (uiState.filters.tags?.length) {
        const hasMatchingTag = uiState.filters.tags.some(tag => dest.tags.includes(tag));
        if (!hasMatchingTag) return false;
      }

      // Date range filter
      if (uiState.filters.dateRange) {
        const { start, end } = uiState.filters.dateRange;
        if (start && dest.startDate < start) return false;
        if (end && dest.endDate > end) return false;
      }

      // Budget range filter
      if (uiState.filters.budgetRange) {
        const { min, max } = uiState.filters.budgetRange;
        const budget = dest.budget || 0;
        if (budget < min || budget > max) return false;
      }

      return true;
    });
  }, [currentDestinations, uiState.searchQuery, uiState.filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = currentDestinations.length;
    const filtered = filteredDestinations.length;
    const filterEfficiency = total > 0 ? (filtered / total) * 100 : 0;

    // Budget statistics
    const totalBudget = filteredDestinations.reduce((sum, dest) => sum + (dest.budget || 0), 0);
    const avgBudget = filtered > 0 ? totalBudget / filtered : 0;
    const maxBudget = Math.max(...filteredDestinations.map(d => d.budget || 0), 0);
    const minBudget = Math.min(...filteredDestinations.filter(d => (d.budget || 0) > 0).map(d => d.budget || 0), maxBudget);

    // Time statistics
    const totalDuration = filteredDestinations.reduce((sum, dest) => sum + dest.duration, 0);
    const avgDuration = filtered > 0 ? totalDuration / filtered : 0;

    // Priority statistics
    const avgPriority = filtered > 0 
      ? filteredDestinations.reduce((sum, dest) => sum + dest.priority, 0) / filtered 
      : 0;
    const highPriorityCount = filteredDestinations.filter(d => d.priority >= 4).length;

    // Status distribution
    const statusDistribution = Object.values(DestinationStatus).map(status => ({
      status,
      count: filteredDestinations.filter(d => d.status === status).length,
      percentage: filtered > 0 ? (filteredDestinations.filter(d => d.status === status).length / filtered) * 100 : 0
    }));

    // Category distribution
    const categoryDistribution = Object.values(DestinationCategory).map(category => ({
      category,
      count: filteredDestinations.filter(d => d.category === category).length,
      percentage: filtered > 0 ? (filteredDestinations.filter(d => d.category === category).length / filtered) * 100 : 0
    })).filter(item => item.count > 0);

    // Top tags
    const tagCounts = filteredDestinations.reduce((acc, dest) => {
      dest.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      total,
      filtered,
      filterEfficiency,
      totalBudget,
      avgBudget,
      maxBudget,
      minBudget,
      totalDuration,
      avgDuration,
      avgPriority,
      highPriorityCount,
      statusDistribution,
      categoryDistribution,
      topTags
    };
  }, [currentDestinations, filteredDestinations]);

  const hasActiveFilters = Object.keys(uiState.filters).some(key => {
    const value = (uiState.filters as any)[key];
    return value && (Array.isArray(value) ? value.length > 0 : true);
  }) || uiState.searchQuery;

  if (!currentTrip) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        Wählen Sie eine Reise aus, um Statistiken anzuzeigen.
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        borderBottom: '1px solid #f3f4f6',
        background: hasActiveFilters ? '#f0f9ff' : '#fafafa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={18} color={hasActiveFilters ? '#3b82f6' : '#6b7280'} />
          <span style={{ 
            fontSize: '1rem', 
            fontWeight: '600', 
            color: hasActiveFilters ? '#3b82f6' : '#374151' 
          }}>
            Filter-Statistiken
          </span>
        </div>
        
        <div style={{
          background: hasActiveFilters ? '#3b82f6' : '#e5e7eb',
          color: hasActiveFilters ? 'white' : '#6b7280',
          borderRadius: '20px',
          padding: '0.25rem 0.75rem',
          fontSize: '0.75rem',
          fontWeight: '600'
        }}>
          {stats.filtered} von {stats.total}
        </div>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Main Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          {/* Filter Efficiency */}
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#3b82f6',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Target size={20} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1e40af',
              marginBottom: '0.25rem'
            }}>
              {Math.round(stats.filterEfficiency)}%
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Filter-Treffer
            </div>
          </div>

          {/* Total Budget */}
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#10b981',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <DollarSign size={20} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#047857',
              marginBottom: '0.25rem'
            }}>
              {formatCurrency(stats.totalBudget)}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Gesamt-Budget
            </div>
          </div>

          {/* Total Duration */}
          <div style={{
            background: '#fefce8',
            border: '1px solid #fde047',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#eab308',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Clock size={20} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#a16207',
              marginBottom: '0.25rem'
            }}>
              {Math.round(stats.totalDuration / 60)}h
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Gesamt-Zeit
            </div>
          </div>

          {/* High Priority Count */}
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center'
          }}>
            <div style={{
              color: '#f59e0b',
              marginBottom: '0.5rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <Star size={20} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#d97706',
              marginBottom: '0.25rem'
            }}>
              {stats.highPriorityCount}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontWeight: '500'
            }}>
              Must-See
            </div>
          </div>
        </div>

        {showDetailed && (
          <>
            {/* Status Distribution */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{
                margin: '0 0 0.75rem 0',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Activity size={16} />
                Status-Verteilung
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {stats.statusDistribution.map(({ status, count, percentage }) => {
                  const statusConfig = {
                    [DestinationStatus.PLANNED]: { label: 'Geplant', color: '#3b82f6', emoji: '⏳' },
                    [DestinationStatus.VISITED]: { label: 'Besucht', color: '#10b981', emoji: '✅' },
                    [DestinationStatus.SKIPPED]: { label: 'Übersprungen', color: '#ef4444', emoji: '❌' }
                  };
                  const config = statusConfig[status];

                  return (
                    <div key={status} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      background: `${config.color}08`,
                      borderRadius: '8px',
                      border: `1px solid ${config.color}20`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{config.emoji}</span>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>
                          {config.label}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          background: '#f3f4f6',
                          borderRadius: '4px',
                          height: '6px',
                          width: '60px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            background: config.color,
                            height: '100%',
                            width: `${percentage}%`,
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: config.color
                          }}>
                            {count}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            ({Math.round(percentage)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category Distribution */}
            {stats.categoryDistribution.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <MapPin size={16} />
                  Kategorie-Verteilung
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {stats.categoryDistribution.map(({ category, count, percentage }) => (
                    <div key={category} style={{
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '0.75rem 0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                        {getCategoryIcon(category)}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.25rem'
                      }}>
                        {getCategoryLabel(category)}
                      </div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: '#3b82f6'
                      }}>
                        {count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Tags */}
            {stats.topTags.length > 0 && (
              <div>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Award size={16} />
                  Beliebte Tags
                </h4>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {stats.topTags.map(({ tag, count }, index) => (
                    <div key={tag} style={{
                      background: index === 0 ? '#fbbf24' : index === 1 ? '#e5e7eb' : '#f3f4f6',
                      color: index === 0 ? 'white' : '#374151',
                      borderRadius: '16px',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem'
                    }}>
                      {index === 0 && <Zap size={12} />}
                      #{tag}
                      <span style={{
                        background: index === 0 ? 'rgba(255,255,255,0.3)' : '#d1d5db',
                        color: index === 0 ? 'white' : '#6b7280',
                        borderRadius: '8px',
                        padding: '0.125rem 0.25rem',
                        fontSize: '0.65rem',
                        fontWeight: '600'
                      }}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* No Results Message */}
        {stats.filtered === 0 && hasActiveFilters && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              marginBottom: '0.5rem',
              color: '#374151'
            }}>
              Keine Ergebnisse gefunden
            </h3>
            <p style={{ fontSize: '0.875rem', margin: 0 }}>
              Versuchen Sie, Ihre Filter anzupassen oder zu erweitern.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterStats;