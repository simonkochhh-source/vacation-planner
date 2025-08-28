import { destinationSchema, tripSchema, DestinationFormData, TripFormData } from '../validationSchemas';
import { DestinationCategory, DestinationStatus } from '../../types';

describe('Validation Schemas', () => {
  describe('destinationSchema', () => {
    const validDestinationData: DestinationFormData = {
      name: 'Brandenburg Gate',
      location: 'Berlin, Germany',
      category: DestinationCategory.ATTRACTION,
      startDate: '2024-01-01',
      endDate: '2024-01-01',
      budget: 50,
      actualCost: 45,
      coordinates: { lat: 52.516272, lng: 13.377722 },
      notes: 'Must see attraction',
      images: ['https://example.com/image.jpg'],
      status: DestinationStatus.PLANNED,
      tags: ['historic', 'landmark'],
      color: '#FF0000'
    };

    describe('name field', () => {
      it('should validate correct name', () => {
        const result = destinationSchema.safeParse(validDestinationData);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const data = { ...validDestinationData, name: '' };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Name ist erforderlich')).toBe(true);
        }
      });

      it('should reject name longer than 100 characters', () => {
        const longName = 'A'.repeat(101);
        const data = { ...validDestinationData, name: longName };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Name darf nicht länger als 100 Zeichen sein')).toBe(true);
        }
      });
    });

    describe('location field', () => {
      it('should validate correct location', () => {
        const result = destinationSchema.safeParse(validDestinationData);
        expect(result.success).toBe(true);
      });

      it('should reject empty location', () => {
        const data = { ...validDestinationData, location: '' };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Ort ist erforderlich')).toBe(true);
        }
      });

      it('should reject location longer than 200 characters', () => {
        const longLocation = 'A'.repeat(201);
        const data = { ...validDestinationData, location: longLocation };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Ort darf nicht länger als 200 Zeichen sein')).toBe(true);
        }
      });
    });

    describe('category field', () => {
      it('should validate valid category', () => {
        Object.values(DestinationCategory).forEach(category => {
          const data = { ...validDestinationData, category };
          const result = destinationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid category', () => {
        const data = { ...validDestinationData, category: 'invalid_category' as any };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
      });
    });

    describe('date fields', () => {
      it('should validate correct date format', () => {
        const data = {
          ...validDestinationData,
          startDate: '2024-12-31',
          endDate: '2024-12-31'
        };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject empty start date', () => {
        const data = { ...validDestinationData, startDate: '' };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Startdatum ist erforderlich')).toBe(true);
        }
      });

      it('should reject invalid date format', () => {
        const data = { ...validDestinationData, startDate: '2024/01/01' };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Ungültiges Datumsformat')).toBe(true);
        }
      });

      it('should reject end date before start date', () => {
        const data = {
          ...validDestinationData,
          startDate: '2024-01-10',
          endDate: '2024-01-05'
        };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Enddatum muss nach dem Startdatum liegen')).toBe(true);
        }
      });

      it('should allow same start and end date', () => {
        const data = {
          ...validDestinationData,
          startDate: '2024-01-01',
          endDate: '2024-01-01'
        };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('budget and cost fields', () => {
      it('should validate positive budget', () => {
        const data = { ...validDestinationData, budget: 100 };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject negative budget', () => {
        const data = { ...validDestinationData, budget: -10 };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Budget kann nicht negativ sein')).toBe(true);
        }
      });

      it('should allow zero budget', () => {
        const data = { ...validDestinationData, budget: 0 };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject negative actual cost', () => {
        const data = { ...validDestinationData, actualCost: -5 };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Kosten können nicht negativ sein')).toBe(true);
        }
      });

      it('should allow actual cost up to 150% of budget', () => {
        const data = { ...validDestinationData, budget: 100, actualCost: 150 };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject actual cost exceeding 150% of budget', () => {
        const data = { ...validDestinationData, budget: 100, actualCost: 151 };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Tatsächliche Kosten überschreiten das Budget erheblich')).toBe(true);
        }
      });

      it('should allow undefined budget and actual cost', () => {
        const data = { 
          ...validDestinationData, 
          budget: undefined, 
          actualCost: undefined 
        };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('coordinates field', () => {
      it('should validate correct coordinates', () => {
        const data = {
          ...validDestinationData,
          coordinates: { lat: 52.516272, lng: 13.377722 }
        };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject latitude out of range', () => {
        const data = {
          ...validDestinationData,
          coordinates: { lat: 91, lng: 0 }
        };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Breitengrad muss zwischen -90 und 90 liegen')).toBe(true);
        }
      });

      it('should reject longitude out of range', () => {
        const data = {
          ...validDestinationData,
          coordinates: { lat: 0, lng: 181 }
        };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Längengrad muss zwischen -180 und 180 liegen')).toBe(true);
        }
      });

      it('should allow boundary coordinate values', () => {
        const testCases = [
          { lat: -90, lng: -180 },
          { lat: 90, lng: 180 },
          { lat: 0, lng: 0 }
        ];

        testCases.forEach(coordinates => {
          const data = { ...validDestinationData, coordinates };
          const result = destinationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should allow undefined coordinates', () => {
        const data = { ...validDestinationData, coordinates: undefined };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('notes field', () => {
      it('should validate notes within limit', () => {
        const notes = 'A'.repeat(999);
        const data = { ...validDestinationData, notes };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject notes longer than 1000 characters', () => {
        const longNotes = 'A'.repeat(1001);
        const data = { ...validDestinationData, notes: longNotes };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Notizen dürfen nicht länger als 1000 Zeichen sein')).toBe(true);
        }
      });

      it('should allow undefined notes', () => {
        const data = { ...validDestinationData, notes: undefined };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('images field', () => {
      it('should validate array of valid URLs', () => {
        const images = [
          'https://example.com/image1.jpg',
          'http://test.com/image2.png'
        ];
        const data = { ...validDestinationData, images };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject invalid URLs', () => {
        const images = ['not-a-url', 'https://valid.com/image.jpg'];
        const data = { ...validDestinationData, images };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Ungültige URL')).toBe(true);
        }
      });

      it('should default to empty array when undefined', () => {
        const data = { ...validDestinationData, images: undefined };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.images).toEqual([]);
        }
      });
    });

    describe('status field', () => {
      it('should validate valid status values', () => {
        Object.values(DestinationStatus).forEach(status => {
          const data = { ...validDestinationData, status };
          const result = destinationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid status', () => {
        const data = { ...validDestinationData, status: 'invalid_status' as any };
        const result = destinationSchema.safeParse(data);
        
        expect(result.success).toBe(false);
      });

      it('should allow undefined status', () => {
        const data = { ...validDestinationData, status: undefined };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('tags field', () => {
      it('should validate array of strings', () => {
        const data = { ...validDestinationData, tags: ['historic', 'landmark', 'must-see'] };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow empty tags array', () => {
        const data = { ...validDestinationData, tags: [] };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow undefined tags', () => {
        const data = { ...validDestinationData, tags: undefined };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('color field', () => {
      it('should validate valid hex colors', () => {
        const validColors = ['#FF0000', '#00ff00', '#0000FF', '#123ABC', '#ffffff'];
        
        validColors.forEach(color => {
          const data = { ...validDestinationData, color };
          const result = destinationSchema.safeParse(data);
          expect(result.success).toBe(true);
        });
      });

      it('should reject invalid hex colors', () => {
        const invalidColors = ['#FF', '#GGGGGG', 'red', '#1234567', 'FF0000'];
        
        invalidColors.forEach(color => {
          const data = { ...validDestinationData, color };
          const result = destinationSchema.safeParse(data);
          
          expect(result.success).toBe(false);
          if (!result.success) {
            expect(result.error.issues.some(e => e.message === 'Ungültiges Farbformat (Hex)')).toBe(true);
          }
        });
      });

      it('should allow undefined color', () => {
        const data = { ...validDestinationData, color: undefined };
        const result = destinationSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('tripSchema', () => {
    const validTripData: TripFormData = {
      name: 'European Adventure',
      description: 'A wonderful trip through Europe',
      startDate: '2024-01-01',
      endDate: '2024-01-14',
      budget: 2000,
      participants: ['Alice', 'Bob', 'Charlie'],
      tags: ['vacation', 'europe', 'culture']
    };

    describe('name field', () => {
      it('should validate correct name', () => {
        const result = tripSchema.safeParse(validTripData);
        expect(result.success).toBe(true);
      });

      it('should reject empty name', () => {
        const data = { ...validTripData, name: '' };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Name ist erforderlich')).toBe(true);
        }
      });

      it('should reject name longer than 100 characters', () => {
        const longName = 'A'.repeat(101);
        const data = { ...validTripData, name: longName };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Name darf nicht länger als 100 Zeichen sein')).toBe(true);
        }
      });
    });

    describe('description field', () => {
      it('should validate description within limit', () => {
        const description = 'A'.repeat(499);
        const data = { ...validTripData, description };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject description longer than 500 characters', () => {
        const longDescription = 'A'.repeat(501);
        const data = { ...validTripData, description: longDescription };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Beschreibung darf nicht länger als 500 Zeichen sein')).toBe(true);
        }
      });

      it('should allow undefined description', () => {
        const data = { ...validTripData, description: undefined };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('date fields', () => {
      it('should validate correct date format', () => {
        const data = {
          ...validTripData,
          startDate: '2024-12-31',
          endDate: '2024-12-31'
        };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject empty start date', () => {
        const data = { ...validTripData, startDate: '' };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Startdatum ist erforderlich')).toBe(true);
        }
      });

      it('should reject invalid date format', () => {
        const data = { ...validTripData, startDate: '01/01/2024' };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Ungültiges Datumsformat')).toBe(true);
        }
      });

      it('should reject end date before start date', () => {
        const data = {
          ...validTripData,
          startDate: '2024-01-10',
          endDate: '2024-01-05'
        };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Enddatum muss nach dem Startdatum liegen')).toBe(true);
        }
      });

      it('should allow same start and end date', () => {
        const data = {
          ...validTripData,
          startDate: '2024-01-01',
          endDate: '2024-01-01'
        };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('budget field', () => {
      it('should validate positive budget', () => {
        const data = { ...validTripData, budget: 1000 };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject negative budget', () => {
        const data = { ...validTripData, budget: -100 };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Budget kann nicht negativ sein')).toBe(true);
        }
      });

      it('should allow zero budget', () => {
        const data = { ...validTripData, budget: 0 };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow undefined budget', () => {
        const data = { ...validTripData, budget: undefined };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('participants field', () => {
      it('should validate array of participant names', () => {
        const participants = ['Alice', 'Bob', 'Charlie Smith'];
        const data = { ...validTripData, participants };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject empty participant names', () => {
        const participants = ['Alice', '', 'Charlie'];
        const data = { ...validTripData, participants };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Teilnehmername darf nicht leer sein')).toBe(true);
        }
      });

      it('should reject participant names longer than 50 characters', () => {
        const longName = 'A'.repeat(51);
        const participants = ['Alice', longName];
        const data = { ...validTripData, participants };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Teilnehmername darf nicht länger als 50 Zeichen sein')).toBe(true);
        }
      });

      it('should allow empty participants array', () => {
        const data = { ...validTripData, participants: [] };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow undefined participants', () => {
        const data = { ...validTripData, participants: undefined };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    describe('tags field', () => {
      it('should validate array of tag names', () => {
        const tags = ['vacation', 'europe', 'culture', 'adventure'];
        const data = { ...validTripData, tags };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should reject empty tag names', () => {
        const tags = ['vacation', '', 'culture'];
        const data = { ...validTripData, tags };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Tag darf nicht leer sein')).toBe(true);
        }
      });

      it('should reject tag names longer than 30 characters', () => {
        const longTag = 'A'.repeat(31);
        const tags = ['vacation', longTag];
        const data = { ...validTripData, tags };
        const result = tripSchema.safeParse(data);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues.some(e => e.message === 'Tag darf nicht länger als 30 Zeichen sein')).toBe(true);
        }
      });

      it('should allow empty tags array', () => {
        const data = { ...validTripData, tags: [] };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      it('should allow undefined tags', () => {
        const data = { ...validTripData, tags: undefined };
        const result = tripSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    it('should handle minimal valid destination', () => {
      const minimalDestination = {
        name: 'Test',
        location: 'Test Location',
        category: DestinationCategory.ATTRACTION,
        startDate: '2024-01-01',
        endDate: '2024-01-01'
      };
      
      const result = destinationSchema.safeParse(minimalDestination);
      expect(result.success).toBe(true);
    });

    it('should handle minimal valid trip', () => {
      const minimalTrip = {
        name: 'Test Trip',
        startDate: '2024-01-01',
        endDate: '2024-01-01'
      };
      
      const result = tripSchema.safeParse(minimalTrip);
      expect(result.success).toBe(true);
    });

    it('should handle multiple validation errors', () => {
      const invalidDestination = {
        name: '', // Error: empty name
        location: 'A'.repeat(201), // Error: too long location
        category: DestinationCategory.ATTRACTION,
        startDate: '2024-01-10',
        endDate: '2024-01-05', // Error: end date before start date
        budget: -50, // Error: negative budget
        coordinates: { lat: 95, lng: 185 }, // Error: out of range coordinates
        color: 'invalid' // Error: invalid color format
      };
      
      const result = destinationSchema.safeParse(invalidDestination);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });
  });
});