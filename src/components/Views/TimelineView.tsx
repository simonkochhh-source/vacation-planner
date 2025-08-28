import React from 'react';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import EnhancedTimelineView from '../Scheduling/EnhancedTimelineView';

const TimelineView: React.FC = () => {
  const { currentTrip, reorderDestinations } = useApp();

  const handleReorderDestinations = async (reorderedDestinations: Destination[]) => {
    if (!currentTrip) return;
    
    try {
      console.log('Timeline: Reordering destinations:', reorderedDestinations.map(d => d.name));
      
      // Update the trip with the new destination order using the proper reorderDestinations action
      const destinationIds = reorderedDestinations.map(dest => dest.id);
      await reorderDestinations(currentTrip.id, destinationIds);
      
      console.log('✅ Trip destinations reordered successfully');
    } catch (error) {
      console.error('❌ Failed to reorder destinations:', error);
    }
  };

  return (
    <EnhancedTimelineView 
      onDestinationClick={(dest) => {
        console.log('Timeline: Destination clicked:', dest.name);
      }}
      onEditDestination={(dest) => {
        console.log('Timeline: Edit destination:', dest.name);
      }}
      onReorderDestinations={handleReorderDestinations}
    />
  );
};

export default TimelineView;