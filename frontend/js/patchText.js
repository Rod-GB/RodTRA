import { plainText, steamImage } from './format';

const escape = value => value.replace(/[&<>"]/g, letter => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[letter]));

export function safePostLink(value = '') {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

// Parse only supported structure; React renders the resulting nodes without raw HTML.
export function parsePatch(value = '') {
  const image = source => {
    const normalized = source.trim().replace(/\{STEAM_CLAN_IMAGE\}/g, 'https://clan.akamai.steamstatic.com/images').replace(/&amp;/g, '&');
    const safe = steamImage(normalized);
    return safe ? `<span data-patch-image="${escape(safe)}"></span>` : '';
  };
  let html = value.replace(/\r\n?/g, '\n')
    .replace(/<(script|style|iframe|object|video|audio)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(?:link|meta|source|embed)\b[^>]*>/gi, '')
    .replace(/<img\b[^>]*>/gi, tag => {
      const match = tag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
      return match ? image(match[1] || match[2] || match[3]) : '';
    })
    .replace(/\[code\]([\s\S]*?)\[\/code\]/gi, (_, text) => '<pre>' + escape(text) + '</pre>')
    .replace(/\[img[^\]]*\]([\s\S]*?)\[\/img\]/gi, (_, source) => image(source))
    .replace(/\[url=([^\]]+)\]([\s\S]*?)\[\/url\]/gi, (_, href, label) => {
      const safe = safePostLink(href.replace(/^["']|["']$/g, ''));
      return safe ? `<a href="${escape(safe)}">${label}</a>` : label;
    })
    .replace(/\[url\]([\s\S]*?)\[\/url\]/gi, (_, href) => {
      const safe = safePostLink(href);
      return safe ? `<a href="${escape(safe)}">${escape(href)}</a>` : escape(href);
    })
    .replace(/\[(\/?)(h[1-6]|list|olist|quote|b|i|u|strike|table|tr|td)\]/gi, (_, closing, tag) => {
      const names = { list:'ul', olist:'ol', quote:'blockquote', b:'strong', i:'em', u:'u', strike:'s', table:'table', tr:'tr', td:'td' };
      return '<' + closing + (names[tag.toLowerCase()] || tag.toLowerCase()) + '>';
    })
    .replace(/\[\*\]/g, '<li>')
    .replace(/\[hr\]/gi, '<hr>')
    .replace(/\[\/?(?:previewyoutube|youtube|video)[^\]]*\]/gi, '')
    .replace(/\[\/?[a-z][^\]]*\]/gi, '');
  // Bare newlines remain readable without turning block-tag whitespace into extra rows.
  html = html.replace(/\n/g, '<br>');
  return new DOMParser().parseFromString(html, 'text/html').body;
}

export function patchText(value = '') {
  const root = parsePatch(value);
  return plainText(root.innerHTML.replace(/<br\s*\/?\s*>|<\/(?:p|div|h[1-6]|li)>/gi, '\n')).trim();
}
