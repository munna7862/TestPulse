import { describe, expect, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  Button,
  IconButton,
  Badge,
  StatusBadge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  EmptyState,
  CodeBlock,
  cn,
} from "./index";

describe("Design System Primitives [@testpulse/ui]", () => {
  it("merges class names deterministically via cn helper", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    const isHidden: boolean = false;
    expect(cn("bg-red-500", undefined, isHidden && "hidden", "text-white")).toBe("bg-red-500 text-white");
  });

  describe("Loading & Empty States [SC-UX-004]", () => {
    it("[SC-UX-004] renders Skeleton with accessible aria-busy attribute", () => {
      const html = renderToString(React.createElement(Skeleton, { className: "h-4 w-32" }));
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-live="polite"');
      expect(html).toContain("animate-pulse");
    });

    it("[SC-UX-004] renders EmptyState with title, description, and call to action", () => {
      const html = renderToString(
        React.createElement(EmptyState, {
          title: "No Test Runs Found",
          description: "Trigger a test run in your CI pipeline to see real-time updates.",
          action: React.createElement(Button, null, "Connect CI"),
        }),
      );
      expect(html).toContain("No Test Runs Found");
      expect(html).toContain("Trigger a test run in your CI pipeline");
      expect(html).toContain("Connect CI");
    });

    it("[SC-UX-004] renders Button in loading state with spinner and aria-busy", () => {
      const html = renderToString(React.createElement(Button, { loading: true }, "Submit"));
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain("disabled");
      expect(html).toContain("animate-spin");
      expect(html).toContain("Submit");
    });
  });

  describe("Test Execution Status Badges", () => {
    const statuses = ["passed", "failed", "skipped", "flaky", "quarantined", "running"] as const;

    for (const status of statuses) {
      it(`renders StatusBadge for status '${status}'`, () => {
        const html = renderToString(React.createElement(StatusBadge, { status }));
        expect(html).toContain(status);
        expect(html).toContain("inline-flex");
      });
    }
  });

  describe("CodeBlock Untrusted Text Safety", () => {
    it("renders untrusted text safely as plain code text", () => {
      const untrustedCode = `<script>alert("xss")</script>\nAssertionError: expected true to be false`;
      const html = renderToString(React.createElement(CodeBlock, { code: untrustedCode }));

      // Must be safely escaped in HTML serialization, never raw executable script
      expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
      expect(html).toContain("AssertionError");
    });
  });

  describe("Card Component", () => {
    it("renders structured card components", () => {
      const html = renderToString(
        React.createElement(
          Card,
          null,
          React.createElement(
            CardHeader,
            null,
            React.createElement(CardTitle, null, "Card Title"),
            React.createElement(CardDescription, null, "Card Description"),
          ),
          React.createElement(CardContent, null, "Card Content Body"),
        ),
      );
      expect(html).toContain("Card Title");
      expect(html).toContain("Card Description");
      expect(html).toContain("Card Content Body");
    });
  });

  describe("Badge and IconButton", () => {
    it("renders Badge variants", () => {
      const html = renderToString(React.createElement(Badge, { variant: "destructive" }, "Alert"));
      expect(html).toContain("Alert");
      expect(html).toContain("bg-destructive");
    });

    it("renders IconButton with aria-label", () => {
      const html = renderToString(React.createElement(IconButton, { "aria-label": "Close dialog" }));
      expect(html).toContain('aria-label="Close dialog"');
    });
  });
});
