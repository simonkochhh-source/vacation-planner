# 🔧 Avatar Upload Debugging & Setup

## Problem: "Storage Bucket: Fehler"

Wenn der Avatar Upload Connection Test fehlschlägt, folge diesen Schritten:

### 🔍 **Schritt 1: Problem diagnostizieren**

1. Gehe zu den **Account-Informationen** in der App
2. Klicke auf **"Verbindung testen"** 
3. Öffne die **Browser-Konsole** (F12)
4. Schaue dir die detaillierten Log-Meldungen an

### 🛠️ **Schritt 2: Avatars Bucket erstellen**

#### Option A: Über Supabase Dashboard (Empfohlen)

1. **Supabase Dashboard** → **Storage** → **Buckets**
2. Klicke **"New Bucket"**
3. **Konfiguration:**
   - **Name**: `avatars`
   - **Public**: ✅ **AKTIVIERT** (sehr wichtig!)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: `image/*`

#### Option B: SQL Query ausführen

Gehe zu **SQL Editor** und führe aus:

```sql
-- Create avatars bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, 
  ARRAY['image/*']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/*'];
```

### 🔒 **Schritt 3: Storage Policies erstellen**

**WICHTIG**: Gehe zu **Storage** → **Policies** und erstelle diese 4 Policies:

#### 1. Upload Policy (INSERT)
```sql
-- Name: "Users can upload own avatars"
-- Target roles: authenticated
-- USING expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### 2. Update Policy (UPDATE)
```sql
-- Name: "Users can update own avatars" 
-- Target roles: authenticated
-- USING expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### 3. Delete Policy (DELETE)
```sql
-- Name: "Users can delete own avatars"
-- Target roles: authenticated
-- USING expression:
bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
```

#### 4. View Policy (SELECT)
```sql
-- Name: "Anyone can view avatars"
-- Target roles: anon, authenticated
-- USING expression:
bucket_id = 'avatars'
```

### 🔧 **Schritt 4: Policies als SQL (Falls UI nicht funktioniert)**

Falls die Supabase UI Probleme macht, führe diese SQL-Queries aus:

```sql
-- Enable RLS on storage.objects (falls noch nicht aktiv)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. Upload Policy
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. Update Policy  
CREATE POLICY "Users can update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 3. Delete Policy
CREATE POLICY "Users can delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 4. View Policy
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
```

### ✅ **Schritt 5: Testen**

1. Gehe zurück zu **Account-Informationen**
2. Klicke **"Verbindung testen"**
3. Alle Checks sollten jetzt ✅ grün sein:
   - ✅ Authentifizierung: OK
   - ✅ Storage Bucket: OK
   - ✅ Öffentlicher Zugang: OK
   - ✅ Upload-Berechtigung: OK

4. Klicke **"Upload testen"** für einen vollständigen Test

### 🐛 **Häufige Probleme & Lösungen**

#### Problem: "Bucket not found"
- **Lösung**: Stelle sicher, dass der Bucket wirklich `avatars` heißt (nicht `avatar`)
- **Prüfung**: Schaue in Storage → Buckets nach

#### Problem: "new row violates row-level security"  
- **Lösung**: Policies wurden nicht korrekt erstellt
- **Prüfung**: Gehe zu Storage → Policies und überprüfe alle 4 Policies

#### Problem: "Permission denied"
- **Lösung**: Bucket ist nicht als "Public" markiert
- **Prüfung**: Storage → Buckets → avatars → Edit → Public: ✅

#### Problem: "Function storage.foldername does not exist"
- **Lösung**: Verwende diese alternative Policy-Syntax:
```sql
-- Alternative USING expression für Policies:
bucket_id = 'avatars' AND auth.uid()::text = split_part(name, '/', 1)
```

#### Problem: "relation 'storage.objects' does not exist"
- **Lösung**: RLS ist noch nicht aktiviert:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

#### Problem: Upload funktioniert, aber "SELECT policy" fehlt
- **Symptom**: Upload erfolgreich, aber Avatare werden nicht angezeigt
- **Lösung**: SELECT Policy für öffentliche Anzeige erstellen:
```sql
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');
```

#### Problem: "Bucket exists but upload fails"
- **Diagnose**: Verwende **"Policy Syntax testen"** Button für detaillierte Analyse
- **Häufige Ursache**: Policy-Syntax nicht kompatibel mit Supabase-Version
- **Lösung**: Alternative Policy-Expressions verwenden (siehe **"SQL generieren"**)

### 🧪 **Erweiterte Diagnose-Tools**

Die App bietet jetzt erweiterte Debugging-Tools bei anhaltenden Problemen:

1. **"Policy Syntax testen"** - Testet verschiedene Datei-Strukturen und Policy-Syntaxen
2. **"SQL generieren"** - Generiert maßgeschneiderte SQL-Statements für deine Supabase-Instanz

#### Browser-Console Testing

Du kannst auch manuell in der Browser-Konsole testen:

```javascript
// Basis-Tests
await window.testAvatarUpload()           // Vollständiger Verbindungstest
await window.testUserServiceAvatar()     // UserService Upload-Test

// Erweiterte Diagnose
await window.testPolicySyntax()          // Policy-Syntax Variationen testen
await window.generatePolicySQL()         // SQL-Statements generieren

// Supabase direkt testen
await window.supabase.storage.listBuckets()  // Bucket-Liste
```

#### Häufige Policy-Syntax Probleme

Falls `storage.foldername` nicht funktioniert, verwende diese alternative Policy:

```sql
-- Ersetze die INSERT Policy mit:
CREATE POLICY "Users can upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = split_part(name, '/', 1)
  );
```

### 📁 **Erwartete Dateistruktur**

Nach erfolgreichem Setup:
```
storage/avatars/
├── user-id-1-timestamp.jpg
├── user-id-2-timestamp.png
└── ...
```

### 🎯 **Erfolgs-Kriterien**

✅ Bucket `avatars` existiert und ist public  
✅ 4 Storage Policies sind aktiv  
✅ Test-Upload funktioniert  
✅ Avatar-Anzeige in der App funktioniert  
✅ Keine Konsolen-Fehler beim Upload  

---

**Bei weiteren Problemen**: Schaue in die Browser-Konsole und schicke die spezifischen Fehlermeldungen.