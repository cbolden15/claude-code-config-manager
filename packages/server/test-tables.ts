import { PrismaClient } from '@prisma/client';
import { getMachineInfo } from './src/lib/paths.js';

const prisma = new PrismaClient();

async function createTestRecords() {
  console.log('=== Creating Test Records in New v2.0 Tables ===\n');

  try {
    // Clean up any existing test records
    console.log('0. Cleaning up existing test records...');
    await prisma.syncState.deleteMany({});
    await prisma.syncLog.deleteMany({});
    await prisma.claudeDesktopPlugin.deleteMany({});
    await prisma.claudeDesktopMcp.deleteMany({});
    await prisma.globalEnvVar.deleteMany({});
    await prisma.globalPermission.deleteMany({});
    await prisma.globalHook.deleteMany({});
    await prisma.machineOverride.deleteMany({});
    await prisma.machine.deleteMany({});
    console.log('   ✅ Cleaned up existing records\n');

    // 1. Create Machine record
    console.log('1. Creating Machine record...');
    const machineInfo = getMachineInfo();
    const machine = await prisma.machine.create({
      data: {
        name: machineInfo.hostname,
        hostname: machineInfo.hostname,
        platform: machineInfo.platform,
        arch: machineInfo.arch,
        homeDir: machineInfo.homeDir,
        isCurrentMachine: true,
        syncEnabled: true
      }
    });
    console.log('   ✅ Machine created:', machine.id, '\n');

    // 2. Create MachineOverride record
    console.log('2. Creating MachineOverride record...');
    const override = await prisma.machineOverride.create({
      data: {
        machineId: machine.id,
        configType: 'hook',
        configKey: 'test-hook',
        action: 'disable',
        reason: 'Test override'
      }
    });
    console.log('   ✅ MachineOverride created:', override.id, '\n');

    // 3. Create GlobalHook record
    console.log('3. Creating GlobalHook record...');
    const hook = await prisma.globalHook.create({
      data: {
        hookType: 'PreToolUse',
        matcher: 'Write',
        command: 'echo "Test hook"',
        description: 'Test hook for verification',
        enabled: true,
        category: 'testing'
      }
    });
    console.log('   ✅ GlobalHook created:', hook.id, '\n');

    // 4. Create GlobalPermission record
    console.log('4. Creating GlobalPermission record...');
    const permission = await prisma.globalPermission.create({
      data: {
        permission: 'Bash(ls:*)',
        action: 'allow',
        description: 'Test permission',
        enabled: true,
        category: 'filesystem'
      }
    });
    console.log('   ✅ GlobalPermission created:', permission.id, '\n');

    // 5. Create GlobalEnvVar record
    console.log('5. Creating GlobalEnvVar record...');
    const envVar = await prisma.globalEnvVar.create({
      data: {
        key: 'TEST_VAR',
        value: 'test_value',
        scope: 'all',
        encrypted: false,
        sensitive: false,
        category: 'testing'
      }
    });
    console.log('   ✅ GlobalEnvVar created:', envVar.id, '\n');

    // 6. Create ClaudeDesktopMcp record (need a Component first)
    console.log('6. Creating ClaudeDesktopMcp record...');
    let component = await prisma.component.findFirst();
    if (!component) {
      console.log('   ⚠️  No component found, creating one first...');
      component = await prisma.component.create({
        data: {
          type: 'MCP_SERVER',
          name: 'test-mcp',
          description: 'Test MCP server',
          config: JSON.stringify({ command: 'node', args: ['server.js'] }),
          enabled: true,
          tags: 'test'
        }
      });
      console.log('   ✅ Component created:', component.id);
    }

    const desktopMcp = await prisma.claudeDesktopMcp.create({
      data: {
        componentId: component.id,
        enabled: true
      }
    });
    console.log('   ✅ ClaudeDesktopMcp created:', desktopMcp.id, '\n');

    // 7. Create ClaudeDesktopPlugin record
    console.log('7. Creating ClaudeDesktopPlugin record...');
    const plugin = await prisma.claudeDesktopPlugin.create({
      data: {
        pluginId: 'test-plugin@test',
        enabled: true,
        config: JSON.stringify({ enabled: true })
      }
    });
    console.log('   ✅ ClaudeDesktopPlugin created:', plugin.id, '\n');

    // 8. Create SyncLog record
    console.log('8. Creating SyncLog record...');
    const syncLog = await prisma.syncLog.create({
      data: {
        machineId: machine.id,
        syncType: 'full',
        status: 'completed',
        filesCreated: 1,
        filesUpdated: 0,
        filesDeleted: 0,
        filesSkipped: 0,
        startedAt: new Date(),
        completedAt: new Date()
      }
    });
    console.log('   ✅ SyncLog created:', syncLog.id, '\n');

    // 9. Create SyncState record
    console.log('9. Creating SyncState record...');
    const syncState = await prisma.syncState.create({
      data: {
        machineId: machine.id,
        configType: 'hook',
        configId: hook.id,
        localHash: 'abc123',
        serverHash: 'abc123',
        syncStatus: 'synced',
        lastSyncedAt: new Date()
      }
    });
    console.log('   ✅ SyncState created:', syncState.id, '\n');

    console.log('✅ All test records created successfully!');
    console.log('\n=== Summary ===');
    console.log('9 new v2.0 tables tested');
    console.log('All tables are accessible and working correctly');

  } catch (error) {
    console.error('❌ Error creating test records:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestRecords();
