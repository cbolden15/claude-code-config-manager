import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import PromptsList from './components/PromptsList';

export const dynamic = 'force-dynamic';

export default function PromptsPage() {
  return (
    <>
      <Header
        title="Prompt Editor"
        description="Manage Auto-Claude agent prompts with Monaco editor and live preview"
        actions={
          <Link href="/auto-claude/prompts/new">
            <Button>
              New Prompt
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <PromptsList />
      </div>
    </>
  );
}