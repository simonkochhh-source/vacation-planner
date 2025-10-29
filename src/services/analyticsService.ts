import { 
  TrainingDataPoint, 
  UserFeedback, 
  ConversationAnalytics, 
  InteractionPattern,
  TravelPreferences
} from '../types/ai';

interface RouteFeedback {
  routeId: string;
  accepted: boolean;
  feedback: string;
  preferences: TravelPreferences;
  timestamp: Date;
}

interface ModelPerformanceMetrics {
  accuracy: number;
  userSatisfaction: number;
  responseTime: number;
  completionRate: number;
  errorRate: number;
}

class AnalyticsService {
  private trainingData: TrainingDataPoint[] = [];
  private userFeedback: UserFeedback[] = [];
  private routeFeedback: RouteFeedback[] = [];
  private conversationAnalytics: ConversationAnalytics[] = [];
  private interactionPatterns: Map<string, InteractionPattern[]> = new Map();
  private modelWeights: Map<string, number> = new Map();

  constructor() {
    this.loadStoredData();
    this.initializeModelWeights();
  }

  // Store training data for ML improvement
  async storeTrainingData(data: TrainingDataPoint): Promise<void> {
    this.trainingData.push(data);
    
    // Persist to localStorage for now (in production, use proper database)
    this.persistTrainingData();
    
    // Analyze patterns for real-time learning
    await this.analyzeTrainingPatterns();
  }

  // Store user feedback for quality improvement
  async storeFeedback(feedback: UserFeedback): Promise<void> {
    this.userFeedback.push(feedback);
    
    // Update training data with feedback
    const trainingPoint = this.trainingData.find(
      td => td.output.response.includes(feedback.messageId) // Simplified matching
    );
    
    if (trainingPoint) {
      trainingPoint.feedback.push(feedback);
      trainingPoint.qualityScore = this.calculateUpdatedQualityScore(trainingPoint);
    }
    
    // Learn from feedback patterns
    await this.learnFromFeedback(feedback);
    
    this.persistUserFeedback();
  }

  // Store route-specific feedback
  async storeRouteFeedback(feedback: RouteFeedback): Promise<void> {
    this.routeFeedback.push(feedback);
    
    // Analyze route acceptance patterns
    await this.analyzeRoutePatterns();
    
    this.persistRouteFeedback();
  }

  // Track user interaction patterns
  async trackInteraction(pattern: InteractionPattern): Promise<void> {
    const sessionPatterns = this.interactionPatterns.get('current_session') || [];
    
    // Check if similar pattern exists
    const existingPattern = sessionPatterns.find(p => p.action === pattern.action);
    
    if (existingPattern) {
      existingPattern.frequency += pattern.frequency;
      existingPattern.timeSpent += pattern.timeSpent;
      existingPattern.success = existingPattern.success && pattern.success;
    } else {
      sessionPatterns.push(pattern);
    }
    
    this.interactionPatterns.set('current_session', sessionPatterns);
    
    // Update global patterns for ML
    await this.updateGlobalPatterns(pattern);
  }

  // Analyze training patterns for continuous learning
  private async analyzeTrainingPatterns(): Promise<void> {
    if (this.trainingData.length < 10) return; // Need minimum data
    
    const recentData = this.trainingData.slice(-50); // Analyze recent patterns
    
    // Analyze successful interaction patterns
    const highQualityInteractions = recentData.filter(data => data.qualityScore > 0.8);
    const lowQualityInteractions = recentData.filter(data => data.qualityScore < 0.5);
    
    // Identify success patterns
    const successPatterns = this.identifyPatterns(highQualityInteractions);
    const failurePatterns = this.identifyPatterns(lowQualityInteractions);
    
    // Update model weights based on patterns
    await this.updateModelWeights(successPatterns, failurePatterns);
    
    console.log('Pattern analysis:', {
      totalData: this.trainingData.length,
      highQuality: highQualityInteractions.length,
      lowQuality: lowQualityInteractions.length,
      successPatterns: successPatterns.length,
      failurePatterns: failurePatterns.length
    });
  }

  // Identify patterns in training data
  private identifyPatterns(data: TrainingDataPoint[]): any[] {
    const patterns: any[] = [];
    
    // Group by user preferences
    const preferenceGroups = this.groupByPreferences(data);
    
    // Analyze each group for successful strategies
    Object.entries(preferenceGroups).forEach(([key, group]) => {
      if (group.length >= 3) { // Minimum group size
        const avgQuality = group.reduce((sum, item) => sum + item.qualityScore, 0) / group.length;
        
        if (avgQuality > 0.7) {
          patterns.push({
            preferencePattern: key,
            avgQuality,
            sampleSize: group.length,
            commonStrategies: this.extractCommonStrategies(group)
          });
        }
      }
    });
    
    return patterns;
  }

