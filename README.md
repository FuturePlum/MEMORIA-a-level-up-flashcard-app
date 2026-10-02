# Flashcard

PWA de flashcards à répétition espacée, en français.

## Fonctionnalités

- Création de cartes à la main ou par IA (Gemini) depuis du texte, des photos, des PDF ou des documents
- Révision par paliers, mode « S'entraîner », planning par matière avec dates de contrôle
- Rappels par notification, série (streak), statistiques
- Fiches de synthèse générées par IA (export Word/PDF)
- Synchronisation automatique entre appareils (Worker Cloudflare + KV)
- Fonctionne hors ligne (service worker), thème sombre « Pop nuit »

## Structure

| Fichier | Rôle |
|---|---|
| `index.html` | Toute l'app (HTML, CSS, JS) |
| `sw.js` | Service worker (cache hors ligne) |
| `manifest.json` | Manifeste PWA |
| `.well-known/assetlinks.json` | Lien avec l'app Android (TWA) |
| `worker/worker.js` | Worker Cloudflare de synchro et de partage |
| `docs/CONTEXTE-PROJET.md` | Documentation technique détaillée |

## Utilisation

1. Ouvre l'app (déployée sur Cloudflare Pages).
2. Pour la génération IA, crée une clé gratuite sur [aistudio.google.com/apikey](https://aistudio.google.com/apikey) et colle-la dans les réglages. Elle reste sur ton appareil.

## Déploiement

- **Site** : uploader tous les fichiers de la racine sur Cloudflare Pages (chaque déploiement remplace tout le site).
- **Worker** : `worker/worker.js` avec un KV nommé `FLASHCARD_SYNC`.
- Si `sw.js` change, incrémenter `SW_VERSION`.

## Application Android

L'APK est un TWA généré avec PWABuilder. Il est téléchargeable dans l'onglet **Releases**.
