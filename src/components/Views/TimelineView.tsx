import React from 'react';
import EnhancedTimelineView from '../Scheduling/EnhancedTimelineView';

const TimelineView: React.FC = () => {
  return (
    <EnhancedTimelineView 
      onDestinationClick={(dest) => {
        console.log('Timeline: Destination clicked:', dest.name);
      }}
      onEditDestination={(dest) => {
        console.log('Timeline: Edit destination:', dest.name);
      }}
      onReorderDestinations={(reorderedDests) => {
        console.log('Timeline: Reorder destinations:', reorderedDests.map(d => d.name));
      }}
    />
  );
};

export default TimelineView;