import React from 'react';
import { MapPin, Calendar, Star, Coffee, Mountain, Waves } from 'lucide-react';
import Button from '../Common/Button';
import Card from '../Common/Card';

const DesignSystemDemo: React.FC = () => {
  return (
    <div style={{ padding: 'var(--space-2xl)', backgroundColor: 'var(--color-background)', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          <h1 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-3xl)', 
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-md)'
          }}>
            🏕️ Trailkeeper Design System
          </h1>
          <p style={{ 
            fontSize: 'var(--text-lg)', 
            color: 'var(--color-text-secondary)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Ein natürlicher, entspannter Style für Camper & Roadtrip-Enthusiasten
          </p>
        </div>

        {/* Colors */}
        <Card className="mb-8">
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-2xl)', 
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-primary)'
          }}>
            Farbpalette
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div style={{ 
                backgroundColor: 'var(--color-primary-sage)', 
                height: '80px', 
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-sm)'
              }}></div>
              <p className="text-sm font-medium">Sage Green</p>
              <p className="text-xs text-secondary">#87A96B</p>
            </div>
            <div className="text-center">
              <div style={{ 
                backgroundColor: 'var(--color-primary-ocean)', 
                height: '80px', 
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-sm)'
              }}></div>
              <p className="text-sm font-medium">Ocean Blue</p>
              <p className="text-xs text-secondary">#4A90A4</p>
            </div>
            <div className="text-center">
              <div style={{ 
                backgroundColor: 'var(--color-secondary-sunset)', 
                height: '80px', 
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-sm)'
              }}></div>
              <p className="text-sm font-medium">Sunset Orange</p>
              <p className="text-xs text-secondary">#CC8B65</p>
            </div>
            <div className="text-center">
              <div style={{ 
                backgroundColor: 'var(--color-accent-campfire)', 
                height: '80px', 
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--space-sm)'
              }}></div>
              <p className="text-sm font-medium">Campfire</p>
              <p className="text-xs text-secondary">#D2691E</p>
            </div>
          </div>
        </Card>

        {/* Buttons */}
        <Card className="mb-8">
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-2xl)', 
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-primary)'
          }}>
            Buttons
          </h2>
          
          <div className="flex flex-wrap gap-4 mb-6">
            <Button variant="primary" leftIcon={<MapPin size={20} />}>
              Plan Trip
            </Button>
            <Button variant="secondary" leftIcon={<Calendar size={20} />}>
              View Schedule
            </Button>
            <Button variant="ghost" leftIcon={<Star size={20} />}>
              Add to Wishlist
            </Button>
            <Button variant="primary" size="sm">Small Button</Button>
            <Button variant="primary" loading>Loading...</Button>
          </div>
        </Card>

        {/* Cards */}
        <Card className="mb-8">
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-2xl)', 
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-primary)'
          }}>
            Destination Cards
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card hover>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ 
                  backgroundColor: 'var(--color-primary-sage)', 
                  color: 'white',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <Coffee size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                    Beach Café
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Entspanntes Frühstück am Strand
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Perfekter Start in den Tag mit Meerblick und lokalem Kaffee
              </p>
            </Card>

            <Card hover>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ 
                  backgroundColor: 'var(--color-primary-ocean)', 
                  color: 'white',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <Mountain size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                    Bergwanderung
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Panorama Trail
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                3 Stunden Wanderung mit atemberaubender Aussicht
              </p>
            </Card>

            <Card hover>
              <div className="flex items-center gap-3 mb-3">
                <div style={{ 
                  backgroundColor: 'var(--color-secondary-sunset)', 
                  color: 'white',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <Waves size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-medium)', margin: 0 }}>
                    Surf Session
                  </h3>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                    Morgendliche Wellen
                  </p>
                </div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', margin: 0 }}>
                Beste Wellen am frühen Morgen - Board mieten vor Ort
              </p>
            </Card>
          </div>
        </Card>

        {/* Typography */}
        <Card>
          <h2 style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-2xl)', 
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-text-primary)'
          }}>
            Typography
          </h2>
          
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-3xl)' }}>Heading 1 - Poppins</h1>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-2xl)' }}>Heading 2 - Poppins</h2>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)' }}>Heading 3 - Poppins</h3>
          </div>
          
          <div>
            <p style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-md)' }}>
              <strong>Body Large (Inter)</strong> - Für wichtige Inhalte und Einführungstexte
            </p>
            <p style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-md)' }}>
              Body Text (Inter) - Der Standard-Fließtext für Beschreibungen und längere Inhalte. 
              Optimiert für gute Lesbarkeit auf allen Geräten.
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              Small Text - Für Zusatzinformationen, Timestamps und Metadaten
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DesignSystemDemo;