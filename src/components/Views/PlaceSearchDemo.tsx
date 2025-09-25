import React, { useState } from 'react';
import { MapPin, Star, Calendar, Users } from 'lucide-react';
import EnhancedPlaceSearch from '../Search/EnhancedPlaceSearch';
import { PlaceCategory } from '../../services/enhancedOpenStreetMapService';
import { Coordinates } from '../../types';

const PlaceSearchDemo: React.FC = () => {
  const [searchValue, setSearchValue] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [searchHistory, setSearchHistory] = useState<any[]>([]);

  // Example location (Munich city center)
  const searchCenter: Coordinates = { lat: 48.137154, lng: 11.575721 };

  const handlePlaceSelect = (place: any) => {
    console.log('Selected place:', place);
    setSelectedPlace(place);
    setSearchHistory(prev => [place, ...prev.filter(p => p.place_id !== place.place_id)].slice(0, 5));
  };

  const categoryExamples = [
    {
      category: PlaceCategory.ACCOMMODATION,
      name: 'Hotels & Unterkünfte',
      examples: ['Hotel Vier Jahreszeiten', 'Holiday Inn', 'Hilton'],
      color: 'bg-blue-50 border-blue-200 text-blue-800'
    },
    {
      category: PlaceCategory.CAMPING,
      name: 'Camping & Outdoor',
      examples: ['Campingplatz Starnberger See', 'Camping Allweglehen'],
      color: 'bg-green-50 border-green-200 text-green-800'
    },
    {
      category: PlaceCategory.RESTAURANT,
      name: 'Restaurants & Cafés',
      examples: ['Zur Letzten Instanz', 'Café Central', 'Augustiner Bräu'],
      color: 'bg-orange-50 border-orange-200 text-orange-800'
    },
    {
      category: PlaceCategory.ATTRACTION,
      name: 'Sehenswürdigkeiten',
      examples: ['Neuschwanstein', 'Brandenburger Tor', 'Kölner Dom'],
      color: 'bg-purple-50 border-purple-200 text-purple-800'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Place Search Demo
          </h1>
          <p className="text-gray-600 text-lg">
            Google-ähnliche Suche für Orte, Hotels, Restaurants, Sehenswürdigkeiten und mehr
          </p>
        </div>

        {/* Search Component */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Suche nach Orten, Unterkünften oder Sehenswürdigkeiten
            </label>
          </div>
          
          <EnhancedPlaceSearch
            value={searchValue}
            onChange={setSearchValue}
            onPlaceSelect={handlePlaceSelect}
            searchNear={searchCenter}
            placeholder="Schwerter Straße 95A, Dortmund oder Hotel Vier Jahreszeiten München..."
            showCategories={true}
            autoFocus={true}
            className="w-full"
          />
          
          <div className="mt-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>Suche zentriert um München (48.137°, 11.576°)</span>
            </div>
          </div>
        </div>

        {/* Selected Place Details */}
        {selectedPlace && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Ausgewählter Ort
            </h2>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin size={24} className="text-blue-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {selectedPlace.structured_formatting.main_text}
                </h3>
                
                <p className="text-gray-600 mb-2">
                  {selectedPlace.formattedAddress}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span>Typ: {selectedPlace.type}</span>
                  <span>Kategorie: {selectedPlace.class}</span>
                  {selectedPlace.distance && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {selectedPlace.distance}
                    </span>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-2">Koordinaten</h4>
                  <p className="text-sm text-gray-600 font-mono">
                    Lat: {selectedPlace.coordinates.lat.toFixed(6)}, 
                    Lng: {selectedPlace.coordinates.lng.toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Examples */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Kategorien & Suchbeispiele
          </h2>
          
          <div className="grid gap-4">
            {categoryExamples.map((category) => (
              <div key={category.name} className={`p-4 rounded-lg border ${category.color}`}>
                <h3 className="font-semibold mb-2">{category.name}</h3>
                <p className="text-sm opacity-80 mb-3">
                  Beispiele: {category.examples.join(', ')}
                </p>
                <div className="flex gap-2">
                  {category.examples.map((example) => (
                    <button
                      key={example}
                      onClick={() => setSearchValue(example)}
                      className="px-3 py-1 bg-white bg-opacity-50 rounded-md text-sm hover:bg-opacity-80 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Suchverlauf
            </h2>
            
            <div className="space-y-3">
              {searchHistory.map((place, index) => (
                <div 
                  key={`${place.place_id}-${index}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => setSelectedPlace(place)}
                >
                  <div className="flex-shrink-0">
                    <MapPin size={16} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {place.structured_formatting.main_text}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {place.formattedAddress}
                    </p>
                  </div>
                  {place.distance && (
                    <div className="flex-shrink-0 text-sm text-gray-500">
                      {place.distance}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features List */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Features der Enhanced Place Search
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Star className="text-yellow-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <h3 className="font-semibold text-gray-900">Google-ähnliche UX</h3>
                <p className="text-sm text-gray-600">Intuitives Design mit Dropdown-Suche und Tastaturnavigation</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <h3 className="font-semibold text-gray-900">Standortbasierte Suche</h3>
                <p className="text-sm text-gray-600">Ergebnisse sortiert nach Entfernung und Relevanz</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Calendar className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <h3 className="font-semibold text-gray-900">Kategorienfilter</h3>
                <p className="text-sm text-gray-600">Hotels, Restaurants, Sehenswürdigkeiten, Camping, etc.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Users className="text-purple-500 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <h3 className="font-semibold text-gray-900">Intelligente Suche</h3>
                <p className="text-sm text-gray-600">Relevanz-Scoring und Duplikatsentfernung</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceSearchDemo;