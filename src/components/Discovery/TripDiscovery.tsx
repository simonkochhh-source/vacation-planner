import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MapPin, Star, Clock, Euro, Users, Globe, ExternalLink, Eye } from 'lucide-react';
import { useTripContext } from '../../contexts/TripContext';
import { useAuth } from '../../contexts/AuthContext';
import { Trip, TripPrivacy, canUserAccessTrip, canUserAccessTripAsync, getTripPermissions } from '../../types';
import Button from '../Common/Button';
import Card from '../Common/Card';

interface TripDiscoveryProps {
  onOpenTrip?: (trip: Trip) => void;
  className?: string;
}

const TripDiscovery: React.FC<TripDiscoveryProps> = ({
  onOpenTrip,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Trip[]>([]);
  const [publicTrips, setPublicTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const { trips, setCurrentTrip } = useTripContext();

  const { user } = useAuth();
  const currentUserId = user?.id || 'anonymous';

  // Load public trips on mount
  useEffect(() => {
    const loadPublicTrips = async () => {
      try {
        // Filter for public trips that the user can access
        const accessibleTrips = trips.filter(trip => 
          trip.privacy === TripPrivacy.PUBLIC && canUserAccessTrip(trip, currentUserId)
        );
        setPublicTrips(accessibleTrips.slice(0, 6)); // Show top 6 public trips
      } catch (error) {
        console.error('Error loading public trips:', error);
      }
    };

    loadPublicTrips();
  }, [trips, currentUserId]);

  // Enhanced search that includes own trips, public trips, and contact trips
  const searchTrips = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const searchTerm = query.toLowerCase();
      const results: Trip[] = [];
      
      console.log(`🔍 Searching for: "${searchTerm}"`);
      console.log(`📊 Total trips to search: ${trips.length}`);
      console.log(`👤 Current user ID: ${currentUserId}`);
      
      // Process trips in batches to handle async permission checks
      for (const trip of trips) {
        // Check if trip matches search term
        const matchesSearch = 
          trip.name.toLowerCase().includes(searchTerm) ||
          trip.description?.toLowerCase().includes(searchTerm) ||
          trip.tags.some(tag => tag.toLowerCase().includes(searchTerm));
        
        if (!matchesSearch) continue;
        
        console.log(`🎯 Found matching trip: "${trip.name}" (privacy: ${trip.privacy}, owner: ${trip.ownerId})`);
        
        // Use async permission check for comprehensive access validation
        const hasAccess = await canUserAccessTripAsync(trip, currentUserId);
        
        console.log(`🔐 Access check for "${trip.name}": ${hasAccess}`);
        
        if (hasAccess) {
          results.push(trip);
          console.log(`✅ Added to results: "${trip.name}"`);
        } else {
          console.log(`❌ Access denied for: "${trip.name}"`);
        }
        
        // Limit results for performance
        if (results.length >= 15) break;
      }
      
      // Sort results by relevance: own trips first, then contacts, then public
      const sortedResults = results.sort((a, b) => {
        const aIsOwn = a.ownerId === currentUserId;
        const bIsOwn = b.ownerId === currentUserId;
        const aIsPublic = a.privacy === TripPrivacy.PUBLIC;
        const bIsPublic = b.privacy === TripPrivacy.PUBLIC;
        
        // Own trips first
        if (aIsOwn && !bIsOwn) return -1;
        if (!aIsOwn && bIsOwn) return 1;
        
        // Then contacts/private trips
        if (!aIsPublic && bIsPublic) return -1;
        if (aIsPublic && !bIsPublic) return 1;
        
        // Finally sort by creation date (newest first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      console.log(`📋 Final results: ${sortedResults.length} trips found`);
      sortedResults.forEach(trip => console.log(`  - ${trip.name} (${trip.privacy})`));
      
      setSearchResults(sortedResults.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Error searching trips:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [trips, currentUserId]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTrips(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchTrips]);

  const handleTripSelect = (trip: Trip) => {
    const permissions = getTripPermissions(trip, currentUserId);
    
    if (permissions.canView) {
      setCurrentTrip(trip.id);
      onOpenTrip?.(trip);
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `${diffDays} ${diffDays === 1 ? 'Tag' : 'Tage'}`;
  };

  const TripCard: React.FC<{ trip: Trip; showOwner?: boolean }> = ({ trip, showOwner = true }) => {
    const permissions = getTripPermissions(trip, currentUserId);
    const isOwn = permissions.isOwner;
    
    return (
      <Card 
        padding="md" 
        className="hover:shadow-lg transition-all duration-200 cursor-pointer"
        onClick={() => handleTripSelect(trip)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-lg)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-primary)',
                margin: 0,
                marginBottom: 'var(--space-xs)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {trip.name}
              </h3>
              
              {trip.description && (
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  lineHeight: 1.4,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {trip.description}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginLeft: 'var(--space-sm)' }}>
              {isOwn && (
                <div style={{
                  background: 'var(--color-primary-sage)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  Meine
                </div>
              )}
              
              {!isOwn && trip.privacy === TripPrivacy.PUBLIC && (
                <div style={{
                  background: 'var(--color-secondary-sky)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  <Globe size={10} />
                  Öffentlich
                </div>
              )}
              
              {!isOwn && trip.privacy === TripPrivacy.CONTACTS && (
                <div style={{
                  background: 'var(--color-accent-coral)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 'var(--font-weight-medium)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}>
                  <Users size={10} />
                  Kontakt
                </div>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <Clock size={14} />
              {formatDateRange(trip.startDate, trip.endDate)}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <MapPin size={14} />
              {trip.destinations.length} {trip.destinations.length === 1 ? 'Ziel' : 'Ziele'}
            </div>

            {trip.participants.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Users size={14} />
                {trip.participants.length + 1} {trip.participants.length + 1 === 1 ? 'Person' : 'Personen'}
              </div>
            )}

            {trip.budget && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
                <Euro size={14} />
                {trip.budget}€
              </div>
            )}
          </div>

          {/* Tags */}
          {trip.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
              {trip.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  style={{
                    background: 'var(--color-neutral-mist)',
                    color: 'var(--color-text-secondary)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--font-weight-medium)'
                  }}
                >
                  #{tag}
                </span>
              ))}
              {trip.tags.length > 3 && (
                <span style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: 'var(--text-xs)'
                }}>
                  +{trip.tags.length - 3} weitere
                </span>
              )}
            </div>
          )}

          {/* Action */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-xs)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {permissions.canEdit ? 'Kann bearbeitet werden' : 'Nur anzeigen'}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ExternalLink size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                handleTripSelect(trip);
              }}
            >
              {permissions.canEdit ? 'Öffnen' : 'Ansehen'}
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className={className} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
          margin: '0 0 var(--space-sm) 0'
        }}>
          🌍 Reisen entdecken
        </h2>
        <p style={{
          fontSize: 'var(--text-base)',
          color: 'var(--color-text-secondary)',
          margin: 0
        }}>
          Entdecke öffentliche Reisen von anderen Nutzern oder finde deine eigenen Trips.
        </p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-md)',
          gap: 'var(--space-sm)'
        }}>
          <Search size={20} style={{ color: 'var(--color-text-secondary)' }} />
          <input
            type="text"
            placeholder="Nach Reisen suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-primary)'
            }}
          />
          {isLoading && (
            <div style={{ color: 'var(--color-text-secondary)' }}>
              Suche...
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            margin: '0 0 var(--space-md) 0'
          }}>
            Suchergebnisse ({searchResults.length})
          </h3>
          
          {searchResults.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-md)'
            }}>
              {searchResults.map((trip) => (
                <TripCard key={trip.id} trip={trip} showOwner={true} />
              ))}
            </div>
          ) : searchQuery && !isLoading ? (
            <div style={{
              background: 'var(--color-neutral-mist)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              Keine Reisen für "{searchQuery}" gefunden.
            </div>
          ) : null}
        </div>
      )}

      {/* Public Trips */}
      {!searchQuery && (
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            margin: '0 0 var(--space-md) 0'
          }}>
            🌟 Beliebte öffentliche Reisen
          </h3>
          
          {publicTrips.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: 'var(--space-md)'
            }}>
              {publicTrips.map((trip) => (
                <TripCard key={trip.id} trip={trip} showOwner={true} />
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--color-neutral-mist)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
              color: 'var(--color-text-secondary)'
            }}>
              Noch keine öffentlichen Reisen verfügbar.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripDiscovery;