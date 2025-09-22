import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
      
      <div className="space-y-8 text-gray-700">
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Datenschutz auf einen Blick</h2>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Allgemeine Hinweise</h3>
          <p className="mb-4">
            Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen 
            Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit 
            denen Sie persönlich identifiziert werden können.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Datenerfassung auf dieser Website</h3>
          <p className="mb-4">
            <strong>Wer ist verantwortlich für die Datenerfassung auf dieser Website?</strong><br />
            Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. 
            Die Kontaktdaten finden Sie in der Sektion "Hinweise zur verantwortlichen Stelle" in dieser Datenschutzerklärung.
          </p>
          
          <p className="mb-4">
            <strong>Wie erfassen wir Ihre Daten?</strong><br />
            Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese mitteilen. Hierbei kann es sich 
            z.B. um Daten handeln, die Sie in Kontaktformulare eingeben oder bei der Registrierung angeben.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Hosting und Content Delivery Networks (CDN)</h2>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Supabase</h3>
          <p className="mb-4">
            Wir nutzen Supabase als Backend-Service für unsere Anwendung. Anbieter ist die Supabase Inc., 
            mit Servern in verschiedenen Regionen. Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO 
            aufgrund unseres berechtigten Interesses an einer sicheren und effizienten Bereitstellung unserer Website.
          </p>
          
          <p className="mb-4">
            <strong>Verarbeitete Daten:</strong>
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li>Benutzerdaten (E-Mail, Passwort-Hash)</li>
            <li>Reisedaten (Trips, Destinationen, Fotos)</li>
            <li>Nutzungsstatistiken</li>
            <li>IP-Adressen (zur Sicherheit und Fehlerdiagnose)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Allgemeine Hinweise und Pflichtinformationen</h2>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Datenschutz</h3>
          <p className="mb-4">
            Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. 
            Wir behandeln Ihre personenbezogenen Daten vertraulich und entsprechend der gesetzlichen 
            Datenschutzbestimmungen sowie dieser Datenschutzerklärung.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Hinweis zur verantwortlichen Stelle</h3>
          <p className="mb-4">
            Die verantwortliche Stelle für die Datenverarbeitung auf dieser Website ist:<br />
            <strong>Trailkeeper Vacation Planner</strong><br />
            Bei Fragen zum Datenschutz können Sie sich jederzeit an uns wenden.
          </p>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Widerruf Ihrer Einwilligung zur Datenverarbeitung</h3>
          <p className="mb-4">
            Viele Datenverarbeitungsvorgänge sind nur mit Ihrer ausdrücklichen Einwilligung möglich. 
            Sie können eine bereits erteilte Einwilligung jederzeit widerrufen. Die Rechtmäßigkeit der 
            bis zum Widerruf erfolgten Datenverarbeitung bleibt vom Widerruf unberührt.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Datenerfassung auf dieser Website</h2>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Cookies</h3>
          <p className="mb-4">
            Unsere Internetseiten verwenden so genannte „Cookies". Cookies sind kleine Textdateien und 
            richten auf Ihrem Endgerät keinen Schaden an. Sie werden entweder vorübergehend für die 
            Dauer einer Sitzung (Session-Cookies) oder dauerhaft (dauerhafte Cookies) auf Ihrem Endgerät gespeichert.
          </p>
          
          <p className="mb-4">
            <strong>Folgende Cookie-Kategorien verwenden wir:</strong>
          </p>
          <ul className="list-disc ml-6 mb-4">
            <li><strong>Notwendige Cookies:</strong> Für grundlegende Website-Funktionen</li>
            <li><strong>Analyse-Cookies:</strong> Zur Verbesserung der Website-Performance</li>
            <li><strong>Personalisierungs-Cookies:</strong> Für personalisierte Inhalte</li>
            <li><strong>Marketing-Cookies:</strong> Für relevante Werbung (nur mit Ihrer Zustimmung)</li>
          </ul>

          <h3 className="text-lg font-medium text-gray-900 mb-2">Registrierung auf dieser Website</h3>
          <p className="mb-4">
            Sie können sich auf dieser Website registrieren, um zusätzliche Funktionen zu nutzen. 
            Die dazu eingegebenen Daten verwenden wir nur zum Zwecke der Nutzung des jeweiligen 
            Angebotes oder Dienstes, für den Sie sich registriert haben.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Ihre Rechte</h2>
          
          <p className="mb-4">Sie haben folgende Rechte bezüglich Ihrer personenbezogenen Daten:</p>
          
          <ul className="list-disc ml-6 mb-4">
            <li><strong>Recht auf Auskunft:</strong> Sie können Auskunft über Ihre gespeicherten Daten verlangen</li>
            <li><strong>Recht auf Berichtigung:</strong> Falsche Daten können berichtigt werden</li>
            <li><strong>Recht auf Löschung:</strong> Ihre Daten können gelöscht werden, soweit keine gesetzlichen Aufbewahrungspflichten bestehen</li>
            <li><strong>Recht auf Einschränkung:</strong> Die Verarbeitung Ihrer Daten kann eingeschränkt werden</li>
            <li><strong>Recht auf Datenübertragbarkeit:</strong> Sie können Ihre Daten in einem strukturierten Format erhalten</li>
            <li><strong>Widerspruchsrecht:</strong> Sie können der Verarbeitung Ihrer Daten widersprechen</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Analysewerkzeuge und Werbung</h2>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">Google Analytics (falls aktiviert)</h3>
          <p className="mb-4">
            Diese Website nutzt Funktionen des Webanalysedienstes Google Analytics nur mit Ihrer 
            ausdrücklichen Einwilligung. Die durch das Cookie erzeugten Informationen über Ihre 
            Benutzung dieser Website werden in der Regel an einen Server von Google in den USA 
            übertragen und dort gespeichert.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Kontakt</h2>
          
          <p className="mb-4">
            Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte können Sie sich jederzeit an uns wenden:
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-medium">Trailkeeper Vacation Planner</p>
            <p>E-Mail: privacy@trailkeeper.app</p>
            <p>Oder nutzen Sie die Datenschutzeinstellungen in der Anwendung</p>
          </div>
        </section>

        <section className="border-t pt-6 mt-8">
          <p className="text-sm text-gray-600">
            <strong>Stand dieser Datenschutzerklärung:</strong> {new Date().toLocaleDateString('de-DE')}<br />
            Diese Datenschutzerklärung wird regelmäßig überprüft und bei Bedarf aktualisiert.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;