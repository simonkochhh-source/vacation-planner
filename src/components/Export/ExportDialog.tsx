import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import { ExportService } from '../../services/exportService';
import { ExportOptions } from '../../types';
import {
  Download,
  FileText,
  Map,
  Navigation,
  Calendar,
  Database,
  Globe,
  X,
  Settings,
  CheckSquare,
  Square
} from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'gpx' | 'csv' | 'json' | 'kml' | 'ics';

const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose }) => {
  const { currentTrip, destinations } = useApp();
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('gpx');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'gpx',
    includePhotos: false,
    includeNotes: true
  });
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen || !currentTrip) return null;

  const tripDestinations = destinations.filter(dest => 
    currentTrip.destinations.includes(dest.id)
  );

  const destinationsWithCoords = tripDestinations.filter(dest => dest.coordinates);

  const exportFormats = [
    {
      id: 'gpx' as ExportFormat,
      name: 'GPX',
      description: 'GPS Exchange Format für Navigationsgeräte',
      icon: Navigation,
      extension: '.gpx',
      mimeType: 'application/gpx+xml',
      requiresCoordinates: true,
      features: ['GPS-Wegpunkte', 'Routen-Track', 'Metadaten']
    },
    {
      id: 'csv' as ExportFormat,
      name: 'CSV',
      description: 'Tabellenkalkulation (Excel, Google Sheets)',
      icon: FileText,
      extension: '.csv',
      mimeType: 'text/csv',
      requiresCoordinates: false,
      features: ['Alle Daten', 'Excel-kompatibel', 'Einfache Bearbeitung']
    },
    {
      id: 'json' as ExportFormat,
      name: 'JSON',
      description: 'Vollständiger Datenexport',
      icon: Database,
      extension: '.json',
      mimeType: 'application/json',
      requiresCoordinates: false,
      features: ['Komplette Daten', 'Statistiken', 'Re-Import möglich']
    },
    {
      id: 'kml' as ExportFormat,
      name: 'KML',
      description: 'Google Earth & Google Maps',
      icon: Globe,
      extension: '.kml',
      mimeType: 'application/vnd.google-earth.kml+xml',
      requiresCoordinates: true,
      features: ['Google Earth', 'Rich Media', 'Visualisierung']
    },
    {
      id: 'ics' as ExportFormat,
      name: 'iCalendar',
      description: 'Kalender-Import (Outlook, Google Calendar)',
      icon: Calendar,
      extension: '.ics',
      mimeType: 'text/calendar',
      requiresCoordinates: false,
      features: ['Kalender-Events', 'Erinnerungen', 'Terminplanung']
    }
  ];

  const selectedFormatInfo = exportFormats.find(f => f.id === selectedFormat)!;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      let content: string;
      let filename: string;
      
      const baseFilename = currentTrip.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      
      switch (selectedFormat) {
        case 'gpx':
          content = ExportService.exportToGPX(currentTrip, tripDestinations);
          filename = `${baseFilename}.gpx`;
          break;
        case 'csv':
          content = ExportService.exportToCSV(currentTrip, tripDestinations);
          filename = `${baseFilename}.csv`;
          break;
        case 'json':
          content = ExportService.exportToJSON(currentTrip, tripDestinations, exportOptions);
          filename = `${baseFilename}.json`;
          break;
        case 'kml':
          content = ExportService.exportToKML(currentTrip, tripDestinations);
          filename = `${baseFilename}.kml`;
          break;
        case 'ics':
          content = ExportService.exportToICS(currentTrip, tripDestinations);
          filename = `${baseFilename}.ics`;
          break;
        default:
          throw new Error('Unbekanntes Export-Format');
      }

      ExportService.downloadFile(content, filename, selectedFormatInfo.mimeType);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Fehler beim Export. Bitte versuchen Sie es erneut.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem'
        }}>
          <div>
            <h2 style={{
              margin: '0 0 0.5rem 0',
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Reise exportieren
            </h2>
            <p style={{
              margin: 0,
              color: '#6b7280',
              fontSize: '0.875rem'
            }}>
              {currentTrip.name} • {tripDestinations.length} Ziele
            </p>
          </div>
          
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: '#6b7280'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Format Selection */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Export-Format wählen
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
            {exportFormats.map((format) => {
              const Icon = format.icon;
              const isSelected = selectedFormat === format.id;
              const hasRequiredData = !format.requiresCoordinates || destinationsWithCoords.length > 0;
              
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  disabled={!hasRequiredData}
                  style={{
                    background: isSelected ? '#dbeafe' : 'white',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem',
                    cursor: hasRequiredData ? 'pointer' : 'not-allowed',
                    opacity: hasRequiredData ? 1 : 0.5,
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    marginBottom: '0.5rem'
                  }}>
                    <Icon size={20} style={{ color: isSelected ? '#3b82f6' : '#6b7280' }} />
                    <span style={{
                      fontWeight: '600',
                      color: isSelected ? '#3b82f6' : '#1f2937'
                    }}>
                      {format.name}
                    </span>
                  </div>
                  
                  <p style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {format.description}
                  </p>
                  
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.25rem'
                  }}>
                    {format.features.map((feature) => (
                      <span
                        key={feature}
                        style={{
                          background: '#f3f4f6',
                          color: '#374151',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem'
                        }}
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                  
                  {!hasRequiredData && (
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.75rem',
                      color: '#ef4444'
                    }}>
                      Benötigt GPS-Koordinaten
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Export Options */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <Settings size={18} style={{ color: '#6b7280' }} />
            <h3 style={{
              margin: 0,
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Optionen
            </h3>
          </div>
          
          <div style={{
            background: '#f9fafb',
            borderRadius: '8px',
            padding: '1rem',
            display: 'grid',
            gap: '1rem'
          }}>
            {selectedFormat === 'json' && (
              <>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <button
                    onClick={() => setExportOptions(prev => ({
                      ...prev,
                      includePhotos: !prev.includePhotos
                    }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {exportOptions.includePhotos ? (
                      <CheckSquare size={16} style={{ color: '#3b82f6' }} />
                    ) : (
                      <Square size={16} style={{ color: '#9ca3af' }} />
                    )}
                  </button>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                    Foto-URLs einschließen
                  </span>
                </label>
                
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer'
                }}>
                  <button
                    onClick={() => setExportOptions(prev => ({
                      ...prev,
                      includeNotes: !prev.includeNotes
                    }))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {exportOptions.includeNotes ? (
                      <CheckSquare size={16} style={{ color: '#3b82f6' }} />
                    ) : (
                      <Square size={16} style={{ color: '#9ca3af' }} />
                    )}
                  </button>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>
                    Notizen einschließen
                  </span>
                </label>
              </>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '0.75rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <div>
                <strong>Gesamt:</strong> {tripDestinations.length} Ziele
              </div>
              <div>
                <strong>Mit GPS:</strong> {destinationsWithCoords.length} Ziele
              </div>
              <div>
                <strong>Zeitraum:</strong> {currentTrip.startDate} bis {currentTrip.endDate}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem'
        }}>
          <h4 style={{
            margin: '0 0 0.5rem 0',
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Export-Vorschau
          </h4>
          
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            display: 'grid',
            gap: '0.25rem'
          }}>
            <div><strong>Format:</strong> {selectedFormatInfo.name} ({selectedFormatInfo.extension})</div>
            <div><strong>Dateiname:</strong> {currentTrip.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}{selectedFormatInfo.extension}</div>
            <div><strong>Beschreibung:</strong> {selectedFormatInfo.description}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleExport}
            disabled={isExporting || (selectedFormatInfo.requiresCoordinates && destinationsWithCoords.length === 0)}
            style={{
              background: isExporting ? '#9ca3af' : '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              padding: '0.75rem 1.5rem',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Download size={16} />
            {isExporting ? 'Exportiere...' : 'Exportieren'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;