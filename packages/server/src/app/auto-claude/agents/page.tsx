import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import AgentsList from './components/AgentsList';

export const dynamic = 'force-dynamic';

export default function AgentsPage() {
  return (
    <>
      <Header
        title="Agent Configurations"
        description="Manage Auto-Claude agent types with tool and MCP server configurations"
        actions={
          <Link href="/auto-claude/agents/new">
            <Button>
              New Agent Config
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <AgentsList />
      </div>
    </>
  );
}