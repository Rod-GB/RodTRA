import { plainText } from './format';

// Turn Steam HTML and BBCode into readable headings, paragraphs, and list items.
export function patchText(value = '') {
  const separated = value
    .replace(/\[img[^\]]*\][\s\S]*?\[\/img\]/gi, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/\[h[1-6]\]|<h[1-6]\b[^>]*>/gi, '\n## ')
    .replace(/\[\/h[1-6]\]|<\/h[1-6]>/gi, '\n')
    .replace(/\[\*\]|<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?\s*>|<\/?(?:p|div|ul|ol|blockquote)\b[^>]*>/gi, '\n')
    .replace(/\[\/?(?:list|olist|quote)[^\]]*\]/gi, '\n')
    .replace(/\[\/?[a-z][^\]]*\]/gi, '')
    .replace(/\{STEAM_CLAN_IMAGE\}[^\s]*/g, '');
  return plainText(separated)
    .replace(/\r\n?/g, '\n')
    .replace(/^\\(?=[A-Za-z])/gm, '')
    .replace(/([.!?])(?=[A-Z][a-z])/g, '$1\n')
    .split('\n').map(line => line.trim()).filter(Boolean).join('\n');
}
