"use client";

import { useEffect, useRef, useState } from "react";
import type { CreatedApiKey } from "@testpulse/shared";
import { Check, Copy, KeyRound } from "lucide-react";
import {
  Button,
  CodeBlock,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@testpulse/ui";
import {
  apiKeysClient,
  buildExpiresAtIso,
  buildReporterSnippet,
  formatApiKeyError,
  type KeyExpiryPreset,
  type ReporterFramework,
  validateApiKeyName,
} from "@/lib/api-keys";

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onCreated: (created: CreatedApiKey) => void;
}

export function CreateApiKeyDialog({ open, onOpenChange, projectId, projectName, onCreated }: CreateApiKeyDialogProps) {
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<KeyExpiryPreset>("never");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [framework, setFramework] = useState<ReporterFramework>("playwright");
  const sessionSeqRef = useRef(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      sessionSeqRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
    };
  }, [projectId]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen && submitting) return;
    if (!nextOpen) {
      sessionSeqRef.current += 1;
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = null;
      }
      setName("");
      setPreset("never");
      setSubmitting(false);
      setError(null);
      setCreated(null);
      setCopiedKey(false);
      setFramework("playwright");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validateApiKeyName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    const seq = sessionSeqRef.current;
    const targetProjectId = projectId;
    setSubmitting(true);
    setError(null);
    try {
      const expiresAt = buildExpiresAtIso(preset);
      const result = await apiKeysClient.createApiKey(targetProjectId, {
        name: name.trim(),
        ...(expiresAt ? { expiresAt } : {}),
      });
      if (seq !== sessionSeqRef.current) return;
      setCreated(result);
      onCreated(result);
    } catch (err) {
      if (seq !== sessionSeqRef.current) return;
      setError(formatApiKeyError(err, "We couldn't create that API key right now. Please try again."));
    } finally {
      if (seq === sessionSeqRef.current) {
        setSubmitting(false);
      }
    }
  }

  async function handleCopyPlaintext() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.plaintextKey);
      setCopiedKey(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedKey(false), 2000);
    } catch {
      // Clipboard may be unavailable in restricted contexts; user can still select manually.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {created ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Copy your new API key</span>
              </DialogTitle>
              <DialogDescription>
                Store this key securely now — you won&apos;t be able to view this key again once you close this dialog.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 p-3">
              <code className="flex-1 break-all font-mono text-xs text-foreground select-all">
                {created.plaintextKey}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleCopyPlaintext();
                }}
              >
                {copiedKey ? (
                  <>
                    <Check className="mr-1.5 h-3.5 w-3.5 text-status-passed" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    <span>Copy key</span>
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Quick reporter setup (set TESTPULSE_API_KEY in CI):</p>
              <Tabs value={framework} onValueChange={(v) => setFramework(v as ReporterFramework)}>
                <TabsList>
                  <TabsTrigger value="playwright">Playwright</TabsTrigger>
                  <TabsTrigger value="vitest">Vitest</TabsTrigger>
                </TabsList>
                <TabsContent value="playwright">
                  <CodeBlock language="ts" code={buildReporterSnippet("playwright", projectName)} />
                </TabsContent>
                <TabsContent value="vitest">
                  <CodeBlock language="ts" code={buildReporterSnippet("vitest", projectName)} />
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Generate API key</DialogTitle>
              <DialogDescription>
                Create a CI ingestion key scoped to <span className="font-medium text-foreground">{projectName}</span>.
              </DialogDescription>
            </DialogHeader>

            {error && (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground"
              >
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="api-key-name" className="text-sm font-medium text-foreground">
                Key name
              </label>
              <Input
                id="api-key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="GitHub Actions CI"
                maxLength={100}
                disabled={submitting}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="api-key-expiry" className="text-sm font-medium text-foreground">
                Expiration
              </label>
              <select
                id="api-key-expiry"
                value={preset}
                onChange={(e) => setPreset(e.target.value as KeyExpiryPreset)}
                disabled={submitting}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              >
                <option value="never">Never expires</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="365d">1 year</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || name.trim().length === 0}>
                {submitting ? "Creating..." : "Create API key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
