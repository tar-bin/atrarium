import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PDSLoginForm } from '@/components/pds/PDSLoginForm';
import { usePDS } from '@/contexts/PDSContext';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { session } = usePDS();
  const pdsUrl = import.meta.env.VITE_PDS_URL || 'http://localhost:3000';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Welcome to Atrarium Dashboard</CardTitle>
          <CardDescription>
            Manage your communities, feeds, and moderation in one place
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Atrarium is a community management system built on AT Protocol (Bluesky).
            Create communities, organize themed feeds, and moderate content from this dashboard.
          </p>
          <div className="flex gap-4">
            <Link to="/communities">
              <Button>Browse Communities</Button>
            </Link>
            <Link to="/moderation">
              <Button variant="outline">View Moderation Log</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* PDS Login section */}
      {!session.isAuthenticated ? (
        <div className="flex justify-center">
          <PDSLoginForm pdsUrl={pdsUrl} />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You are logged in as <span className="font-medium">{session.handle}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
