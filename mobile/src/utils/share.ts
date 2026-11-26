import { Platform, Share } from 'react-native';
import { showStyledAlert } from './alertManager';

interface ShareOptions {
  message: string;
  title?: string;
  url?: string;
}

/**
 * Partage natif, avec repli sur le web : beaucoup de navigateurs (ordinateurs
 * notamment) n'ont pas l'API de partage, et `Share.share` lève alors une erreur.
 * Dans ce cas, le texte est copié dans le presse-papiers et l'utilisateur est prévenu.
 * Une annulation par l'utilisateur n'affiche rien.
 */
export async function shareSafely(opts: ShareOptions): Promise<void> {
  try {
    await Share.share(opts);
    return;
  } catch (e: any) {
    if (Platform.OS !== 'web' || e?.name === 'AbortError') return;
  }
  const text = opts.url && !opts.message.includes(opts.url) ? `${opts.message}\n${opts.url}` : opts.message;
  try {
    await navigator.clipboard.writeText(text);
    showStyledAlert({ title: 'Copié', message: 'Le texte à partager a été copié dans le presse-papiers.', tone: 'success' });
  } catch {
    showStyledAlert({ title: 'Partager', message: text, tone: 'info' });
  }
}
