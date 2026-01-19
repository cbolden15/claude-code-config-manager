import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getMachineInfo } from '@/lib/paths';

/**
 * GET /api/machines/current
 * Get or auto-register current machine
 */
export async function GET(request: NextRequest) {
  try {
    // Get current machine info
    const machineInfo = getMachineInfo();

    // Look for machine with matching hostname
    let machine = await prisma.machine.findFirst({
      where: {
        OR: [
          { hostname: machineInfo.hostname },
          { name: machineInfo.hostname }
        ]
      },
      include: {
        projects: {
          orderBy: { lastActiveAt: 'desc' },
          take: 5
        },
        healthScores: {
          orderBy: { timestamp: 'desc' },
          take: 1
        },
        _count: {
          select: {
            projects: true,
            sessions: true,
            recommendations: true,
            appliedConfigs: true
          }
        }
      }
    });

    if (machine) {
      // Update lastSeen
      machine = await prisma.machine.update({
        where: { id: machine.id },
        data: { lastSeen: new Date() },
        include: {
          projects: {
            orderBy: { lastActiveAt: 'desc' },
            take: 5
          },
          healthScores: {
            orderBy: { timestamp: 'desc' },
            take: 1
          },
          _count: {
            select: {
              projects: true,
              sessions: true,
              recommendations: true,
              appliedConfigs: true
            }
          }
        }
      });

      return NextResponse.json({
        ...machine,
        latestHealthScore: machine.healthScores[0] || null,
        healthScores: undefined
      });
    }

    // Auto-register new machine
    // Unset any existing current machines
    await prisma.machine.updateMany({
      where: { isCurrentMachine: true },
      data: { isCurrentMachine: false }
    });

    // Create new machine
    machine = await prisma.machine.create({
      data: {
        name: machineInfo.hostname,
        hostname: machineInfo.hostname,
        platform: machineInfo.platform,
        arch: machineInfo.arch,
        homeDir: machineInfo.homeDir,
        isCurrentMachine: true
      },
      include: {
        projects: true,
        healthScores: true,
        _count: {
          select: {
            projects: true,
            sessions: true,
            recommendations: true,
            appliedConfigs: true
          }
        }
      }
    });

    return NextResponse.json({
      ...machine,
      latestHealthScore: null,
      healthScores: undefined
    }, { status: 201 });
  } catch (error) {
    console.error('[GET /api/machines/current]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
