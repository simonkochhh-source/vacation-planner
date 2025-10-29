export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'route_preview' | 'quick_actions' | 'error';
  metadata?: {
    route?: GeneratedRoute;
    actions?: QuickAction[];
    error?: string;
    images?: string[];
    cost?: number;
  };
  status: 'sending' | 'sent' | 'error' | 'processing';
}

export interface ChatSession {
  id: string;
  tripId: string;
  userId: string;
  messages: ChatMessage[];
  context: ConversationContext;
  preferences: TravelPreferences;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'archived';
  qualityScore?: number; // For ML improvement
  userFeedback?: UserFeedback[];
}

export interface ConversationContext {
  tripDates: {
    startDate: Date;
    endDate: Date;
  };
  budget?: {
    total?: number;
    daily?: number;
    currency: string;
  };
  currentPhase: ConversationPhase;
  collectedPreferences: Partial<TravelPreferences>;
  lastActivity: Date;
  conversationSummary?: string;
}

export type ConversationPhase = 
  | 'welcome'
  | 'preferences_collection'
  | 'route_generation'
  | 'route_refinement'
  | 'finalization'
  | 'completed';

export interface TravelPreferences {
  interests: InterestCategory[];
  budgetRange: BudgetRange;
  travelStyle: 'relaxed' | 'moderate' | 'active';
  accommodationType: AccommodationType[];
  transportMode: TransportMode[];
  groupSize: number;
  dietaryRestrictions?: string[];
  mobilityRequirements?: string[];
  previousDestinations?: string[];
  priorityFactors: PriorityFactor[];
}

export interface InterestCategory {
  id: string;
  name: string;
  weight: number; // 1-10 importance
  subcategories?: string[];
}

export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
  type: 'total' | 'daily';
  flexibility: 'strict' | 'flexible' | 'very_flexible';
}

export type AccommodationType = 
  | 'hotel' 
  | 'hostel' 
  | 'apartment' 
  | 'villa' 
  | 'camping' 
  | 'mixed';

export type TransportMode = 
  | 'car' 
  | 'public_transport' 
  | 'plane' 
  | 'train' 
  | 'bike' 
  | 'walking' 
  | 'mixed';

export interface PriorityFactor {
  factor: 'cost' | 'time' | 'comfort' | 'adventure' | 'culture' | 'nature';
  importance: number; // 1-10
}

export interface GeneratedRoute {
  id: string;
  destinations: GeneratedDestination[];
  totalDuration: number;
  estimatedCost: CostBreakdown;
  travelDistance: number;
  routeType: 'linear' | 'circular' | 'hub';
  optimizationNotes: string[];
  confidence: number; // 0-1 AI confidence score
  alternatives?: GeneratedRoute[];
  generatedAt: Date;
  modelVersion: string; // For tracking AI improvements
}

export interface GeneratedDestination {
  name: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    country: string;
    region: string;
  };
  duration: number; // days
  description: string;
  highlights: string[];
  estimatedCost: number;
  images: string[];
  suggestedActivities: Activity[];
  accommodation: AccommodationSuggestion[];
  bestTimeToVisit: string;
  transportFromPrevious?: TransportSuggestion;
  localTips: string[];
  weatherInfo?: WeatherInfo;
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  category: string;
  duration: number; // hours
  cost: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  images: string[];
  bookingRequired: boolean;
  bookingUrl?: string;
  rating?: number;
  reviews?: number;
}

export interface AccommodationSuggestion {
  name: string;
  type: AccommodationType;
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  rating: number;
  description: string;
  amenities: string[];
  bookingUrl?: string;
  images: string[];
}

export interface TransportSuggestion {
  mode: TransportMode;
  duration: number; // minutes
  cost: number;
  description: string;
  bookingRequired: boolean;
  bookingUrl?: string;
}

export interface WeatherInfo {
  averageTemp: {
    min: number;
    max: number;
  };
  rainfall: number;
  description: string;
  recommendedClothing: string[];
}

export interface CostBreakdown {
  accommodation: number;
  transport: number;
  activities: number;
  food: number;
  other: number;
  total: number;
  currency: string;
  dailyAverage: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  message: string;
  category: 'interest' | 'budget' | 'style' | 'transport' | 'accommodation';
  weight?: number; // For personalization
}

export interface AIResponse {
  message: string;
  route?: GeneratedRoute;
  quickActions?: QuickAction[];
  phase: ConversationPhase;
  confidence: number;
  processingTime: number;
  modelUsed: string;
  promptTokens: number;
  responseTokens: number;
}

export interface UserFeedback {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback?: string;
  timestamp: Date;
  feedbackType: 'route_quality' | 'response_accuracy' | 'usefulness' | 'overall';
}

// Analytics & Learning Interfaces
export interface ConversationAnalytics {
  sessionId: string;
  totalMessages: number;
  completionTime: number; // minutes
  routeAccepted: boolean;
  userSatisfaction?: number;
  dropoffPoint?: ConversationPhase;
  errorCount: number;
  averageResponseTime: number;
  preferencesCollected: number;
  interactionPatterns: InteractionPattern[];
}

export interface InteractionPattern {
  action: string;
  frequency: number;
  timeSpent: number;
  success: boolean;
}

// ML Training Data Interface
export interface TrainingDataPoint {
  input: {
    preferences: TravelPreferences;
    context: ConversationContext;
    userMessage: string;
  };
  output: {
    response: string;
    route?: GeneratedRoute;
    actions?: QuickAction[];
  };
  feedback: UserFeedback[];
  qualityScore: number;
  timestamp: Date;
  modelVersion: string;
}

// Error Handling
export interface AIError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  timestamp: Date;
}

// API Interfaces
export interface ChatRequest {
  message: string;
  sessionId: string;
  context: ConversationContext;
  preferences: Partial<TravelPreferences>;
}

export interface ChatResponse {
  response: AIResponse;
  session: Partial<ChatSession>;
  error?: AIError;
}

// Component Props
export interface ChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripData: {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    budget?: number;
    participants: number;
  };
  onRouteAccept: (route: GeneratedRoute) => Promise<void>;
}

export interface ChatMessageProps {
  message: ChatMessage;
  isUser: boolean;
  onActionClick?: (action: QuickAction) => void;
  onFeedback?: (feedback: UserFeedback) => void;
  onRouteAccept?: (route: GeneratedRoute) => void;
}

export interface RoutePreviewProps {
  route: GeneratedRoute;
  onAccept: () => void;
  onModify: () => void;
  onReject: () => void;
  loading?: boolean;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  onActionSelect: (action: QuickAction) => void;
  loading?: boolean;
}

// State Management
export interface AIState {
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  isTyping: boolean;
  error: AIError | null;
  preferences: Partial<TravelPreferences>;
  currentPhase: ConversationPhase;
  generatedRoute: GeneratedRoute | null;
  analytics: ConversationAnalytics | null;
}