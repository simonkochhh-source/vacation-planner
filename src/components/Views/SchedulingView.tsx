import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import { 
  TimelineView, 
  ScheduleOptimizer, 
  TravelTimeCalculator, 
  ScheduleTemplates 
} from '../Scheduling';
import {
  Clock,
  Zap,
  Route,
  BookOpen,
  Calendar
} from 'lucide-react';

type SchedulingTab = 'timeline' | 'optimizer' | 'calculator' | 'templates';

const SchedulingView: React.FC = () => {
  const { currentTrip, destinations, updateDestination } = useApp();
  const [activeTab, setActiveTab] = useState<SchedulingTab>('timeline');

  const tabs = [
    {
      id: 'timeline' as SchedulingTab,
      label: 'Zeitplan',
      icon: <Clock size={18} />,
      description: 'Chronologische Übersicht Ihrer Reise'
    },
    {
      id: 'optimizer' as SchedulingTab,
      label: 'Optimierung',
      icon: <Zap size={18} />,
      description: 'Automatische Routenoptimierung'
    },
    {
      id: 'calculator' as SchedulingTab,
      label: 'Reisezeiten',
      icon: <Route size={18} />,
      description: 'Reisezeiten zwischen Zielen berechnen'
    },
    {
      id: 'templates' as SchedulingTab,
      label: 'Vorlagen',
      icon: <BookOpen size={18} />,
      description: 'Bewährte Zeitplan-Vorlagen'
    }
  ];

  const handleOptimizationApply = async (optimizedDestinations: any[]) => {
    // Apply optimized destinations
    for (const dest of optimizedDestinations) {
      await updateDestination(dest.id, dest);
    }
  };

  const handleTravelTimeAdd = async (fromId: string, toId: string, duration: number) => {
    // This could add travel time as buffer to the schedule
    console.log(`Add ${duration} minutes travel time from ${fromId} to ${toId}`);
  };

  const handleTemplateApply = async (template: any, date: string) => {
    // Apply template to create new destinations for the specified date
    console.log(`Apply template ${template.name} to ${date}`);
  };

  if (!currentTrip) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        color: '#6b7280'
      }}>
        <Calendar size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus der Sidebar aus oder erstellen Sie eine neue Reise.
        </p>
      </div>
    );
  }

  return (
    <div className="main-content" style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 1.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '1rem',
          marginBottom: '1rem'
        }}>
          <div>
            <h1 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#1f2937'
            }}>
              Erweiterte Zeitplanung
            </h1>
            <p style={{
              margin: 0,
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              {currentTrip.name} • Professionelle Tools für optimale Reiseplanung
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '1px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                cursor: 'pointer',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                minWidth: 'fit-content'
              }}
              title={tab.description}
              onMouseOver={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseOut={(e) => {
                if (activeTab !== tab.id) {
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: '#f9fafb'
      }}>
        {activeTab === 'timeline' && (
          <TimelineView 
            onDestinationClick={(dest) => {
              // Could implement navigation to destination detail
              console.log('Destination clicked:', dest.name);
            }}
            onEditDestination={(dest) => {
              // Could open edit form
              console.log('Edit destination:', dest.name);
            }}
          />
        )}

        {activeTab === 'optimizer' && (
          <ScheduleOptimizer 
            onApplyOptimization={handleOptimizationApply}
          />
        )}

        {activeTab === 'calculator' && (
          <TravelTimeCalculator 
            onAddTravelTime={handleTravelTimeAdd}
          />
        )}

        {activeTab === 'templates' && (
          <ScheduleTemplates 
            onApplyTemplate={handleTemplateApply}
          />
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '1rem 1.5rem',
        fontSize: '0.875rem',
        color: '#6b7280',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          {activeTab === 'timeline' && 'Zeigt chronologische Übersicht mit Konfliktanalyse'}
          {activeTab === 'optimizer' && 'KI-gestützte Optimierung für effiziente Routen'}
          {activeTab === 'calculator' && 'Präzise Reisezeitberechnung zwischen Zielen'}
          {activeTab === 'templates' && 'Bewährte Vorlagen für verschiedene Reisetypen'}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>Reise:</span>
          <span style={{ fontWeight: '500', color: '#374151' }}>
            {currentTrip.name}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SchedulingView;