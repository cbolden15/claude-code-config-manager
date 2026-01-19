import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import ProfilesList from './components/ProfilesList';

export const dynamic = 'force-dynamic';

export default function ProfilesPage() {
  return (
    <>
      <Header
        title="Model Profiles"
        description="Manage Auto-Claude model profiles with phase-by-phase configuration and cost estimation"
        actions={
          <Link href="/auto-claude/profiles/new">
            <Button>
              New Model Profile
            </Button>
          </Link>
        }
      />
      <div className="p-6">
        <ProfilesList />
      </div>
    </>
  );
}