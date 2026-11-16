// /menus n'a pas de contenu propre : le fil d'Ariane de « Plats (modération) » y renvoie
// (sinon 404) — on redirige vers la liste en attente de modération.
import { redirect } from 'next/navigation';

export default function MenusIndexPage() {
  redirect('/menus/pending');
}
