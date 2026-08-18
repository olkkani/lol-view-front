import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TeamFollowScreen } from '@/features/teams/components/TeamFollowScreen';

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});

function TeamsPage() {
  const navigate = useNavigate();
  return <TeamFollowScreen onBack={() => navigate({ to: '/' })} />;
}
