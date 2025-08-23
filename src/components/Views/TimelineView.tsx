import React from 'react';
import { Clock, Construction } from 'lucide-react';

const TimelineView: React.FC = () => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '2rem',
      padding: '2rem',
      background: '#f8fafc'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '3rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <div style={{
          background: '#fef3c7',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Clock size={40} style={{ color: '#d97706' }} />
        </div>
        
        <h2 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.5rem',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Timeline-Ansicht
        </h2>
        
        <p style={{
          margin: '0 0 1.5rem 0',
          color: '#6b7280',
          fontSize: '1rem',
          lineHeight: '1.6'
        }}>
          Die Timeline-Ansicht befindet sich noch in der Entwicklung. Hier werden Sie Ihre Reise chronologisch verfolgen können.
        </p>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          background: '#fef3c7',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#92400e'
        }}>
          <Construction size={16} />
          Geplante Features: Chronologische Zeitplanung
        </div>
      </div>
      
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '500px'
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#374151'
        }}>
          Geplante Timeline-Features:
        </h3>
        <ul style={{
          margin: 0,
          paddingLeft: '1.5rem',
          color: '#6b7280',
          lineHeight: '1.8'
        }}>
          <li>📅 Chronologische Darstellung aller Destinationen</li>
          <li>⏰ Detaillierte Zeitplanung mit Start-/Endzeiten</li>
          <li>🔄 Drag & Drop für Umplanung</li>
          <li>📊 Zeitverteilung und Statistiken</li>
          <li>⚡ Konflikterkennung bei Überschneidungen</li>
          <li>📱 Mobile Timeline-Navigation</li>
        </ul>
      </div>
    </div>
  );
};

export default TimelineView;