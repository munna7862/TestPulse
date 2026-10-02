import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../lib/utils";

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({ code, language = "bash", showLineNumbers = false, className, ...props }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "relative rounded-lg border border-border bg-muted/60 font-mono text-xs text-foreground overflow-hidden",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
        <span className="uppercase font-semibold tracking-wider">{language}</span>
        <button
          type="button"
          onClick={() => {
            void handleCopy();
          }}
          aria-label={copied ? "Copied code" : "Copy code"}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted transition-colors cursor-pointer text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-status-passed" aria-hidden="true" />
              <span className="text-status-passed">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto p-4 leading-relaxed">
        {showLineNumbers ? (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx}>
                  <td className="w-8 select-none pr-4 text-right text-muted-foreground/60">{idx + 1}</td>
                  <td className="whitespace-pre">{line}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <pre className="whitespace-pre font-mono">
            {/* Pure text rendering guarantees untrusted code is never evaluated as HTML */}
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
