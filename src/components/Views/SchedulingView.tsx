import React from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import EnhancedTimelineView from '../Scheduling/EnhancedTimelineView';
import {
  Calendar
} from 'lucide-react';

const SchedulingView: React.FC = () => {
  const { currentTrip, reorderDestinations } = useApp();

  const handleReorderDestinations = async (reorderedDestinations: Destination[]) => {
    if (!currentTrip) return;
    
    try {
      console.log('Scheduling: Reordering destinations:', reorderedDestinations.map(d => d.name));
      
      // Update the trip with the new destination order using the proper reorderDestinations action
      const destinationIds = reorderedDestinations.map(dest => dest.id);
      await reorderDestinations(currentTrip.id, destinationIds);
      
      console.log('✅ Trip destinations reordered successfully');
    } catch (error) {
      console.error('❌ Failed to reorder destinations:', error);
    }
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
};

export default SchedulingView;