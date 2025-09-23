import React, { useState } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Button from '../Common/Button';
import Modal from '../Common/Modal';
import PrivacyPolicy from './PrivacyPolicy';

interface DataExportRequest {
  email: string;
  dataTypes: string[];
  status: 'pending' | 'processing' | 'completed';
  createdAt: Date;
}

interface DataDeletionRequest {
  email: string;
  reason: string;
  confirmDelete: boolean;
  status: 'pending' | 'processing' | 'completed';
  createdAt: Date;
}

interface CookiePreferences {
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

const DataProtectionSettings: React.FC = () => {
  const [cookiePreferences, setCookiePreferences] = useLocalStorage<CookiePreferences | null>('cookie_preferences', null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [exportRequest, setExportRequest] = useState<Partial<DataExportRequest>>({
    email: '',
    dataTypes: ['trips', 'destinations', 'photos']
  });
  const [deleteRequest, setDeleteRequest] = useState<Partial<DataDeletionRequest>>({
    email: '',
    reason: '',
    confirmDelete: false
  });

  const handleCookieReset = () => {
    setCookiePreferences(null);
    localStorage.removeItem('cookie_preferences');
    // Reload page to show cookie banner again
    window.location.reload();
  };

  const handleDataExport = async () => {
    // In a real application, this would call an API endpoint
    console.log('Data export requested:', exportRequest);
    
    // Simulate API call
    const request: DataExportRequest = {
      email: exportRequest.email!,
      dataTypes: exportRequest.dataTypes!,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Store request locally for demo purposes
    const existingRequests = JSON.parse(localStorage.getItem('data_export_requests') || '[]');
    existingRequests.push(request);
    localStorage.setItem('data_export_requests', JSON.stringify(existingRequests));
    
    setShowExportModal(false);
    alert('Ihr Datenexport wurde angefordert. Sie erhalten eine E-Mail mit den exportierten Daten innerhalb von 30 Tagen.');
  };

  const handleDataDeletion = async () => {
    if (!deleteRequest.confirmDelete) {
      alert('Bitte bestätigen Sie, dass Sie Ihre Daten wirklich löschen möchten.');
      return;
    }

    // In a real application, this would call an API endpoint
    console.log('Data deletion requested:', deleteRequest);
    
    // Simulate API call
    const request: DataDeletionRequest = {
      email: deleteRequest.email!,
      reason: deleteRequest.reason!,
      confirmDelete: deleteRequest.confirmDelete,
      status: 'pending',
      createdAt: new Date()
    };
    
    // Store request locally for demo purposes
    const existingRequests = JSON.parse(localStorage.getItem('data_deletion_requests') || '[]');
    existingRequests.push(request);
    localStorage.setItem('data_deletion_requests', JSON.stringify(existingRequests));
    
    setShowDeleteModal(false);
    alert('Ihr Antrag auf Datenlöschung wurde eingereicht. Die Bearbeitung erfolgt innerhalb von 30 Tagen.');
  };

  const clearAllLocalData = () => {
    if (window.confirm('Möchten Sie wirklich alle lokalen Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      // Clear all localStorage except essential data
      const keysToKeep = ['supabase.auth.token'];
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      alert('Alle lokalen Daten wurden gelöscht.');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutz-Einstellungen</h1>
      
      <div className="space-y-8">
        {/* Cookie Preferences */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Cookie-Einstellungen</h2>
          <p className="text-gray-600 mb-4">
            Verwalten Sie Ihre Cookie-Präferenzen und setzen Sie Ihre Einwilligung zurück.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="secondary"
              onClick={handleCookieReset}
            >
              Cookie-Einstellungen zurücksetzen
            </Button>
            
            <Button
              variant="secondary"
              onClick={() => setShowPrivacyPolicy(true)}
            >
              Datenschutzerklärung anzeigen
            </Button>
          </div>
          
          {cookiePreferences && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-gray-900 mb-2">Aktuelle Einstellungen:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Notwendige Cookies: ✅ Aktiviert</li>
                <li>Analyse-Cookies: {cookiePreferences?.analytics ? '✅ Aktiviert' : '❌ Deaktiviert'}</li>
                <li>Marketing-Cookies: {cookiePreferences?.marketing ? '✅ Aktiviert' : '❌ Deaktiviert'}</li>
                <li>Personalisierung: {cookiePreferences?.personalization ? '✅ Aktiviert' : '❌ Deaktiviert'}</li>
              </ul>
            </div>
          )}
        </section>

        {/* Data Export */}
        <section className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Datenexport</h2>
          <p className="text-gray-600 mb-4">
            Fordern Sie eine Kopie Ihrer gespeicherten Daten an. Sie erhalten diese innerhalb von 30 Tagen per E-Mail.
          </p>
          
          <Button
            variant="primary"
            onClick={() => setShowExportModal(true)}
          >
            Meine Daten exportieren
          </Button>
        </section>

        {/* Data Deletion */}
        <section className="bg-white border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-700 mb-4">Datenlöschung</h2>
          <p className="text-gray-600 mb-4">
            Beantragen Sie die vollständige Löschung Ihrer Daten. Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
            >
              Komplette Datenlöschung beantragen
            </Button>
            
            <Button
              variant="secondary"
              onClick={clearAllLocalData}
            >
              Lokale Daten löschen
            </Button>
          </div>
        </section>

        {/* Your Rights */}
        <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">Ihre Rechte</h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">🔍 Recht auf Auskunft</h4>
              <p className="text-blue-700">Sie können jederzeit Auskunft über Ihre gespeicherten Daten verlangen.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">✏️ Recht auf Berichtigung</h4>
              <p className="text-blue-700">Falsche oder unvollständige Daten können berichtigt werden.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">🗑️ Recht auf Löschung</h4>
              <p className="text-blue-700">Sie können die Löschung Ihrer Daten verlangen, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.</p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">📦 Recht auf Datenübertragbarkeit</h4>
              <p className="text-blue-700">Sie können Ihre Daten in einem strukturierten Format erhalten.</p>
            </div>
          </div>
        </section>
      </div>

      {/* Privacy Policy Modal */}
      {showPrivacyPolicy && (
        <Modal
          isOpen={showPrivacyPolicy}
          onClose={() => setShowPrivacyPolicy(false)}
          title="Datenschutzerklärung"
          className="max-w-5xl"
        >
          <div className="max-h-96 overflow-y-auto">
            <PrivacyPolicy />
          </div>
        </Modal>
      )}

      {/* Data Export Modal */}
      {showExportModal && (
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Datenexport anfordern"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse für den Versand:
              </label>
              <input
                type="email"
                value={exportRequest.email || ''}
                onChange={(e) => setExportRequest(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="ihre@email.de"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Welche Daten möchten Sie exportieren?
              </label>
              <div className="space-y-2">
                {[
                  { key: 'trips', label: 'Reisen und Trips' },
                  { key: 'destinations', label: 'Destinationen und Orte' },
                  { key: 'photos', label: 'Fotos und Medien' },
                  { key: 'preferences', label: 'Benutzereinstellungen' }
                ].map(item => (
                  <label key={item.key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={exportRequest.dataTypes?.includes(item.key) || false}
                      onChange={(e) => {
                        const newTypes = e.target.checked 
                          ? [...(exportRequest.dataTypes || []), item.key]
                          : (exportRequest.dataTypes || []).filter(t => t !== item.key);
                        setExportRequest(prev => ({ ...prev, dataTypes: newTypes }));
                      }}
                      className="mr-2"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowExportModal(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={handleDataExport}
                disabled={!exportRequest.email || !exportRequest.dataTypes?.length}
              >
                Export anfordern
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Data Deletion Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Datenlöschung beantragen"
        >
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">⚠️ Wichtiger Hinweis</h4>
              <p className="text-red-700 text-sm">
                Diese Aktion führt zur vollständigen und unwiderruflichen Löschung aller Ihrer Daten. 
                Stellen Sie sicher, dass Sie zuvor eine Sicherungskopie Ihrer wichtigen Daten erstellt haben.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse zur Bestätigung:
              </label>
              <input
                type="email"
                value={deleteRequest.email || ''}
                onChange={(e) => setDeleteRequest(prev => ({ ...prev, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="ihre@email.de"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Grund für die Löschung (optional):
              </label>
              <textarea
                value={deleteRequest.reason || ''}
                onChange={(e) => setDeleteRequest(prev => ({ ...prev, reason: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
                placeholder="Warum möchten Sie Ihre Daten löschen lassen?"
              />
            </div>
            
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={deleteRequest.confirmDelete || false}
                  onChange={(e) => setDeleteRequest(prev => ({ ...prev, confirmDelete: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Ich bestätige, dass ich die vollständige Löschung meiner Daten beantragen möchte und verstehe, 
                  dass diese Aktion nicht rückgängig gemacht werden kann.
                </span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="danger"
                onClick={handleDataDeletion}
                disabled={!deleteRequest.email || !deleteRequest.confirmDelete}
              >
                Löschung beantragen
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DataProtectionSettings;