import DOMPurify from 'dompurify';

/**
 * Strips all HTML tags from the given input string using DOMPurify.
 * This is used to sanitize user-generated or AI-generated text.
 */
export const sanitizeText = (input: string): string => {
  if (!input) return '';
  
  // DOMPurify requires a window object. In SSR contexts (e.g. Next.js server components),
  // we return the input directly. React automatically escapes strings rendered as children,
  // so the primary XSS risk is client-side dynamic rendering or dangerouslySetInnerHTML.
  if (typeof window === 'undefined') {
    return input;
  }
  
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }) as string;
};
