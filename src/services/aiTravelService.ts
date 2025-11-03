import { 
  ChatRequest, 
  ChatResponse, 
  GeneratedRoute, 
  TravelPreferences, 
  ConversationContext,
  TrainingDataPoint,
  UserFeedback
} from '../types/ai';
import { GoogleGenerativeAI } from '@google/generative-ai';

class AITravelService {
  private geminiClient: GoogleGenerativeAI;
  private modelVersion: string = 'gemini-2.5-flash'; // Google Gemini 2.5 Flash model - FREE TIER
  private trainingData: TrainingDataPoint[] = [];
  private userPatterns: Map<string, any> = new Map();
  
  // Rate limiting for free tier (60 requests per minute)
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor() {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || '';
    this.geminiClient = new GoogleGenerativeAI(apiKey);
    
    // Safety check - ensure we're using free tier model
    const allowedFreeModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-flash-8b'];
    if (!allowedFreeModels.includes(this.modelVersion)) {
      console.warn('⚠️ Non-free model detected, switching to gemini-2.5-flash for free tier');
      this.modelVersion = 'gemini-2.5-flash';
    }
  }

  // Fallback mock response when API is not available
  private getMockResponse(userMessage: string, context: ConversationContext): any {
    const mockResponses = {
      welcome: {
        message: `Hallo! Ich bin der Trailkeeper Assistent und helfe Ihnen gerne bei der Planung Ihrer Reise! 🌍

Erzählen Sie mir gerne von Ihren Reiseplänen:
- Wohin möchten Sie reisen?
- Wie lange soll die Reise dauern?
- Was sind Ihre Interessen (Kultur, Natur, Entspannung, Abenteuer)?

Ich erstelle Ihnen dann eine personalisierte Reiseroute mit allen wichtigen Details!`,
        quickActions: [
          { id: 'culture', label: '🏛️ Kulturreise', icon: '🏛️', message: 'Ich interessiere mich für Kultur und Geschichte', category: 'interest' },
          { id: 'beach', label: '🏖️ Strandurlaub', icon: '🏖️', message: 'Ich möchte einen entspannten Strandurlaub', category: 'interest' },
          { id: 'nature', label: '🏔️ Naturerlebnis', icon: '🏔️', message: 'Ich liebe Natur und Wandern', category: 'interest' },
          { id: 'adventure', label: '🎒 Abenteuerreise', icon: '🎒', message: 'Ich suche Abenteuer und Aktivitäten', category: 'interest' }
        ]
      },
      preferences_collection: {
        message: `Vielen Dank für die Informationen! Das hilft mir sehr bei der Planung.

Lassen Sie mich noch ein paar Details wissen:
- Welches Budget schwebt Ihnen vor?
- Bevorzugen Sie Hotels, Ferienwohnungen oder andere Unterkünfte?
- Reisen Sie allein, als Paar oder in einer Gruppe?

Mit diesen Informationen kann ich Ihnen eine maßgeschneiderte Route zusammenstellen!`,
        quickActions: [
          { id: 'budget_low', label: '💰 Budget bis 1000€', icon: '💰', message: 'Mein Budget ist etwa 1000€', category: 'budget' },
          { id: 'hotels', label: '🏨 Hotels bevorzugt', icon: '🏨', message: 'Ich bevorzuge Hotels', category: 'accommodation' },
          { id: 'group', label: '👥 Gruppenreise', icon: '👥', message: 'Wir reisen als Gruppe', category: 'style' },
          { id: 'surprise', label: '✨ Überrasch mich!', icon: '✨', message: 'Überrasch mich mit deinen Vorschlägen', category: 'general' }
        ]
      },
      route_generation: {
        message: `Perfekt! Hier ist Ihre detaillierte tagesstrukturierte Reiseroute! 🗺️

📅 **TAG 1 (Ankunftstag): Destination Start**
🌅 **09:00-12:00**: Ankunft & Check-in + erste Orientierung
🍽️ **12:00-15:00**: Willkommens-Lunch im lokalen Restaurant + Stadtviertel erkunden  
🏛️ **15:00-18:00**: Erste Hauptattraktion & Panorama-Aussichtspunkt
🍷 **19:00-22:00**: Authentisches Dinner + lokale Spezialitäten probieren
🏨 **Übernachtung**: Zentral gelegenes Hotel (€120-150/Nacht)

📅 **TAG 2: Kulturelle Highlights**
🌅 **09:00-12:00**: Hauptmuseum/Sehenswürdigkeit (früh für weniger Touristen)
🍽️ **12:30-15:00**: Traditionelles Mittagessen + historisches Viertel wandern
🎨 **15:00-18:00**: Zweite wichtige Attraktion + lokale Kunstszene
🌃 **19:30-22:00**: Rooftop-Dinner mit Stadtblick + Nachtspaziergang

📅 **TAG 3: Naturerlebnis & Transfer**
🚗 **09:00-12:00**: Transfer zur nächsten Destination (Scenic Route)
🏞️ **12:00-15:00**: Naturpark/Landschaft + Picknick-Lunch
🌊 **15:00-18:00**: Outdoor-Aktivität (Wandern/Bootstour/Radfahren)
🍖 **19:00-22:00**: Traditionelle Grillspezialitäten + lokale Musik

📅 **TAG 4: Kulinarik & Kultur**
🍇 **09:00-12:00**: Food-Tour/Marktbesuch + Kochkurs möglich
🍽️ **12:00-15:00**: Gourmet-Lunch + Weingut/Brauerei-Besichtigung
🏛️ **15:30-18:00**: Kulturelle Stätte + handwerkliche Traditionen
🎭 **19:30-22:00**: Kulturelle Veranstaltung + authentisches Dinner

📅 **TAG 5-6: Entspannung & Highlights**
🏖️ **Flexible Tagesgestaltung**: Strände, Wellness, Shopping
🎯 **Must-See Attraktionen**: Je nach Destination angepasst
🌅 **Sonnenuntergang-Spots**: Romantische Abendgestaltung
💫 **Geheimtipps**: Lokale Insider-Empfehlungen

📅 **TAG 7: Abschied & Abreise**
🌅 **10:00-13:00**: Letzte Highlights + Souvenir-Shopping
🍽️ **13:00-15:00**: Abschiedslunch in besonderem Restaurant
✈️ **15:00+**: Transfer zum Flughafen/Bahnhof + Heimreise

💰 **Kostenübersicht:**
- Unterkünfte: €840 (7 Nächte á €120 Ø)
- Essen & Trinken: €350 (€50/Tag)
- Aktivitäten & Eintritt: €210 (€30/Tag)
- Transport vor Ort: €140 (€20/Tag)
**Gesamt: €1.540 pro Person**

🎯 **Inklusive:**
- Konkrete Uhrzeiten für bessere Planung
- Restaurant-Empfehlungen für jede Mahlzeit
- Mix aus Must-See & Geheimtipps
- Budgetfreundliche & Premium-Optionen
- Flexibilität für spontane Änderungen

Soll ich diese Route übernehmen oder möchten Sie Anpassungen?`,
        quickActions: [
          { id: 'accept', label: '✅ Route übernehmen', icon: '✅', message: 'Diese Route gefällt mir, ich übernehme sie', category: 'action' },
          { id: 'modify', label: '🔄 Anpassen', icon: '🔄', message: 'Ich möchte einige Änderungen an der Route', category: 'action' },
          { id: 'alternative', label: '💡 Alternative zeigen', icon: '💡', message: 'Zeig mir eine alternative Route', category: 'action' },
          { id: 'details', label: '📋 Details anzeigen', icon: '📋', message: 'Ich möchte mehr Details zur Route', category: 'action' }
        ],
        route: {
          id: 'italy-7days-cultural',
          name: 'Italien Kulturreise - 7 Tage',
          description: 'Eine wunderschöne 7-tägige Reise durch die kulturellen Highlights Italiens',
          routeType: 'linear',
          totalDuration: 7,
          travelDistance: 850,
          confidence: 0.92,
          destinations: [
            {
              id: 'rome',
              name: 'Rom',
              description: 'Die ewige Stadt mit antiken Wunderwerken und lebendiger Kultur',
              coordinates: { lat: 41.9028, lng: 12.4964 },
              location: { address: 'Rom, Italien' },
              duration: 3,
              estimatedCost: 420,
              highlights: ['Kolosseum', 'Forum Romanum', 'Vatikan', 'Trevi-Brunnen', 'Spanische Treppe'],
              suggestedActivities: [
                { name: 'Kolosseum-Tour', duration: 3, cost: 25 },
                { name: 'Vatikan-Besichtigung', duration: 4, cost: 30 },
                { name: 'Abendspaziergang Trastevere', duration: 2, cost: 0 }
              ],
              accommodation: [{
                name: 'Hotel Artemide',
                rating: 4.2,
                priceRange: { min: 120, max: 180 }
              }],
              localTips: ['Früh am Morgen zum Kolosseum', 'Reservierung für Vatikan notwendig']
            },
            {
              id: 'florence',
              name: 'Florenz',
              description: 'Renaissance-Perle mit weltberühmter Kunst und Architektur',
              coordinates: { lat: 43.7696, lng: 11.2558 },
              location: { address: 'Florenz, Italien' },
              duration: 2,
              estimatedCost: 280,
              highlights: ['Uffizien', 'Ponte Vecchio', 'Dom von Florenz', 'Palazzo Pitti'],
              suggestedActivities: [
                { name: 'Uffizien-Museum', duration: 3, cost: 20 },
                { name: 'Dom-Besichtigung', duration: 2, cost: 15 },
                { name: 'Toskana-Weinprobe', duration: 4, cost: 45 }
              ],
              accommodation: [{
                name: 'Hotel Davanzati',
                rating: 4.0,
                priceRange: { min: 100, max: 150 }
              }],
              localTips: ['Tickets für Uffizien vorab buchen', 'Sonnenuntergang vom Piazzale Michelangelo']
            },
            {
              id: 'venice',
              name: 'Venedig',
              description: 'Einzigartige Lagunenstadt mit romantischen Kanälen',
              coordinates: { lat: 45.4408, lng: 12.3155 },
              location: { address: 'Venedig, Italien' },
              duration: 2,
              estimatedCost: 320,
              highlights: ['Markusplatz', 'Dogenpalast', 'Gondelfahrt', 'Murano & Burano'],
              suggestedActivities: [
                { name: 'Gondelfahrt', duration: 1, cost: 80 },
                { name: 'Dogenpalast-Tour', duration: 2, cost: 25 },
                { name: 'Insel-Hopping Murano/Burano', duration: 6, cost: 40 }
              ],
              accommodation: [{
                name: 'Hotel ai Reali',
                rating: 4.3,
                priceRange: { min: 150, max: 220 }
              }],
              localTips: ['Acqua alta (Hochwasser) beachten', 'Früh am Morgen für weniger Touristen']
            }
          ],
          estimatedCost: {
            total: 1200,
            currency: 'EUR',
            accommodation: 480,
            transport: 180,
            activities: 285,
            food: 255,
            dailyAverage: 171
          }
        }
      },
      route_refinement: {
        message: `Gerne! Ich helfe Ihnen dabei, die Route anzupassen. 

Was möchten Sie ändern?
- Andere Städte besuchen (z.B. Neapel, Mailand)?
- Mehr Zeit in einer bestimmten Stadt verbringen?
- Budget anpassen oder andere Aktivitäten?
- Andere Reisezeit oder Dauer?

Teilen Sie mir Ihre Wünsche mit und ich erstelle eine angepasste Route für Sie!`,
        quickActions: [
          { id: 'add_cities', label: '🏙️ Andere Städte', icon: '🏙️', message: 'Ich möchte andere Städte besuchen', category: 'modification' },
          { id: 'more_time', label: '⏰ Mehr Zeit', icon: '⏰', message: 'Ich möchte mehr Zeit in bestimmten Städten', category: 'modification' },
          { id: 'budget_change', label: '💰 Budget ändern', icon: '💰', message: 'Ich möchte das Budget anpassen', category: 'modification' },
          { id: 'new_route', label: '🔄 Neue Route', icon: '🔄', message: 'Erstelle eine komplett neue Route', category: 'modification' }
        ]
      },
      finalization: {
        message: `Ausgezeichnet! 🎉 Ihre Italien-Reise ist bereit!

✅ **Route bestätigt**: Rom → Florenz → Venedig (7 Tage)
✅ **Budget**: ~1.200€ pro Person 
✅ **Unterkünfte**: Zentrale 3-4 Sterne Hotels reserviert
✅ **Aktivitäten**: Alle wichtigen Sehenswürdigkeiten eingeplant

**Nächste Schritte:**
1. 🎫 Flüge buchen (Rom Ankunft, Venedig Abflug)
2. 🏨 Hotelreservierungen bestätigen  
3. 🎭 Tickets für Attraktionen vorbuchen (Kolosseum, Uffizien)
4. 🧳 Packliste und Reisedokumente vorbereiten

Wunderbare Reise und *Buon Viaggio*! 🇮🇹`,
        quickActions: [
          { id: 'export', label: '📱 Reiseplan exportieren', icon: '📱', message: 'Reiseplan als PDF exportieren', category: 'export' },
          { id: 'calendar', label: '📅 Zum Kalender', icon: '📅', message: 'Termine zum Kalender hinzufügen', category: 'export' },
          { id: 'new_trip', label: '✈️ Neue Reise planen', icon: '✈️', message: 'Eine weitere Reise planen', category: 'action' },
          { id: 'share', label: '📤 Teilen', icon: '📤', message: 'Reiseplan mit anderen teilen', category: 'export' }
        ]
      },
      completed: {
        message: `Vielen Dank, dass Sie den Trailkeeper Assistent für Ihre Reiseplanung genutzt haben! 🙏

Ich hoffe, Sie haben eine unvergessliche Zeit in Italien! Falls Sie weitere Reisen planen möchten, bin ich jederzeit für Sie da.

*Arrivederci und gute Reise!* 🇮🇹✨`,
        quickActions: [
          { id: 'new_destination', label: '🌍 Neues Ziel', icon: '🌍', message: 'Ich möchte eine Reise zu einem anderen Ziel planen', category: 'restart' },
          { id: 'restart', label: '🔄 Neu starten', icon: '🔄', message: 'Von vorne beginnen', category: 'restart' }
        ]
      }
    };

    const currentPhase = context.currentPhase || 'welcome';
    const response = mockResponses[currentPhase as keyof typeof mockResponses] || mockResponses.welcome;

    return {
      message: response.message,
      route: (response as any).route, // Include route data if present
      processingTime: 1500,
      promptTokens: 150,
      responseTokens: 200,
      confidence: 0.85,
      quickActions: response.quickActions || this.generateQuickActions(currentPhase)
    };
  }

