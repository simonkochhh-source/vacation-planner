# Test Documentation - Vacation Planner

## Übersicht

Diese Dokumentation beschreibt die umfassende Test-Suite für die Vacation Planner Anwendung. Die Tests decken alle wichtigen Komponenten, Services und Workflows ab.

## Test-Struktur

### 1. Unit Tests

#### Core Components
- **AppContext Tests** (`src/stores/__tests__/AppContext.test.tsx`)
  - State Management
  - CRUD Operationen
  - LocalStorage Persistierung
  - UI State Updates

#### View Components
- **ListView Tests** (`src/components/Views/__tests__/ListView.test.tsx`)
  - Destinations Anzeige
  - Filtering und Sorting
  - Batch-Operationen
  - Drag & Drop Funktionalität

#### Budget System
- **BudgetOverview Tests** (`src/components/Budget/__tests__/BudgetOverview.test.tsx`)
  - Budget Berechungen
  - Überschreitungen
  - Kategorie-basierte Aufschlüsselung
  - Statistiken

#### Photo Management
- **PhotoUpload Tests** (`src/components/Photos/__tests__/PhotoUpload.test.tsx`)
  - File Upload Validierung
  - Drag & Drop Support
  - Progress Tracking
  - Error Handling

#### Scheduling System
- **ScheduleOptimizer Tests** (`src/components/Scheduling/__tests__/ScheduleOptimizer.test.tsx`)
  - Route Optimierung
  - Prioritäts-basierte Sortierung
  - Reisezeit Berechnungen
  - Multi-Tage Planung

#### Filter System
- **AdvancedFilters Tests** (`src/components/Filter/__tests__/AdvancedFilters.test.tsx`)
  - Kategorie Filter
  - Datum- und Budget-Filter
  - Tag-basierte Filterung
  - Kombinierte Filter

#### Forms
- **DestinationForm Tests** (`src/components/Forms/__tests__/DestinationForm.test.tsx`)
  - Form Validierung
  - Koordinaten Handling
  - Tag Management
  - Error States

### 2. Service Tests

#### Weather Service
- **WeatherService Tests** (`src/services/__tests__/weatherService.test.ts`)
  - API Integration
  - Daten Transformation
  - Caching Mechanismus
  - Error Handling

#### Utility Functions
- **Utils Tests** (`src/utils/__tests__/index.test.ts`)
  - Datum/Zeit Formatierung
  - Währung Formatierung
  - Distanz Berechnungen
  - Validierung Funktionen

### 3. Integration Tests

#### Full Application Flow
- **App Integration Tests** (`src/__tests__/App.integration.test.tsx`)
  - Komplette User Workflows
  - Cross-Component Interaktionen
  - Data Persistence
  - View Navigation

## Test Utilities

### Mock Setup (`src/test-utils.tsx`)
- **React-Leaflet Mocks**: Für Karten-Komponenten
- **DnD-Kit Mocks**: Für Drag & Drop Funktionalität
- **Service Mocks**: Für Weather, Photo und Export Services
- **Test Data**: Vordefinierte Mock-Daten für Tests

### Custom Render Function
```typescript
import { render } from './test-utils';

// Automatisch mit AppProvider gewrappt
render(<Component />);
```

## Test-Ausführung

### Alle Tests ausführen
```bash
npm test
```

### Tests mit Coverage
```bash
npm run test:coverage
```

### Tests im Watch-Mode
```bash
npm test -- --watch
```

### Spezifische Tests ausführen
```bash
# Nur Unit Tests
npm test -- --testNamePattern="Unit"

# Nur Integration Tests
npm test -- --testNamePattern="Integration"

# Spezifische Komponente
npm test -- ListView
```

## Coverage-Ziele

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

### Coverage-Ausschlüsse
- Test-Dateien
- Mock-Daten
- Type-Definitionen
- Stories (Storybook)
- Index-Dateien

## Test-Patterns

### Component Testing
```typescript
describe('ComponentName', () => {
  it('renders without crashing', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    render(<ComponentName />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

### Service Testing
```typescript
describe('ServiceName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles successful API calls', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    const result = await ServiceName.method();
    expect(result).toEqual(expectedData);
  });

  it('handles API errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404
    });

    await expect(ServiceName.method()).rejects.toThrow();
  });
});
```

### Integration Testing
```typescript
describe('Feature Integration', () => {
  it('completes full user workflow', async () => {
    render(<App />);
    
    // Step 1: Initial state
    expect(screen.getByText('Welcome')).toBeInTheDocument();
    
    // Step 2: User action
    const button = screen.getByRole('button', { name: /action/i });
    fireEvent.click(button);
    
    // Step 3: Verify result
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

## Mock-Strategien

### External Dependencies
- **Leaflet Maps**: Vollständig gemockt mit DOM-Elementen
- **File APIs**: Mock FileReader und File Constructor
- **LocalStorage**: Automatisch von jsdom bereitgestellt
- **Fetch**: Global gemockt für API-Calls

### Component Dependencies
- **Context Provider**: Automatisch in test-utils eingebunden
- **Router**: Nicht verwendet, daher nicht gemockt
- **Third-party Components**: Individual gemockt je nach Bedarf

## Best Practices

### 1. Test-Benennung
- Beschreibend und spezifisch
- Verhalten fokussiert, nicht Implementation
- Einheitliche Struktur: "should do X when Y"

### 2. Test-Organisation
- Ein Test-File pro Source-File
- Logische Gruppierung mit `describe`
- Setup und Cleanup in `beforeEach/afterEach`

### 3. Assertions
- Spezifisch und aussagekräftig
- User-centric (screen.getByRole, getByLabelText)
- Async Operations mit waitFor

### 4. Mock-Management
- Minimal nötige Mocks
- Realistische Mock-Daten
- Cleanup zwischen Tests

## Kontinuierliche Integration

### Pre-commit Hooks
- Tests müssen vor Commit erfolgreich sein
- Coverage-Threshold wird überprüft
- Lint-Checks inklusive

### CI/CD Pipeline
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
    - run: npm ci
    - run: npm run test:coverage
    - run: npm run lint
```

## Debugging Tests

### Debug-Modus
```bash
# Node Inspector
npm test -- --inspect-brk

# VS Code Debugging
# Verwende "Jest Debug" Configuration
```

### Common Issues
1. **Async Operations**: Immer `waitFor` verwenden
2. **Mock Cleanup**: `clearAllMocks()` in beforeEach
3. **DOM Queries**: User-centric Selektoren bevorzugen
4. **Timing Issues**: `fake-timers` für Zeit-basierte Tests

## Erweiterung der Tests

### Neue Komponente testen
1. Test-File in entsprechendem `__tests__` Ordner erstellen
2. Basic rendering Test
3. User-interaction Tests
4. Error-handling Tests
5. Integration mit bestehenden Features

### Performance Testing
```typescript
import { performance } from 'perf_hooks';

it('performs well with large datasets', () => {
  const start = performance.now();
  
  render(<ComponentWithLargeData data={largeDataset} />);
  
  const end = performance.now();
  expect(end - start).toBeLessThan(100); // 100ms limit
});
```

Diese Test-Suite gewährleistet die Qualität und Zuverlässigkeit der Vacation Planner Anwendung durch umfassende Abdeckung aller wichtigen Funktionalitäten.