# Supabase Setup Guide

## 1. Supabase-Projekt einrichten

1. Gehen Sie zu [supabase.com](https://supabase.com)
2. Erstellen Sie ein kostenloses Konto
3. Erstellen Sie ein neues Projekt
4. Warten Sie, bis das Projekt vollständig initialisiert ist

## 2. Datenbankschema erstellen

1. Navigieren Sie zu "SQL Editor" in Ihrem Supabase-Dashboard
2. Kopieren Sie den Inhalt der Datei `supabase-schema.sql`
3. Fügen Sie ihn in den SQL Editor ein
4. Klicken Sie auf "Run" um das Schema zu erstellen

## 3. API-Schlüssel abrufen

1. Navigieren Sie zu "Settings" → "API"
2. Kopieren Sie folgende Werte:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **anon public key**: `eyJ0eXAi...` (der anon/public Schlüssel)

## 4. Environment-Variablen konfigurieren

1. Kopieren Sie `.env.example` zu `.env`:
   ```bash
   cp .env.example .env
   ```

2. Öffnen Sie die `.env` Datei und fügen Sie Ihre Werte ein:
   ```
   REACT_APP_SUPABASE_URL=https://your-project-ref.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Wichtig**: Stellen Sie sicher, dass `.env` in Ihrer `.gitignore` steht!

## 5. Anwendung testen

1. Starten Sie die Anwendung:
   ```bash
   npm start
   ```

2. Überprüfen Sie die Browser-Konsole auf Verbindungsfehler
3. Testen Sie das Erstellen einer neuen Reise
4. Testen Sie das Hinzufügen von Destinationen

## 6. Real-time Features

Die Anwendung nutzt Supabases Real-time Features:
- Änderungen werden automatisch zwischen verschiedenen Browsern synchronisiert
- Keine manuelle Aktualisierung erforderlich
- Funktioniert auch bei paralleler Nutzung

## 7. Fehlerbehebung

### Verbindungsfehler
- Überprüfen Sie die Environment-Variablen
- Stellen Sie sicher, dass der anon key korrekt ist
- Prüfen Sie die Browser-Konsole auf detaillierte Fehlermeldungen

### Schema-Fehler
- Stellen Sie sicher, dass das gesamte SQL-Schema ausgeführt wurde
- Überprüfen Sie in Supabase unter "Database" → "Tables" ob alle Tabellen existieren

### Real-time funktioniert nicht
- Real-time ist in der kostenlosen Tier beschränkt
- Prüfen Sie die Supabase-Dokumentation für aktuelle Limits

## 8. Migration von LocalStorage

Die Anwendung kann automatisch auf LocalStorage zurückgreifen, falls Supabase nicht verfügbar ist. Bestehende Daten bleiben als Fallback erhalten.

## 9. Nächste Schritte

Nach erfolgreicher Konfiguration können Sie:
- Mit der Flutter-App fortfahren
- Authentifizierung hinzufügen (für Multi-User Support)
- Bildupload konfigurieren
- Backup/Restore Features implementieren