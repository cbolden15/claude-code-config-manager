'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export default function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  const processedContent = useMemo(() => {
    // Simple markdown processing for preview
    let processed = content;

    // Process injection points with highlighting
    processed = processed.replace(
      /\{\{([^}]+)\}\}/g,
      '<span class="injection-point" data-point="$1">{{$1}}</span>'
    );

    // Process basic markdown
    // Headers
    processed = processed.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h3>');
    processed = processed.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>');
    processed = processed.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-4">$1</h1>');

    // Bold and italic
    processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold">$1</strong>');
    processed = processed.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // Code blocks
    processed = processed.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto my-2"><code class="text-sm">$1</code></pre>');

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');

    // Lists
    processed = processed.replace(/^- (.+)$/gm, '<li class="ml-4">• $1</li>');
    processed = processed.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4">$1. $2</li>');

    // Line breaks
    processed = processed.replace(/\n\n/g, '</p><p class="mb-2">');
    processed = `<p class="mb-2">${processed}</p>`;

    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');

    return processed;
  }, [content]);

  const injectionPoints = useMemo(() => {
    const points: string[] = [];
    const matches = content.matchAll(/\{\{([^}]+)\}\}/g);

    for (const match of matches) {
      const point = match[1];
      if (!points.includes(point)) {
        points.push(point);
      }
    }

    return points;
  }, [content]);

  const getInjectionPointInfo = (point: string) => {
    switch (point) {
      case 'specDirectory':
        return {
          label: 'Spec Directory',
          description: 'Current spec directory for project context',
          color: 'bg-blue-100 text-blue-800',
        };
      case 'projectContext':
        return {
          label: 'Project Context',
          description: 'Project analysis and context information',
          color: 'bg-green-100 text-green-800',
        };
      case 'mcpDocumentation':
        return {
          label: 'MCP Documentation',
          description: 'MCP server documentation and capabilities',
          color: 'bg-purple-100 text-purple-800',
        };
      default:
        return {
          label: point,
          description: 'Custom injection point',
          color: 'bg-gray-100 text-gray-800',
        };
    }
  };

  return (
    <div className={`markdown-preview h-full overflow-auto ${className}`}>
      {/* Injection Points Summary */}
      {injectionPoints.length > 0 && (
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Injection Points Used:</h4>
          <div className="flex flex-wrap gap-2">
            {injectionPoints.map((point) => {
              const info = getInjectionPointInfo(point);
              return (
                <Badge
                  key={point}
                  className={`${info.color} text-xs`}
                  title={info.description}
                >
                  {info.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Rendered Content */}
      <div
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{
          __html: processedContent
        }}
        style={{
          '--injection-point-bg': '#E3F2FD',
          '--injection-point-color': '#0066CC',
        } as React.CSSProperties}
      />

      <style jsx>{`
        .markdown-preview :global(.injection-point) {
          background-color: var(--injection-point-bg);
          color: var(--injection-point-color);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
          border: 1px solid #BBDEFB;
          display: inline-block;
          margin: 0 2px;
          cursor: help;
        }

        .markdown-preview :global(.injection-point:hover) {
          background-color: #BBDEFB;
        }

        .markdown-preview :global(h1),
        .markdown-preview :global(h2),
        .markdown-preview :global(h3) {
          line-height: 1.2;
        }

        .markdown-preview :global(p) {
          line-height: 1.5;
          color: #374151;
        }

        .markdown-preview :global(pre) {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .markdown-preview :global(code) {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        }

        .markdown-preview :global(li) {
          line-height: 1.4;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}