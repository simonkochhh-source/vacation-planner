import { z } from 'zod';
import { DestinationCategory, DestinationStatus } from '../types';

// Destination Schema
export const destinationSchema = z.object({
  name: z.string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf nicht länger als 100 Zeichen sein'),
  
  location: z.string()
    .min(1, 'Ort ist erforderlich')
    .max(200, 'Ort darf nicht länger als 200 Zeichen sein'),
  
  category: z.nativeEnum(DestinationCategory),
  
  startDate: z.string()
    .min(1, 'Startdatum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat'),
  
  startTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (HH:MM)'),
  
  endDate: z.string()
    .min(1, 'Enddatum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat'),
  
  endTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Ungültiges Zeitformat (HH:MM)'),
  
  priority: z.number()
    .min(1, 'Priorität muss zwischen 1 und 5 liegen')
    .max(5, 'Priorität muss zwischen 1 und 5 liegen')
    .int('Priorität muss eine ganze Zahl sein'),
  
  budget: z.number()
    .min(0, 'Budget kann nicht negativ sein')
    .optional(),
  
  actualCost: z.number()
    .min(0, 'Kosten können nicht negativ sein')
    .optional(),
  
  coordinates: z.object({
    lat: z.number()
      .min(-90, 'Breitengrad muss zwischen -90 und 90 liegen')
      .max(90, 'Breitengrad muss zwischen -90 und 90 liegen'),
    lng: z.number()
      .min(-180, 'Längengrad muss zwischen -180 und 180 liegen')
      .max(180, 'Längengrad muss zwischen -180 und 180 liegen')
  }).optional(),
  
  notes: z.string()
    .max(1000, 'Notizen dürfen nicht länger als 1000 Zeichen sein')
    .optional(),
  
  images: z.array(z.string().url('Ungültige URL'))
    .optional(),
  
  status: z.nativeEnum(DestinationStatus),
  
  tags: z.array(z.string())
    .optional(),
  
  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Ungültiges Farbformat (Hex)')
    .optional()
}).refine((data) => {
  // Validate that end date is after start date
  if (data.endDate && data.startDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, {
  message: 'Enddatum muss nach dem Startdatum liegen',
  path: ['endDate']
}).refine((data) => {
  // Validate that end time is after start time if same date
  if (data.endDate && data.startDate && data.endTime && data.startTime) {
    if (data.endDate === data.startDate) {
      return data.endTime > data.startTime;
    }
  }
  return true;
}, {
  message: 'Endzeit muss nach der Startzeit liegen',
  path: ['endTime']
}).refine((data) => {
  // Validate actual cost doesn't exceed budget if both are set
  if (data.budget && data.actualCost) {
    return data.actualCost <= data.budget * 1.5; // Allow 50% overspend
  }
  return true;
}, {
  message: 'Tatsächliche Kosten überschreiten das Budget erheblich',
  path: ['actualCost']
});

// Trip Schema
export const tripSchema = z.object({
  name: z.string()
    .min(1, 'Name ist erforderlich')
    .max(100, 'Name darf nicht länger als 100 Zeichen sein'),
  
  description: z.string()
    .max(500, 'Beschreibung darf nicht länger als 500 Zeichen sein')
    .optional(),
  
  startDate: z.string()
    .min(1, 'Startdatum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat'),
  
  endDate: z.string()
    .min(1, 'Enddatum ist erforderlich')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datumsformat'),
  
  budget: z.number()
    .min(0, 'Budget kann nicht negativ sein')
    .optional(),
  
  participants: z.array(z.string()
    .min(1, 'Teilnehmername darf nicht leer sein')
    .max(50, 'Teilnehmername darf nicht länger als 50 Zeichen sein')
  ).optional(),
  
  tags: z.array(z.string()
    .min(1, 'Tag darf nicht leer sein')
    .max(30, 'Tag darf nicht länger als 30 Zeichen sein')
  ).optional()
}).refine((data) => {
  // Validate that end date is after start date
  return new Date(data.endDate) >= new Date(data.startDate);
}, {
  message: 'Enddatum muss nach dem Startdatum liegen',
  path: ['endDate']
});

// Export types for form data
export type DestinationFormData = z.infer<typeof destinationSchema>;
export type TripFormData = z.infer<typeof tripSchema>;