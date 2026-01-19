/**
 * CCM Simplified Validation Schemas
 *
 * Zod schemas for validating API requests and data
 */

import { z } from 'zod';

// =============================================================================
// ENUMS
// =============================================================================

export const RecommendationCategorySchema = z.enum([
  'mcp_server',
  'skill',
  'hook',
  'permission',
  'context',
  'workflow',
]);

export const RecommendationPrioritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);

export const RecommendationStatusSchema = z.enum([
  'active',
  'applied',
  'dismissed',
  'expired',
]);

export const ConfigTypeSchema = z.enum([
  'mcp_server',
  'hook',
  'permission',
  'skill',
  'context_rule',
]);

export const ScheduleTypeSchema = z.enum(['cron', 'interval', 'threshold']);

export const TaskTypeSchema = z.enum([
  'analyze_context',
  'generate_recommendations',
  'health_check',
]);

export const ExecutionStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
]);

export const HealthTrendSchema = z.enum(['improving', 'stable', 'declining']);

export const ConfigSourceSchema = z.enum(['recommendation', 'manual', 'imported']);

// =============================================================================
// MACHINE SCHEMAS
// =============================================================================

export const MachineCreateSchema = z.object({
  name: z.string().min(1),
  hostname: z.string().optional(),
  platform: z.string().min(1),
  arch: z.string().optional(),
  homeDir: z.string().optional(),
});

export const MachineUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  hostname: z.string().optional(),
  platform: z.string().min(1).optional(),
  arch: z.string().optional(),
  homeDir: z.string().optional(),
});

// =============================================================================
// PROJECT SCHEMAS
// =============================================================================

export const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  path: z.string().min(1),
  machineId: z.string().min(1),
});

// =============================================================================
// SESSION SCHEMAS
// =============================================================================

export const SessionCreateSchema = z.object({
  machineId: z.string().min(1),
  sessionId: z.string().min(1),
  projectPath: z.string().optional(),
  projectName: z.string().optional(),
  toolsUsed: z.array(z.string()).optional(),
  commandsRun: z.array(z.string()).optional(),
  filesAccessed: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  tokensUsed: z.number().int().min(0).optional(),
  contextTokens: z.number().int().min(0).optional(),
  detectedTechs: z.array(z.string()).optional(),
  detectedPatterns: z.array(z.string()).optional(),
});

export const SessionUpdateSchema = z.object({
  endedAt: z.coerce.date().optional(),
  duration: z.number().int().min(0).optional(),
  toolsUsed: z.array(z.string()).optional(),
  commandsRun: z.array(z.string()).optional(),
  filesAccessed: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  tokensUsed: z.number().int().min(0).optional(),
  contextTokens: z.number().int().min(0).optional(),
  detectedTechs: z.array(z.string()).optional(),
  detectedPatterns: z.array(z.string()).optional(),
});

// =============================================================================
// RECOMMENDATION SCHEMAS
// =============================================================================

export const RecommendationEvidenceSchema = z.object({
  patterns: z.array(z.string()),
  occurrences: z.number().int().min(0),
  projects: z.array(z.string()),
  examples: z.array(z.string()).optional(),
});

export const RecommendationCreateSchema = z.object({
  machineId: z.string().min(1),
  category: RecommendationCategorySchema,
  title: z.string().min(1),
  description: z.string().min(1),
  priority: RecommendationPrioritySchema,
  evidence: RecommendationEvidenceSchema,
  estimatedTokenSavings: z.number().int().min(0).optional(),
  estimatedTimeSavings: z.number().int().min(0).optional(),
  confidenceScore: z.number().min(0).max(1).optional(),
  configType: ConfigTypeSchema,
  configData: z.record(z.unknown()),
});

export const RecommendationUpdateSchema = z.object({
  status: RecommendationStatusSchema.optional(),
  dismissReason: z.string().optional(),
  wasHelpful: z.boolean().optional(),
  actualSavings: z.number().int().min(0).optional(),
});

export const RecommendationFiltersSchema = z.object({
  machineId: z.string().optional(),
  category: RecommendationCategorySchema.optional(),
  priority: RecommendationPrioritySchema.optional(),
  status: RecommendationStatusSchema.optional(),
});

// =============================================================================
// CONTEXT SCHEMAS
// =============================================================================

export const ContextAnalysisRequestSchema = z.object({
  machineId: z.string().min(1),
  projectPath: z.string().min(1),
  filePath: z.string().optional(),
});

// =============================================================================
// SCHEDULED TASK SCHEMAS
// =============================================================================

export const ScheduledTaskCreateSchema = z.object({
  machineId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  taskType: TaskTypeSchema,
  scheduleType: ScheduleTypeSchema,
  cronExpression: z.string().optional(),
  intervalHours: z.number().int().min(1).optional(),
  thresholdMetric: z.string().optional(),
  thresholdValue: z.number().int().optional(),
  thresholdOp: z.enum(['lt', 'gt']).optional(),
  taskConfig: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const ScheduledTaskUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cronExpression: z.string().optional(),
  intervalHours: z.number().int().min(1).optional(),
  thresholdMetric: z.string().optional(),
  thresholdValue: z.number().int().optional(),
  thresholdOp: z.enum(['lt', 'gt']).optional(),
  taskConfig: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

// =============================================================================
// APPLIED CONFIG SCHEMAS
// =============================================================================

export const AppliedConfigCreateSchema = z.object({
  machineId: z.string().min(1),
  configType: ConfigTypeSchema,
  configName: z.string().min(1),
  configData: z.record(z.unknown()),
  recommendationId: z.string().optional(),
  source: ConfigSourceSchema,
});

export const AppliedConfigUpdateSchema = z.object({
  configData: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
});

export const AppliedConfigFiltersSchema = z.object({
  machineId: z.string().optional(),
  configType: ConfigTypeSchema.optional(),
  source: ConfigSourceSchema.optional(),
  enabled: z.boolean().optional(),
});

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type MachineCreateSchemaType = z.infer<typeof MachineCreateSchema>;
export type MachineUpdateSchemaType = z.infer<typeof MachineUpdateSchema>;
export type ProjectCreateSchemaType = z.infer<typeof ProjectCreateSchema>;
export type SessionCreateSchemaType = z.infer<typeof SessionCreateSchema>;
export type SessionUpdateSchemaType = z.infer<typeof SessionUpdateSchema>;
export type RecommendationCreateSchemaType = z.infer<typeof RecommendationCreateSchema>;
export type RecommendationUpdateSchemaType = z.infer<typeof RecommendationUpdateSchema>;
export type RecommendationFiltersSchemaType = z.infer<typeof RecommendationFiltersSchema>;
export type ContextAnalysisRequestSchemaType = z.infer<typeof ContextAnalysisRequestSchema>;
export type ScheduledTaskCreateSchemaType = z.infer<typeof ScheduledTaskCreateSchema>;
export type ScheduledTaskUpdateSchemaType = z.infer<typeof ScheduledTaskUpdateSchema>;
export type AppliedConfigCreateSchemaType = z.infer<typeof AppliedConfigCreateSchema>;
export type AppliedConfigUpdateSchemaType = z.infer<typeof AppliedConfigUpdateSchema>;
export type AppliedConfigFiltersSchemaType = z.infer<typeof AppliedConfigFiltersSchema>;
