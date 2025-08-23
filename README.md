# Vacation Planner App

Eine webbasierte Anwendung zur detaillierten Planung und Verfolgung von Urlaubsreisen mit zeitgenauer Strukturierung von Orten und Sehenswürdigkeiten.

## 🚀 Features

- Detaillierte Planung von Reisestationen mit Zeitangaben
- Strukturierte Verwaltung von Orten und Sehenswürdigkeiten
- Interaktive Kartenansicht mit zeitlicher Abfolge
- Export- und Sharing-Funktionen
- Responsive Design für alle Geräte

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + React-Leaflet
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Routing**: React Router
- **Date/Time**: date-fns

## 📦 Installation & Start

```bash
# Dependencies installieren
npm install

# Entwicklungsserver starten
npm start

# Build für Produktion
npm run build

# Tests ausführen
npm test
```

## 🎭 Mock-Daten für Entwicklung

Die App enthält umfangreiche Mock-Daten zum Testen der Funktionalität:

### Mock-Daten laden:
1. **Entwicklungsserver starten** (`npm start`)
2. **Datenbank-Symbol** (💾) unten rechts klicken
3. **"Mock-Daten laden"** Button klicken
4. **Seite neu laden** (F5)

### Enthaltene Mock-Daten:
- **5 realistische Reisen**:
  - 🏛️ **Berlin Entdeckungstour** - Brandenburger Tor, Museumsinsel, Café Einstein
  - 🏔️ **Bayern Rundreise** - München, Hofbräuhaus, Schloss Neuschwanstein  
  - ⚓ **Hamburg Hafenstadt** - Speicherstadt, Fischmarkt
  - ⛪ **Rheinland Kulturreise** - Kölner Dom, Museum Ludwig
  - 🎭 **Dresden Elbflorenz** - Frauenkirche
- **12 detaillierte Ziele** mit echten Koordinaten
- **Verschiedene Kategorien**: Sehenswürdigkeiten, Hotels, Restaurants, Museen
- **Realistische Daten** und Zeitpläne
- **Budget-Informationen** und Notizen

### Daten verwalten:
- **"Alle Daten löschen"** - Entfernt alle gespeicherten Daten
- **"Seite neu laden"** - Lädt die App neu
- **Mock-Data-Loader** ist nur im Development-Modus sichtbar

## 🗂️ Projektstruktur

```
src/
├── components/          # React Komponenten
├── hooks/              # Custom Hooks
├── types/              # TypeScript Definitionen
├── utils/              # Utility Funktionen
├── stores/             # State Management
├── services/           # API Services
└── App.tsx             # Haupt-App Komponente
```

## 📋 Entwicklungsstatus

- [x] Projekt Setup ✅
- [ ] Datenmodelle
- [ ] Basis Components
- [ ] CRUD Operationen
- [ ] Kartenintegration
- [ ] Erweiterte Features

## 🎯 Roadmap

### Phase 1: Grundfunktionalität (3 Wochen)
- Projekt Setup ✅
- Datenmodelle und CRUD
- Basis UI Components
- Listen- und Detailansicht

### Phase 2: Kartenintegration (3 Wochen)
- Leaflet Integration
- Marker und Routing
- Timeline Navigation

### Phase 3: Erweiterte Features (3 Wochen)
- API Integrationen
- Export/Import
- Performance Optimierung

### Phase 4: Polish & Testing (2 Wochen)
- Bug Fixes
- Documentation
- Testing & QA

---

## 📚 Create React App Info

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app) with TypeScript template.

---

## 📋 Detaillierte Todo-Liste

### ✅ Abgeschlossen
     ☒ Projekt-Setup und Grundstruktur erstellen                  
     ☒ Datenmodelle definieren und TypeScript Interfaces erstellen
     ☒ Basis-Components (Header, Sidebar, Layout) implementieren
     ☒ LocalStorage Integration für Datenpersistierung
     ☒ CRUD-Operationen für Destinations implementieren
     ☒ Listen-Ansicht mit DestinationList und DestinationItem
     ☒ Add/Edit Forms mit React Hook Form und Zod Validation
     ☒ Basis-Filterung und Sortierung implementieren
     ☒ Responsive Design mit CSS Grid und Flexbox
     ☒ Grundlegende Navigation und Routing
     ☒ Zeitplanung-Features (Start-/Endzeiten, Timeline)
     ☒ Kategorie-System für Destinations
     ☒ Status-Management (geplant/besucht/übersprungen)
     ☒ Export/Import Basis-Funktionalität (JSON, CSV)
     ☒ Leaflet/Google Maps Integration
     ☒ Marker-System für Karte implementieren
     ☒ Basis-Popup Funktionalität für Marker
     ☒ Koordinaten-System Integration
     ☒ Routing zwischen Destinationen
     ☒ Timeline-Navigation auf Karte
     ☒ Farbcodierung und Kategorien auf Karte
     ☒ Zoom und Pan-Funktionalitäten optimieren
     ☒ Erweiterte Kartenfeatures implementieren
     ☒ Geocoding Integration (OpenStreetMap/Google)
     ☒ Mobile Karten-Optimierung
     ☒ Map Performance-Optimierung
     ☒ Debug: Hinzufügen Button für Ziele funktioniert nicht
     ☒ Mock-Daten für App erstellen
     ☒ Welcome Screen für neue Benutzer implementiert

### 🔄 In Arbeit / Nächste Schritte
     ☐ Erweiterte Filter-Optionen
     ☐ Drag & Drop für Reihenfolge-Änderungen
     ☐ Batch-Operationen für mehrere Destinations
     ☐ Erweiterte Export-Formate (GPX)
     ☐ Wetter-API Integration (OpenWeatherMap)
     ☐ Foto-Upload und -verwaltung
     ☐ Erweiterte Zeitplanung-Tools
     ☐ Budget-Tracking implementieren
     ☐ Polish und Bug-Fixes
     ☐ Performance-Optimierung (Virtual Scrolling, Code Splitting)
     ☐ Dokumentation erstellen
     ☐ Testing und QA durchführen
