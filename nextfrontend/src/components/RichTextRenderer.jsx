import { useMemo } from 'react';
import DOMPurify from 'dompurify';

const sanitizeRichText = (input) => {
  if (typeof input !== 'string') return '';
  const raw = input.trim();
  if (!raw) return '';

  const cleaned = raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  if (typeof window === 'undefined') return cleaned;

  return DOMPurify.sanitize(cleaned, {
    ALLOWED_TAGS: [
      'p', 'br', 'div', 'span', 'strong', 'b', 'em', 'i', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'figure', 'figcaption', 'code', 'pre', 'hr',
      'table', 'tbody', 'thead', 'tr', 'td', 'th', 'mark', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'style', 'class', 'data-list'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  });
};

export default function RichTextRenderer({ content, className = '', emptyText = '' }) {
  const safeHtml = useMemo(() => sanitizeRichText(content), [content]);

  if (!safeHtml && emptyText) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safeHtml || '' }}
    />
  );
}
