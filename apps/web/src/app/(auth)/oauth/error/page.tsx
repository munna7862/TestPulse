import Link from "next/link";
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@testpulse/ui";
import { oauthErrorContent, parseOAuthErrorParams } from "@/lib/oauth";

export const metadata = { title: "Sign-in problem · TestPulse" };

interface OAuthErrorPageProps {
  searchParams: Promise<{ code?: string | string[]; provider?: string | string[] }>;
}

/** Landing page for failed OAuth sign-in/link attempts. The API redirects here with opaque `code`/`provider`. */
export default async function OAuthErrorPage({ searchParams }: OAuthErrorPageProps) {
  const { code, provider } = parseOAuthErrorParams(await searchParams);
  const content = oauthErrorContent(code, provider);

  return (
    <Card className="shadow-lg border-surface-border">
      <CardHeader className="text-center space-y-2">
        <div
          aria-hidden="true"
          className="mx-auto w-12 h-12 rounded-full bg-status-failed-bg text-status-failed flex items-center justify-center text-xl font-bold"
        >
          !
        </div>
        <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
          {content.title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div
          role="alert"
          className="p-3 text-sm rounded-md bg-status-failed-bg text-status-failed border border-status-failed/20"
        >
          {content.message}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <Button className="w-full" asChild>
          <Link href="/login">Back to sign in</Link>
        </Button>
        {content.secondary && (
          <Button variant="outline" className="w-full" asChild>
            <Link href={content.secondary.href}>{content.secondary.label}</Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
