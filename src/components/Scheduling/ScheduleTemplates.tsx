import React, { useState } from 'react';
import { useApp } from '../../stores/AppContext';
import { DestinationCategory } from '../../types';
import {
  BookOpen,
  Clock,
  Users,
  Calendar,
  Star,
  Check
} from 'lucide-react';
import { getCategoryIcon, getCategoryLabel } from '../../utils';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'sightseeing' | 'business' | 'family' | 'romantic' | 'adventure' | 'cultural';
  duration: 'halfday' | 'fullday' | 'multiday';
  schedule: TemplateTimeSlot[];
  tags: string[];
  rating: number;
  usageCount: number;
}

interface TemplateTimeSlot {
  startTime: string;
  endTime: string;
  category: DestinationCategory;
  title: string;
  description: string;
  duration: number;
  priority: number;
  optional?: boolean;
}

interface ScheduleTemplatesProps {
  onApplyTemplate?: (template: ScheduleTemplate, date: string) => void;
}

const ScheduleTemplates: React.FC<ScheduleTemplatesProps> = ({
  onApplyTemplate
}) => {
  const { currentTrip } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<ScheduleTemplate['category'] | 'all'>('all');
  const [selectedDuration, setSelectedDuration] = useState<ScheduleTemplate['duration'] | 'all'>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [applyDate, setApplyDate] = useState<string>('');

  // Predefined schedule templates
  const templates: ScheduleTemplate[] = [
    {
      id: 'sightseeing-full',
      name: 'Klassische Sightseeing-Tour',
      description: 'Ein vollgepackter Tag mit den wichtigsten Sehenswürdigkeiten',
      category: 'sightseeing',
      duration: 'fullday',
      tags: ['Sehenswürdigkeiten', 'Kultur', 'Fotografie'],
      rating: 4.8,
      usageCount: 245,
      schedule: [
        {
          startTime: '09:00',
          endTime: '10:30',
          category: DestinationCategory.ATTRACTION,
          title: 'Hauptsehenswürdigkeit 1',
          description: 'Besichtigung der wichtigsten Attraktion',
          duration: 90,
          priority: 5
        },
        {
          startTime: '10:45',
          endTime: '12:15',
          category: DestinationCategory.ATTRACTION,
          title: 'Hauptsehenswürdigkeit 2',
          description: 'Zweite wichtige Sehenswürdigkeit',
          duration: 90,
          priority: 4
        },
        {
          startTime: '12:30',
          endTime: '13:30',
          category: DestinationCategory.RESTAURANT,
          title: 'Mittagspause',
          description: 'Lokales Restaurant oder Café',
          duration: 60,
          priority: 3
        },
        {
          startTime: '14:00',
          endTime: '15:30',
          category: DestinationCategory.MUSEUM,
          title: 'Museum oder Galerie',
          description: 'Kultureller Besuch',
          duration: 90,
          priority: 4
        },
        {
          startTime: '16:00',
          endTime: '17:00',
          category: DestinationCategory.ATTRACTION,
          title: 'Stadtbummel',
          description: 'Spaziergang durch die Altstadt',
          duration: 60,
          priority: 3
        },
        {
          startTime: '17:30',
          endTime: '18:30',
          category: DestinationCategory.RESTAURANT,
          title: 'Café-Pause',
          description: 'Entspannung bei Kaffee und Kuchen',
          duration: 60,
          priority: 2,
          optional: true
        }
      ]
    },
    {
      id: 'business-day',
      name: 'Business-Tag',
      description: 'Strukturierter Geschäftstag mit Terminen und Networking',
      category: 'business',
      duration: 'fullday',
      tags: ['Business', 'Meetings', 'Networking'],
      rating: 4.5,
      usageCount: 89,
      schedule: [
        {
          startTime: '08:00',
          endTime: '09:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Business-Frühstück',
          description: 'Networking beim Frühstück',
          duration: 60,
          priority: 3
        },
        {
          startTime: '09:30',
          endTime: '11:00',
          category: DestinationCategory.OTHER,
          title: 'Meeting 1',
          description: 'Erster Geschäftstermin',
          duration: 90,
          priority: 5
        },
        {
          startTime: '11:30',
          endTime: '12:30',
          category: DestinationCategory.OTHER,
          title: 'Meeting 2',
          description: 'Zweiter Geschäftstermin',
          duration: 60,
          priority: 4
        },
        {
          startTime: '13:00',
          endTime: '14:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Business-Lunch',
          description: 'Geschäftsessen',
          duration: 60,
          priority: 4
        },
        {
          startTime: '14:30',
          endTime: '16:00',
          category: DestinationCategory.OTHER,
          title: 'Workshop/Präsentation',
          description: 'Längerer Termin oder Präsentation',
          duration: 90,
          priority: 5
        },
        {
          startTime: '16:30',
          endTime: '17:30',
          category: DestinationCategory.OTHER,
          title: 'Follow-up Meeting',
          description: 'Nachbesprechung',
          duration: 60,
          priority: 3,
          optional: true
        }
      ]
    },
    {
      id: 'family-fun',
      name: 'Familientag',
      description: 'Spaß für die ganze Familie mit kinderfreundlichen Aktivitäten',
      category: 'family',
      duration: 'fullday',
      tags: ['Familie', 'Kinder', 'Spaß'],
      rating: 4.7,
      usageCount: 156,
      schedule: [
        {
          startTime: '10:00',
          endTime: '11:30',
          category: DestinationCategory.ATTRACTION,
          title: 'Kinderfreundliche Attraktion',
          description: 'Zoo, Aquarium oder Spielplatz',
          duration: 90,
          priority: 5
        },
        {
          startTime: '12:00',
          endTime: '13:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Familien-Restaurant',
          description: 'Kinderfreundliches Restaurant',
          duration: 60,
          priority: 4
        },
        {
          startTime: '13:30',
          endTime: '15:00',
          category: DestinationCategory.ENTERTAINMENT,
          title: 'Aktivität für Kinder',
          description: 'Spielplatz, Minigolf oder ähnliches',
          duration: 90,
          priority: 4
        },
        {
          startTime: '15:30',
          endTime: '16:30',
          category: DestinationCategory.RESTAURANT,
          title: 'Eis oder Snack',
          description: 'Pause mit Eis oder Snacks',
          duration: 60,
          priority: 3
        },
        {
          startTime: '17:00',
          endTime: '18:00',
          category: DestinationCategory.ENTERTAINMENT,
          title: 'Freie Spielzeit',
          description: 'Park oder Spielbereich',
          duration: 60,
          priority: 2,
          optional: true
        }
      ]
    },
    {
      id: 'romantic-evening',
      name: 'Romantischer Abend',
      description: 'Perfekter Abend für Paare',
      category: 'romantic',
      duration: 'halfday',
      tags: ['Romantik', 'Dinner', 'Zweisamkeit'],
      rating: 4.9,
      usageCount: 198,
      schedule: [
        {
          startTime: '17:00',
          endTime: '18:30',
          category: DestinationCategory.ATTRACTION,
          title: 'Romantischer Spaziergang',
          description: 'Sonnenuntergang an schönem Ort',
          duration: 90,
          priority: 4
        },
        {
          startTime: '19:00',
          endTime: '20:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Aperitif',
          description: 'Cocktails oder Wein in Bar',
          duration: 60,
          priority: 3
        },
        {
          startTime: '20:30',
          endTime: '22:30',
          category: DestinationCategory.RESTAURANT,
          title: 'Romantisches Dinner',
          description: 'Gehobenes Restaurant',
          duration: 120,
          priority: 5
        },
        {
          startTime: '23:00',
          endTime: '24:00',
          category: DestinationCategory.ENTERTAINMENT,
          title: 'Nachspann',
          description: 'Lounge oder Nachtspaziergang',
          duration: 60,
          priority: 2,
          optional: true
        }
      ]
    },
    {
      id: 'cultural-immersion',
      name: 'Kulturelle Entdeckung',
      description: 'Tiefes Eintauchen in die lokale Kultur',
      category: 'cultural',
      duration: 'fullday',
      tags: ['Kultur', 'Geschichte', 'Tradition'],
      rating: 4.6,
      usageCount: 78,
      schedule: [
        {
          startTime: '09:00',
          endTime: '10:30',
          category: DestinationCategory.MUSEUM,
          title: 'Historisches Museum',
          description: 'Lokale Geschichte verstehen',
          duration: 90,
          priority: 5
        },
        {
          startTime: '11:00',
          endTime: '12:30',
          category: DestinationCategory.CULTURAL,
          title: 'Historisches Viertel',
          description: 'Architektur und Geschichte',
          duration: 90,
          priority: 4
        },
        {
          startTime: '13:00',
          endTime: '14:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Traditionelles Lokal',
          description: 'Authentische regionale Küche',
          duration: 60,
          priority: 4
        },
        {
          startTime: '14:30',
          endTime: '16:00',
          category: DestinationCategory.CULTURAL,
          title: 'Kulturelle Aktivität',
          description: 'Handwerk, Musik oder Tanz',
          duration: 90,
          priority: 3
        },
        {
          startTime: '16:30',
          endTime: '17:30',
          category: DestinationCategory.SHOPPING,
          title: 'Lokaler Markt',
          description: 'Regionale Produkte entdecken',
          duration: 60,
          priority: 3
        }
      ]
    },
    {
      id: 'adventure-day',
      name: 'Abenteuer-Tag',
      description: 'Aktiver Tag voller Abenteuer und Sport',
      category: 'adventure',
      duration: 'fullday',
      tags: ['Abenteuer', 'Sport', 'Aktivität'],
      rating: 4.4,
      usageCount: 112,
      schedule: [
        {
          startTime: '08:00',
          endTime: '09:00',
          category: DestinationCategory.RESTAURANT,
          title: 'Sportler-Frühstück',
          description: 'Energiereiches Frühstück',
          duration: 60,
          priority: 4
        },
        {
          startTime: '09:30',
          endTime: '12:00',
          category: DestinationCategory.SPORTS,
          title: 'Outdoor-Aktivität 1',
          description: 'Wandern, Klettern oder Radfahren',
          duration: 150,
          priority: 5
        },
        {
          startTime: '12:30',
          endTime: '13:30',
          category: DestinationCategory.RESTAURANT,
          title: 'Stärkung',
          description: 'Picknick oder rustikales Lokal',
          duration: 60,
          priority: 3
        },
        {
          startTime: '14:00',
          endTime: '16:30',
          category: DestinationCategory.SPORTS,
          title: 'Outdoor-Aktivität 2',
          description: 'Wassersport oder andere Aktivität',
          duration: 150,
          priority: 4
        },
        {
          startTime: '17:00',
          endTime: '18:00',
          category: DestinationCategory.OTHER,
          title: 'Entspannung',
          description: 'Pause und Regeneration',
          duration: 60,
          priority: 2
        }
      ]
    }
  ];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    if (selectedCategory !== 'all' && template.category !== selectedCategory) return false;
    if (selectedDuration !== 'all' && template.duration !== selectedDuration) return false;
    return true;
  });

  const getCategoryColor = (category: ScheduleTemplate['category']) => {
    switch (category) {
      case 'sightseeing': return '#3b82f6';
      case 'business': return '#6b7280';
      case 'family': return '#16a34a';
      case 'romantic': return '#dc2626';
      case 'adventure': return '#d97706';
      case 'cultural': return '#7c3aed';
      default: return '#6b7280';
    }
  };

  const getDurationLabel = (duration: ScheduleTemplate['duration']) => {
    switch (duration) {
      case 'halfday': return 'Halber Tag';
      case 'fullday': return 'Ganzer Tag';
      case 'multiday': return 'Mehrere Tage';
      default: return duration;
    }
  };

  const getTotalDuration = (schedule: TemplateTimeSlot[]): number => {
    return schedule.reduce((sum, slot) => sum + slot.duration, 0);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate && applyDate && onApplyTemplate) {
      onApplyTemplate(selectedTemplate, applyDate);
      setSelectedTemplate(null);
      setApplyDate('');
    }
  };

  if (!currentTrip) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
        padding: '3rem',
        color: '#6b7280'
      }}>
        <BookOpen size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Keine Reise ausgewählt</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Wählen Sie eine Reise aus, um Vorlagen anzuwenden.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          Zeitplan-Vorlagen
        </h1>
        <p style={{
          margin: 0,
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          Bewährte Tagesabläufe für verschiedene Reisetypen
        </p>
      </div>

      {/* Filters */}
      <div style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Filter
        </h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Kategorie
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="all">Alle Kategorien</option>
              <option value="sightseeing">Sightseeing</option>
              <option value="business">Business</option>
              <option value="family">Familie</option>
              <option value="romantic">Romantik</option>
              <option value="adventure">Abenteuer</option>
              <option value="cultural">Kultur</option>
            </select>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Dauer
            </label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.875rem',
                background: 'white'
              }}
            >
              <option value="all">Alle Dauern</option>
              <option value="halfday">Halber Tag</option>
              <option value="fullday">Ganzer Tag</option>
              <option value="multiday">Mehrere Tage</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {filteredTemplates.map(template => (
          <div key={template.id} style={{
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setSelectedTemplate(template)}
          onMouseOver={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          >
            {/* Template Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #f3f4f6'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    {template.name}
                  </h3>
                  <p style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    {template.description}
                  </p>
                </div>

                <div style={{
                  background: getCategoryColor(template.category),
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  marginLeft: '1rem'
                }}>
                  {template.category}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                fontSize: '0.875rem',
                color: '#6b7280'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} />
                  <span>{getDurationLabel(template.duration)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Star size={14} />
                  <span>{template.rating}/5</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Users size={14} />
                  <span>{template.usageCount}x verwendet</span>
                </div>
              </div>
            </div>

            {/* Schedule Preview */}
            <div style={{ padding: '1rem 1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <Calendar size={14} style={{ color: '#6b7280' }} />
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  Tagesablauf ({formatDuration(getTotalDuration(template.schedule))})
                </span>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {template.schedule.map((slot, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.5rem',
                    background: '#f9fafb',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}>
                    <div style={{
                      color: getCategoryColor(template.category),
                      fontSize: '1rem'
                    }}>
                      {getCategoryIcon(slot.category)}
                    </div>
                    
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      minWidth: '80px'
                    }}>
                      {slot.startTime} - {slot.endTime}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {slot.title}
                        {slot.optional && (
                          <span style={{
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            color: '#6b7280'
                          }}>
                            (optional)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div style={{
              padding: '0 1.5rem 1.5rem 1.5rem'
            }}>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.25rem'
              }}>
                {template.tags.map(tag => (
                  <span key={tag} style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem'
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
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
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                {selectedTemplate.name}
              </h2>
              <button
                onClick={() => setSelectedTemplate(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                ×
              </button>
            </div>

            <p style={{
              margin: '0 0 1.5rem 0',
              color: '#6b7280',
              fontSize: '1rem'
            }}>
              {selectedTemplate.description}
            </p>

            {/* Apply Template Form */}
            <div style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Vorlage anwenden
              </h4>
              
              <div style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'end'
              }}>
                <div style={{ flex: 1 }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    Datum auswählen
                  </label>
                  <input
                    type="date"
                    value={applyDate}
                    onChange={(e) => setApplyDate(e.target.value)}
                    min={currentTrip.startDate}
                    max={currentTrip.endDate}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>
                
                <button
                  onClick={handleApplyTemplate}
                  disabled={!applyDate}
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.75rem 1.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: !applyDate ? 0.6 : 1
                  }}
                >
                  <Check size={16} />
                  Anwenden
                </button>
              </div>
            </div>

            {/* Detailed Schedule */}
            <div>
              <h4 style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937'
              }}>
                Detaillierter Zeitplan
              </h4>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                {selectedTemplate.schedule.map((slot, index) => (
                  <div key={index} style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '1rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1rem'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: getCategoryColor(selectedTemplate.category),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '1.25rem',
                        flexShrink: 0
                      }}>
                        {getCategoryIcon(slot.category)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          marginBottom: '0.5rem'
                        }}>
                          <h5 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {slot.title}
                          </h5>
                          
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>
                            {slot.startTime} - {slot.endTime}
                          </div>
                          
                          {slot.optional && (
                            <span style={{
                              background: '#fef3c7',
                              color: '#d97706',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: '500'
                            }}>
                              Optional
                            </span>
                          )}
                        </div>

                        <p style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {slot.description}
                        </p>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          fontSize: '0.75rem',
                          color: '#9ca3af'
                        }}>
                          <span>Dauer: {formatDuration(slot.duration)}</span>
                          <span>Kategorie: {getCategoryLabel(slot.category)}</span>
                          <span>Priorität: {slot.priority}/5</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleTemplates;