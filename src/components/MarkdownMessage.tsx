'use client';

import { memo, useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface MarkdownMessageProps {
  content: string;
}

// Only http(s) links are rendered; anything else (javascript:, data:) is
// dropped to plain text.
function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard?.writeText(text)?.catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md text-dim hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      aria-label="Copy code to clipboard"
      title="Copy code"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="relative group my-2 rounded-xl border border-line bg-[rgba(5,8,14,0.85)] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 pt-2 pb-0">
        <span className="label !text-[10px]">{language || 'code'}</span>
      </div>
      <CopyButton text={code} />
      <pre className="overflow-x-auto px-3.5 pb-3 pt-1.5">
        <code className="font-mono text-[12px] leading-relaxed text-soft">{code}</code>
      </pre>
    </div>
  );
}

function MarkdownMessage({ content }: MarkdownMessageProps) {
  // First split into fenced code blocks and text runs so code is never
  // re-parsed as markdown.
  const blocks = content.split(/```/);

  const renderInline = (text: string) => {
    // Match inline code `code`, bold **text**, italic *text*, links [t](u)
    const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g);

    return tokens.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-white/[0.07] text-cyan border border-white/5"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-soft">
            {part.slice(1, -1)}
          </em>
        );
      }
      const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (link) {
        const href = safeHref(link[2]);
        if (href) {
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan underline decoration-cyan/40 hover:decoration-cyan underline-offset-2"
            >
              {link[1]}
            </a>
          );
        }
        return <span key={i}>{link[1]}</span>;
      }
      return part;
    });
  };

  const renderTextBlock = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      const key = `${keyPrefix}-${idx}`;
      if (!trimmed) {
        return <div key={key} className="h-1.5" />;
      }

      // Headings: ### and ##
      const heading = trimmed.match(/^(#{2,3})\s+(.+)$/);
      if (heading) {
        const isH3 = heading[1].length === 3;
        return (
          <div
            key={key}
            className={`${isH3 ? 'text-[14px]' : 'text-[15px]'} font-bold text-white mt-2 mb-0.5`}
          >
            {renderInline(heading[2])}
          </div>
        );
      }

      // Bullet point
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <div key={key} className="flex items-start gap-2 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan mt-[9px] flex-shrink-0" />
            <span>{renderInline(trimmed.slice(2))}</span>
          </div>
        );
      }

      // Numbered list
      const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        return (
          <div key={key} className="flex items-start gap-2 pl-1">
            <span className="font-mono text-[10px] text-cyan font-bold mt-1">
              {numMatch[1]}.
            </span>
            <span>{renderInline(numMatch[2])}</span>
          </div>
        );
      }

      return <p key={key}>{renderInline(line)}</p>;
    });
  };

  return (
    <div className="space-y-1.5 leading-[1.65]">
      {blocks.map((block, blockIdx) => {
        // Odd indices are inside fences; the first line may name the language.
        if (blockIdx % 2 === 1) {
          const firstNewline = block.indexOf('\n');
          const language =
            firstNewline > 0 ? block.slice(0, firstNewline).trim() : undefined;
          const code =
            firstNewline >= 0 ? block.slice(firstNewline + 1).replace(/\n$/, '') : block;
          return <CodeBlock key={blockIdx} code={code} language={language} />;
        }
        return renderTextBlock(block, `b${blockIdx}`);
      })}
    </div>
  );
}

// Memoized: message content is immutable once rendered, so re-renders of the
// chat log (e.g. while a new reply streams in) skip re-parsing every message.
export default memo(MarkdownMessage);
