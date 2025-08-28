import { ExportService } from '../exportService';
import { Trip, Destination, DestinationCategory, DestinationStatus, ExportOptions } from '../../types';

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

// Setup DOM mocks
Object.defineProperty(document, 'createElement', { value: mockCreateElement });
Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });
Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

global.Blob = jest.fn().mockImplementation((content, options) => ({
  content,
  options
}));

describe('ExportService', () => {
  let mockTrip: Trip;
  let mockDestinations: Destination[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockTrip = {
      id: 'trip-1',
      name: 'Test Trip',
      description: 'A test trip for testing',
      startDate: '2024-01-01',
      endDate: '2024-01-03',
      destinations: ['dest-1', 'dest-2'],
      budget: 1000,
      actualCost: 800,
      participants: ['Alice', 'Bob'],
      status: 'active',
      tags: ['vacation', 'europe'],
      createdAt: new Date('2023-12-01'),
      updatedAt: new Date('2023-12-15')
    };

    mockDestinations = [
      {
        id: 'dest-1',
        name: 'Brandenburg Gate',
        location: 'Berlin, Germany',
        coordinates: { lat: 52.516272, lng: 13.377722 },
        category: DestinationCategory.ATTRACTION,
        status: DestinationStatus.PLANNED,
        priority: 1,
        startDate: '2024-01-01',
        endDate: '2024-01-01',
        duration: 120, // 2 hours
        budget: 50,
        actualCost: 45,
        tags: ['historic', 'landmark'],
        notes: 'Must see attraction',
        photos: [],
        transportMode: 'walking',
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2023-12-10')
      },
      {
        id: 'dest-2',
        name: 'Berlin Museum',
        location: 'Berlin, Germany',
        coordinates: { lat: 52.521918, lng: 13.413215 },
        category: DestinationCategory.MUSEUM,
        status: DestinationStatus.VISITED,
        priority: 2,
        startDate: '2024-01-02',
        endDate: '2024-01-02',
        duration: 180, // 3 hours
        budget: 25,
        actualCost: 20,
        tags: ['culture'],
        notes: 'Great art collection',
        photos: [],
        transportMode: 'public_transport',
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2023-12-10')
      },
      {
        id: 'dest-3', // Not included in trip
        name: 'Unused Destination',
        location: 'Somewhere',
        category: DestinationCategory.RESTAURANT,
        status: DestinationStatus.PLANNED,
        priority: 3,
        startDate: '2024-01-03',
        endDate: '2024-01-03',
        duration: 60,
        tags: [],
        photos: [],
        transportMode: 'walking',
        createdAt: new Date('2023-12-01'),
        updatedAt: new Date('2023-12-10')
      }
    ];

    // Setup DOM element mock
    const mockElement = {
      href: '',
      download: '',
      click: mockClick
    };
    mockCreateElement.mockReturnValue(mockElement);
    mockCreateObjectURL.mockReturnValue('blob:test-url');
  });

  describe('exportToGPX', () => {
    it('should export trip to GPX format with waypoints and track', () => {
      const gpx = ExportService.exportToGPX(mockTrip, mockDestinations);

      expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(gpx).toContain('<gpx version="1.1"');
      expect(gpx).toContain('<name>Test Trip</name>');
      expect(gpx).toContain('<desc>A test trip for testing</desc>');
      
      // Check waypoints
      expect(gpx).toContain('<wpt lat="52.516272" lon="13.377722">');
      expect(gpx).toContain('<name>Brandenburg Gate</name>');
      expect(gpx).toContain('<type>attraction</type>');
      
      expect(gpx).toContain('<wpt lat="52.521918" lon="13.413215">');
      expect(gpx).toContain('<name>Berlin Museum</name>');
      expect(gpx).toContain('<type>museum</type>');
      
      // Check track
      expect(gpx).toContain('<trk>');
      expect(gpx).toContain('<name>Test Trip - Route</name>');
      expect(gpx).toContain('<trkpt lat="52.516272" lon="13.377722">');
      
      expect(gpx).toContain('</gpx>');
    });

    it('should handle trip with no destinations', () => {
      const emptyTrip = { ...mockTrip, destinations: [] };
      const gpx = ExportService.exportToGPX(emptyTrip, mockDestinations);
      
      expect(gpx).toContain('<gpx version="1.1"');
      expect(gpx).not.toContain('<wpt');
      expect(gpx).not.toContain('<trk>');
      expect(gpx).toContain('</gpx>');
    });

    it('should only include destinations with coordinates', () => {
      const destinationsWithoutCoords = [
        ...mockDestinations,
        {
          ...mockDestinations[0],
          id: 'dest-4',
          coordinates: undefined
        }
      ];
      
      const tripWithExtra = {
        ...mockTrip,
        destinations: ['dest-1', 'dest-2', 'dest-4']
      };
      
      const gpx = ExportService.exportToGPX(tripWithExtra, destinationsWithoutCoords);
      
      // Should only contain 2 waypoints (dest-4 has no coordinates)
      const waypointMatches = gpx.match(/<wpt /g);
      expect(waypointMatches?.length).toBe(2);
    });

    it('should escape XML special characters', () => {
      const specialTrip = {
        ...mockTrip,
        name: 'Trip with <special> & "quoted" characters'
      };
      
      const gpx = ExportService.exportToGPX(specialTrip, mockDestinations);
      
      expect(gpx).toContain('&lt;special&gt; &amp; &quot;quoted&quot;');
      expect(gpx).not.toContain('<special>');
      expect(gpx).not.toContain('&');
      expect(gpx).not.toContain('"quoted"');
    });
  });

  describe('exportToCSV', () => {
    it('should export trip to CSV format with all columns', () => {
      const csv = ExportService.exportToCSV(mockTrip, mockDestinations);
      
      const lines = csv.split('\n');
      
      // Check header
      expect(lines[0]).toContain('Name,Ort,Kategorie,Status,Priorität');
      expect(lines[0]).toContain('Startdatum,Enddatum,Dauer (min)');
      expect(lines[0]).toContain('Budget,Tatsächliche Kosten');
      expect(lines[0]).toContain('Breitengrad,Längengrad,Tags,Notizen');
      
      // Check first destination row
      expect(lines[1]).toContain('Brandenburg Gate,Berlin\\, Germany');
      expect(lines[1]).toContain('attraction,planned');
      expect(lines[1]).toContain('2024-01-01,2024-01-01,120');
      expect(lines[1]).toContain('50,45');
      expect(lines[1]).toContain('52.516272,13.377722');
      expect(lines[1]).toContain('historic; landmark,Must see attraction');
      
      // Check second destination row
      expect(lines[2]).toContain('Berlin Museum,Berlin\\, Germany');
      expect(lines[2]).toContain('museum,visited');
    });

    it('should handle missing optional fields', () => {
      const destinationWithMissingFields = {
        ...mockDestinations[0],
        budget: undefined,
        actualCost: undefined,
        coordinates: undefined,
        notes: undefined
      };
      
      const csv = ExportService.exportToCSV(mockTrip, [destinationWithMissingFields]);
      const lines = csv.split('\n');
      
      expect(lines[1]).toContain(',,52.516272'); // Empty budget and actualCost
      expect(lines[1]).toMatch(/,,$/); // Empty coordinates and notes at end
    });

    it('should escape CSV special characters', () => {
      const specialDestination = {
        ...mockDestinations[0],
        name: 'Destination, with "quotes" and,commas',
        notes: 'Notes with\nnewlines'
      };
      
      const csv = ExportService.exportToCSV(mockTrip, [specialDestination]);
      
      expect(csv).toContain('"Destination, with ""quotes"" and,commas"');
      expect(csv).toContain('"Notes with\nnewlines"');
    });
  });

  describe('exportToJSON', () => {
    const mockOptions: ExportOptions = {
      includePhotos: true,
      includeNotes: true
    };

    it('should export trip to JSON format with full data', () => {
      const json = ExportService.exportToJSON(mockTrip, mockDestinations, mockOptions);
      const data = JSON.parse(json);
      
      // Check trip data
      expect(data.trip.id).toBe('trip-1');
      expect(data.trip.name).toBe('Test Trip');
      expect(data.trip.description).toBe('A test trip for testing');
      expect(data.trip.startDate).toBe('2024-01-01');
      expect(data.trip.endDate).toBe('2024-01-03');
      expect(data.trip.budget).toBe(1000);
      expect(data.trip.participants).toEqual(['Alice', 'Bob']);
      expect(data.trip.tags).toEqual(['vacation', 'europe']);
      expect(data.trip.exportedAt).toBeDefined();
      
      // Check destinations
      expect(data.destinations).toHaveLength(2);
      expect(data.destinations[0].id).toBe('dest-1');
      expect(data.destinations[0].name).toBe('Brandenburg Gate');
      expect(data.destinations[0].photos).toEqual([]); // includePhotos: true
      expect(data.destinations[0].notes).toBe('Must see attraction'); // includeNotes: true
      
      // Check statistics
      expect(data.statistics.totalDestinations).toBe(2);
      expect(data.statistics.visitedDestinations).toBe(1);
      expect(data.statistics.plannedDestinations).toBe(1);
      expect(data.statistics.totalBudget).toBe(75);
      expect(data.statistics.actualCost).toBe(65);
      expect(data.statistics.totalDuration).toBe(300);
    });

    it('should exclude photos and notes when options specify', () => {
      const restrictedOptions: ExportOptions = {
        includePhotos: false,
        includeNotes: false
      };
      
      const json = ExportService.exportToJSON(mockTrip, mockDestinations, restrictedOptions);
      const data = JSON.parse(json);
      
      expect(data.destinations[0].photos).toEqual([]);
      expect(data.destinations[0].notes).toBeUndefined();
    });
  });

  describe('exportToKML', () => {
    it('should export trip to KML format for Google Earth', () => {
      const kml = ExportService.exportToKML(mockTrip, mockDestinations);
      
      expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
      expect(kml).toContain('<name>Test Trip</name>');
      expect(kml).toContain('<description>A test trip for testing</description>');
      
      // Check placemarks
      expect(kml).toContain('<Placemark>');
      expect(kml).toContain('<name>Brandenburg Gate</name>');
      expect(kml).toContain('<coordinates>13.377722,52.516272,0</coordinates>');
      expect(kml).toContain('<h3>Brandenburg Gate</h3>');
      expect(kml).toContain('<strong>Kategorie:</strong> attraction');
      
      expect(kml).toContain('<name>Berlin Museum</name>');
      expect(kml).toContain('<coordinates>13.413215,52.521918,0</coordinates>');
      
      expect(kml).toContain('</kml>');
    });

    it('should only include destinations with coordinates', () => {
      const destinationsWithoutCoords = [
        ...mockDestinations,
        {
          ...mockDestinations[0],
          id: 'dest-4',
          coordinates: undefined
        }
      ];
      
      const tripWithExtra = {
        ...mockTrip,
        destinations: ['dest-1', 'dest-2', 'dest-4']
      };
      
      const kml = ExportService.exportToKML(tripWithExtra, destinationsWithoutCoords);
      
      // Should only contain 2 placemarks
      const placemarkMatches = kml.match(/<Placemark>/g);
      expect(placemarkMatches?.length).toBe(2);
    });
  });

  describe('exportToICS', () => {
    it('should export trip to iCalendar format', () => {
      const ics = ExportService.exportToICS(mockTrip, mockDestinations);
      
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Vacation Planner//Trip Export//EN');
      expect(ics).toContain('X-WR-CALNAME:Test Trip');
      
      // Check events
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:dest-1@vacation-planner.app');
      expect(ics).toContain('SUMMARY:Brandenburg Gate');
      expect(ics).toContain('LOCATION:Berlin\\, Germany');
      expect(ics).toContain('CATEGORIES:attraction');
      expect(ics).toContain('STATUS:TENTATIVE'); // planned -> TENTATIVE
      
      expect(ics).toContain('UID:dest-2@vacation-planner.app');
      expect(ics).toContain('SUMMARY:Berlin Museum');
      expect(ics).toContain('STATUS:CONFIRMED'); // visited -> CONFIRMED
      
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('should format ICS datetime correctly', () => {
      const ics = ExportService.exportToICS(mockTrip, mockDestinations);
      
      // Should contain properly formatted datetime
      expect(ics).toMatch(/DTSTART:20240101T090000Z/);
      expect(ics).toMatch(/DTEND:20240101T110000Z/); // +120 minutes duration
    });

    it('should escape ICS special characters', () => {
      const specialDestination = {
        ...mockDestinations[0],
        name: 'Event; with, special\ncharacters\\and backslashes'
      };
      
      const ics = ExportService.exportToICS(mockTrip, [specialDestination]);
      
      expect(ics).toContain('SUMMARY:Event\\; with\\, special\\ncharacters\\\\and backslashes');
    });
  });

  describe('downloadFile', () => {
    it('should create and trigger download', () => {
      const content = 'test content';
      const filename = 'test.txt';
      const mimeType = 'text/plain';
      
      ExportService.downloadFile(content, filename, mimeType);
      
      // Check Blob creation
      expect(global.Blob).toHaveBeenCalledWith([content], { type: mimeType });
      
      // Check URL creation and cleanup
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      
      // Check DOM manipulation
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('helper methods', () => {
    describe('escapeXML', () => {
      it('should escape XML special characters', () => {
        const service = ExportService as any;
        const input = '<tag>content & "quotes" & \'apostrophes\'</tag>';
        const result = service.escapeXML(input);
        
        expect(result).toBe('&lt;tag&gt;content &amp; &quot;quotes&quot; &amp; &apos;apostrophes&apos;&lt;/tag&gt;');
      });
    });

    describe('escapeCSV', () => {
      it('should escape CSV special characters', () => {
        const service = ExportService as any;
        
        expect(service.escapeCSV('simple text')).toBe('simple text');
        expect(service.escapeCSV('text, with commas')).toBe('"text, with commas"');
        expect(service.escapeCSV('text "with quotes"')).toBe('"text ""with quotes"""');
        expect(service.escapeCSV('text\nwith newlines')).toBe('"text\nwith newlines"');
      });
    });

    describe('escapeICS', () => {
      it('should escape ICS special characters', () => {
        const service = ExportService as any;
        const input = 'Text; with, special\ncharacters\\here';
        const result = service.escapeICS(input);
        
        expect(result).toBe('Text\\; with\\, special\\ncharacters\\\\here');
      });
    });

    describe('calculateTripStatistics', () => {
      it('should calculate correct statistics', () => {
        const service = ExportService as any;
        const stats = service.calculateTripStatistics(mockDestinations.slice(0, 2));
        
        expect(stats).toEqual({
          totalDestinations: 2,
          visitedDestinations: 1, // dest-2
          plannedDestinations: 1, // dest-1
          skippedDestinations: 0,
          totalBudget: 75, // 50 + 25
          actualCost: 65, // 45 + 20
          totalDuration: 300 // 120 + 180
        });
      });
    });

    describe('formatICSDateTime', () => {
      it('should format dates correctly', () => {
        const service = ExportService as any;
        
        const result = service.formatICSDateTime('2024-01-01', '09:00');
        expect(result).toBe('20240101T090000Z');
        
        const resultWithDuration = service.formatICSDateTime('2024-01-01', '09:00', 120);
        expect(resultWithDuration).toBe('20240101T110000Z'); // +2 hours
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty destinations array', () => {
      expect(() => ExportService.exportToGPX(mockTrip, [])).not.toThrow();
      expect(() => ExportService.exportToCSV(mockTrip, [])).not.toThrow();
      expect(() => ExportService.exportToKML(mockTrip, [])).not.toThrow();
      expect(() => ExportService.exportToICS(mockTrip, [])).not.toThrow();
    });

    it('should handle destinations not in trip', () => {
      const gpx = ExportService.exportToGPX(mockTrip, [mockDestinations[2]]); // dest-3 not in trip
      expect(gpx).not.toContain('Unused Destination');
    });

    it('should handle missing trip description', () => {
      const tripWithoutDesc = { ...mockTrip, description: undefined };
      const gpx = ExportService.exportToGPX(tripWithoutDesc, mockDestinations);
      
      expect(gpx).toContain('<desc>Exported from Vacation Planner</desc>');
    });

    it('should handle single destination (no track)', () => {
      const singleDestTrip = { ...mockTrip, destinations: ['dest-1'] };
      const gpx = ExportService.exportToGPX(singleDestTrip, mockDestinations);
      
      expect(gpx).toContain('<wpt'); // Should have waypoint
      expect(gpx).not.toContain('<trk>'); // Should not have track
    });
  });
});