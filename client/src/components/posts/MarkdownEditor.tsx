/**
 * Markdown Editor Component
 * Textarea with live preview of formatted Markdown output
 */

import { useEffect, useState } from 'react';
import { type EmojiMetadata, renderMarkdown } from '../../lib/markdown';

export interface MarkdownEditorProps {
  /**
   * Current Markdown value
   */
  value: string;

  /**
   * Callback when value changes
   */
  onChange: (value: string) => void;

  /**
   * Optional emoji registry for shortcode replacement
   */
  emojiRegistry?: Map<string, EmojiMetadata>;

  /**
   * Placeholder text for empty editor
   */
  placeholder?: string;

  /**
   * Maximum character limit (optional)
   */
  maxLength?: number;

  /**
   * Whether to show live preview
   * @default true
   */
  showPreview?: boolean;

  /**
   * Custom CSS class for container
   */
  className?: string;
}

/**
 * MarkdownEditor - Textarea with live Markdown preview
 */
export function MarkdownEditor({
  value,
  onChange,
  emojiRegistry,
  placeholder = 'Write your post in Markdown...',
  maxLength,
  showPreview = true,
  className = '',
}: MarkdownEditorProps) {
  const [renderedHtml, setRenderedHtml] = useState<string>('');

  // Update preview when value or emoji registry changes
  useEffect(() => {
    if (showPreview && value) {
      const html = renderMarkdown(value, emojiRegistry);
      setRenderedHtml(html);
    } else {
      setRenderedHtml('');
    }
  }, [value, emojiRegistry, showPreview]);

  const characterCount = value.length;
  const isOverLimit = maxLength ? characterCount > maxLength : false;

  return (
    <div className={`markdown-editor ${className}`}>
      {/* Editor Toolbar */}
      <div className="editor-toolbar flex items-center justify-between border-b border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
        <div className="toolbar-buttons flex gap-2">
          <button
            type="button"
            onClick={() => {
              const selection = window.getSelection()?.toString() || 'text';
              onChange(`${value}**${selection}**`);
            }}
            className="toolbar-btn px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => {
              const selection = window.getSelection()?.toString() || 'text';
              onChange(`${value}*${selection}*`);
            }}
            className="toolbar-btn px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(`${value}\n- List item`);
            }}
            className="toolbar-btn px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Bullet List"
          >
            • List
          </button>
          <button
            type="button"
            onClick={() => {
              onChange(`${value}\n1. Numbered item`);
            }}
            className="toolbar-btn px-2 py-1 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Numbered List"
          >
            1. List
          </button>
          <button
            type="button"
            onClick={() => {
              const selection = window.getSelection()?.toString() || 'code';
              onChange(`${value}\`${selection}\``);
            }}
            className="toolbar-btn px-2 py-1 text-sm font-mono hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            title="Inline Code"
          >
            {'</>'}
          </button>
        </div>

        {/* Character count */}
        {maxLength && (
          <div
            className={`character-count text-sm ${isOverLimit ? 'text-red-500' : 'text-gray-500'}`}
          >
            {characterCount} / {maxLength}
          </div>
        )}
      </div>

      {/* Editor Textarea */}
      <div className="editor-content">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className="w-full min-h-[200px] p-3 border-0 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-vertical"
          aria-label="Markdown editor"
        />
      </div>

      {/* Live Preview */}
      {showPreview && value && (
        <div className="preview-section border-t border-gray-300 dark:border-gray-700">
          <div className="preview-header bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            Preview
          </div>
          <div
            className="preview-content p-3 prose prose-sm dark:prose-invert max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized via DOMPurify in renderMarkdown
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      )}
    </div>
  );
}
