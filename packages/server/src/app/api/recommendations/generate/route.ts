import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

/**
 * POST /api/recommendations/generate
 * Analyze usage patterns and generate smart recommendations
 *
 * This endpoint:
 * 1. Fetches session data and patterns for the machine
 * 2. Detects patterns across sessions
 * 3. Generates MCP server and skill recommendations
 * 4. Saves recommendations to database
 */

const GenerateSchema = z.object({
  machineId: z.string().min(1),
  daysBack: z.number().int().min(1).max(365).default(30),
  forceRefresh: z.boolean().default(false)
});

// MCP server recommendations based on detected patterns
const MCP_RECOMMENDATIONS = [
  {
    pattern: 'ssh_database_query',
    tech: 'postgresql',
    item: 'PostgreSQL MCP',
    category: 'database',
    title: 'Enable Direct PostgreSQL Access',
    descriptionTemplate: 'You query PostgreSQL {count} times via SSH in {days} days. PostgreSQL MCP provides direct database access without SSH overhead.',
    timeSavings: 30,
    tokenSavings: 100,
    minOccurrences: 5,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres'],
      env: {
        POSTGRES_CONNECTION_STRING: 'postgresql://user:password@host:5432/database'
      }
    }
  },
  {
    pattern: 'git_workflow',
    tech: 'git',
    item: 'GitHub MCP',
    category: 'cicd',
    title: 'Improve Git Workflow Management',
    descriptionTemplate: 'You use git commands {count} times in {days} days. GitHub MCP provides better PR management and issue tracking.',
    timeSavings: 20,
    tokenSavings: 50,
    minOccurrences: 10,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '<YOUR_TOKEN>'
      }
    }
  },
  {
    pattern: 'n8n_workflow_management',
    tech: 'n8n',
    item: 'n8n MCP',
    category: 'automation',
    title: 'Direct n8n Workflow Management',
    descriptionTemplate: 'You manage n8n workflows {count} times in {days} days. n8n MCP provides direct API access.',
    timeSavings: 40,
    tokenSavings: 120,
    minOccurrences: 5,
    configTemplate: {
      url: 'https://your-n8n-host/mcp-server/http',
      type: 'streamable-http'
    }
  },
  {
    pattern: 'docker_management',
    tech: 'docker',
    item: 'Docker MCP',
    category: 'infrastructure',
    title: 'Streamline Container Management',
    descriptionTemplate: 'You manage Docker containers {count} times in {days} days. Docker MCP simplifies container operations.',
    timeSavings: 15,
    tokenSavings: 40,
    minOccurrences: 5,
    configTemplate: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-docker']
    }
  }
];

