/**
 * Privacy utilities for anonymizing sensitive data in public trips
 */

import { Destination, Trip, TripPrivacy, Coordinates } from '../types';

/**
 * Extract city name from a full address
 * Examples:
 * "Musterstraße 123, 44137 Dortmund, Deutschland" -> "Dortmund"
 * "Frankfurt am Main, Hessen, Deutschland" -> "Frankfurt am Main"
 */
export function extractCityFromAddress(address: string): string {
  console.log('Extracting city from address:', address);
  
  // Split by commas and clean up each part
  const parts = address.split(',').map(part => part.trim());
  
  // Common German states and country names to filter out
  const statesAndCountries = [
    'deutschland', 'germany', 'nordrhein-westfalen', 'nrw', 'bayern', 'bavaria',
    'baden-württemberg', 'hessen', 'sachsen', 'niedersachsen', 'rheinland-pfalz',
    'schleswig-holstein', 'thüringen', 'brandenburg', 'sachsen-anhalt', 'hamburg',
    'bremen', 'berlin', 'mecklenburg-vorpommern', 'saarland'
  ];
  
  // Find the city - typically the largest part that's not a street, district, state, or country
  let bestCandidate = '';
  let bestScore = 0;
  
  for (const part of parts) {
    const cleanPart = part.toLowerCase().trim();
    
    // Skip if it's a postal code (5 digits)
    if (/^\d{5}$/.test(cleanPart)) continue;
    
    // Skip if it's a house number or very short
    if (/^\d+$/.test(cleanPart) || cleanPart.length < 3) continue;
    
    // Skip if it's a known state or country
    if (statesAndCountries.includes(cleanPart)) continue;
    
    // Skip if it contains typical street indicators
    if (/(straße|str\.|weg|platz|allee|gasse|ring|damm|ufer)$/i.test(cleanPart)) continue;
    
    // Score based on length and position (cities are usually prominent)
    let score = cleanPart.length;
    
    // Boost score for parts that look like city names
    if (/^[a-zA-ZäöüßÄÖÜ\s-]+$/.test(cleanPart) && cleanPart.length >= 4) {
      score += 10;
    }
    
    // Boost score for well-known city patterns
    if (/(dortmund|berlin|münchen|hamburg|köln|frankfurt|stuttgart|düsseldorf|essen|bremen|dresden|leipzig|hannover|nürnberg)/.test(cleanPart)) {
      score += 20;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = part; // Use original casing
    }
  }
  
  const result = bestCandidate || 'Unbekannte Stadt';
  console.log('Extracted city:', result);
  return result;
}

/**
 * Generate anonymized coordinates that point to city center instead of exact location
 * This provides approximate location for route calculation while protecting privacy
 */
export function anonymizeCoordinates(originalCoords: Coordinates, cityName: string): Coordinates {
  console.log('Anonymizing coordinates for city:', cityName);
  
  // Rough city center coordinates for major German cities
  const cityCenters: { [key: string]: Coordinates } = {
    'dortmund': { lat: 51.5136, lng: 7.4653 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'münchen': { lat: 48.1351, lng: 11.5820 },
    'hamburg': { lat: 53.5511, lng: 9.9937 },
    'köln': { lat: 50.9375, lng: 6.9603 },
    'frankfurt am main': { lat: 50.1109, lng: 8.6821 },
    'frankfurt': { lat: 50.1109, lng: 8.6821 },
    'stuttgart': { lat: 48.7758, lng: 9.1829 },
    'düsseldorf': { lat: 51.2277, lng: 6.7735 },
    'essen': { lat: 51.4556, lng: 7.0116 },
    'bremen': { lat: 53.0793, lng: 8.8017 },
    'dresden': { lat: 51.0504, lng: 13.7373 },
    'leipzig': { lat: 51.3397, lng: 12.3731 },
    'hannover': { lat: 52.3759, lng: 9.7320 },
    'nürnberg': { lat: 49.4521, lng: 11.0767 }
  };
  
  const cityKey = cityName.toLowerCase().trim();
  
  // If we have city center coordinates, use them
  if (cityCenters[cityKey]) {
    const result = cityCenters[cityKey];
    console.log('Using city center coordinates:', result);
    return result;
  }
  
  // Fallback: create a larger offset from original coordinates to approximate city center
  // This moves the point significantly away from the exact location while staying in the general area
  const offset = 0.05; // ~5km offset - larger anonymization
  const anonymized = {
    lat: Math.round((originalCoords.lat + (Math.random() - 0.5) * offset) * 1000) / 1000,
    lng: Math.round((originalCoords.lng + (Math.random() - 0.5) * offset) * 1000) / 1000
  };
  
  console.log('Using offset anonymization:', anonymized);
  return anonymized;
}

/**
 * Anonymize a single destination if it's a homepoint in a public trip
 * Replaces exact address with city name and adjusts coordinates
 */
export function anonymizeHomepoint(
  destination: Destination, 
  settings?: { homePoint?: { name: string; address: string; coordinates: Coordinates } }
): Destination {
  // Check if this destination is a homepoint - either by settings match or by name
  const isHomepointBySettings = settings?.homePoint && 
    destination.name === 'Home' &&
    destination.location === settings.homePoint.address;
    
  const isHomepointByName = isLikelyHomepoint(destination);

  if (!isHomepointBySettings && !isHomepointByName) {
    return destination; // Not a homepoint, return as-is
  }

  const cityName = extractCityFromAddress(destination.location);
  
  return {
    ...destination,
    name: cityName, // Change name from "Home" to city name for public display
    location: cityName, // Show only city name instead of full address
    coordinates: destination.coordinates ? 
      anonymizeCoordinates(destination.coordinates, cityName) : 
      undefined
  };
}

/**
 * Anonymize all homepoints in a trip if the trip is public
 * This function should be called before displaying or sharing trips
 */
export function anonymizeTripForPublicDisplay(
  trip: Trip,
  destinations: Destination[],
  settings?: { homePoint?: { name: string; address: string; coordinates: Coordinates } }
): { trip: Trip; destinations: Destination[] } {
  // Only anonymize if trip is public
  if (trip.privacy !== TripPrivacy.PUBLIC) {
    return { trip, destinations };
  }

  // Anonymize homepoints in destinations
  const anonymizedDestinations = destinations.map(dest => 
    anonymizeHomepoint(dest, settings)
  );

  return {
    trip,
    destinations: anonymizedDestinations
  };
}

/**
 * Check if a destination is likely a homepoint based on its properties
 */
export function isLikelyHomepoint(destination: Destination): boolean {
  return destination.name === 'Home' || 
         destination.name.toLowerCase().includes('zuhause') ||
         destination.name.toLowerCase().includes('home');
}

/**
 * Prepare trip for copying - remove homepoint specificity but keep structure
 * When a user copies a public trip, they should be able to set their own homepoint
 */
export function prepareTripForCopying(
  trip: Trip,
  destinations: Destination[]
): { trip: Trip; destinations: Destination[]; homepointDestination?: Destination } {
  const homepointIndex = destinations.findIndex(isLikelyHomepoint);
  
  if (homepointIndex === -1) {
    return { trip, destinations };
  }

  const homepointDestination = destinations[homepointIndex];
  
  // Remove homepoint from destinations list
  const destinationsWithoutHomepoint = destinations.filter((_, index) => index !== homepointIndex);
  
  return {
    trip: {
      ...trip,
      destinations: trip.destinations.filter((_, index) => index !== homepointIndex)
    },
    destinations: destinationsWithoutHomepoint,
    homepointDestination // Return separately so user can choose to replace with their homepoint
  };
}