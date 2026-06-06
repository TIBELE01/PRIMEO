// formatters: date, price, and string formatting utilities
export const formatters = {
  date: (iso: string, locale = 'fr-FR'): string =>
    new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }),

  time: (iso: string): string =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),

  price: (amount: number, currency = 'XOF'): string =>
    `${amount.toLocaleString('fr-FR')} ${currency}`,

  duration: (nights: number): string =>
    nights === 1 ? '1 nuit' : `${nights} nuits`,

  phoneNumber: (phone: string): string =>
    phone.replace(/(\d{2})(?=\d)/g, '$1 ').trim(),

  truncate: (text: string, maxLength = 120): string =>
    text.length > maxLength ? `${text.slice(0, maxLength)}...` : text,

  initials: (name: string): string =>
    name.split(' ').slice(0, 2).map(n => n[0]?.toUpperCase() ?? '').join(''),
};
