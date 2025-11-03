import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { 
  AIState, 
  ChatMessage, 
  ChatSession, 
  ConversationContext, 
  TravelPreferences, 
  GeneratedRoute,
  QuickAction,
  UserFeedback,
  ConversationAnalytics,
  TrainingDataPoint,
  AIError
} from '../types/ai';
import { aiTravelService } from '../services/aiTravelService';
import { analyticsService } from '../services/analyticsService';

interface AIContextType extends AIState {
  sendMessage: (message: string) => Promise<void>;
  sendQuickAction: (action: QuickAction) => Promise<void>;
  acceptRoute: (route: GeneratedRoute) => Promise<void>;
  rejectRoute: (route: GeneratedRoute, reason?: string) => Promise<void>;
  modifyRoute: (route: GeneratedRoute, modifications: string) => Promise<void>;
  provideFeedback: (messageId: string, feedback: UserFeedback) => Promise<void>;
  resetSession: () => void;
  startNewSession: (tripData: any) => void;
  updatePreferences: (preferences: Partial<TravelPreferences>) => void;
  retryLastMessage: () => Promise<void>;
}

type AIAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: AIError | null }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<ChatMessage> } }
  | { type: 'SET_SESSION'; payload: ChatSession }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<TravelPreferences> }
  | { type: 'SET_ROUTE'; payload: GeneratedRoute | null }
  | { type: 'SET_PHASE'; payload: ConversationContext['currentPhase'] }
  | { type: 'RESET_SESSION' }
  | { type: 'UPDATE_ANALYTICS'; payload: Partial<ConversationAnalytics> };

const initialState: AIState = {
  currentSession: null,
  messages: [],
  isLoading: false,
  isTyping: false,
  error: null,
  preferences: {},
  currentPhase: 'welcome',
  generatedRoute: null,
  analytics: null
};

function aiReducer(state: AIState, action: AIAction): AIState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false, isTyping: false };
    
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.payload],
        error: null
      };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id 
            ? { ...msg, ...action.payload.updates }
            : msg
        )
      };
    
    case 'SET_SESSION':
      return { 
        ...state, 
        currentSession: action.payload,
        messages: action.payload.messages || [],
        preferences: action.payload.preferences || {},
        currentPhase: action.payload.context.currentPhase
      };
    
    case 'UPDATE_PREFERENCES':
      return { 
        ...state, 
        preferences: { ...state.preferences, ...action.payload }
      };
    
    case 'SET_ROUTE':
      return { ...state, generatedRoute: action.payload };
    
    case 'SET_PHASE':
      return { ...state, currentPhase: action.payload };
    
    case 'RESET_SESSION':
      return { 
        ...initialState,
        analytics: state.analytics // Keep analytics for learning
      };
    
    case 'UPDATE_ANALYTICS':
      return {
        ...state,
        analytics: state.analytics 
          ? { ...state.analytics, ...action.payload }
          : action.payload as ConversationAnalytics
      };
    
    default:
      return state;
  }
}

const AIContext = createContext<AIContextType | undefined>(undefined);

