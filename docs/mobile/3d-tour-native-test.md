# Visite 3D — Test sur build natif (iOS / Android)

## ⚠️ Contexte d'exécution

La visite 3D (`mobile/src/screens/client/VirtualTour/VirtualTourScreen.tsx`)
utilise `@react-three/fiber/native` + `three`, qui nécessitent du **code natif
compilé**. Elle **ne fonctionne pas dans Expo Go** — un **build de
développement EAS** est obligatoire.

> Le test sur appareil réel ne peut pas être exécuté en CI/sandbox : il requiert
> un build EAS et un device/émulateur. Cette page documente la procédure et les
> optimisations déjà en place.

## Optimisations déjà appliquées (code)

Le viewer est déjà optimisé pour le mobile (`VirtualTourScreen.tsx` + `utils/panorama.ts`) :

| Optimisation | Implémentation |
|---|---|
| **Texture adaptative** | `panoramaTargetWidth()` : 2048px sous ~1200px d'écran (8 Mo GPU), 4096px au-delà |
| **WebP serveur + downscale** | `optimizePanoramaUrl()` réécrit vers l'endpoint Supabase Image Transform (`?width=…&quality=80`) |
| **Libération VRAM** | `texture.dispose()` à l'unmount de chaque panorama (changement de pièce) |
| **Zéro alloc/frame** | `Raycaster` et `Vector2` alloués au niveau module, réutilisés chaque frame |
| **Projection paresseuse** | `FovController` n'appelle `updateProjectionMatrix()` que si le FOV a changé |
| **Géométrie raisonnable** | sphère 64×40 segments (équilibre qualité/perf) |
| **Clamp pitch** | `MAX_PITCH ≈ 85°` évite le gimbal lock |

Tests unitaires des utilitaires : `mobile/__tests__/panorama.test.ts`.

## Procédure de build EAS

```bash
cd mobile

# 1. Build de développement (une fois par plateforme)
eas build --profile development --platform android
eas build --profile development --platform ios

# 2. Installer l'APK/IPA sur l'appareil, puis lancer le dev server
npx expo start --dev-client
```

## Checklist de test sur appareil

Ouvrir une propriété disposant d'une visite 3D → bouton « Visite virtuelle 3D ».

- [ ] **FPS** : rotation fluide ≥ 50 FPS (profiler Xcode Instruments / Android GPU Profiler)
- [ ] **Mémoire** : pic < 250 Mo, pas de fuite en changeant de pièce 10× (la VRAM doit redescendre grâce à `texture.dispose()`)
- [ ] **Chargement** : panorama affiché < 3 s en 4G (texture 2048px WebP)
- [ ] **Gestes** : pan (rotation), pinch (zoom borné 35°–95°), tap hotspot → changement de pièce
- [ ] **Stabilité** : aucun crash après 5 min d'exploration + 20 changements de pièce
- [ ] **Bas de gamme** : tester sur un Android d'entrée de gamme (RAM ≤ 3 Go) → reste sur 2048px

## Optimisations supplémentaires (si nécessaire après mesure)

Si les FPS chutent ou la mémoire sature sur appareil bas de gamme :

1. **Réduire la texture** : abaisser le seuil dans `panoramaTargetWidth()` ou la `quality` (80 → 70) dans `optimizePanoramaUrl()`.
2. **Réduire la géométrie** : `sphereGeometry args={[500, 48, 32]}` (moins de segments).
3. **Désactiver l'antialiasing** sur les appareils bas de gamme : `gl={{ antialias: false }}`.
4. **LOD** : charger une texture 1024px d'abord, puis remplacer par 2048px une fois visible.

Ces leviers sont tous centralisés dans `utils/panorama.ts` et le composant
`VirtualTourScreen.tsx` — aucune dépendance native supplémentaire requise.
