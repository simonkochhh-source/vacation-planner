import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useApp } from '../../stores/AppContext';
import { Destination } from '../../types';
import { DraggableDestinationCard } from './DraggableDestinationCard';

interface DraggableDestinationListProps {
  destinations: Destination[];
  onEdit: (destination: Destination) => void;
  onDelete: (destId: string) => void;
  batchMode?: boolean;
  selectedDestinations?: string[];
  onToggleSelection?: (destId: string) => void;
  onWeatherClick?: (destination: Destination) => void;
  onPhotoUpload?: (destination: Destination) => void;
  onPhotoGallery?: (destination: Destination) => void;
}

const DraggableDestinationList: React.FC<DraggableDestinationListProps> = ({
  destinations,
  onEdit,
  onDelete,
  batchMode = false,
  selectedDestinations = [],
  onToggleSelection,
  onWeatherClick,
  onPhotoUpload,
  onPhotoGallery
}) => {
  const { currentTrip, reorderDestinations } = useApp();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentTrip) {
      const destinationIds = destinations.map(dest => dest.id);
      const oldIndex = destinationIds.indexOf(active.id as string);
      const newIndex = destinationIds.indexOf(over.id as string);
      
      const newOrder = arrayMove(destinationIds, oldIndex, newIndex);
      
      try {
        await reorderDestinations(currentTrip.id, newOrder);
      } catch (error) {
        console.error('Failed to reorder destinations:', error);
        // You could add a toast notification here
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={destinations.map(dest => dest.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {destinations.map((destination) => (
            <DraggableDestinationCard
              key={destination.id}
              destination={destination}
              onEdit={onEdit}
              onDelete={onDelete}
              batchMode={batchMode}
              isSelected={selectedDestinations.includes(destination.id)}
              onToggleSelection={onToggleSelection}
              onWeatherClick={onWeatherClick}
              onPhotoUpload={onPhotoUpload}
              onPhotoGallery={onPhotoGallery}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default DraggableDestinationList;