  // Reset conversation context for new trip planning session
  resetSession(sessionId: string): void {
    // Clear user patterns for this session to prevent cross-contamination
    this.userPatterns.delete(sessionId);
    console.log(`🔄 AI Session reset for sessionId: ${sessionId}`);
  }

  // Main message processing with learning capabilities
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      let response;
      
      // Try Gemini API if key is available, otherwise use fallback
      const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY;
      
      if (geminiApiKey) {
        try {
          const personalizedPrompt = await this.buildPersonalizedPrompt(request);
          response = await this.callGemini(personalizedPrompt, request.message, request.context);
        } catch (apiError) {
          console.warn('Gemini API nicht verfügbar, verwende Fallback-Modus:', apiError);
          // Determine next phase for mock response
          const nextPhase = this.determineNextPhase(request.context.currentPhase, request.message);
          response = this.getMockResponse(request.message, { ...request.context, currentPhase: nextPhase });
        }
      } else {
        console.warn('Kein Gemini API Key konfiguriert, verwende Fallback-Modus');
        // Determine next phase for mock response
        const nextPhase = this.determineNextPhase(request.context.currentPhase, request.message);
        response = this.getMockResponse(request.message, { ...request.context, currentPhase: nextPhase });
      }
      
      // Store interaction for learning (with error handling)
      try {
        await this.storeInteractionData(request, response);
      } catch (storeError) {
        console.warn('Fehler beim Speichern der Interaktionsdaten:', storeError);
        // Continue with response even if storage fails
      }
      
