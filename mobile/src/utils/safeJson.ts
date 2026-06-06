// Analyse JSON défensive : ne lève jamais d'exception.
// Retourne `fallback` si l'entrée est nulle, vide ou corrompue — évite les
// crashs au démarrage / à la reconnexion lorsque le cache AsyncStorage est
// corrompu (écriture interrompue, données obsolètes, etc.).
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (raw == null || raw === '') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}