// Skill recommendations based on patterns
const SKILL_RECOMMENDATIONS = [
  {
    pattern: 'ssh_database_query',
    item: 'homelab-database-query',
    category: 'database',
    title: 'One-Command Database Queries',
    descriptionTemplate: 'You query databases {count} times in {days} days. Create a skill to query with one command.',
    timeSavings: 60,
    tokenSavings: 150,
    minOccurrences: 10,
    configTemplate: {
      skillTemplate: 'database-query',
      databases: []
    }
  },
  {
    pattern: 'n8n_workflow_management',
    item: 'n8n-workflow-status',
    category: 'automation',
    title: 'Instant n8n Workflow Overview',
    descriptionTemplate: 'You check n8n workflows {count} times in {days} days. A skill provides instant status.',
    timeSavings: 50,
    tokenSavings: 130,
    minOccurrences: 10,
    configTemplate: {
      skillTemplate: 'n8n-status'
    }
  },
  {
    pattern: 'service_health_check',
    item: 'homelab-service-health',
    category: 'monitoring',
    title: 'Quick Service Health Checks',
    descriptionTemplate: 'You check service status {count} times in {days} days. A health check skill provides instant overview.',
    timeSavings: 45,
    tokenSavings: 120,
    minOccurrences: 8,
    configTemplate: {
      skillTemplate: 'health-check',
      services: []
    }
  },
  {
    pattern: 'git_workflow',
    item: 'git-smart-commit',
    category: 'cicd',
    title: 'Automated Git Workflows',
    descriptionTemplate: 'You run git workflows {count} times in {days} days. A skill can automate commit, push, and PR creation.',
    timeSavings: 35,
    tokenSavings: 90,
    minOccurrences: 15,
    configTemplate: {
      skillTemplate: 'git-workflow',
      features: ['auto-commit', 'pr-creation']
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = GenerateSchema.parse(body);
    const { machineId, daysBack, forceRefresh } = validated;

    // Verify machine exists
    const machine = await prisma.machine.findUnique({
      where: { id: machineId }
    });

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    // Get patterns for this machine
    const patterns = await prisma.pattern.findMany({
      where: {
        machineId,
        lastSeen: { gte: cutoffDate }
      }
    });

    // Get sessions to detect technologies
    const sessions = await prisma.session.findMany({
      where: {
        machineId,
        startedAt: { gte: cutoffDate }
      },
      select: {
        detectedTechs: true
      }
    });

    // Aggregate technologies from sessions
    const techSet = new Set<string>();
    for (const session of sessions) {
      try {
        const techs = JSON.parse(session.detectedTechs) as string[];
        techs.forEach(t => techSet.add(t));
      } catch {
        // Ignore parse errors
      }
    }

    const recommendations: Array<{
      category: string;
      item: string;
      title: string;
      description: string;
      detectedPatterns: string[];
      occurrenceCount: number;
      projectsAffected: string[];
      timeSavings: number;
      tokenSavings: number;
      monthlySavings: number;
      confidenceScore: number;
      priority: string;
      configTemplate: Record<string, unknown>;
    }> = [];

    // Generate MCP recommendations
    for (const mcpRec of MCP_RECOMMENDATIONS) {
      const pattern = patterns.find(p => p.type === mcpRec.pattern);

      if (pattern && pattern.occurrences >= mcpRec.minOccurrences) {
        // Check if recommendation already exists and is not dismissed
        const existing = await prisma.recommendation.findFirst({
          where: {
            machineId,
            title: mcpRec.title,
            status: { not: 'dismissed' }
          }
        });

        if (existing && !forceRefresh) {
          continue; // Skip if already exists
        }

        const projectsAffected = JSON.parse(pattern.projectPaths) as string[];
        const confidence = Math.min(pattern.occurrences / (mcpRec.minOccurrences * 4), 1.0);
        const priority = pattern.occurrences >= mcpRec.minOccurrences * 4 ? 'critical' :
                        pattern.occurrences >= mcpRec.minOccurrences * 2 ? 'high' :
                        'medium';

        const dailyOccurrences = pattern.occurrences / daysBack;
        const monthlySavings = Math.round(dailyOccurrences * mcpRec.tokenSavings * 30);

        const description = mcpRec.descriptionTemplate
          .replace('{count}', pattern.occurrences.toString())
          .replace('{days}', daysBack.toString());

        recommendations.push({
          category: 'mcp_server',
          item: mcpRec.item,
          title: mcpRec.title,
          description,
          detectedPatterns: [mcpRec.pattern],
          occurrenceCount: pattern.occurrences,
          projectsAffected,
          timeSavings: mcpRec.timeSavings,
          tokenSavings: mcpRec.tokenSavings,
          monthlySavings,
          confidenceScore: confidence,
          priority,
          configTemplate: mcpRec.configTemplate
        });
      }
    }

    // Generate skill recommendations
    for (const skillRec of SKILL_RECOMMENDATIONS) {
      const pattern = patterns.find(p => p.type === skillRec.pattern);

      if (pattern && pattern.occurrences >= skillRec.minOccurrences) {
        const existing = await prisma.recommendation.findFirst({
          where: {
            machineId,
            title: skillRec.title,
            status: { not: 'dismissed' }
          }
        });

        if (existing && !forceRefresh) {
          continue;
        }

        const projectsAffected = JSON.parse(pattern.projectPaths) as string[];
        const confidence = Math.min(pattern.occurrences / (skillRec.minOccurrences * 4), 1.0);
        const priority = pattern.occurrences >= skillRec.minOccurrences * 4 ? 'critical' :
                        pattern.occurrences >= skillRec.minOccurrences * 2 ? 'high' :
                        'medium';

        const dailyOccurrences = pattern.occurrences / daysBack;
        const monthlySavings = Math.round(dailyOccurrences * skillRec.tokenSavings * 30);

        const description = skillRec.descriptionTemplate
          .replace('{count}', pattern.occurrences.toString())
          .replace('{days}', daysBack.toString());

        recommendations.push({
          category: 'skill',
          item: skillRec.item,
          title: skillRec.title,
          description,
          detectedPatterns: [skillRec.pattern],
          occurrenceCount: pattern.occurrences,
          projectsAffected,
          timeSavings: skillRec.timeSavings,
          tokenSavings: skillRec.tokenSavings,
          monthlySavings,
          confidenceScore: confidence,
          priority,
          configTemplate: skillRec.configTemplate
        });
      }
    }

    // Save recommendations to database
    const savedRecommendations = [];
    for (const rec of recommendations) {
      const evidence = {
        patterns: rec.detectedPatterns,
        occurrences: rec.occurrenceCount,
        projects: rec.projectsAffected
      };

      const saved = await prisma.recommendation.create({
        data: {
          machineId,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          evidence: JSON.stringify(evidence),
          estimatedTokenSavings: rec.monthlySavings,
          estimatedTimeSavings: rec.timeSavings,
          confidenceScore: rec.confidenceScore,
          configType: rec.category,
          configData: JSON.stringify(rec.configTemplate),
          status: 'active'
        }
      });

      // Mark the pattern as having a recommendation
      for (const patternType of rec.detectedPatterns) {
        await prisma.pattern.updateMany({
          where: {
            machineId,
            type: patternType
          },
          data: {
            hasRecommendation: true
          }
        });
      }

      savedRecommendations.push({
        ...saved,
        detectedPatterns: rec.detectedPatterns,
        projectsAffected: rec.projectsAffected,
        configTemplate: rec.configTemplate
      });
    }

    // Calculate totals
    const totalMonthlySavings = savedRecommendations.reduce((sum, r) => sum + r.estimatedTokenSavings, 0);

    return NextResponse.json({
      success: true,
      count: savedRecommendations.length,
      recommendations: savedRecommendations,
      summary: {
        patternsAnalyzed: patterns.length,
        technologiesDetected: techSet.size,
        mcpRecommendations: savedRecommendations.filter(r => r.category === 'mcp_server').length,
        skillRecommendations: savedRecommendations.filter(r => r.category === 'skill').length,
        totalMonthlySavings,
        periodDays: daysBack
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[POST /api/recommendations/generate]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