export function AIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(aiReducer, initialState);

  // Analytics tracking for ML improvement
  useEffect(() => {
    if (state.currentSession) {
      const analytics: Partial<ConversationAnalytics> = {
        sessionId: state.currentSession.id,
        totalMessages: state.messages.length,
        errorCount: state.messages.filter(m => m.status === 'error').length,
        preferencesCollected: Object.keys(state.preferences).length
      };
      
      dispatch({ type: 'UPDATE_ANALYTICS', payload: analytics });
    }
  }, [state.messages, state.preferences, state.currentSession]);

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Send user message and get AI response
  const sendMessage = useCallback(async (message: string) => {
    if (!state.currentSession || state.isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId(),
      content: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text',
      status: 'sent'
    };

    dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_TYPING', payload: true });

    try {
      const startTime = Date.now();
      
      const response = await aiTravelService.sendMessage({
        message,
        sessionId: state.currentSession.id,
        context: state.currentSession.context,
        preferences: state.preferences
      });

      const processingTime = Date.now() - startTime;

      const aiMessage: ChatMessage = {
        id: generateMessageId(),
        content: response.response.message,
        sender: 'ai',
        timestamp: new Date(),
        type: response.response.route ? 'route_preview' : 'text',
        status: 'sent',
        metadata: {
          route: response.response.route,
          actions: response.response.quickActions,
          cost: response.response.route?.estimatedCost.total
        }
      };

      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });
      dispatch({ type: 'SET_PHASE', payload: response.response.phase });
      
      if (response.response.route) {
        dispatch({ type: 'SET_ROUTE', payload: response.response.route });
      }

      // Store training data for ML improvement
      const trainingData: TrainingDataPoint = {
        input: {
          preferences: state.preferences as TravelPreferences,
          context: state.currentSession.context,
          userMessage: message
        },
        output: {
          response: response.response.message,
          route: response.response.route,
          actions: response.response.quickActions
        },
        feedback: [], // Will be updated when user provides feedback
        qualityScore: response.response.confidence,
        timestamp: new Date(),
        modelVersion: response.response.modelUsed
      };

      await analyticsService.storeTrainingData(trainingData);
      
      // Track response time for performance monitoring
      dispatch({ 
        type: 'UPDATE_ANALYTICS', 
        payload: { averageResponseTime: processingTime }
      });

    } catch (error) {
      console.error('AI Service Error:', error);
      
      const errorMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Entschuldigung, es gab ein Problem bei der Verarbeitung deiner Anfrage. Bitte versuche es erneut.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'error',
        status: 'error',
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      dispatch({ type: 'ADD_MESSAGE', payload: errorMessage });
      dispatch({ 
        type: 'SET_ERROR', 
        payload: {
          code: 'AI_SERVICE_ERROR',
          message: 'Failed to get AI response',
          details: error,
          recoverable: true,
          timestamp: new Date()
        }
      });

      // Track errors for ML improvement
      dispatch({ 
        type: 'UPDATE_ANALYTICS', 
        payload: { errorCount: (state.analytics?.errorCount || 0) + 1 }
      });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_TYPING', payload: false });
    }
  }, [state.currentSession, state.isLoading, state.preferences, state.analytics, generateMessageId]);

  // Accept generated route
  const acceptRoute = useCallback(async (route: GeneratedRoute) => {
    if (!state.currentSession) return;

    try {
      // Mark route as accepted in analytics
      dispatch({ 
        type: 'UPDATE_ANALYTICS', 
        payload: { routeAccepted: true }
      });

      // Provide positive feedback for ML
      await analyticsService.storeRouteFeedback({
        routeId: route.id,
        accepted: true,
        feedback: 'Route accepted by user',
        preferences: state.preferences as TravelPreferences,
        timestamp: new Date()
      });

      // Send confirmation message
      const confirmationMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Perfekt! Deine Route wurde erfolgreich übernommen. Du findest alle Ziele jetzt in deiner Timeline. 🎉',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      };

      dispatch({ type: 'ADD_MESSAGE', payload: confirmationMessage });
      dispatch({ type: 'SET_PHASE', payload: 'completed' });

    } catch (error) {
      console.error('Route acceptance error:', error);
    }
  }, [state.currentSession, state.preferences, generateMessageId]);

  // Reject generated route
  const rejectRoute = useCallback(async (route: GeneratedRoute, reason?: string) => {
    if (!state.currentSession) return;

    try {
      // Store rejection feedback for ML improvement
      await analyticsService.storeRouteFeedback({
        routeId: route.id,
        accepted: false,
        feedback: reason || 'Route rejected by user',
        preferences: state.preferences as TravelPreferences,
        timestamp: new Date()
      });

      // Ask for improvement suggestions
      const followUpMessage: ChatMessage = {
        id: generateMessageId(),
        content: 'Kein Problem! Was würdest du gerne an der Route ändern? Erzähl mir mehr über deine Wünsche.',
        sender: 'ai',
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
      };

      dispatch({ type: 'ADD_MESSAGE', payload: followUpMessage });
      dispatch({ type: 'SET_PHASE', payload: 'route_refinement' });
      dispatch({ type: 'SET_ROUTE', payload: null });

    } catch (error) {
      console.error('Route rejection error:', error);
    }
  }, [state.currentSession, state.preferences, generateMessageId]);

  // Modify existing route
  const modifyRoute = useCallback(async (route: GeneratedRoute, modifications: string) => {
    if (!state.currentSession) return;

    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await aiTravelService.modifyRoute({
        route,
        modifications,
        sessionId: state.currentSession.id,
        preferences: state.preferences as TravelPreferences
      });

      if (response.route) {
        dispatch({ type: 'SET_ROUTE', payload: response.route });
        
        const modificationMessage: ChatMessage = {
          id: generateMessageId(),
          content: response.message,
          sender: 'ai',
          timestamp: new Date(),
          type: 'route_preview',
          status: 'sent',
          metadata: {
            route: response.route
          }
        };

        dispatch({ type: 'ADD_MESSAGE', payload: modificationMessage });
      }

    } catch (error) {
      console.error('Route modification error:', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.currentSession, state.preferences, generateMessageId]);

  // Provide user feedback for ML improvement
  const provideFeedback = useCallback(async (messageId: string, feedback: UserFeedback) => {
    try {
      await analyticsService.storeFeedback(feedback);
      
      // Update the message with feedback
      dispatch({ 
        type: 'UPDATE_MESSAGE', 
        payload: { 
          id: messageId, 
          updates: { 
            metadata: { 
              ...state.messages.find(m => m.id === messageId)?.metadata
            }
          }
        }
      });

      // Use feedback to improve future responses
      // TODO: Implement public method for model weight updates
      console.log('User feedback received:', feedback.rating);

    } catch (error) {
      console.error('Feedback storage error:', error);
    }
  }, [state.messages]);

  // Reset session
  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  // Start new session
  const startNewSession = useCallback((tripData: any) => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: ChatSession = {
      id: sessionId,
      tripId: tripData.id,
      userId: 'current_user', // Should come from auth context
      messages: [],
      context: {
        destination: tripData.destination || tripData.name, // Use trip destination if available
        homepoint: tripData.homepoint || 'Deutschland', // Default homepoint, can be customized
        tripDates: {
          startDate: new Date(tripData.startDate),
          endDate: new Date(tripData.endDate)
        },
        budget: tripData.budget ? {
          total: tripData.budget,
          currency: tripData.currency || 'EUR'
        } : undefined,
        currentPhase: 'welcome',
        collectedPreferences: {},
        lastActivity: new Date()
      },
      preferences: {
        interests: [],
        budgetRange: { min: 0, max: 1000, currency: 'EUR', type: 'total', flexibility: 'flexible' },
        travelStyle: 'moderate',
        accommodationType: [],
        groupSize: 1,
        dietaryRestrictions: [],
        transportMode: [],
        priorityFactors: []
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    dispatch({ type: 'SET_SESSION', payload: newSession });
    dispatch({ type: 'SET_PHASE', payload: 'welcome' });

    // Initialize analytics for the session
    const initialAnalytics: ConversationAnalytics = {
      sessionId,
      totalMessages: 0,
      completionTime: 0,
      routeAccepted: false,
      errorCount: 0,
      averageResponseTime: 0,
      preferencesCollected: 0,
      interactionPatterns: []
    };

    dispatch({ type: 'UPDATE_ANALYTICS', payload: initialAnalytics });
  }, []);

  // Update preferences
  const updatePreferences = useCallback((preferences: Partial<TravelPreferences>) => {
    dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
  }, []);

  // Retry last message (for error recovery)
  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = [...state.messages]
      .reverse()
      .find(msg => msg.sender === 'user');
    
    if (lastUserMessage) {
      // Remove the error message
      const messagesWithoutError = state.messages.filter(msg => msg.type !== 'error');
      
      // Re-send the last user message
      await sendMessage(lastUserMessage.content);
    }
  }, [state.messages, sendMessage]);

  // Send quick action
  const sendQuickAction = useCallback(async (action: QuickAction) => {
    console.log('sendQuickAction called:', action.id, 'generatedRoute:', state.generatedRoute);
    
    // Handle special actions that don't need to send a message
    if (action.id === 'accept' && state.generatedRoute) {
      console.log('Accepting route directly:', state.generatedRoute);
      // Route acceptance - call acceptRoute directly instead of sending message
      await acceptRoute(state.generatedRoute);
      return;
    }
    
    // For all other actions, send the message normally
    await sendMessage(action.message);
    
    // Track quick action usage for personalization
    await analyticsService.trackInteraction({
      action: `quick_action_${action.id}`,
      frequency: 1,
      timeSpent: 0,
      success: true
    });
  }, [sendMessage, acceptRoute, state.generatedRoute]);

  const contextValue: AIContextType = {
    ...state,
    sendMessage,
    sendQuickAction,
    acceptRoute,
    rejectRoute,
    modifyRoute,
    provideFeedback,
    resetSession,
    startNewSession,
    updatePreferences,
    retryLastMessage
  };

  return (
    <AIContext.Provider value={contextValue}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI(): AIContextType {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}