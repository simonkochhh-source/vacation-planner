import React, { useState, useEffect } from 'react';
import { useUIContext } from '../../contexts/UIContext';
import { useTripContext } from '../../contexts/TripContext';
import { useResponsive } from '../../hooks/useResponsive';
import { chatService } from '../../services/chatService';
import { 
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  MessageCircle,
  Users
} from 'lucide-react';

// Import existing views
import EnhancedTimelineView from '../Scheduling/EnhancedTimelineView';
import MapView from './MapView';
import BudgetView from './BudgetView';
import PhotosView from './PhotosView';

type TripSubTab = 'timeline' | 'budget' | 'map' | 'photos';

interface TripTabConfig {
  id: TripSubTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const tripTabs: TripTabConfig[] = [
  {
    id: 'timeline',
    label: 'Timeline',
    icon: <Calendar size={20} />,
    description: 'Zeitplan und Reiseverlauf'
  },
  {
    id: 'budget',
    label: 'Budget',
    icon: <DollarSign size={20} />,
    description: 'Kostenplanung und Tracking'
  },
  {
    id: 'map',
    label: 'Karte',
    icon: <MapPin size={20} />,
    description: 'Interaktive Kartenansicht'
  },
  {
    id: 'photos',
    label: 'Fotos',
    icon: <Camera size={20} />,
    description: 'Reisefotos und Erinnerungen'
  }
];

const TripsView: React.FC = () => {
  const { updateUIState } = useUIContext();
  const { currentTrip } = useTripContext();
  const { isMobile } = useResponsive();
  const [activeTab, setActiveTab] = useState<TripSubTab>('timeline');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [existingTripChatId, setExistingTripChatId] = useState<string | null>(null);
  const [isCheckingExistingChat, setIsCheckingExistingChat] = useState(false);

  // Check for existing trip chat when currentTrip changes
  useEffect(() => {
    const checkExistingTripChat = async () => {
      if (!currentTrip?.id) {
        setExistingTripChatId(null);
        return;
      }

      try {
        setIsCheckingExistingChat(true);
        const existingChat = await chatService.findExistingTripChat(currentTrip.id);
        setExistingTripChatId(existingChat?.id || null);
        console.log('🔍 Trip chat check:', existingChat ? `Found: ${existingChat.id}` : 'None found');
      } catch (error) {
        console.error('❌ Error checking existing trip chat:', error);
        setExistingTripChatId(null);
      } finally {
        setIsCheckingExistingChat(false);
      }
    };

    checkExistingTripChat();
  }, [currentTrip?.id]);

  const handleReorderDestinations = async (reorderedDestinations: any[]) => {
    // Handle reordering logic - pass through to timeline
    console.log('Reordering destinations:', reorderedDestinations);
  };

  const handleOpenTripChat = async () => {
    if (!currentTrip) {
      console.warn('No current trip selected');
      return;
    }

    try {
      setIsCreatingChat(true);

      // If existing chat found, navigate to it directly
      if (existingTripChatId) {
        console.log('✅ Navigating to existing trip chat:', existingTripChatId);
        updateUIState({ 
          chatOpen: true,
          selectedChatRoomId: existingTripChatId 
        });
        return;
      }

      // Get trip participants (for now, we'll just use the trip creator)
      // In a full implementation, you would get all trip participants
      const participantIds: string[] = []; // TODO: Get actual participants from trip

      // Create new trip chat room
      const tripChatRoom = await chatService.getOrCreateTripChatRoom(
        currentTrip.id,
        currentTrip.name,
        participantIds
      );

      // Update local state with the new chat ID
      setExistingTripChatId(tripChatRoom.id);

      updateUIState({ 
        chatOpen: true,
        selectedChatRoomId: tripChatRoom.id 
      });
    } catch (error) {
      console.error('Failed to open trip chat:', error);
      alert('Fehler beim Öffnen des Reisechats. Bitte versuchen Sie es erneut.');
    } finally {
      setIsCreatingChat(false);
    }
  };


  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <EnhancedTimelineView 
            onDestinationClick={(dest) => {
              console.log('Destination clicked:', dest.name);
            }}
            onEditDestination={(dest) => {
              console.log('Edit destination:', dest.name);
            }}
            onReorderDestinations={handleReorderDestinations}
          />
        );
      case 'budget':
        return <BudgetView />;
      case 'map':
        return <MapView />;
      case 'photos':
        return <PhotosView />;
      default:
        return <EnhancedTimelineView 
          onDestinationClick={(dest) => console.log(dest)}
          onEditDestination={(dest) => console.log(dest)}
          onReorderDestinations={handleReorderDestinations}
        />;
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-background)'
    }}>
        {/* Header with Trip Info */}
        <div style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: 'var(--space-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Trip Info */}
          <div style={{ textAlign: isMobile ? 'center' : 'left', flex: 1 }}>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: isMobile ? 'var(--text-xl)' : 'var(--text-2xl)',
              fontWeight: 'var(--font-weight-bold)',
              margin: 0,
              color: 'var(--color-text-primary)'
            }}>
              {currentTrip ? currentTrip.name : 'Keine Reise ausgewählt'}
            </h1>
            {currentTrip && (
              <p style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-secondary)',
                margin: '4px 0 0 0'
              }}>
                {currentTrip.startDate && currentTrip.endDate ? (
                  `${new Date(currentTrip.startDate).toLocaleDateString('de-DE')} - ${new Date(currentTrip.endDate).toLocaleDateString('de-DE')}`
                ) : (
                  'Datum noch nicht festgelegt'
                )}
              </p>
            )}
          </div>

          {/* Trip Actions */}
          {currentTrip && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              marginLeft: 'var(--space-lg)'
            }}>
              {/* Reisechat eröffnen Button */}
              <button
                onClick={handleOpenTripChat}
                disabled={isCreatingChat || isCheckingExistingChat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  padding: `${isMobile ? 'var(--space-2)' : 'var(--space-2) var(--space-4)'}`,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-primary-sage)',
                  background: 'var(--color-primary-sage)',
                  color: 'white',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  cursor: (isCreatingChat || isCheckingExistingChat) ? 'not-allowed' : 'pointer',
                  transition: 'all var(--transition-fast)',
                  opacity: (isCreatingChat || isCheckingExistingChat) ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isCreatingChat) {
                    e.currentTarget.style.background = 'var(--color-primary-ocean)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-ocean)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCreatingChat) {
                    e.currentTarget.style.background = 'var(--color-primary-sage)';
                    e.currentTarget.style.borderColor = 'var(--color-primary-sage)';
                  }
                }}
                title={existingTripChatId ? "Zum Reisechat" : "Reisechat für alle Teilnehmer eröffnen"}
              >
                <MessageCircle size={16} />
                {!isMobile && (() => {
                  if (isCheckingExistingChat) return 'Prüfe...';
                  if (isCreatingChat) return 'Erstelle...';
                  return existingTripChatId ? 'Zum Reisechat' : 'Reisechat eröffnen';
                })()}
              </button>

              {/* Participants indicator (placeholder for future participants feature) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-neutral-mist)',
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-secondary)'
              }}>
                <Users size={14} />
                {!isMobile && (
                  <span>1 Teilnehmer</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          padding: '0 var(--space-lg)',
          overflowX: 'auto'
        }}>
          <div style={{
            display: 'flex',
            gap: 'var(--space-xs)',
            minWidth: 'fit-content'
          }}>
            {tripTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-md) var(--space-lg)',
                    border: isActive ? '2px solid transparent' : '2px solid transparent',
                    borderBottomColor: isActive ? 'var(--color-primary-sage)' : 'transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    fontFamily: 'var(--font-family-system)',
                    color: isActive ? 'var(--color-primary-sage)' : 'var(--color-text-secondary)',
                    transition: 'all var(--transition-fast)',
                    minHeight: 'var(--touch-target-min-size)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-primary)';
                      e.currentTarget.style.backgroundColor = 'var(--color-neutral-mist)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--color-text-secondary)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                  title={tab.description}
                >
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {tab.icon}
                  </span>
                  {!isMobile && (
                    <span>{tab.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div style={{
          flex: 1,
          overflow: 'hidden',
          background: 'var(--color-background)'
        }}>
          {currentTrip ? (
            renderTabContent()
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              padding: 'var(--space-xl)',
              textAlign: 'center'
            }}>
              <div>
                <div style={{
                  background: 'var(--color-neutral-mist)',
                  borderRadius: 'var(--radius-full)',
                  width: '80px',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-lg) auto'
                }}>
                  <MapPin size={32} style={{ color: 'var(--color-text-secondary)' }} />
                </div>
                
                <h2 style={{
                  fontSize: 'var(--text-xl)',
                  fontWeight: 'var(--font-weight-semibold)',
                  margin: '0 0 var(--space-sm) 0',
                  color: 'var(--color-text-primary)'
                }}>
                  Keine Reise ausgewählt
                </h2>
                
                <p style={{
                  fontSize: 'var(--text-base)',
                  color: 'var(--color-text-secondary)',
                  margin: 0,
                  maxWidth: '400px'
                }}>
                  Wähle eine Reise über die Navigation aus oder erstelle eine neue Reise, um loszulegen.
                </p>
              </div>
            </div>
          )}
        </div>

    </div>
  );
};

export default TripsView;