import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import Button from '../Common/Button';
import Modal from '../Common/Modal';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface CookieConsentProps {
  onPreferencesChange?: (preferences: CookiePreferences) => void;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ onPreferencesChange }) => {
  const [cookiePreferences, setCookiePreferences] = useLocalStorage<CookiePreferences | null>(
    'cookie_preferences', 
    null
  );
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false
  });

  useEffect(() => {
    // Show banner if no preferences have been set
    if (cookiePreferences === null) {
      // Delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      // Apply existing preferences
      onPreferencesChange?.(cookiePreferences);
    }
  }, [cookiePreferences, onPreferencesChange]);

  const handleAcceptAll = () => {
    const allAccepted: CookiePreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true
    };
    
    setCookiePreferences(allAccepted);
    setShowBanner(false);
    onPreferencesChange?.(allAccepted);
  };

  const handleAcceptNecessary = () => {
    const necessaryOnly: CookiePreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false
    };
    
    setCookiePreferences(necessaryOnly);
    setShowBanner(false);
    onPreferencesChange?.(necessaryOnly);
  };

  const handleCustomizeSettings = () => {
    if (cookiePreferences) {
      setTempPreferences(cookiePreferences);
    }
    setShowSettings(true);
  };

  const handleSaveSettings = () => {
    setCookiePreferences(tempPreferences);
    setShowSettings(false);
    setShowBanner(false);
    onPreferencesChange?.(tempPreferences);
  };

  const updateTempPreference = (key: keyof CookiePreferences, value: boolean) => {
    setTempPreferences(prev => ({
      ...prev,
      [key]: key === 'necessary' ? true : value // Necessary cookies cannot be disabled
    }));
  };

  if (!showBanner && !showSettings) {
    return null;
  }

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg p-4 md:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  🍪 Cookie-Einstellungen
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Wir verwenden Cookies und ähnliche Technologien, um Ihnen die bestmögliche 
                  Nutzererfahrung zu bieten, unsere Dienste zu personalisieren und zu analysieren. 
                  Sie können Ihre Einstellungen jederzeit in den Datenschutzeinstellungen anpassen.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 min-w-fit">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAcceptNecessary}
                  className="whitespace-nowrap"
                >
                  Nur notwendige
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCustomizeSettings}
                  className="whitespace-nowrap"
                >
                  Einstellungen
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAcceptAll}
                  className="whitespace-nowrap"
                >
                  Alle akzeptieren
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Settings Modal */}
      {showSettings && (
        <Modal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          title="Cookie-Einstellungen verwalten"
        >
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Verwalten Sie Ihre Cookie-Präferenzen. Notwendige Cookies sind für 
              die Grundfunktionen der Website erforderlich und können nicht deaktiviert werden.
            </p>

            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Notwendige Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Erforderlich für grundlegende Website-Funktionen wie Anmeldung und Navigation.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled={true}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Analyse-Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Helfen uns zu verstehen, wie Sie unsere Website nutzen, um sie zu verbessern.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPreferences.analytics}
                    onChange={(e) => updateTempPreference('analytics', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Marketing-Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Werden verwendet, um Ihnen relevante Werbung anzuzeigen.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPreferences.marketing}
                    onChange={(e) => updateTempPreference('marketing', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">Personalisierungs-Cookies</h4>
                    <p className="text-sm text-gray-600">
                      Ermöglichen personalisierte Inhalte und Funktionen basierend auf Ihren Präferenzen.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={tempPreferences.personalization}
                    onChange={(e) => updateTempPreference('personalization', e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => setShowSettings(false)}
              >
                Abbrechen
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
              >
                Einstellungen speichern
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default CookieConsent;