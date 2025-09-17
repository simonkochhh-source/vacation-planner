# Supabase Database Migration Guide

## Problem
Die App zeigt den Fehler: `Could not find the 'privacy' column of 'trips' in the schema cache`

Das bedeutet, dass die Supabase-Datenbank noch nicht die erforderlichen Spalten für das Privacy-System hat.

## Lösung: Database Migration

### Schritt 1: Supabase Dashboard öffnen
1. Gehe zu [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Wähle dein Projekt aus: `kyzbtkkprvegzgzrlhez`
3. Gehe zum "SQL Editor" im linken Menü

### Schritt 2: Migration ausführen

⚠️ **WICHTIG**: Falls du den Fehler `operator does not exist: uuid = text` siehst, verwende **Option C**.

**Option A: Einfache Migration**
1. Kopiere den Inhalt von `supabase_migration_simple.sql`
2. Füge ihn in den SQL Editor ein
3. Klicke "Run" um die Migration auszuführen

**Option B: Vollständige Migration mit RLS**
1. Kopiere den Inhalt von `supabase_migration_privacy_system.sql`
2. Füge ihn in den SQL Editor ein
3. Klicke "Run" um die Migration auszuführen

**Option C: Sichere Migration (bei Typ-Fehlern)**
1. Führe zuerst `supabase_migration_debug.sql` aus um die Tabellenstruktur zu prüfen
2. Kopiere dann den Inhalt von `supabase_migration_safe.sql`
3. Füge ihn in den SQL Editor ein
4. Klicke "Run" um die Migration auszuführen

### Schritt 3: Überprüfung

Nach der Migration sollten folgende Spalten in der `trips` Tabelle vorhanden sein:
- `privacy` (TEXT mit CHECK constraint oder ENUM)
- `owner_id` (UUID)
- `tagged_users` (TEXT[])
- `tags` (TEXT[])

### Schritt 4: App testen

1. Lade die App neu (Ctrl+F5 oder Cmd+Shift+R)
2. Versuche eine Reise zu bearbeiten und die Privacy-Einstellung zu ändern
3. Der Fehler sollte verschwunden sein

## SQL Commands (für schnelle Ausführung)

```sql
-- Minimal required columns
ALTER TABLE trips 
ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'private' CHECK (privacy IN ('private', 'public')),
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS tagged_users TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update existing trips
UPDATE trips 
SET owner_id = user_id 
WHERE owner_id IS NULL;
```

## Troubleshooting

### Fehler: "permission denied"
- Stelle sicher, dass du als Projektinhaber angemeldet bist
- Versuche die Migration in kleineren Teilen auszuführen

### Fehler: "column already exists"
- Das ist normal, bedeutet die Spalte existiert bereits
- Die Migration wird trotzdem erfolgreich ausgeführt

### Fehler: "relation does not exist"
- Stelle sicher, dass du das richtige Projekt ausgewählt hast
- Überprüfe, dass die `trips` Tabelle existiert

## Nächste Schritte

Nach erfolgreicher Migration:
1. Die Privacy-Funktionen sollten vollständig funktionieren
2. Trips können zwischen private/public umgeschaltet werden
3. Tagged users können zu privaten Trips hinzugefügt werden
4. RLS (Row Level Security) schützt die Daten automatisch