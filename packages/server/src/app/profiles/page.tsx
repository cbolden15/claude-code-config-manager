import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ProfilesClient } from './components/ProfilesClient';

async function getProfiles() {
  return prisma.profile.findMany({
    include: {
      components: {
        include: { component: { select: { type: true } } },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  });
}

export default async function ProfilesPage() {
  const profiles = await getProfiles();

  return (
    <>
      <Header
        title="Profiles"
        description="Manage component bundles for different project types"
        actions={
          <Link href="/profiles/new">
            <Button>New Profile</Button>
          </Link>
        }
      />

      <div className="p-6">
        <ProfilesClient profiles={profiles} />
      </div>
    </>
  );
}
