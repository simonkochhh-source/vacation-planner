import React, { useState, useCallback } from 'react';
import { MapPin, Clock, Euro, Car, Star, Users, Edit3, Check, X } from 'lucide-react';
import { RoutePreviewProps } from '../../types/ai';

const RoutePreview: React.FC<RoutePreviewProps> = ({
  route,
  onAccept,
  onModify,
  onReject,
  loading = false
}) => {
  const [selectedDestination, setSelectedDestination] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const formatCurrency = useCallback((amount: number, currency: string = 'EUR') => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }, []);

  const formatDuration = useCallback((days: number) => {
    if (days === 1) return '1 Tag';
    return `${days} Tage`;
  }, []);

  const getRouteTypeLabel = useCallback((type: string) => {
    const labels = {
      linear: 'Lineare Route',
      circular: 'Rundreise',
      hub: 'Stern-Route'
    };
    return labels[type as keyof typeof labels] || type;
  }, []);

  const handleDestinationClick = useCallback((index: number) => {
    setSelectedDestination(selectedDestination === index ? null : index);
  }, [selectedDestination]);

  if (!route) return null;

  return (
    <div className="route-preview">
      {/* Route Header */}
      <div className="route-header">
        <div className="route-title">
          <h4>Vorgeschlagene {getRouteTypeLabel(route.routeType)}</h4>
          <div className="route-meta">
            <span className="meta-item">
              <Clock size={14} />
              {formatDuration(route.totalDuration)}
            </span>
            <span className="meta-item">
              <MapPin size={14} />
              {route.destinations.length} Ziele
            </span>
            <span className="meta-item">
              <Car size={14} />
              ~{Math.round(route.travelDistance)}km
            </span>
            <span className="meta-item">
              <Euro size={14} />
              {formatCurrency(route.estimatedCost.total, route.estimatedCost.currency)}
            </span>
          </div>
        </div>
        
        <div className="confidence-score">
          <div className="confidence-bar">
            <div 
              className="confidence-fill"
              style={{ width: `${route.confidence * 100}%` }}
            ></div>
          </div>
          <span className="confidence-text">
            {Math.round(route.confidence * 100)}% Übereinstimmung
          </span>
        </div>
      </div>

      {/* Destinations List */}
      <div className="destinations-list">
        {route.destinations.map((destination, index) => (
          <div 
            key={index}
            className={`destination-item ${selectedDestination === index ? 'selected' : ''}`}
            onClick={() => handleDestinationClick(index)}
          >
            <div className="destination-number">
              {index + 1}
            </div>
            
            <div className="destination-content">
              <div className="destination-header">
                <h5 className="destination-name">{destination.name}</h5>
                <div className="destination-meta">
                  <span className="duration">{formatDuration(destination.duration)}</span>
                  <span className="cost">{formatCurrency(destination.estimatedCost)}</span>
                </div>
              </div>
              
              <p className="destination-description">
                {destination.description}
              </p>
              
              {destination.highlights && destination.highlights.length > 0 && (
                <div className="destination-highlights">
                  {destination.highlights.slice(0, 3).map((highlight, idx) => (
                    <span key={idx} className="highlight-tag">
                      {highlight}
                    </span>
                  ))}
                  {destination.highlights.length > 3 && (
                    <span className="highlight-more">
                      +{destination.highlights.length - 3} weitere
                    </span>
                  )}
                </div>
              )}

              {/* Expanded Details */}
              {selectedDestination === index && (
                <div className="destination-details">
                  {destination.suggestedActivities && destination.suggestedActivities.length > 0 && (
                    <div className="detail-section">
                      <h6>Aktivitäten</h6>
                      <div className="activities-list">
                        {destination.suggestedActivities.slice(0, 3).map((activity, idx) => (
                          <div key={idx} className="activity-item">
                            <span className="activity-name">{activity.name}</span>
                            <span className="activity-duration">
                              {activity.duration}h
                            </span>
                            {activity.cost > 0 && (
                              <span className="activity-cost">
                                {formatCurrency(activity.cost)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {destination.accommodation && destination.accommodation.length > 0 && (
                    <div className="detail-section">
                      <h6>Unterkunft</h6>
                      <div className="accommodation-item">
                        <span className="accommodation-name">
                          {destination.accommodation[0].name}
                        </span>
                        <div className="accommodation-rating">
                          <Star size={12} fill="#ffd700" />
                          {destination.accommodation[0].rating}
                        </div>
                        <span className="accommodation-price">
                          {formatCurrency(destination.accommodation[0].priceRange.min)}-
                          {formatCurrency(destination.accommodation[0].priceRange.max)}
                        </span>
                      </div>
                    </div>
                  )}

                  {destination.localTips && destination.localTips.length > 0 && (
                    <div className="detail-section">
                      <h6>Lokale Tipps</h6>
                      <ul className="tips-list">
                        {destination.localTips.slice(0, 2).map((tip, idx) => (
                          <li key={idx} className="tip-item">{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transport to next destination */}
            {index < route.destinations.length - 1 && destination.transportFromPrevious && (
              <div className="transport-info">
                <div className="transport-line"></div>
                <div className="transport-details">
                  <Car size={12} />
                  <span>{Math.round(destination.transportFromPrevious.duration / 60)}h</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Cost Breakdown */}
      <div className="cost-breakdown">
        <h6>Kostenaufschlüsselung</h6>
        <div className="cost-items">
          <div className="cost-item">
            <span>Unterkunft</span>
            <span>{formatCurrency(route.estimatedCost.accommodation, route.estimatedCost.currency)}</span>
          </div>
          <div className="cost-item">
            <span>Transport</span>
            <span>{formatCurrency(route.estimatedCost.transport, route.estimatedCost.currency)}</span>
          </div>
          <div className="cost-item">
            <span>Aktivitäten</span>
            <span>{formatCurrency(route.estimatedCost.activities, route.estimatedCost.currency)}</span>
          </div>
          <div className="cost-item">
            <span>Verpflegung</span>
            <span>{formatCurrency(route.estimatedCost.food, route.estimatedCost.currency)}</span>
          </div>
          <div className="cost-item total">
            <span>Gesamt</span>
            <span>{formatCurrency(route.estimatedCost.total, route.estimatedCost.currency)}</span>
          </div>
        </div>
        <div className="cost-note">
          Durchschnitt: {formatCurrency(route.estimatedCost.dailyAverage, route.estimatedCost.currency)}/Tag
        </div>
      </div>

      {/* Action Buttons */}
      <div className="route-actions">
        <button
          className="action-btn secondary"
          onClick={onReject}
          disabled={loading}
        >
          <X size={16} />
          Ablehnen
        </button>
        
        <button
          className="action-btn secondary"
          onClick={onModify}
          disabled={loading}
        >
          <Edit3 size={16} />
          Anpassen
        </button>
        
        <button
          className="action-btn primary"
          onClick={onAccept}
          disabled={loading}
        >
          <Check size={16} />
          Route übernehmen
        </button>
      </div>

      {/* Toggle Details */}
      <button
        className="toggle-details"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? 'Weniger anzeigen' : 'Mehr Details anzeigen'}
      </button>

      <style>{`
        .route-preview {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 16px;
          padding: 1.5rem;
          margin: 1rem 0;
          animation: slideIn 0.3s ease-out;
        }

        .route-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
          gap: 1rem;
        }

        .route-title h4 {
          margin: 0 0 0.5rem 0;
          color: #00bcd4;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .route-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #999;
          font-size: 0.85rem;
        }

        .confidence-score {
          text-align: right;
          min-width: 120px;
        }

        .confidence-bar {
          width: 100%;
          height: 6px;
          background: #333;
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }

        .confidence-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff6b6b 0%, #ffa726 50%, #4caf50 100%);
          transition: width 0.3s ease;
        }

        .confidence-text {
          font-size: 0.75rem;
          color: #999;
        }

        .destinations-list {
          margin-bottom: 1.5rem;
        }

        .destination-item {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 12px;
          padding: 1rem;
          border: 1px solid transparent;
          position: relative;
        }

        .destination-item:hover {
          background: #333;
          border-color: #444;
        }

        .destination-item.selected {
          background: #333;
          border-color: #00bcd4;
          box-shadow: 0 0 0 1px rgba(0, 188, 212, 0.3);
        }

        .destination-number {
          width: 32px;
          height: 32px;
          background: #00bcd4;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 0.9rem;
          flex-shrink: 0;
        }

        .destination-content {
          flex: 1;
        }

        .destination-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
          gap: 1rem;
        }

        .destination-name {
          margin: 0;
          color: #fff;
          font-size: 1rem;
          font-weight: 600;
        }

        .destination-meta {
          display: flex;
          gap: 1rem;
          color: #999;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .destination-description {
          margin: 0 0 0.75rem 0;
          color: #ccc;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .destination-highlights {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .highlight-tag {
          background: rgba(0, 188, 212, 0.1);
          color: #00bcd4;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-size: 0.75rem;
          border: 1px solid rgba(0, 188, 212, 0.3);
        }

        .highlight-more {
          color: #999;
          font-size: 0.75rem;
          font-style: italic;
        }

        .destination-details {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #444;
          animation: slideDown 0.2s ease-out;
        }

        .detail-section {
          margin-bottom: 1rem;
        }

        .detail-section:last-child {
          margin-bottom: 0;
        }

        .detail-section h6 {
          margin: 0 0 0.5rem 0;
          color: #00bcd4;
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .activity-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          color: #ccc;
          font-size: 0.8rem;
        }

        .activity-name {
          flex: 1;
        }

        .activity-duration,
        .activity-cost {
          color: #999;
          font-size: 0.75rem;
        }

        .accommodation-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          color: #ccc;
          font-size: 0.8rem;
        }

        .accommodation-rating {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #ffd700;
          font-size: 0.75rem;
        }

        .tips-list {
          margin: 0;
          padding-left: 1rem;
          color: #ccc;
          font-size: 0.8rem;
        }

        .tip-item {
          margin-bottom: 0.25rem;
          line-height: 1.3;
        }

        .transport-info {
          position: absolute;
          right: -0.5rem;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .transport-line {
          width: 2px;
          height: 40px;
          background: #444;
          position: relative;
        }

        .transport-line::after {
          content: '';
          position: absolute;
          bottom: -4px;
          left: -2px;
          width: 0;
          height: 0;
          border-left: 3px solid transparent;
          border-right: 3px solid transparent;
          border-top: 8px solid #444;
        }

        .transport-details {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #999;
          font-size: 0.75rem;
          background: #2a2a2a;
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
          border: 1px solid #444;
        }

        .cost-breakdown {
          background: #333;
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .cost-breakdown h6 {
          margin: 0 0 0.75rem 0;
          color: #00bcd4;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .cost-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cost-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #ccc;
          font-size: 0.85rem;
        }

        .cost-item.total {
          border-top: 1px solid #444;
          padding-top: 0.5rem;
          margin-top: 0.5rem;
          font-weight: 600;
          color: #fff;
        }

        .cost-note {
          margin-top: 0.75rem;
          color: #999;
          font-size: 0.8rem;
          text-align: center;
          font-style: italic;
        }

        .route-actions {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .action-btn {
          flex: 1;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .action-btn.primary {
          background: #00bcd4;
          color: white;
        }

        .action-btn.primary:hover:not(:disabled) {
          background: #00acc1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 188, 212, 0.3);
        }

        .action-btn.secondary {
          background: #444;
          color: #ccc;
          border: 1px solid #555;
        }

        .action-btn.secondary:hover:not(:disabled) {
          background: #555;
          color: #fff;
          border-color: #666;
        }

        .action-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none !important;
        }

        .toggle-details {
          width: 100%;
          background: none;
          border: 1px solid #444;
          color: #999;
          padding: 0.5rem;
          border-radius: 8px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.2s ease;
        }

        .toggle-details:hover {
          border-color: #00bcd4;
          color: #00bcd4;
        }

        /* Animations */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 300px;
          }
        }

        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .route-preview {
            padding: 1rem;
          }

          .route-header {
            flex-direction: column;
            gap: 1rem;
          }

          .route-meta {
            gap: 0.75rem;
          }

          .meta-item {
            font-size: 0.8rem;
          }

          .destination-item {
            padding: 0.75rem;
          }

          .destination-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .destination-meta {
            gap: 0.75rem;
          }

          .route-actions {
            flex-direction: column;
            gap: 0.5rem;
          }

          .transport-info {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .destination-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .destination-number {
            align-self: flex-start;
          }

          .highlight-tag {
            font-size: 0.7rem;
            padding: 0.2rem 0.4rem;
          }

          .cost-breakdown {
            padding: 0.75rem;
          }

          .detail-section {
            margin-bottom: 0.75rem;
          }
        }

        /* High contrast mode */
        @media (prefers-contrast: high) {
          .route-preview {
            border-width: 2px;
          }

          .destination-item.selected {
            border-width: 2px;
          }

          .action-btn {
            border-width: 2px;
          }
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .route-preview,
          .destination-details {
            animation: none;
          }

          .action-btn:hover {
            transform: none;
          }

          .confidence-fill {
            transition: none;
          }
        }

        /* Focus management */
        .destination-item:focus,
        .action-btn:focus,
        .toggle-details:focus {
          outline: 2px solid #00bcd4;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
};

export default RoutePreview;