      // Determine the next phase first, then use it for generating actions
      const nextPhase = this.determineNextPhase(request.context.currentPhase, request.message);
      
      // Extract and update destination in context if found
      const detectedDestination = (request.context as any).destination || this.extractDestinationFromMessage(request.message);
      
      return {
        response: {
          message: response.message,
          route: response.route,
          quickActions: response.quickActions || this.generateQuickActions(nextPhase),
          phase: nextPhase,
          confidence: response.confidence || 0.8,
          processingTime: response.processingTime || 0,
          modelUsed: this.modelVersion,
          promptTokens: response.promptTokens || 0,
          responseTokens: response.responseTokens || 0
        },
        session: {
          context: {
            ...request.context,
            destination: detectedDestination || undefined, // Update destination dynamically
            currentPhase: nextPhase,
            lastActivity: new Date(),
            conversationSummary: await this.generateConversationSummary(request)
          }
        }
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      throw error;
    }
  }

  // Personalized prompt building based on user history and patterns
  private async buildPersonalizedPrompt(request: ChatRequest): Promise<string> {
    const userPatterns = this.userPatterns.get(request.sessionId) || {};
    const similarInteractions = await this.findSimilarInteractions(request);
    
    const basePrompt = this.getBasePrompt(request.context.currentPhase);
    const personalizationLayer = this.buildPersonalizationLayer(userPatterns, similarInteractions);
    const contextLayer = this.buildContextLayer(request);
    const conversationHistory = this.buildConversationHistory(request.messageHistory || []);
    
    return `${basePrompt}\n\n${personalizationLayer}\n\n${contextLayer}\n\n${conversationHistory}\n\nUser message: ${request.message}`;
  }

  // Base prompt templates for different conversation phases
  private getBasePrompt(phase: ConversationContext['currentPhase']): string {
    const prompts = {
      welcome: `Du bist der Trailkeeper Assistent, ein intelligenter Reiseplanungsassistent. Du hilfst Benutzern bei der Planung ihrer Reisen mit Fachwissen und personalisierten Empfehlungen. 

WICHTIG: Die Reisedaten (Datum, Dauer, Budget) sind bereits aus der Reiseplanung bekannt - frage NICHT nochmal nach diesen Informationen!

KONTEXT-ERHALTUNG: Du führst eine fortlaufende Unterhaltung. Beziehe dich auf vorherige Nachrichten und wiederhole keine bereits gestellten Fragen!

Wichtige Richtlinien:
- Beziehe dich auf die vorherige Unterhaltung und baue darauf auf
- Die Trip-Daten (Daten, Budget) sind bereits verfügbar im Kontext
- Wiederhole KEINE bereits gestellten Fragen oder behandle bereits bekannte Informationen als neu
- Verstehe die Interessen und den Reisestil des Benutzers basierend auf dem Gesprächsverlauf
- Stelle ansprechende Fragen zu Präferenzen, NICHT zu Logistik
- Nutze die vorhandenen Trip-Informationen in deinen Antworten
- Biete relevante Schnellaktions-Buttons an
- Sei warmherzig und einladend
- Antworte immer auf Deutsch`,

      preferences_collection: `Sammle weiterhin Reisepräferenzen für die Reiseplanung basierend auf dem bisherigen Gesprächsverlauf.

KONTEXT-ERHALTUNG: Beziehe dich auf bereits bekannte Informationen aus der Unterhaltung!

Konzentriere dich nur auf noch fehlende Informationen:
- Reiseinteressen (Kultur, Natur, Strände, Essen, Abenteuer) - falls noch nicht besprochen
- Budget-Überlegungen und Flexibilität - falls noch nicht geklärt
- Reisestil (entspannt, moderat, aktiv) - falls noch nicht bekannt
- Unterkunftspräferenzen - falls noch nicht besprochen
- Transportpräferenzen - falls noch nicht geklärt
- Gruppendynamik und besondere Anforderungen - falls relevant

Wichtig: 
- Nutze die vorhandenen Trip-Informationen und bereits gesammelte Präferenzen
- Frage NICHT nach bereits bekannten Informationen
- Baue auf dem bisherigen Gesprächsverlauf auf
- Biete relevante Schnellaktionen basierend auf dem bisher Gelernten an
- Antworte auf Deutsch`,

      route_generation: `WICHTIG: Erstelle SOFORT eine konkrete, tagesstrukturierte Reiseroute! Keine weiteren Fragen!

Basierend auf den bereits verfügbaren Trip-Daten und Präferenzen, erstelle eine detaillierte Route mit:

STRUKTUR (für jeden Tag):
- Tag X (Datum): Tagesthema
- Morgens (9:00-12:00): Aktivität + Ort
- Mittags (12:00-15:00): Restaurant/Mittagspause + weitere Aktivität  
- Nachmittags (15:00-18:00): Hauptattraktionen
- Abends (18:00-22:00): Dinner + Abendaktivität
- Übernachtung: Empfohlene Unterkunft + Kostenbereich

ZUSÄTZLICH:
- Transportmöglichkeiten zwischen Orten
- Geschätzte Kosten pro Tag
- Geheimtipps und lokale Empfehlungen
- Praktische Hinweise

Sei KONKRET und SPEZIFISCH mit Ortsnamen, Restaurants, Aktivitäten und Zeiten!
Formatiere als strukturierten Text (nicht JSON).
Antworte auf Deutsch.`,

      route_refinement: `Hilf bei der Verfeinerung und Anpassung der vorgeschlagenen Reiseroute basierend auf Nutzerfeedback. Sei flexibel und:
- Höre auf spezifische Bedenken oder Wünsche
- Passe Ziele, Dauer oder Aktivitäten entsprechend an
- Behalte Budget-Überlegungen bei
- Halte die Route geografisch logisch
- Erkläre deine Begründung für Änderungen

Antworte auf Deutsch.`,

      finalization: `Finalisiere die Reiseroute und bereite die Übergabe an die Hauptanwendung vor. Biete:
- Endgültige Bestätigung der Route
- Zusammenfassung der wichtigsten Highlights
- Nächste Schritte für Buchung und Vorbereitung
- Finale Tipps oder Empfehlungen

Antworte auf Deutsch.`,

      completed: `Die Reiseplanung ist abgeschlossen. Biete Ermutigung und abschließende Gedanken zu ihrem Reiseabenteuer.
Antworte auf Deutsch.`
    };

    return prompts[phase] || prompts.welcome;
  }

  // Build personalization layer based on user patterns and history
  private buildPersonalizationLayer(userPatterns: any, similarInteractions: TrainingDataPoint[]): string {
    let personalization = '\nPersonalization context:\n';
    
    if (userPatterns.preferredBudgetRange) {
      personalization += `- User typically prefers ${userPatterns.preferredBudgetRange} budget range\n`;
    }
    
    if (userPatterns.favoriteInterests?.length > 0) {
      personalization += `- User shows strong interest in: ${userPatterns.favoriteInterests.join(', ')}\n`;
    }
    
    if (userPatterns.travelStyle) {
      personalization += `- User's travel style tends to be: ${userPatterns.travelStyle}\n`;
    }
    
    if (similarInteractions.length > 0) {
      const successfulPatterns = similarInteractions
        .filter(interaction => interaction.qualityScore > 0.7)
        .map(interaction => interaction.output.response)
        .slice(0, 2);
      
      if (successfulPatterns.length > 0) {
        personalization += `- Successful approaches with similar users:\n${successfulPatterns.map(p => `  • ${p.substring(0, 100)}...`).join('\n')}\n`;
      }
    }
    
    return personalization;
  }

  // Extract destination from user message using pattern matching
  private extractDestinationFromMessage(message: string): string | null {
    const normalizedMessage = message.toLowerCase();
    
    // Common patterns for destinations
    const destinationPatterns = [
      // Direct mentions
      /(?:nach|in|zu)\s+([a-zA-ZäöüÄÖÜß\s-]{2,}?)(?:\s|$|,|\.|!|\?)/,
      /([a-zA-ZäöüÄÖÜß\s-]{2,}?)\s+(?:reise|trip|urlaub|fahren|besuchen|reisen)/,
      /(?:eine reise nach|einen trip nach|urlaub in|fahrt nach)\s+([a-zA-ZäöüÄÖÜß\s-]{2,}?)(?:\s|$|,|\.|!|\?)/,
      
      // Country/City patterns
      /(?:^|\s)(portugal|spanien|italien|frankreich|kroatien|griechenland|türkei|deutschland|österreich|schweiz|niederlande|belgien|dänemark|schweden|norwegen|polen|tschechien|ungarn|england|irland|schottland)(?:\s|$|,|\.|!|\?)/,
      /(?:^|\s)(lissabon|porto|madrid|barcelona|rom|mailand|venedig|florenz|neapel|paris|lyon|marseille|zagreb|split|dubrovnik|athen|thessaloniki|istanbul|ankara|berlin|münchen|hamburg|köln|wien|salzburg|zürich|genf|amsterdam|rotterdam|brüssel|antwerpen|kopenhagen|stockholm|göteborg|oslo|bergen|warschau|krakau|prag|budapest|london|edinburgh|dublin|cork)(?:\s|$|,|\.|!|\?)/,
    ];
    
    for (const pattern of destinationPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        // Clean up the extracted destination
        const destination = match[1].trim()
          .replace(/^(der|die|das|den|dem|des)\s+/i, '') // Remove German articles
          .replace(/\s+/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (destination.length >= 2) {
          return destination;
        }
      }
    }
    
    return null;
  }

  // Build context layer with current trip and conversation data
  private buildContextLayer(request: ChatRequest): string {
    const { context, preferences } = request;
    
    let contextInfo = '\nTrip context (pre-filled from user\'s trip planning):\n';
    
    // Extract destination from context or user message
    const detectedDestination = (context as any).destination || this.extractDestinationFromMessage(request.message);
    
    if (detectedDestination) {
      contextInfo += `- Destination: ${detectedDestination}\n`;
    } else {
      contextInfo += `- Destination: (to be determined based on user input)\n`;
    }
    
    // Add homepoint information
    const homepoint = (context as any).homepoint || 'Deutschland';
    contextInfo += `- Start/End Location: ${homepoint} (user's home base)\n`;
    
    // Trip duration and dates - already known from trip planning
    const durationDays = Math.ceil((context.tripDates.endDate.getTime() - context.tripDates.startDate.getTime()) / (1000 * 60 * 60 * 24));
    contextInfo += `- Duration: ${durationDays} days (${durationDays - 1} nights)\n`;
    contextInfo += `- Dates: ${context.tripDates.startDate.toLocaleDateString('de-DE')} - ${context.tripDates.endDate.toLocaleDateString('de-DE')}\n`;
    
    if (context.budget) {
      contextInfo += `- Budget: ${context.budget.total || context.budget.daily} ${context.budget.currency}\n`;
    }
    
    if (Object.keys(preferences).length > 0) {
      contextInfo += '\nCollected preferences:\n';
      
      if (preferences.interests && preferences.interests.length > 0) {
        contextInfo += `- Interests: ${preferences.interests.map(i => i.name).join(', ')}\n`;
      }
      
      if (preferences.travelStyle) {
        contextInfo += `- Travel style: ${preferences.travelStyle}\n`;
      }
      
      if (preferences.budgetRange) {
        contextInfo += `- Budget range: ${preferences.budgetRange.min}-${preferences.budgetRange.max} ${preferences.budgetRange.currency}\n`;
      }
      
      if (preferences.accommodationType && preferences.accommodationType.length > 0) {
        contextInfo += `- Accommodation: ${preferences.accommodationType.join(', ')}\n`;
      }
    }
    
    if (context.conversationSummary) {
      contextInfo += `\nConversation summary: ${context.conversationSummary}\n`;
    }
    
    return contextInfo;
  }

  // Build conversation history for context preservation
  private buildConversationHistory(messageHistory: any[]): string {
    if (!messageHistory || messageHistory.length === 0) {
      return 'Previous conversation: (This is the first message in the conversation)';
    }

    // Take the last 8 messages to avoid token limits while maintaining context
    const recentMessages = messageHistory.slice(-8);
    
    let historyText = 'Previous conversation context:\n';
    
    recentMessages.forEach((msg, index) => {
      if (msg.sender === 'user') {
        historyText += `User: ${msg.content}\n`;
      } else if (msg.sender === 'ai') {
        // Include AI responses but keep them shorter to save tokens
        const shortResponse = msg.content.length > 200 
          ? msg.content.substring(0, 200) + '...' 
          : msg.content;
        historyText += `Assistant: ${shortResponse}\n`;
      }
    });
    
    historyText += '\nIMPORTANT: Continue this conversation naturally. Reference previous topics when relevant. Don\'t repeat basic questions already asked.';
    
    return historyText;
  }

  // Find similar successful interactions for learning
  private async findSimilarInteractions(request: ChatRequest): Promise<TrainingDataPoint[]> {
    return this.trainingData
      .filter(data => {
        // Find interactions with similar preferences and context
        const prefSimilarity = this.calculatePreferenceSimilarity(
          data.input.preferences, 
          request.preferences as TravelPreferences
        );
        
        const contextSimilarity = this.calculateContextSimilarity(
          data.input.context,
          request.context
        );
        
        return prefSimilarity > 0.6 && contextSimilarity > 0.5;
      })
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 5);
  }

  // Calculate similarity between user preferences
  private calculatePreferenceSimilarity(prefs1: TravelPreferences, prefs2: Partial<TravelPreferences>): number {
    let score = 0;
    let factors = 0;
    
    // Compare interests
    if (prefs1.interests && prefs2.interests) {
      const common = prefs1.interests.filter(i1 => 
        prefs2.interests!.some(i2 => i2.name === i1.name)
      ).length;
      score += (common / Math.max(prefs1.interests.length, prefs2.interests.length)) * 0.3;
      factors += 0.3;
    }
    
    // Compare travel style
    if (prefs1.travelStyle && prefs2.travelStyle && prefs1.travelStyle === prefs2.travelStyle) {
      score += 0.2;
    }
    factors += 0.2;
    
    // Compare budget range
    if (prefs1.budgetRange && prefs2.budgetRange) {
      const overlap = Math.max(0, Math.min(prefs1.budgetRange.max, prefs2.budgetRange.max) - 
                                  Math.max(prefs1.budgetRange.min, prefs2.budgetRange.min));
      const total = Math.max(prefs1.budgetRange.max, prefs2.budgetRange.max) - 
                   Math.min(prefs1.budgetRange.min, prefs2.budgetRange.min);
      score += (overlap / total) * 0.3;
      factors += 0.3;
    }
    
    // Compare group size
    if (prefs1.groupSize && prefs2.groupSize && prefs1.groupSize === prefs2.groupSize) {
      score += 0.2;
    }
    factors += 0.2;
    
    return factors > 0 ? score / factors : 0;
  }

  // Calculate similarity between contexts
  private calculateContextSimilarity(ctx1: ConversationContext, ctx2: ConversationContext): number {
    let score = 0;
    
    // Compare trip duration
    const duration1 = (ctx1.tripDates.endDate.getTime() - ctx1.tripDates.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const duration2 = (ctx2.tripDates.endDate.getTime() - ctx2.tripDates.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const durationSimilarity = 1 - Math.abs(duration1 - duration2) / Math.max(duration1, duration2);
    score += durationSimilarity * 0.5;
    
    // Compare budget
    if (ctx1.budget && ctx2.budget) {
      const budget1 = ctx1.budget.total || ctx1.budget.daily! * duration1;
      const budget2 = ctx2.budget.total || ctx2.budget.daily! * duration2;
      const budgetSimilarity = 1 - Math.abs(budget1 - budget2) / Math.max(budget1, budget2);
      score += budgetSimilarity * 0.3;
    }
    
    // Compare phase
    if (ctx1.currentPhase === ctx2.currentPhase) {
      score += 0.2;
    }
    
    return score;
  }

  // Rate limiting check for free tier compliance
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    // Reset counter every minute
    if (now - this.lastResetTime > oneMinute) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Free tier: 60 requests per minute
    if (this.requestCount >= 60) {
      console.warn('🚫 Gemini rate limit reached (60/min) - using fallback');
      return false;
    }
    
    this.requestCount++;
    return true;
  }

  // Call Gemini API with free tier safety checks
  private async callGemini(prompt: string, userMessage: string, context: ConversationContext): Promise<any> {
    // Check rate limits first (FREE TIER PROTECTION)
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded - using fallback mode');
    }
    
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const startTime = Date.now();
        
        // SAFETY: Only use free tier model
        const model = this.geminiClient.getGenerativeModel({ 
          model: this.modelVersion, // Use validated free tier model
          generationConfig: {
            maxOutputTokens: 2048, // Reasonable limit for free tier
            temperature: 0.7,
          }
        });
        
        // Combine system prompt and user message for Gemini
        const fullPrompt = `${prompt}\n\nUser: ${userMessage}`;
        
        // Generate content with Gemini
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const text = response.text();
        
        const processingTime = Date.now() - startTime;

        return {
          message: text,
          processingTime,
          promptTokens: 0, // Gemini doesn't provide exact token counts in free tier
          responseTokens: 0,
          confidence: 0.8, // Default confidence for Gemini responses
          quickActions: this.generateQuickActions(context.currentPhase) // Ensure quickActions are always provided
        };

      } catch (error) {
        // Check for quota exceeded errors
        if (error instanceof Error && (error.message?.includes('quota') || error.message?.includes('limit'))) {
          const quotaError = new Error(`Gemini API quota exceeded: ${error.message}`);
          quotaError.name = 'QuotaExceededError';
          throw quotaError;
        }
        
        attempt++;
        if (attempt >= maxRetries) {
          throw error;
        }
        
        // Exponential backoff for other errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  // Calculate confidence score based on response characteristics
  private calculateResponseConfidence(apiResponse: any): number {
    let confidence = 0.8; // Base confidence
    
    // Adjust based on response length (very short responses might be less confident)
    const responseLength = apiResponse.choices[0].message.content.length;
    if (responseLength < 50) confidence -= 0.2;
    else if (responseLength > 500) confidence += 0.1;
    
    // Adjust based on token usage efficiency
    const efficiency = apiResponse.usage?.completion_tokens / apiResponse.usage?.prompt_tokens;
    if (efficiency > 0.5) confidence += 0.1;
    
    return Math.min(1.0, Math.max(0.1, confidence));
  }

  // Generate contextual quick actions
  private generateQuickActions(phase: ConversationContext['currentPhase']) {
    const actions = {
      welcome: [
        { id: 'homepoint_confirm', label: '🏠 Von zu Hause starten', icon: '🏠', message: 'Ja, ich starte und ende die Reise von meinem Wohnort', category: 'general' as const },
        { id: 'homepoint_custom', label: '✈️ Anderer Startort', icon: '✈️', message: 'Ich starte von einem anderen Ort (Flughafen, Hotel, etc.)', category: 'general' as const },
        { id: 'culture', label: '🏛️ Geschichte & Kultur', icon: '🏛️', message: 'Ich interessiere mich für Geschichte und Kultur', category: 'interest' as const },
        { id: 'beach', label: '🏖️ Strand & Meer', icon: '🏖️', message: 'Ich liebe Strände und Wassersport', category: 'interest' as const },
        { id: 'nature', label: '🌲 Natur & Wandern', icon: '🌲', message: 'Ich bin ein Naturliebhaber', category: 'interest' as const },
        { id: 'food', label: '🍷 Kulinarik', icon: '🍷', message: 'Ich mag gutes Essen und Wein', category: 'interest' as const }
      ],
      preferences_collection: [
        { id: 'budget_low', label: '💰 Sparsam (50-80€/Tag)', icon: '💰', message: 'Mein Budget ist eher knapp, etwa 50-80€ pro Tag', category: 'budget' as const },
        { id: 'budget_mid', label: '💳 Mittel (80-150€/Tag)', icon: '💳', message: 'Ich habe ein mittleres Budget von 80-150€ pro Tag', category: 'budget' as const },
        { id: 'budget_high', label: '💎 Komfortabel (150€+/Tag)', icon: '💎', message: 'Budget ist flexibel, etwa 150€+ pro Tag', category: 'budget' as const },
        { id: 'style_relaxed', label: '😌 Entspannt', icon: '😌', message: 'Ich reise gerne entspannt mit viel Zeit zum Genießen', category: 'style' as const }
      ],
      route_generation: [
        { id: 'accept_route', label: '✅ Route übernehmen', icon: '✅', message: 'Diese Route gefällt mir perfekt, ich übernehme sie!', category: 'action' as const },
        { id: 'modify_details', label: '🔄 Details anpassen', icon: '🔄', message: 'Die Route ist gut, aber ich möchte ein paar Details ändern', category: 'modification' as const },
        { id: 'more_culture', label: '🏛️ Mehr Kultur', icon: '🏛️', message: 'Können wir mehr kulturelle Sehenswürdigkeiten einbauen?', category: 'interest' as const },
        { id: 'budget_adjust', label: '💰 Budget anpassen', icon: '💰', message: 'Können wir das Budget optimieren?', category: 'budget' as const },
        { id: 'alternative_route', label: '🗺️ Alternative Route', icon: '🗺️', message: 'Zeig mir eine komplett andere Route', category: 'action' as const },
        { id: 'export_route', label: '📤 Route exportieren', icon: '📤', message: 'Ich möchte die Route exportieren/teilen', category: 'export' as const }
      ],
      route_refinement: [
        { id: 'add_cities', label: '🏙️ Andere Städte', icon: '🏙️', message: 'Ich möchte andere Städte besuchen', category: 'modification' as const },
        { id: 'more_time', label: '⏰ Mehr Zeit', icon: '⏰', message: 'Ich möchte mehr Zeit in bestimmten Städten', category: 'modification' as const },
        { id: 'budget_change', label: '💰 Budget ändern', icon: '💰', message: 'Ich möchte das Budget anpassen', category: 'modification' as const },
        { id: 'new_route', label: '🔄 Neue Route', icon: '🔄', message: 'Erstelle eine komplett neue Route', category: 'modification' as const }
      ],
      finalization: [
        { id: 'export', label: '📱 Reiseplan exportieren', icon: '📱', message: 'Reiseplan als PDF exportieren', category: 'export' as const },
        { id: 'calendar', label: '📅 Zum Kalender', icon: '📅', message: 'Termine zum Kalender hinzufügen', category: 'export' as const },
        { id: 'new_trip', label: '✈️ Neue Reise planen', icon: '✈️', message: 'Eine weitere Reise planen', category: 'action' as const },
        { id: 'share', label: '📤 Teilen', icon: '📤', message: 'Reiseplan mit anderen teilen', category: 'export' as const }
      ],
      completed: [
        { id: 'new_destination', label: '🌍 Neues Ziel', icon: '🌍', message: 'Ich möchte eine Reise zu einem anderen Ziel planen', category: 'restart' as const },
        { id: 'restart', label: '🔄 Neu starten', icon: '🔄', message: 'Von vorne beginnen', category: 'restart' as const }
      ]
    };

    return actions[phase] || [];
  }

  // Determine next conversation phase based on current phase and user input
  private determineNextPhase(currentPhase: ConversationContext['currentPhase'], userMessage: string): ConversationContext['currentPhase'] {
    const message = userMessage.toLowerCase();
    
    // Check for direct phase requests first
    if (message.includes('route') || message.includes('italien') || message.includes('reiseroute') || 
        message.includes('vorschlag') || message.includes('plan')) {
      return 'route_generation';
    }
    
    if (message.includes('budget') || message.includes('preference') || message.includes('detail') ||
        message.includes('unterkunft') || message.includes('gruppe')) {
      return 'preferences_collection';
    }
    
    if (message.includes('hallo') || message.includes('start') || message.includes('anfang') ||
        message.includes('neu') || message.includes('begin')) {
      return 'welcome';
    }
    
    // Normal phase progression based on current phase
    switch (currentPhase) {
      case 'welcome':
        // Any meaningful input should move to preferences
        if (message.length > 3) {
          return 'preferences_collection';
        }
        return 'welcome';
      
      case 'preferences_collection':
        // PROACTIVE: Move to route generation after ANY meaningful preference input
        // The goal is to provide concrete suggestions quickly, not endless questions
        if (message.length > 5 && (
          message.includes('€') || message.includes('budget') || message.includes('hotel') || 
          message.includes('entspannt') || message.includes('aktiv') || message.includes('kultur') || 
          message.includes('strand') || message.includes('natur') || message.includes('abenteuer') || 
          message.includes('gruppe') || message.includes('allein') || message.includes('paar') || 
          message.includes('überrasch') || message.includes('ich') || message.includes('mag') || 
          message.includes('liebe') || message.includes('interesse') || message.includes('gerne') || 
          message.includes('möchte') || message.includes('ja') || message.includes('von zu hause') || 
          message.includes('homepoint') || message.includes('1000') || message.includes('1500') ||
          message.includes('2000') || message.includes('sparsam') || message.includes('komfortabel')
        )) {
          return 'route_generation'; // Generate route proactively!
        }
        return 'preferences_collection';
      
      case 'route_generation':
        if (message.includes('ändern') || message.includes('anpassen') || 
            message.includes('nicht') || message.includes('aber') || message.includes('modifizieren') ||
            message.includes('ich möchte einige änderungen')) {
          return 'route_refinement';
        }
        if (message.includes('übernehmen') || message.includes('perfekt') || 
            message.includes('gefällt') || message.includes('gut') || 
            message.includes('diese route gefällt mir')) {
          return 'finalization';
        }
        if (message.includes('details') || message.includes('mehr details')) {
          return 'route_generation'; // Stay in same phase but show more details
        }
        if (message.includes('alternative') || message.includes('andere route')) {
          return 'route_generation'; // Stay in same phase but generate alternative
        }
        return 'route_generation';
      
      case 'route_refinement':
        if (message.includes('perfekt') || message.includes('übernehmen') || 
            message.includes('passt') || message.includes('fertig') ||
            message.includes('erstelle eine komplett neue route')) {
          return 'finalization';
        }
        return 'route_refinement';
      
      case 'finalization':
        if (message.includes('neue reise') || message.includes('weiteres ziel') ||
            message.includes('eine weitere reise planen')) {
          return 'welcome';
        }
        return 'completed';
      
      case 'completed':
        if (message.includes('neues ziel') || message.includes('neu starten') ||
            message.includes('von vorne beginnen')) {
          return 'welcome';
        }
        return 'completed';
      
      default:
        return currentPhase;
    }
  }

  // Store interaction data for machine learning
  private async storeInteractionData(request: ChatRequest, response: any): Promise<void> {
    const trainingPoint: TrainingDataPoint = {
      input: {
        preferences: request.preferences as TravelPreferences,
        context: request.context,
        userMessage: request.message
      },
      output: {
        response: response.message,
        route: response.route,
        actions: response.quickActions
      },
      feedback: [],
      qualityScore: response.confidence,
      timestamp: new Date(),
      modelVersion: this.modelVersion
    };

    this.trainingData.push(trainingPoint);
    
    // Keep only recent training data (last 1000 interactions)
    if (this.trainingData.length > 1000) {
      this.trainingData = this.trainingData.slice(-1000);
    }

    // Update user patterns
    this.updateUserPatterns(request.sessionId, request);
  }

  // Update user behavior patterns for personalization
  private updateUserPatterns(sessionId: string, request: ChatRequest): void {
    const patterns = this.userPatterns.get(sessionId) || {};
    
    // Track preferred interests
    if (request.preferences.interests) {
      patterns.favoriteInterests = request.preferences.interests.map(i => i.name);
    }
    
    // Track travel style
    if (request.preferences.travelStyle) {
      patterns.travelStyle = request.preferences.travelStyle;
    }
    
    // Track budget patterns
    if (request.preferences.budgetRange) {
      patterns.preferredBudgetRange = `${request.preferences.budgetRange.min}-${request.preferences.budgetRange.max}`;
    }
    
    // Track interaction frequency
    patterns.interactionCount = (patterns.interactionCount || 0) + 1;
    patterns.lastInteraction = new Date();
    
    this.userPatterns.set(sessionId, patterns);
  }

  // Generate conversation summary for context
  private async generateConversationSummary(request: ChatRequest): Promise<string> {
    const preferences = request.preferences;
    const context = request.context;
    
    let summary = '';
    
    if (preferences.interests && preferences.interests.length > 0) {
      summary += `Interessiert sich für: ${preferences.interests.map(i => i.name).join(', ')}. `;
    }
    
    if (preferences.travelStyle) {
      summary += `Reisestil: ${preferences.travelStyle}. `;
    }
    
    if (preferences.budgetRange) {
      summary += `Budget: ${preferences.budgetRange.min}-${preferences.budgetRange.max} ${preferences.budgetRange.currency}. `;
    }
    
    return summary.trim();
  }

  // Modify existing route based on user feedback
  async modifyRoute(params: {
    route: GeneratedRoute;
    modifications: string;
    sessionId: string;
    preferences: TravelPreferences;
  }): Promise<{ route: GeneratedRoute; message: string }> {
    const prompt = `
    Modify the following travel route based on user feedback:
    
    Current route: ${JSON.stringify(params.route)}
    User modifications requested: ${params.modifications}
    User preferences: ${JSON.stringify(params.preferences)}
    
    Provide an updated route that addresses the user's concerns while maintaining:
    - Logical geographical flow
    - Budget considerations
    - Time constraints
    - User's core interests
    
    Respond with a JSON object containing the modified route and an explanation message in German.
    `;

    try {
      const response = await this.callGemini(prompt, params.modifications, { currentPhase: 'route_refinement' } as any);
      const parsed = JSON.parse(response.message);
      
      return {
        route: parsed.route,
        message: parsed.message || 'Hier ist deine angepasste Route!'
      };
    } catch (error) {
      console.error('Route modification error:', error);
      throw error;
    }
  }

  // Learn from user feedback to improve future responses
  async learnFromFeedback(feedback: UserFeedback[]): Promise<void> {
    // Analyze feedback patterns
    const positivePatterns = feedback.filter(f => f.rating >= 4);
    const negativePatterns = feedback.filter(f => f.rating <= 2);
    
    // Update model weights based on feedback
    // This would integrate with a more sophisticated ML pipeline in production
    
    console.log('Learning from feedback:', {
      positive: positivePatterns.length,
      negative: negativePatterns.length,
      totalFeedback: feedback.length
    });
  }

  // Get analytics for model improvement
  getAnalytics(): any {
    return {
      totalInteractions: this.trainingData.length,
      averageQualityScore: this.trainingData.reduce((sum, data) => sum + data.qualityScore, 0) / this.trainingData.length,
      userPatterns: Array.from(this.userPatterns.entries()),
      modelVersion: this.modelVersion,
      lastUpdated: new Date()
    };
  }
}

export const aiTravelService = new AITravelService();