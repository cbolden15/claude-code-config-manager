/**
 * CCM Simplified Types - Smart Recommendations Core
 *
 * Philosophy: OBSERVE → ANALYZE → RECOMMEND → APPLY → MEASURE → AUTOMATE
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

/**
 * Recommendation categories
 */
export const RecommendationCategory = {
  MCP_SERVER: 'mcp_server',
  SKILL: 'skill',
  HOOK: 'hook',
  PERMISSION: 'permission',
  CONTEXT: 'context',
  WORKFLOW: 'workflow',
} as const;

export type RecommendationCategory = (typeof RecommendationCategory)[keyof typeof RecommendationCategory];

/**
 * Recommendation priorities
 */
export const RecommendationPriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type RecommendationPriority = (typeof RecommendationPriority)[keyof typeof RecommendationPriority];

/**
 * Recommendation status
 */
export const RecommendationStatus = {
  ACTIVE: 'active',
  APPLIED: 'applied',
  DISMISSED: 'dismissed',
  EXPIRED: 'expired',
} as const;

export type RecommendationStatus = (typeof RecommendationStatus)[keyof typeof RecommendationStatus];

/**
 * Config types for applied configurations
 */
export const ConfigType = {
  MCP_SERVER: 'mcp_server',
  HOOK: 'hook',
  PERMISSION: 'permission',
  SKILL: 'skill',
  CONTEXT_RULE: 'context_rule',
} as const;

export type ConfigType = (typeof ConfigType)[keyof typeof ConfigType];

/**
 * Schedule types
 */
export const ScheduleType = {
  CRON: 'cron',
  INTERVAL: 'interval',
  THRESHOLD: 'threshold',
} as const;

export type ScheduleType = (typeof ScheduleType)[keyof typeof ScheduleType];

/**
 * Task types
 */
export const TaskType = {
  ANALYZE_CONTEXT: 'analyze_context',
  GENERATE_RECOMMENDATIONS: 'generate_recommendations',
  HEALTH_CHECK: 'health_check',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

/**
 * Execution status
 */
export const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

/**
 * Health trend
 */
export const HealthTrend = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DECLINING: 'declining',
} as const;

export type HealthTrend = (typeof HealthTrend)[keyof typeof HealthTrend];

/**
 * Applied config source
 */
export const ConfigSource = {
  RECOMMENDATION: 'recommendation',
  MANUAL: 'manual',
  IMPORTED: 'imported',
} as const;

export type ConfigSource = (typeof ConfigSource)[keyof typeof ConfigSource];

// =============================================================================
// CORE: Machine & Project Identity
// =============================================================================

/**
 * Machine - represents a computer running Claude Code
 */