  // Group training data by user preferences
  private groupByPreferences(data: TrainingDataPoint[]): Record<string, TrainingDataPoint[]> {
    const groups: Record<string, TrainingDataPoint[]> = {};
    
    data.forEach(item => {
      const key = this.generatePreferenceKey(item.input.preferences);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return groups;
  }

  // Generate a key from user preferences for grouping
  private generatePreferenceKey(preferences: TravelPreferences): string {
    const interests = preferences.interests?.map(i => i.name).sort().join(',') || 'none';
    const style = preferences.travelStyle || 'unknown';
    const budgetRange = preferences.budgetRange ? 
      `${Math.floor(preferences.budgetRange.min / 50) * 50}-${Math.floor(preferences.budgetRange.max / 50) * 50}` : 
      'unknown';
    
    return `${interests}|${style}|${budgetRange}`;
  }

  // Extract common successful strategies from a group
  private extractCommonStrategies(group: TrainingDataPoint[]): any[] {
    const strategies = group.map(item => ({
      responseLength: item.output.response.length,
      hasRoute: !!item.output.route,
      hasActions: !!item.output.actions,
      responseType: this.categorizeResponse(item.output.response),
      qualityScore: item.qualityScore
    }));
    
    // Find common characteristics of high-quality responses
    const highQuality = strategies.filter(s => s.qualityScore > 0.8);
    
    return [{
      avgResponseLength: highQuality.reduce((sum, s) => sum + s.responseLength, 0) / highQuality.length,
      routeInclusionRate: highQuality.filter(s => s.hasRoute).length / highQuality.length,
      actionsInclusionRate: highQuality.filter(s => s.hasActions).length / highQuality.length,
      commonResponseTypes: this.getMostCommon(highQuality.map(s => s.responseType))
    }];
  }

  // Categorize response type for pattern analysis
  private categorizeResponse(response: string): string {
    const lower = response.toLowerCase();
    
    if (lower.includes('route') || lower.includes('reise')) return 'route_focused';
    if (lower.includes('budget') || lower.includes('kosten')) return 'budget_focused';
    if (lower.includes('aktivität') || lower.includes('sehenswürdigkeit')) return 'activity_focused';
    if (lower.includes('unterkunft') || lower.includes('hotel')) return 'accommodation_focused';
    if (lower.includes('frage') || lower.includes('wünsche')) return 'question_asking';
    
    return 'general';
  }

  // Get most common values from array
  private getMostCommon<T>(arr: T[]): T[] {
    const counts = arr.reduce((acc, val) => {
      acc[val as string] = (acc[val as string] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const sorted = Object.entries(counts).sort(([,a], [,b]) => b - a);
    return sorted.slice(0, 3).map(([val]) => val as T);
  }

  // Update model weights based on patterns
  private async updateModelWeights(successPatterns: any[], failurePatterns: any[]): Promise<void> {
    // Increase weights for successful patterns
    successPatterns.forEach(pattern => {
      const weight = this.modelWeights.get(pattern.preferencePattern) || 1.0;
      this.modelWeights.set(pattern.preferencePattern, Math.min(2.0, weight + 0.1));
    });
    
    // Decrease weights for failure patterns
    failurePatterns.forEach(pattern => {
      const weight = this.modelWeights.get(pattern.preferencePattern) || 1.0;
      this.modelWeights.set(pattern.preferencePattern, Math.max(0.5, weight - 0.1));
    });
    
    this.persistModelWeights();
  }

  // Learn from user feedback
  private async learnFromFeedback(feedback: UserFeedback): Promise<void> {
    // Adjust quality scores based on feedback
    if (feedback.rating >= 4) {
      // Positive feedback - reinforce this pattern
      await this.reinforcePositivePattern(feedback);
    } else if (feedback.rating <= 2) {
      // Negative feedback - avoid this pattern
      await this.avoidNegativePattern(feedback);
    }
  }

  // Reinforce positive patterns
  private async reinforcePositivePattern(feedback: UserFeedback): Promise<void> {
    // Find the training data associated with this feedback
    const associatedData = this.findAssociatedTrainingData(feedback.messageId);
    
    if (associatedData) {
      // Increase the quality score
      associatedData.qualityScore = Math.min(1.0, associatedData.qualityScore + 0.1);
      
      // Reinforce the preference pattern
      const patternKey = this.generatePreferenceKey(associatedData.input.preferences);
      const currentWeight = this.modelWeights.get(patternKey) || 1.0;
      this.modelWeights.set(patternKey, Math.min(2.0, currentWeight + 0.05));
    }
  }

  // Avoid negative patterns
  private async avoidNegativePattern(feedback: UserFeedback): Promise<void> {
    const associatedData = this.findAssociatedTrainingData(feedback.messageId);
    
    if (associatedData) {
      // Decrease the quality score
      associatedData.qualityScore = Math.max(0.1, associatedData.qualityScore - 0.2);
      
      // Reduce the preference pattern weight
      const patternKey = this.generatePreferenceKey(associatedData.input.preferences);
      const currentWeight = this.modelWeights.get(patternKey) || 1.0;
      this.modelWeights.set(patternKey, Math.max(0.3, currentWeight - 0.1));
    }
  }

  // Find training data associated with a message ID
  private findAssociatedTrainingData(messageId: string): TrainingDataPoint | undefined {
    // Simplified matching - in production, use proper message ID tracking
    return this.trainingData.find(data => 
      data.timestamp.getTime() > Date.now() - 5 * 60 * 1000 // Within last 5 minutes
    );
  }

  // Analyze route acceptance patterns
  private async analyzeRoutePatterns(): Promise<void> {
    if (this.routeFeedback.length < 5) return;
    
    const recentFeedback = this.routeFeedback.slice(-20);
    const acceptanceRate = recentFeedback.filter(f => f.accepted).length / recentFeedback.length;
    
    // Group by preference patterns
    const preferencePatterns = this.groupRouteFeedbackByPreferences(recentFeedback);
    
    // Identify high-acceptance patterns
    Object.entries(preferencePatterns).forEach(([pattern, feedback]) => {
      const acceptance = feedback.filter(f => f.accepted).length / feedback.length;
      
      if (acceptance > 0.8 && feedback.length >= 3) {
        // High acceptance rate - reinforce this pattern
        const currentWeight = this.modelWeights.get(`route_${pattern}`) || 1.0;
        this.modelWeights.set(`route_${pattern}`, Math.min(2.0, currentWeight + 0.1));
      } else if (acceptance < 0.3 && feedback.length >= 3) {
        // Low acceptance rate - reduce this pattern
        const currentWeight = this.modelWeights.get(`route_${pattern}`) || 1.0;
        this.modelWeights.set(`route_${pattern}`, Math.max(0.5, currentWeight - 0.1));
      }
    });
    
    console.log('Route pattern analysis:', {
      totalRoutes: this.routeFeedback.length,
      recentAcceptanceRate: acceptanceRate,
      patterns: Object.keys(preferencePatterns).length
    });
  }

  // Group route feedback by preference patterns
  private groupRouteFeedbackByPreferences(feedback: RouteFeedback[]): Record<string, RouteFeedback[]> {
    const groups: Record<string, RouteFeedback[]> = {};
    
    feedback.forEach(item => {
      const key = this.generatePreferenceKey(item.preferences);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    
    return groups;
  }

  // Calculate updated quality score based on feedback
  private calculateUpdatedQualityScore(trainingPoint: TrainingDataPoint): number {
    if (trainingPoint.feedback.length === 0) return trainingPoint.qualityScore;
    
    const avgFeedbackRating = trainingPoint.feedback.reduce((sum, f) => sum + f.rating, 0) / trainingPoint.feedback.length;
    const feedbackScore = (avgFeedbackRating - 1) / 4; // Convert 1-5 to 0-1
    
    // Weighted average of original score and feedback
    return (trainingPoint.qualityScore * 0.3) + (feedbackScore * 0.7);
  }

  // Update global interaction patterns
  private async updateGlobalPatterns(pattern: InteractionPattern): Promise<void> {
    const globalPatterns = this.interactionPatterns.get('global') || [];
    
    const existingPattern = globalPatterns.find(p => p.action === pattern.action);
    
    if (existingPattern) {
      existingPattern.frequency += 1;
      existingPattern.timeSpent = (existingPattern.timeSpent + pattern.timeSpent) / 2;
      existingPattern.success = (existingPattern.success && pattern.success) || 
                               (!existingPattern.success && pattern.success);
    } else {
      globalPatterns.push({ ...pattern, frequency: 1 });
    }
    
    this.interactionPatterns.set('global', globalPatterns);
  }

  // Initialize model weights
  private initializeModelWeights(): void {
    // Set default weights for different preference patterns
    const defaultWeights = [
      'culture,history|moderate|100-200',
      'beach,water|relaxed|80-150',
      'nature,hiking|active|70-120',
      'food,wine|moderate|120-250'
    ];
    
    defaultWeights.forEach(pattern => {
      this.modelWeights.set(pattern, 1.0);
    });
  }

  // Get model performance metrics
  getPerformanceMetrics(): ModelPerformanceMetrics {
    const recentFeedback = this.userFeedback.slice(-50);
    const recentRoutes = this.routeFeedback.slice(-20);
    const recentAnalytics = this.conversationAnalytics.slice(-30);
    
    return {
      accuracy: this.calculateAccuracy(),
      userSatisfaction: recentFeedback.length > 0 ? 
        recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length / 5 : 0,
      responseTime: recentAnalytics.length > 0 ?
        recentAnalytics.reduce((sum, a) => sum + a.averageResponseTime, 0) / recentAnalytics.length : 0,
      completionRate: recentAnalytics.length > 0 ?
        recentAnalytics.filter(a => a.routeAccepted).length / recentAnalytics.length : 0,
      errorRate: recentAnalytics.length > 0 ?
        recentAnalytics.reduce((sum, a) => sum + a.errorCount, 0) / recentAnalytics.length : 0
    };
  }

  // Calculate model accuracy based on feedback
  private calculateAccuracy(): number {
    const recentTraining = this.trainingData.slice(-100);
    if (recentTraining.length === 0) return 0;
    
    const accurateResponses = recentTraining.filter(data => data.qualityScore > 0.7);
    return accurateResponses.length / recentTraining.length;
  }

  // Get improvement recommendations
  getImprovementRecommendations(): string[] {
    const metrics = this.getPerformanceMetrics();
    const recommendations: string[] = [];
    
    if (metrics.userSatisfaction < 0.7) {
      recommendations.push('Improve response personalization based on user preferences');
    }
    
    if (metrics.responseTime > 3000) {
      recommendations.push('Optimize AI model response time');
    }
    
    if (metrics.completionRate < 0.6) {
      recommendations.push('Improve route quality and user engagement');
    }
    
    if (metrics.errorRate > 0.1) {
      recommendations.push('Enhance error handling and fallback strategies');
    }
    
    if (metrics.accuracy < 0.8) {
      recommendations.push('Retrain model with recent high-quality data');
    }
    
    return recommendations;
  }

  // Export training data for external ML processing
  exportTrainingData(): TrainingDataPoint[] {
    return this.trainingData.filter(data => data.qualityScore > 0.6); // Only export quality data
  }

  // Import external training data
  importTrainingData(data: TrainingDataPoint[]): void {
    this.trainingData.push(...data);
    this.persistTrainingData();
  }

  // Persistence methods (localStorage for now, database in production)
  private persistTrainingData(): void {
    try {
      localStorage.setItem('ai_training_data', JSON.stringify(this.trainingData.slice(-500))); // Keep last 500
    } catch (error) {
      console.warn('Failed to persist training data:', error);
    }
  }

  private persistUserFeedback(): void {
    try {
      localStorage.setItem('ai_user_feedback', JSON.stringify(this.userFeedback.slice(-200)));
    } catch (error) {
      console.warn('Failed to persist user feedback:', error);
    }
  }

  private persistRouteFeedback(): void {
    try {
      localStorage.setItem('ai_route_feedback', JSON.stringify(this.routeFeedback.slice(-100)));
    } catch (error) {
      console.warn('Failed to persist route feedback:', error);
    }
  }

  private persistModelWeights(): void {
    try {
      localStorage.setItem('ai_model_weights', JSON.stringify(Array.from(this.modelWeights.entries())));
    } catch (error) {
      console.warn('Failed to persist model weights:', error);
    }
  }

  private loadStoredData(): void {
    try {
      const trainingData = localStorage.getItem('ai_training_data');
      if (trainingData) {
        this.trainingData = JSON.parse(trainingData);
      }

      const userFeedback = localStorage.getItem('ai_user_feedback');
      if (userFeedback) {
        this.userFeedback = JSON.parse(userFeedback);
      }

      const routeFeedback = localStorage.getItem('ai_route_feedback');
      if (routeFeedback) {
        this.routeFeedback = JSON.parse(routeFeedback);
      }

      const modelWeights = localStorage.getItem('ai_model_weights');
      if (modelWeights) {
        this.modelWeights = new Map(JSON.parse(modelWeights));
      }
    } catch (error) {
      console.warn('Failed to load stored data:', error);
    }
  }

  // Public method to update model weights (called from AI context)
  async updateModelWeights(feedback: UserFeedback): Promise<void> {
    await this.learnFromFeedback(feedback);
  }

  // Get model weights for external use
  getModelWeights(): Map<string, number> {
    return new Map(this.modelWeights);
  }

  // Reset all data (for testing/development)
  reset(): void {
    this.trainingData = [];
    this.userFeedback = [];
    this.routeFeedback = [];
    this.conversationAnalytics = [];
    this.interactionPatterns.clear();
    this.modelWeights.clear();
    this.initializeModelWeights();
    
    // Clear localStorage
    localStorage.removeItem('ai_training_data');
    localStorage.removeItem('ai_user_feedback');
    localStorage.removeItem('ai_route_feedback');
    localStorage.removeItem('ai_model_weights');
  }
}

export const analyticsService = new AnalyticsService();