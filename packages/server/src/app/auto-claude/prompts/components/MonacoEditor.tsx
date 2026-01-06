'use client';

import { useRef, useEffect, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

interface MonacoEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  theme?: string;
  options?: any;
  height?: string;
  className?: string;
}

export default function MonacoEditor({
  value,
  onChange,
  language = 'markdown',
  theme = 'vs',
  options = {},
  height = '100%',
  className = '',
}: MonacoEditorProps) {
  const [isMonacoLoaded, setIsMonacoLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    // Dynamically import Monaco only on client side
    const loadMonaco = async () => {
      if (typeof window === 'undefined') return;

      try {
        // Set up Monaco environment
        (window as any).MonacoEnvironment = {
          getWorkerUrl: function (moduleId: string, label: string) {
            if (label === 'json') {
              return './vs/language/json/json.worker.js';
            }
            if (label === 'css' || label === 'scss' || label === 'less') {
              return './vs/language/css/css.worker.js';
            }
            if (label === 'html' || label === 'handlebars' || label === 'razor') {
              return './vs/language/html/html.worker.js';
            }
            if (label === 'typescript' || label === 'javascript') {
              return './vs/language/typescript/ts.worker.js';
            }
            return './vs/editor/editor.worker.js';
          },
        };

        const monaco = await import('monaco-editor');
        setIsMonacoLoaded(true);

        if (!containerRef.current) return;

        // Configure injection point language features
        const configureInjectionPoints = () => {
          // Define completion provider for injection points
          monaco.languages.registerCompletionItemProvider('markdown', {
            provideCompletionItems: (model, position) => {
              const textUntilPosition = model.getValueInRange({
                startLineNumber: position.lineNumber,
                startColumn: 1,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              });

              // Check if we're typing an injection point
              const injectionMatch = textUntilPosition.match(/\{\{([^}]*)$/);
              if (!injectionMatch) {
                return { suggestions: [] };
              }

              const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: position.column - injectionMatch[1].length - 2,
                endColumn: position.column,
              };

              const suggestions: any[] = [
                {
                  label: 'specDirectory',
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: '{{specDirectory}}',
                  documentation: 'Current spec directory for project context',
                  range,
                },
                {
                  label: 'projectContext',
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: '{{projectContext}}',
                  documentation: 'Project analysis and context information',
                  range,
                },
                {
                  label: 'mcpDocumentation',
                  kind: monaco.languages.CompletionItemKind.Variable,
                  insertText: '{{mcpDocumentation}}',
                  documentation: 'MCP server documentation and capabilities',
                  range,
                },
              ];

              return { suggestions };
            },
          });

          // Hover provider for injection points
          monaco.languages.registerHoverProvider('markdown', {
            provideHover: (model, position) => {
              const line = model.getLineContent(position.lineNumber);
              const injectionMatch = line.match(/\{\{([^}]+)\}\}/g);

              if (injectionMatch) {
                for (const match of injectionMatch) {
                  const startIndex = line.indexOf(match);
                  const endIndex = startIndex + match.length;

                  if (position.column >= startIndex + 1 && position.column <= endIndex + 1) {
                    const injectionPoint = match.slice(2, -2); // Remove {{ }}

                    let contents = '';
                    switch (injectionPoint) {
                      case 'specDirectory':
                        contents = 'Current spec directory for project context. This will be replaced with the actual spec directory path when generating prompts.';
                        break;
                      case 'projectContext':
                        contents = 'Project analysis and context information. This includes project structure, dependencies, and current state.';
                        break;
                      case 'mcpDocumentation':
                        contents = 'MCP server documentation and capabilities. This provides information about available MCP servers and their tools.';
                        break;
                      default:
                        contents = `Injection point: ${injectionPoint}. This will be replaced with dynamic content during prompt generation.`;
                    }

                    return {
                      range: {
                        startLineNumber: position.lineNumber,
                        endLineNumber: position.lineNumber,
                        startColumn: startIndex + 1,
                        endColumn: endIndex + 1,
                      },
                      contents: [{ value: contents }],
                    };
                  }
                }
              }

              return null;
            },
          });
        };

        // Create editor
        const editor = monaco.editor.create(containerRef.current, {
          value,
          language,
          theme,
          automaticLayout: true,
          contextmenu: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          selectOnLineNumbers: true,
          roundedSelection: false,
          readOnly: false,
          cursorStyle: 'line',
          fontSize: 14,
          lineHeight: 20,
          ...options,
        });

        editorRef.current = editor;

        // Configure injection point features
        configureInjectionPoints();

        // Handle value changes
        editor.onDidChangeModelContent(() => {
          const currentValue = editor.getValue();
          if (currentValue !== value) {
            onChange(currentValue);
          }
        });

        return () => {
          editor?.dispose();
        };
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
        setIsMonacoLoaded(false);
      }
    };

    loadMonaco();
  }, []);

  // Update editor when value changes externally
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      const position = editorRef.current.getPosition();
      editorRef.current.setValue(value);
      if (position) {
        editorRef.current.setPosition(position);
      }
    }
  }, [value]);

  // Fallback to textarea if Monaco fails to load
  if (!isMonacoLoaded) {
    return (
      <div className={`${className} h-full`}>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full font-mono text-sm resize-none border-0 focus:ring-0"
          placeholder="Loading Monaco Editor... (or fallback textarea)"
          style={{ height: height === '100%' ? '100%' : height }}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`monaco-editor-container ${className}`}
      style={{ height }}
    />
  );
}