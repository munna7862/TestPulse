import { OAuthProviderSchema } from "@testpulse/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@testpulse/ui";
import { LinkedAccounts } from "@/components/LinkedAccounts";

export const metadata = { title: "Profile settings · TestPulse" };

interface ProfileSettingsPageProps {
  searchParams: Promise<{ linked?: string | string[] }>;
}

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const { linked } = await searchParams;
  const justLinked = OAuthProviderSchema.safeParse(Array.isArray(linked) ? linked[0] : linked);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile settings</h1>
        <p className="text-sm text-muted-foreground">Manage how you sign in to TestPulse.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2" className="text-lg">
            Linked accounts
          </CardTitle>
          <CardDescription>Sign in with Google or GitHub in addition to your email and password.</CardDescription>
        </CardHeader>
        <CardContent>
          <LinkedAccounts justLinked={justLinked.success ? justLinked.data : undefined} />
        </CardContent>
      </Card>
    </div>
  );
}
