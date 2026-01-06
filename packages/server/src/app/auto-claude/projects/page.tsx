import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProjectsList from './components/ProjectsList';

export const dynamic = 'force-dynamic';

export default function ProjectsPage() {
  return (
    <>
      <Header
        title="Project Settings"
        description="Manage per-project MCP toggles and credential overrides for Auto-Claude integration"
        actions={
          <Link href="/auto-claude/projects/new">
            <Button>
              Configure Project
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <ProjectsList />
      </div>
    </>
  );
}