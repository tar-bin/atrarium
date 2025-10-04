import { createFileRoute, Link } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
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

      {/* PDS Login section will be added in Phase 3.6 with context */}
    </div>
  );
}
