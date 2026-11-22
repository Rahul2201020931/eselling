import { useState } from 'react';
import { useI18n } from '../i18n.jsx';

// Share an ad by WhatsApp, Facebook or a copied link. No keys or accounts needed.
export default function ShareButtons({ title, path }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;
  const text = encodeURIComponent(`${title} - ${url}`);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="share">
      <span className="muted">{t('Share')}:</span>
      <a className="button secondary small" href={`https://wa.me/?text=${text}`} target="_blank" rel="noreferrer">
        WhatsApp
      </a>
      <a
        className="button secondary small"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
      >
        Facebook
      </a>
      <button type="button" className="secondary small" onClick={copy}>
        {copied ? 'Copied!' : t('Copy link')}
      </button>
    </div>
  );
}