export interface Machine {
  id: string;
  name: string;
  hostname?: string;
  platform: string;
  arch?: string;
  homeDir?: string;
  lastSeen: Date;
  isCurrentMachine: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MachineCreate {
  name: string;
  hostname?: string;
  platform: string;
  arch?: string;
  homeDir?: string;
}

export interface MachineUpdate {
  name?: string;
  hostname?: string;
  platform?: string;
  arch?: string;
  homeDir?: string;
}

/**
 * Project - auto-discovered from sessions
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  machineId: string;
  detectedTechs?: string[];
  detectedPatterns?: string[];
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreate {
  name: string;
  path: string;
  machineId: string;
}

// =============================================================================
// OBSERVE: Session Tracking
// =============================================================================

/**
 * Session - tracks Claude Code usage
 */
export interface Session {
  id: string;
  machineId: string;
  sessionId: string;
  projectPath?: string;
  projectName?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  toolsUsed: string[];
  commandsRun: string[];
  filesAccessed: string[];
  errors: string[];
  tokensUsed: number;
  contextTokens: number;
  detectedTechs: string[];
  detectedPatterns: string[];
}

export interface SessionCreate {
  machineId: string;
  sessionId: string;
  projectPath?: string;
  projectName?: string;
  toolsUsed?: string[];
  commandsRun?: string[];
  filesAccessed?: string[];
  errors?: string[];
  tokensUsed?: number;
  contextTokens?: number;
  detectedTechs?: string[];
  detectedPatterns?: string[];
}

export interface SessionUpdate {
  endedAt?: Date;
  duration?: number;
  toolsUsed?: string[];
  commandsRun?: string[];
  filesAccessed?: string[];
  errors?: string[];
  tokensUsed?: number;
  contextTokens?: number;
  detectedTechs?: string[];
  detectedPatterns?: string[];
}

// =============================================================================
// ANALYZE: Pattern Detection
// =============================================================================

/**
 * Pattern - aggregated usage patterns
 */
export interface Pattern {
  id: string;
  machineId: string;
  type: string;
  occurrences: number;
  firstSeen: Date;
  lastSeen: Date;
  avgPerWeek: number;
  projectPaths: string[];
  technologies: string[];
  exampleCommand?: string;
  confidence: number;
  hasRecommendation: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// RECOMMEND: Smart Recommendations
// =============================================================================

/**
 * Evidence for a recommendation
 */
export interface RecommendationEvidence {
  patterns: string[];
  occurrences: number;
  projects: string[];
  examples?: string[];
}

/**
 * Recommendation - unified model for all recommendation types
 */
export interface Recommendation {
  id: string;
  machineId: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  priority: RecommendationPriority;
  evidence: RecommendationEvidence;
  estimatedTokenSavings: number;
  estimatedTimeSavings: number;
  confidenceScore: number;
  configType: ConfigType;
  configData: Record<string, unknown>;
  status: RecommendationStatus;
  appliedAt?: Date;
  dismissedAt?: Date;
  dismissReason?: string;
  wasHelpful?: boolean;
  actualSavings?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendationCreate {
  machineId: string;
  category: RecommendationCategory;
  title: string;
  description: string;
  priority: RecommendationPriority;
  evidence: RecommendationEvidence;
  estimatedTokenSavings?: number;
  estimatedTimeSavings?: number;
  confidenceScore?: number;
  configType: ConfigType;
  configData: Record<string, unknown>;
}

export interface RecommendationUpdate {
  status?: RecommendationStatus;
  dismissReason?: string;
  wasHelpful?: boolean;
  actualSavings?: number;
}

export interface RecommendationFilters {
  machineId?: string;
  category?: RecommendationCategory;
  priority?: RecommendationPriority;
  status?: RecommendationStatus;
}

export interface RecommendationsListResponse {
  recommendations: Recommendation[];
  total: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
}

// =============================================================================
// MEASURE: Health & Impact
// =============================================================================

/**
 * HealthScore - overall optimization metrics
 */
export interface HealthScore {
  id: string;
  machineId: string;
  score: number;
  mcpScore: number;
  contextScore: number;
  patternScore: number;
  skillScore: number;
  activeRecommendations: number;
  appliedRecommendations: number;
  dismissedRecommendations: number;
  previousScore?: number;
  trend: HealthTrend;
  estimatedMonthlyWaste: number;
  estimatedMonthlySavings: number;
  timestamp: Date;
}

export interface HealthScoreResponse {
  current: HealthScore;
  history: HealthScore[];
}

// =============================================================================
// CONTEXT: CLAUDE.md Optimization
// =============================================================================

/**
 * Section analysis within a context file
 */
export interface ContextSection {
  name: string;
  lines: number;
  tokens: number;
  type: 'active' | 'historical' | 'reference' | 'unknown';
  startLine: number;
  endLine: number;
}

/**
 * Issue detected in context file
 */
export interface ContextIssue {
  type: 'bloat' | 'outdated' | 'duplicate' | 'verbose';
  severity: 'high' | 'medium' | 'low';
  description: string;
  section?: string;
  suggestedAction?: string;
}

/**
 * ContextAnalysis - analysis results for CLAUDE.md
 */
export interface ContextAnalysis {
  id: string;
  machineId: string;
  projectPath: string;
  filePath: string;
  totalLines: number;
  totalTokens: number;
  sections: ContextSection[];
  issues: ContextIssue[];
  currentScore: number;
  potentialScore: number;
  estimatedSavings: number;
  status: 'analyzed' | 'optimized';
  analyzedAt: Date;
}

export interface ContextAnalysisRequest {
  machineId: string;
  projectPath: string;
  filePath?: string;
}

/**
 * ContextArchive - archived content from optimization
 */
export interface ContextArchive {
  id: string;
  machineId: string;
  projectPath: string;
  sourceFile: string;
  sectionName: string;
  reason: string;
  originalTokens: number;
  summaryTokens: number;
  archivedContent: string;
  summaryContent: string;
  archivePath: string;
  archivedAt: Date;
}

// =============================================================================
// AUTOMATE: Scheduled Tasks
// =============================================================================

/**
 * ScheduledTask - automation configuration
 */
export interface ScheduledTask {
  id: string;
  machineId?: string;
  name: string;
  description?: string;
  taskType: TaskType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalHours?: number;
  thresholdMetric?: string;
  thresholdValue?: number;
  thresholdOp?: 'lt' | 'gt';
  taskConfig: Record<string, unknown>;
  enabled: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScheduledTaskCreate {
  machineId?: string;
  name: string;
  description?: string;
  taskType: TaskType;
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalHours?: number;
  thresholdMetric?: string;
  thresholdValue?: number;
  thresholdOp?: 'lt' | 'gt';
  taskConfig?: Record<string, unknown>;
  enabled?: boolean;
}

export interface ScheduledTaskUpdate {
  name?: string;
  description?: string;
  cronExpression?: string;
  intervalHours?: number;
  thresholdMetric?: string;
  thresholdValue?: number;
  thresholdOp?: 'lt' | 'gt';
  taskConfig?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * TaskExecution - execution history
 */
export interface TaskExecution {
  id: string;
  taskId: string;
  status: ExecutionStatus;
  triggerType: 'scheduled' | 'threshold' | 'manual';
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  result?: Record<string, unknown>;
  error?: string;
}

export interface TaskExecutionFilters {
  taskId?: string;
  status?: ExecutionStatus;
  triggerType?: string;
}

// =============================================================================
// APPLIED CONFIGS: What's Currently Active
// =============================================================================

/**
 * AppliedConfig - active configurations from recommendations
 */
export interface AppliedConfig {
  id: string;
  machineId: string;
  configType: ConfigType;
  configName: string;
  configData: Record<string, unknown>;
  recommendationId?: string;
  source: ConfigSource;
  enabled: boolean;
  appliedAt: Date;
  usageCount: number;
  lastUsedAt?: Date;
  tokensSaved: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppliedConfigCreate {
  machineId: string;
  configType: ConfigType;
  configName: string;
  configData: Record<string, unknown>;
  recommendationId?: string;
  source: ConfigSource;
}

export interface AppliedConfigUpdate {
  configData?: Record<string, unknown>;
  enabled?: boolean;
}

export interface AppliedConfigFilters {
  machineId?: string;
  configType?: ConfigType;
  source?: ConfigSource;
  enabled?: boolean;
}

// =============================================================================
// API RESPONSES
// =============================================================================

/**
 * Generic API error
 */
export interface ApiError {
  error: string;
  details?: unknown;
}

/**
 * Dashboard response
 */
export interface DashboardResponse {
  healthScore: HealthScore;
  topRecommendations: Recommendation[];
  recentSessions: Session[];
  activePatterns: Pattern[];
  appliedConfigs: AppliedConfig[];
}

/**
 * Projects list response
 */
export interface ProjectsListResponse {
  projects: Project[];
  total: number;
}

/**
 * Patterns list response
 */
export interface PatternsListResponse {
  patterns: Pattern[];
  total: number;
}
