import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Navigation, 
  RotateCcw, 
  Route, 
  Car, 
  PersonStanding, 
  Bike, 
  Clock, 
  Ruler, 
  Layers,
  Menu,
  X,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface MobileMapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  showRouting: boolean;
  onToggleRouting: () => void;
  routingMode: 'driving' | 'walking' | 'cycling';
  onChangeRoutingMode: (mode: 'driving' | 'walking' | 'cycling') => void;
  showTimeline: boolean;
  onToggleTimeline: () => void;
  showMeasurement: boolean;
  onToggleMeasurement: () => void;
  showClustering: boolean;
  onToggleClustering: () => void;
  isMobile: boolean;
}

const MobileMapControls: React.FC<MobileMapControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onReset,
  onLocate,
  showRouting,
  onToggleRouting,
  routingMode,
  onChangeRoutingMode,
  showTimeline,
  onToggleTimeline,
  showMeasurement,
  onToggleMeasurement,
  showClustering,
  onToggleClustering,
  isMobile
}) => {
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showRoutingModes, setShowRoutingModes] = useState(false);

  if (!isMobile) {
    // Desktop controls (same as before but more compact)
    return (
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem'
      }}>
        {/* Zoom Controls */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          <button
            onClick={onZoomIn}
            style={{
              background: 'white',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}
            title="Hineinzoomen"
          >
            <ZoomIn size={18} />
          </button>
          <button
            onClick={onZoomOut}
            style={{
              background: 'white',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Herauszoomen"
          >
            <ZoomOut size={18} />
          </button>
        </div>

        {/* Navigation Controls */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          <button
            onClick={onLocate}
            style={{
              background: 'white',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}
            title="Meine Position"
          >
            <Navigation size={18} />
          </button>
          <button
            onClick={onReset}
            style={{
              background: 'white',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Ansicht zurücksetzen"
          >
            <RotateCcw size={18} />
          </button>
        </div>

        {/* Feature Controls */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          overflow: 'hidden'
        }}>
          <button
            onClick={onToggleRouting}
            style={{
              background: showRouting ? '#3b82f6' : 'white',
              color: showRouting ? 'white' : '#374151',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}
            title="Route"
          >
            <Route size={18} />
          </button>
          <button
            onClick={onToggleTimeline}
            style={{
              background: showTimeline ? '#3b82f6' : 'white',
              color: showTimeline ? 'white' : '#374151',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}
            title="Timeline"
          >
            <Clock size={18} />
          </button>
          <button
            onClick={onToggleMeasurement}
            style={{
              background: showMeasurement ? '#3b82f6' : 'white',
              color: showMeasurement ? 'white' : '#374151',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb'
            }}
            title="Messen"
          >
            <Ruler size={18} />
          </button>
          <button
            onClick={onToggleClustering}
            style={{
              background: showClustering ? '#3b82f6' : 'white',
              color: showClustering ? 'white' : '#374151',
              border: 'none',
              padding: '0.75rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Clustering"
          >
            <Layers size={18} />
          </button>
        </div>

        {/* Routing Mode Selection */}
        {showRouting && (
          <div style={{
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => onChangeRoutingMode('driving')}
              style={{
                background: routingMode === 'driving' ? '#f3f4f6' : 'white',
                border: 'none',
                padding: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #e5e7eb'
              }}
              title="Auto"
            >
              <Car size={18} />
            </button>
            <button
              onClick={() => onChangeRoutingMode('walking')}
              style={{
                background: routingMode === 'walking' ? '#f3f4f6' : 'white',
                border: 'none',
                padding: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderBottom: '1px solid #e5e7eb'
              }}
              title="Zu Fuß"
            >
              <PersonStanding size={18} />
            </button>
            <button
              onClick={() => onChangeRoutingMode('cycling')}
              style={{
                background: routingMode === 'cycling' ? '#f3f4f6' : 'white',
                border: 'none',
                padding: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Fahrrad"
            >
              <Bike size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mobile controls
  return (
    <>
      {/* Fixed Zoom Controls - Always visible on mobile */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <button
          onClick={onZoomIn}
          style={{
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '1.125rem'
          }}
          title="Hineinzoomen"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={onZoomOut}
          style={{
            background: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '1.125rem'
          }}
          title="Herauszoomen"
        >
          <ZoomOut size={20} />
        </button>
      </div>

      {/* Mobile Menu Button */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        zIndex: 1000
      }}>
        <button
          onClick={() => setIsControlsExpanded(!isControlsExpanded)}
          style={{
            background: isControlsExpanded ? '#3b82f6' : 'white',
            color: isControlsExpanded ? 'white' : '#374151',
            border: 'none',
            borderRadius: '50%',
            width: '48px',
            height: '48px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '1.125rem'
          }}
          title="Menü"
        >
          {isControlsExpanded ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Controls Panel */}
      {isControlsExpanded && (
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '0',
          right: '0',
          background: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          zIndex: 1000,
          maxHeight: '70vh',
          overflow: 'auto'
        }}>
          {/* Handle bar */}
          <div style={{
            padding: '0.75rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '4px',
              background: '#d1d5db',
              borderRadius: '2px'
            }} />
          </div>

          {/* Controls Grid */}
          <div style={{
            padding: '0 1rem 1rem 1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem'
          }}>
            {/* Location */}
            <button
              onClick={() => {
                onLocate();
                setIsControlsExpanded(false);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <Navigation size={24} style={{ color: '#3b82f6' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Position</span>
            </button>

            {/* Reset */}
            <button
              onClick={() => {
                onReset();
                setIsControlsExpanded(false);
              }}
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <RotateCcw size={24} style={{ color: '#6b7280' }} />
              <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>Reset</span>
            </button>

            {/* Routing */}
            <button
              onClick={() => setShowRoutingModes(!showRoutingModes)}
              style={{
                background: showRouting ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${showRouting ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <Route size={24} style={{ color: showRouting ? '#3b82f6' : '#6b7280' }} />
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: showRouting ? '#3b82f6' : '#374151'
              }}>
                Route
              </span>
            </button>

            {/* Timeline */}
            <button
              onClick={onToggleTimeline}
              style={{
                background: showTimeline ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${showTimeline ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <Clock size={24} style={{ color: showTimeline ? '#3b82f6' : '#6b7280' }} />
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: showTimeline ? '#3b82f6' : '#374151'
              }}>
                Timeline
              </span>
            </button>

            {/* Measurement */}
            <button
              onClick={onToggleMeasurement}
              style={{
                background: showMeasurement ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${showMeasurement ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <Ruler size={24} style={{ color: showMeasurement ? '#3b82f6' : '#6b7280' }} />
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: showMeasurement ? '#3b82f6' : '#374151'
              }}>
                Messen
              </span>
            </button>

            {/* Clustering */}
            <button
              onClick={onToggleClustering}
              style={{
                background: showClustering ? '#eff6ff' : '#f8fafc',
                border: `1px solid ${showClustering ? '#3b82f6' : '#e2e8f0'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                minHeight: '80px'
              }}
            >
              <Layers size={24} style={{ color: showClustering ? '#3b82f6' : '#6b7280' }} />
              <span style={{ 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: showClustering ? '#3b82f6' : '#374151'
              }}>
                Cluster
              </span>
            </button>
          </div>

          {/* Routing Mode Selection */}
          {showRoutingModes && (
            <div style={{
              padding: '0 1rem 1rem 1rem',
              borderTop: '1px solid #e5e7eb',
              marginTop: '1rem',
              paddingTop: '1rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <h4 style={{ 
                  margin: 0, 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  Fortbewegungsmittel
                </h4>
                <button
                  onClick={() => setShowRoutingModes(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  <ChevronUp size={20} style={{ color: '#6b7280' }} />
                </button>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem'
              }}>
                <button
                  onClick={() => {
                    onChangeRoutingMode('driving');
                    onToggleRouting();
                    setShowRoutingModes(false);
                  }}
                  style={{
                    background: routingMode === 'driving' ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${routingMode === 'driving' ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Car size={20} style={{ color: routingMode === 'driving' ? '#3b82f6' : '#6b7280' }} />
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '500',
                    color: routingMode === 'driving' ? '#3b82f6' : '#374151'
                  }}>
                    Auto
                  </span>
                </button>
                
                <button
                  onClick={() => {
                    onChangeRoutingMode('walking');
                    onToggleRouting();
                    setShowRoutingModes(false);
                  }}
                  style={{
                    background: routingMode === 'walking' ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${routingMode === 'walking' ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <PersonStanding size={20} style={{ color: routingMode === 'walking' ? '#3b82f6' : '#6b7280' }} />
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '500',
                    color: routingMode === 'walking' ? '#3b82f6' : '#374151'
                  }}>
                    Zu Fuß
                  </span>
                </button>
                
                <button
                  onClick={() => {
                    onChangeRoutingMode('cycling');
                    onToggleRouting();
                    setShowRoutingModes(false);
                  }}
                  style={{
                    background: routingMode === 'cycling' ? '#eff6ff' : '#f8fafc',
                    border: `1px solid ${routingMode === 'cycling' ? '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Bike size={20} style={{ color: routingMode === 'cycling' ? '#3b82f6' : '#6b7280' }} />
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: '500',
                    color: routingMode === 'cycling' ? '#3b82f6' : '#374151'
                  }}>
                    Fahrrad
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click overlay to close */}
      {isControlsExpanded && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setIsControlsExpanded(false)}
        />
      )}
    </>
  );
};

export default MobileMapControls;