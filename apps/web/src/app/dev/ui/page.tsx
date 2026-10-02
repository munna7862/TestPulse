"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Info, Play, Plus, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  CodeBlock,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ThemeToggle,
  Toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@testpulse/ui";
import { useTheme } from "../../../providers/ThemeProvider";

export default function ComponentCatalogPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [selectVal, setSelectVal] = React.useState("playwright");
  const [checkboxChecked, setCheckboxChecked] = React.useState(true);

  const sampleUntrustedStackTrace = `Error: expect(received).toBe(expected) // Object.is equality

- Expected  - 1
+ Received  + 1

  Object {
-   "status": "passed",
+   "status": "failed",
  }

    at /home/runner/work/tests/checkout.spec.ts:42:18
    at async TestRunner.runTestCase (/node_modules/@playwright/test/lib/runner.js:192:7)`;

  return (
    <main className="min-h-screen bg-background p-6 md:p-10 text-foreground space-y-12 max-w-6xl mx-auto">
      {/* Catalog Header */}
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link href="/runs" className="hover:text-foreground inline-flex items-center gap-1 transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to App Shell</span>
            </Link>
            <span>/</span>
            <span>Design System</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">TestPulse Design System Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Standard UI primitives, semantic tokens, and accessibility test fixtures. Current active theme:{" "}
            <span className="font-semibold text-foreground uppercase">{resolvedTheme}</span> ({theme})
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className="cursor-pointer"
          >
            Toggle to {resolvedTheme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>
      </div>

      {/* 1. Buttons & IconButtons */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">1. Buttons & Icon Actions</h2>
          <p className="text-sm text-muted-foreground">
            All visual variants, sizes, icon-only buttons, and loading states.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="default">Primary Action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link Style</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <Button size="sm">Small (sm)</Button>
              <Button size="md">Medium (md)</Button>
              <Button size="lg">Large (lg)</Button>
              <Button loading>Loading State</Button>
              <Button disabled>Disabled</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
              <IconButton aria-label="Add new item" variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </IconButton>
              <IconButton aria-label="Download export" variant="secondary" size="md">
                <Download className="h-4 w-4" />
              </IconButton>
              <IconButton aria-label="Delete resource" variant="destructive" size="md">
                <Trash2 className="h-4 w-4" />
              </IconButton>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Status Badges & Test Execution States */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">2. Test Status Indicators & Badges</h2>
          <p className="text-sm text-muted-foreground">
            Domain model test states mapped to semantic tokens satisfying WCAG 2.1 AA contrast in both themes.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Domain Status Badges
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge status="passed" />
                <StatusBadge status="failed" />
                <StatusBadge status="skipped" />
                <StatusBadge status="flaky" />
                <StatusBadge status="quarantined" />
                <StatusBadge status="running" />
              </div>
            </div>
            <div className="pt-3 border-t border-border">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Generic Variant Badges
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Critical Error</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Form Inputs, Select & Checkbox */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">3. Form Controls & Inputs</h2>
          <p className="text-sm text-muted-foreground">
            Accessible text inputs, validation errors, selects, and checkboxes.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 grid gap-6 md:grid-cols-2">
            <Input
              label="Project Name"
              placeholder="e.g. core-engine"
              helperText="Unique identifier used in reporter configurations"
              required
            />
            <Input
              label="API Key Name"
              placeholder="ci-github-actions"
              error="A key with this name already exists in this project"
            />
            <div className="space-y-1.5">
              <label htmlFor="test-runner-select" className="block text-sm font-medium text-foreground">
                Test Runner Framework
              </label>
              <Select value={selectVal} onValueChange={setSelectVal}>
                <SelectTrigger id="test-runner-select" aria-label="Test Runner Framework" className="w-full">
                  <SelectValue placeholder="Select runner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="playwright">Playwright Test (@playwright/test)</SelectItem>
                  <SelectItem value="vitest">Vitest (vitest)</SelectItem>
                  <SelectItem value="jest">Jest (v1.1+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col justify-end space-y-3 pb-1">
              <Checkbox
                label="Quarantine newly detected flaky tests automatically"
                checked={checkboxChecked}
                onCheckedChange={(checked) => setCheckboxChecked(!!checked)}
              />
              <Checkbox label="Send email notifications on quarantine transitions (Owner/Admin)" disabled />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Dialog, DropdownMenu & Tooltip */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">4. Overlays, Menus & Tooltips</h2>
          <p className="text-sm text-muted-foreground">
            Focus management, keyboard navigation (Escape, Tab), and ARIA attributes.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-4">
            {/* Modal Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open Quarantine Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Quarantine Test Case</DialogTitle>
                  <DialogDescription>
                    Quarantining this test will make failures non-blocking in CI while engineers investigate the root
                    cause.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-2 text-sm text-muted-foreground">
                  Test:{" "}
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                    checkout.spec.ts &gt; process payment
                  </code>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="destructive">Confirm Quarantine</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary">Actions Menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-52">
                <DropdownMenuLabel>Run Operations</DropdownMenuLabel>
                <DropdownMenuItem className="gap-2">
                  <Play className="h-4 w-4" />
                  <span>Re-run Failed Tests</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Download className="h-4 w-4" />
                  <span>Download Artifacts</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span>Abort Run</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Info className="h-4 w-4" />
                    <span>Hover for Tooltip</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Accessible tooltip compliant with WCAG 2.1 AA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>

      {/* 5. Tabs & Tables */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">5. Tabs & Structured Data Tables</h2>
          <p className="text-sm text-muted-foreground">
            Tabbed navigation panels and semantic HTML5 data table with status pills.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All Tests (4)</TabsTrigger>
                <TabsTrigger value="failed">Failed (1)</TabsTrigger>
                <TabsTrigger value="flaky">Flaky (1)</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Case</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">auth.spec.ts &gt; login user</TableCell>
                      <TableCell>
                        <StatusBadge status="passed" size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">240ms</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">checkout.spec.ts &gt; card payment</TableCell>
                      <TableCell>
                        <StatusBadge status="failed" size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">1.82s</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">billing.spec.ts &gt; invoice webhook</TableCell>
                      <TableCell>
                        <StatusBadge status="flaky" size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">850ms</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">dashboard.spec.ts &gt; load metrics</TableCell>
                      <TableCell>
                        <StatusBadge status="running" size="sm" />
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-xs">420ms</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="failed" className="pt-4">
                <p className="text-sm text-muted-foreground">Showing 1 failed test case in this run.</p>
              </TabsContent>
              <TabsContent value="flaky" className="pt-4">
                <p className="text-sm text-muted-foreground">Showing 1 test exhibiting intermittent flaky patterns.</p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* 6. Feedback States: Skeleton & EmptyState */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">6. Feedback States (Skeleton, EmptyState, Toast)</h2>
          <p className="text-sm text-muted-foreground">
            P01-S02 feedback requirements: skeleton loaders, empty illustrations, and notifications.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Skeleton Loaders */}
          <Card>
            <CardHeader>
              <CardTitle as="h3" className="text-base">
                Skeleton Loading State
              </CardTitle>
              <CardDescription>Maintains layout structure during initial data queries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <div className="pt-2 flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>

          {/* Toast Alerts */}
          <Card>
            <CardHeader>
              <CardTitle as="h3" className="text-base">
                Toast Notifications
              </CardTitle>
              <CardDescription>Polite status notifications for user operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Toast
                variant="success"
                title="Quarantine Applied"
                description="Test case marked as non-blocking for subsequent CI runs."
              />
              <Toast
                variant="destructive"
                title="Ingestion Error"
                description="Invalid API key payload detected from CI runner."
              />
            </CardContent>
          </Card>
        </div>

        <EmptyState
          as="h3"
          title="No Flaky Tests Detected"
          description="Congratulations! All test runs in the last 14 days executed deterministically without retries."
          action={<Button variant="outline">Adjust Flakiness Thresholds</Button>}
        />
      </section>

      {/* 7. Safe Untrusted CodeBlock */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">7. Safe Code & Stack Trace Viewer</h2>
          <p className="text-sm text-muted-foreground">
            Guaranteed safe text rendering of untrusted CI runner stack traces, avoiding script injection.
          </p>
        </div>
        <CodeBlock code={sampleUntrustedStackTrace} language="typescript" showLineNumbers />
      </section>
    </main>
  );
}
