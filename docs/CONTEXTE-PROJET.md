# Contexte du projet « Flashcard » — à lire en entier avant toute modification

Brief pour une IA (ou une personne) qui reprend le projet **sans historique**, pour coder et corriger.
Ce document décrit l'état **actuel** (app **v126**, `sw.js` `SW_VERSION = 'v46'`), organisé par sujet. L'historique
version par version est à la fin (section 15) : il ne sert qu'à retrouver pourquoi une règle existe.

Dernière vérification complète contre le code : v92 (`index.html` = 9 641 lignes, `sw.js` = 131 lignes).
**Si tu modifies le code, mets ce fichier à jour dans la même livraison** (section 14).

**Les 6 choses à ne jamais oublier**
1. Deux appareils, une seule base de code : **téléphone (APK)** et **Chromebook (PWA)**. Tout ce qui est propre au grand écran
   vit dans des `@media` ; le téléphone ne doit pas bouger (section 3).
2. `index.html` contient **tout** le code. On le modifie par remplacements ciblés, jamais réécrit en entier.
3. Chaque déploiement Cloudflare remplace **tout** le site : toujours uploader **tous** les fichiers (section 4).
4. `sw.js` modifié → incrémenter `SW_VERSION`.
5. L'utilisateur n'est pas développeur : réponses simples, étape par étape, en français familier (section 13).
6. Ne **jamais** modifier `derniereModification` hors d'une vraie action de l'utilisateur (sinon la synchro écrase l'autre appareil, section 10).

---

## 1. L'app en bref

**PWA de flashcards à répétition espacée.** Sur téléphone, elle est installée sous forme d'**APK généré par PWABuilder**
(TWA : une coque qui ouvre le site sans barre d'adresse, aucun code de l'app dedans). Sur Chromebook, c'est la PWA installée
depuis Chrome.

- Création de cartes à la main, ou par IA (Gemini) depuis du texte collé, des photos, des PDF, des `.docx`/`.txt`/`.md`.
- Révision par paliers, mode « S'entraîner » (score, sans impact sur le planning), planning par matière avec dates de contrôle,
  rappels par notification, série (streak), statistiques.
- Fiches de synthèse générées par IA (export Word/PDF).
- Export/import JSON de la progression, export du HTML complet (sauvegarde de secours).
- Stockage sur l'appareil (`localStorage`) + **synchro automatique entre appareils** (Worker Cloudflare + KV, section 10).
- Thème unique sombre « Pop nuit », police Bricolage Grotesque. Interface en français.

## 2. Fichiers du projet

Site statique, tout à la racine sauf le dernier :

| Fichier | Rôle |
|---|---|
| `index.html` | **Tout le code** (HTML + CSS + JS, ~9 600 lignes). Pas de build, pas de framework. |
| `sw.js` | Service worker : cache hors ligne (réseau d'abord), notifications de rappel. |
| `manifest.json` | Nom « Flashcard », icônes, `theme_color` et `background_color` = `#0c0c12`, `orientation: portrait` (laissé tel quel exprès : ne pas faire pivoter l'APK). |
| `icon-192x192-any.png`, `icon-512x512-any.png`, `icon-512x512-maskable.png` | Icônes (section 12). |
| `.well-known/assetlinks.json` | Lie l'APK au domaine (Digital Asset Links). Package `dev.pages.flashcard2_4ra.twa`. Ne change que si la clé de signature change. |
| `CONTEXTE-PROJET-FLASHCARD.md` | Ce fichier. **Ne pas l'uploader sur Cloudflare** (il serait public) : il sert seulement à la conversation. |

Depuis v124, `worker.js` (Worker de synchro + partage) est dans le zip, mais il vit côté Cloudflare, pas sur Pages. Si l'utilisateur l'a modifié à la main, lui demander sa version actuelle avant de le remplacer.

L'utilisateur garde les fichiers sur son téléphone/ordinateur (pas de Git). **Chaque livraison = un zip complet** avec
tous les fichiers, noms exacts, et un rappel de le ranger quelque part de fiable (il a déjà re-uploadé un `sw.js` périmé).

## 3. Téléphone vs Chromebook — la différenciation centrale

L'utilisateur utilise l'app sur **Pixel 9a (APK)** et sur **Chromebook (PWA dans Chrome / fenêtre installée)**. Une seule base de
code, deux mises en page.

**Détection** : CSS `@media (min-width:900px) and (min-height:480px)` et, côté JS, `ppWide()`. Un téléphone en paysage
(≈ 915 × 412) reste en mode téléphone grâce au `min-height`. Si tu ajoutes une règle grand écran, utilise exactement ce seuil.
Les écouteurs `matchMedia` gèrent le redimensionnement de fenêtre : les deux versions d'un écran sont souvent **toutes deux
dans le HTML**, c'est le CSS qui choisit (éléments grand écran en `display:none` par défaut : `.pp-cb`, `.pp-ra`, `.pp-acts`,
`.pp-fp`, `.pp-sk-w`).

**Où vit le code grand écran** : derniers blocs du `<style>` — « CHROMEBOOK / ORDINATEUR (v70) » (l. ~1728), « CHROMEBOOK v84 »
(l. ~1849), « CHROMEBOOK v85 » (l. ~1949), puis les ajouts v86 à v92. **Le dernier bloc gagne** : certaines règles de v70/v82
(centrage 680 px, `--side` des deux côtés) sont écrasées par v84/v85. Vérifier le bloc le plus bas avant de modifier.

| Sujet | Téléphone (Pixel 9a, APK) | Chromebook / grand écran (PWA) |
|---|---|---|
| Navigation | Barre du bas : Réviser, Planning, Ajouter, Parcourir (`TABBAR_ITEMS`) | **Barre latérale** à gauche (196 px, `top:24px`, `left:24px`) ; **onglet Planning supprimé** |
| Planning | Onglet dédié (`renderPlanning()`) | Intégré à l'accueil : colonne de droite « Cette semaine » + « Matières et contrôles » sous la 1re page (`ppCbHtml`, `ppCbMatsHtml`) |
| Accueil | Une colonne, bloc `.pp-prog7` | Grille 2 colonnes : grande carte + « Réviser tout / S'entraîner » à gauche ; contrôle, série/maîtrisées/réussite, durée, semaine à droite. `.pp-prog7` caché |
| Révision | Boutons dans la carte (`.pp-foot`), arrivée en cascade (`viePop`) | Question à gauche, panneau réponse `.pp-ra` à droite, boutons `.pp-acts` sous les deux panneaux (grisés et enfoncés avant retournement, `ppUnpress` au retournement) |
| Parcourir | Liste ; toucher une carte ouvre la feuille `ppFiche` | Liste groupée à gauche (360 px) + fiche à droite (`ppFp`, `ppFpAuto`, `ppItClick`) |
| Feuilles (Réglages, contrôle, fiche, heure, date) | Feuille du bas (`ppSheet`) | **Fenêtre centrée** (bordure crème, ombre orange) ; Réglages sur 2 colonnes (`.pp-setcols`) |
| Statistiques, Synthèse (`.pp-page`) | Page plein écran | Fenêtre centrée sur fond assombri ; `#modal-root` couvre l'écran et bloque les clics derrière |
| Ajouter | Composeur unique `.pp-cmp` | IA : « carte héros » à gauche, Générer + Synthèse / À la main / Importer à droite ; à la main : Question \| Réponse côte à côte ; aperçu en 2 colonnes |
| Saisie | Tactile : glissement (`GESTE_SEUIL = 45`), haptique `haptique(ms)` | Souris : curseur main, survol (`filter:brightness`), barres fines ; clavier (ci-dessous) |
| Fond animé (onde) | Onde depuis le coin haut-droit, portée tout l'écran, opacité .6 | Onde limitée (portée 520 px max, opacité .36, points plus petits) |
| Faux splash | Superposé au splash natif Android | Pas de splash natif : `.tabbar` et `#topbar` à `opacity:0` jusqu'à `body.splash-done` |
| Distribution | APK PWABuilder (section 5) | PWA : « Installer l'application » dans Chrome. **Un APK installé sur Chromebook s'afficherait en fenêtre de téléphone : à éviter** |
| Déploiement APK nécessaire ? | Seulement pour ce qui est figé dans l'APK (section 5) | **Jamais** : un déploiement Cloudflare suffit |

**Clavier (grand écran, `gererRaccourcisClavier` + écouteur Échap)** : Espace = retourner la carte, Entrée = facile, Maj = difficile,
Suppr/Retour arrière = pas su ; **Échap** ferme la feuille du bas, sinon la page ouverte (Statistiques, Fiche…), sinon quitte
la session. Le rappel des touches (v119) est un petit bloc `.pp-kh` à droite de la barre de maîtrise (`.pp-mb`), seulement avec une souris
(`hover:hover` + `pointer:fine`) : un point de la couleur du bouton + « Suppr · Maj · Entrée » (ordre des boutons Pas su / Difficile / Facile), à demi-transparent, plus net une fois la carte retournée.
Espace n'est volontairement pas rappelé dans cette barre. (L'ancien rappel en `::after` ne s'affichait plus depuis que `.pp-acts` s'est glissé entre `.pp-stage` et `.pp-mb`.) Anneau jaune `:focus-visible` pour Tab.

**Règles pour toute modification visuelle**
- Le comportement par défaut (hors `@media`) **est** le téléphone. Un changement pour le Chromebook va uniquement dans le dernier
  bloc `@media (min-width:900px) and (min-height:480px)` ; un changement pour le téléphone ne doit pas dégrader le Chromebook.
- **Tester aux deux tailles** : téléphone 412 × 915 et grand écran (ex. 1366 × 768, et la limite 900 × 480). Les changements
  Chromebook ont été validés avec un téléphone « identique pixel pour pixel » à 412 × 915 ; garder cette exigence.
- Dire à l'utilisateur sur quel appareil la modification se voit, et si l'APK est concerné (section 5).
- Pas de `:hover{transform:…}` ; tout nouveau bouton dans les listes `:is(...)` a son survol dans le bloc souris (section 11).
- Si `--side` (244 px) ou les largeurs changent, changer ensemble : `body`, `#pp-ses` (`left:236px;right:22px;padding:14px 8px`,
  voir v91), `.pp-page`, `.pp-sheet`. Le fond de `#pp-ses` reprend exactement les couches du `body` avec
  `background-attachment:fixed` : si le fond du `body` change, changer aussi cette ligne.

## 4. Hébergement et déploiement (Cloudflare Pages)

Projet `flashcard2-4ra`. **URL de production fixe : `https://flashcard2-4ra.pages.dev`** (PWABuilder, tests, `assetlinks.json`).
Les URL à préfixe aléatoire de chaque déploiement ne sont pas durables. (L'ancien projet `flashcard-2bz` n'existe plus.)

**Déploiement** : dashboard Cloudflare Pages → projet → « Créer un déploiement » → « Upload a file » → tous les fichiers du site
→ **« Production » coché** → valider.

Pièges déjà rencontrés :
- **Nom de fichier** : Cloudflare publie sous le nom exact reçu. Un `index-4.html` n'écrase jamais `index.html` et l'ancien site
  reste en ligne sans erreur. Toujours renommer en `index.html` / `sw.js` / `manifest.json` avant l'upload.
- **Déploiement partiel** : chaque déploiement remplace TOUT le site. Les fichiers absents disparaissent, notamment
  `.well-known/assetlinks.json` → l'app retombe en mode navigateur **avec barre d'adresse**. **Toujours uploader tous les fichiers
  d'un coup** (3 fichiers de code, 3 icônes, `.well-known/assetlinks.json`), même inchangés. Ne jamais dire « les autres fichiers
  n'ont pas besoin d'être retéléchargés ».
- **Mobile vs PC** : un même déploiement a échoué depuis le téléphone et marché depuis un PC (noms/suffixes de téléchargement).
  Déployer depuis un ordinateur si possible.

## 5. PWABuilder et APK (téléphone uniquement)

Procédure : coller `https://flashcard2-4ra.pages.dev` sur pwabuilder.com → il lit `manifest.json` → générer l'APK Android (TWA)
→ installer. Package : `dev.pages.flashcard2_4ra.twa`.

**Nom de l'app** (« Flashcard ») : `manifest.json` (`name`, `short_name`) + `index.html` (`<title>` et
`<meta name="apple-mobile-web-app-title">`). Les trois restent cohérents.

### Quand repasser par PWABuilder ? (à trancher avant toute procédure)
- **Non, un déploiement Cloudflare suffit** pour tout ce qui est chargé depuis l'URL : fonctionnalités, CSS, textes, couleurs
  internes, `sw.js`, le faux splash, tout le Chromebook.
- **Oui** pour ce qui est figé dans l'APK : icône et couleur de fond du **splash natif**, couleurs de la barre de statut et de
  navigation, nom de l'app, signature.
- Tant que l'APK n'est pas régénéré après un changement de logo, le splash natif montre l'ancien : un saut visible entre splash
  natif et faux splash est normal.

### Procédure quand l'APK doit être régénéré
1. Déployer d'abord le site à jour (tous les fichiers) sur Cloudflare.
2. PWABuilder → URL → Android. Barre de statut et de navigation `#0c0c12` ; **Signing key = « Use mine »** avec l'ancien
   `signing.keystore` (+ mots de passe et alias de `signing-key-info.txt`).
3. Récupérer l'APK (et, si la clé a changé, le nouvel `assetlinks.json`).
4. Si la clé a changé : donner le nouvel `assetlinks.json` à l'IA → nouveau zip complet → réupload Cloudflare.
5. Désinstaller l'ancienne app puis installer le nouvel APK. Avec « Use mine » (même signature), Android accepte la mise à jour
   par-dessus et `assetlinks.json` ne change pas.

Jusqu'ici l'utilisateur a **régénéré une nouvelle clé à chaque passage** (« New »), donc `assetlinks.json` changeait à chaque fois.
Tant qu'il n'a pas confirmé être passé sur « Use mine », supposer ce comportement. Demander s'il a gardé l'APK précédent (si oui
et si seul le site change, rien à régénérer).

**Fichiers de signature** : `signing.keystore` et `signing-key-info.txt` sont à conserver dans un espace fiable (Drive), pas
seulement sur le téléphone. **Sensibles** : ne pas demander de les coller dans le chat. Perdus, il faudrait un nouveau package
(donc pas de mise à jour du Play Store).

## 6. Organisation de `index.html` et données

Un seul fichier : `<style>` (thème, composants `pp-*`, puis blocs Chromebook, puis couche « vie »), HTML des écrans, puis un gros
`<script>`, puis un second `<script>` tout à la fin (couche « vie »). Points d'entrée : `init()` (l. ~9454), `registerServiceWorker()`,
`switchTab()`, `TABBAR_ITEMS`.

### Modèle de données (important pour tout correctif)
`SEED_CARDS`, `MATIERES_CONFIG` et `PLANNING` sont des constantes **vides** (héritage). L'état réel est dans `localStorage` et
reconstruit par `applyLocalOverlay()` : `CARDS = SEED_CARDS + cartes-imported − cartes-deleted`, puis fusion de l'état par carte
(`cartes-overlay`). L'« export du HTML complet » réécrit `SEED_CARDS` avec l'état courant (sauvegarde autonome).

Champs d'une carte : `id`, `matiere`, `question`, `reponse`, `palier`, `prochaineRevision`, `derniereRevision`,
`derniereModification`, `difficultes`, `facileConsecutif`, `facilite`, `inversible`, + **optionnels** `imageQuestion`, `imageReponse` (v121, voir ci-dessous).

Clés `localStorage` (celles marquées **local** ne sont ni exportées ni synchronisées) :

| Clé | Contenu |
|---|---|
| `cartes-imported` | cartes créées/importées/reçues par synchro |
| `cartes-overlay` | état de chaque carte (palier, dates, facilité…) |
| `cartes-deleted` | ids supprimés (filtrage local) |
| `cartes-supprimees-tombstones` | suppressions horodatées, pour la synchro |
| `cartes-datecontrole-overlay`, `cartes-datecontrole-maj` | dates de contrôle par matière + horodatage |
| `cartes-matieres-vides`, `cartes-archive-overlay` | matières sans carte ; matières archivées |
| `cartes-planning` | planning calculé (recalculé côté client) |
| `cartes-streak` | série |
| `gemini_api_key`, `gemini_api_key_maj` | clé Gemini (synchronisée) + horodatage |
| `sync-code-perso`, `sync-derniere-synchro` | synchro (**local**) |
| `rappel-notifs-actif`, `rappel-heure-preferee`, `rappel-relance-active`, `rappel-etat-jour` | rappels (**local**) |
| `lissage-marqueur-retard` | marqueur de série pour l'étalement (**local**) |
| `cartes-stats-extra` | compteurs de statistiques propres à l'appareil (**local**) |

### Images des cartes (v121)
- Une carte peut avoir une image côté question (`imageQuestion`) et/ou réponse (`imageReponse`) : URL `data:image/jpeg;base64,…` stockée **dans la carte** (donc dans `cartes-imported`, ou en surcouche `cartes-overlay` si la carte vient du seed). Une seule copie : `ppImgEnregistrer()` écrit dans la carte importée et retire toute surcharge d'image de l'overlay. Absente ou `null` = pas d'image. Valeur validée par `ppImgValide()` (data:image jpeg/png/webp, < 150 000 caractères) à chaque import/synchro.
- Réduction : `ppImgReduire()` (côté le plus long 720 px, JPEG, qualité 0,72 abaissée si > ~90 000 caractères). Plafond global localStorage `IMG_BUDGET_CARS` = 4,2 M de caractères (`ppImgPlace()`, `ppImgAjusterBudget()`) : au-delà, l'image est refusée avec un message (≈ 50 à 60 images). `saveImportedCards()` renvoie maintenant true/false (les autres écritures localStorage échouent toujours en silence).
- Éditeur : composant `ppImgBloc(ctx, cote)` / `ppImgRangee(ctx)` (pastilles « Image question » / « Image réponse », ✕ pour retirer, toucher pour changer). Contextes : `'man'` (Écrire une carte, état `ppMan`), `'fi'` (fenêtre Modifier la carte, état `ppFi`), `'pv:<i>'` (aperçu IA, carte i). Dans l'aperçu IA, si l'IA a reçu des photos, toucher une pastille ouvre d'abord « Une de tes photos » (`iaImgBanque`) avant « Une autre image… ».
- Affichage : `facesCarte()` renvoie `imgAvant` / `imgArriere` (échangés si la carte est posée à l'envers) ; `ppSesDraw()` les affiche (`.pp-qimg`, `.pp-aimg`) ; sur grand écran l'image réponse est dans le panneau de droite (`.pp-ra`). Fiche Parcourir : les deux images. La liste Parcourir n'en affiche pas.
- Données : `construireDonneesProgression()` (export + synchro), import de sauvegarde, `finaliserImport()`, `fusionnerDepuisSync()`, « Partager à un pote » et Importer (`ppDoImport`) transportent les images. Une modification plus récente venue d'un autre appareil remplace aussi les images (y compris leur retrait).
- IA : voir section 11.

### Style des images (v123)
- Look « joli, pas brut » : coins très arrondis (`border-radius` 28 px sur `.pp-qimg` / `.pp-aimg`, 18 px pour la petite miniature de la question quand la carte est retournée, 26 px sur `.synth-fig img`, 24 px sur la visionneuse `.pz-img`, 13/18 px sur les vignettes de l'éditeur), liseré doux (2 px, crème à 16 %), ombre douce + halo fin (`box-shadow`). Marges `14px 5px 6px 0` pour que l'ombre ne soit pas coupée par le défilement de `.pp-body`. Un seul bloc CSS sert la révision, la fiche et le panneau réponse Chromebook. Impression de synthèse (`body.synth-impression`) : coins droits, inchangé.

### Partager des cartes par code (v124)
- Menu ⋯ d'une matière (Parcourir) → **Partager** (libellé court voulu). `ppPartagerMatiere(m)` envoie `{format:'flashcard-partage', version:1, matiere, cartes:[{question, reponse, inversible, imageQuestion?, imageReponse?}]}` en `POST {SYNC_WORKER_URL}/partage` (jamais progression, dates, clé Gemini ni code de synchro) ; le Worker répond `{code, jours}` (code de 6 caractères, alphabet sans I L O 0 1). Une feuille affiche le code (`.pp-sharecode`) avec « Copier » et « Envoyer » (`ppPartageEnvoyer`, partage système du texte).
- **Images** : envoyées telles quelles (déjà réduites à la création par `ppImgReduire`), donc aucune recompression ni perte supplémentaire.
- **Plan B (ancien envoi par fichier .txt, `ppPartagerFichier`)** si hors ligne, délai de 60 s dépassé, ou Worker pas à jour / en erreur : l'app ne casse pas, elle retombe sur le fichier.
- **Réception** : Ajouter → Importer, champ « Code » (`#pp-ij-code`, tolère minuscules/espaces/tirets) → `ppImportParCode(code)` (GET `/partage?code=`, délai 30 s) puis `ppImporterDonnees(data)` : **même chemin que l'import de fichier** (`resolveImportMatieres` → `finaliserImport`), donc cartes neuves étalées et plafonnées comme un cours ajouté normalement, images validées par `ppImgValide`, budget d'images par `ppImgAjusterBudget`. Si la fenêtre est fermée pendant la recherche, rien n'est importé. Code vide = ancien comportement (JSON collé / fichier).
- Erreurs affichées en toast : « Code introuvable ou expiré » (404), « Code invalide », « Pas de connexion », « Serveur indisponible ».
- **Réduction d'image plus nette (v124)** : `ppImgReduire` réduit par paliers ÷2 avec `imageSmoothingQuality='high'` (même taille de fichier visée : 720 px, ≤ ~90 000 caractères, qualité 0,72 abaissée si besoin).

### Agrandir une image : la visionneuse (v122)
- `ppZoomOuvrir(src, depuisEl)` (bloc « v122 : visionneuse d'image », juste avant `let queue`) ouvre `#pp-zoom` (z-index 2000). Un seul écouteur `click` en **capture** sur `document` ouvre la visionneuse pour `img.pp-qimg`, `img.pp-aimg` et `.synth-fig img` ; comme il est en capture, il passe avant le « retourner la carte » (`onclick` du `.pp-body`). Les images `.pp-qimg/.pp-aimg` ne sont donc plus en `pointer-events:none` (curseur loupe, menu long appui bloqué).
- Ouverture : l'image « s'envole » depuis sa place (FLIP : position de la miniature → centre) ; la miniature est cachée pendant l'ouverture et réaffichée à la fermeture. Fermeture : elle retourne à sa place (ou fondu si la miniature n'est plus à l'écran, p. ex. carte suivante).
- Gestes (Pointer Events, `touch-action:none`) : pincer (2 doigts, zoom 1 à 6 centré sur les doigts), double toucher/double clic (1 ↔ 2,6), glisser pour déplacer quand c'est zoomé (bornes + résistance), glisser vers le bas à zoom 1 (le fond s'éclaircit, fermeture si > 110 px ou geste rapide), toucher à côté de l'image ou ✕. Souris : molette / pincement du pavé tactile = zoom, `+` `-` `0`, **Échap** ferme (écouteur `keydown` en capture sur `window` qui bloque Espace/Entrée/etc. derrière) ; `gererRaccourcisClavier` ignore tout tant que `ppZ` est ouvert.
- Rien n'est stocké ; aucun effet sur la carte, le planning ou `derniereModification`.

### Texte facultatif quand il y a une image (v122)
Une carte peut avoir une image à la place du texte d'un côté (question et/ou réponse vide), à condition que **chaque côté ait un texte ou une image**. Vérifié dans : création à la main (`ppAddCard`), fiche (`ppFicheSave`), import de sauvegarde (`finaliserImport`), fusion de synchro (`fusionnerDepuisSync`), « Partager à un pote » (`ppPartagerMatiere`) et Importer (`ppDoImport`). La liste Parcourir affiche « 🖼 Image » à la place du texte vide. **Ne pas réintroduire** `!question || !reponse` seul dans ces endroits : la fusion de synchro jetterait les cartes image seule. Les flux IA (création, ajustement) exigent toujours un texte.

### Images dans les synthèses (v122)
- État : `syntheseEtat.images = [{url, b64, w, h, c}]` (JPEG réduits, jamais sauvegardés comme la synthèse), `syntheseEtat.curseur` (position du curseur dans le Markdown, pour « Ajouter une image »). Dans le Markdown, une image = **ligne seule** `![légende](img:N)` (N à partir de 1) ; `analyserMarkdown` produit un bloc `{type:'img', n, legende}` ; un numéro inconnu est ignoré à l'affichage et dans les exports.
- Sources : (1) photos jointes → `synBanqueSync(s, liste)` les réduit (`ppImgReduire`), les numérote (`f.synN`) et `partiesCoursSynthese()` les envoie précédées de « Image N : » ; appelé avant chaque génération / ajustement / « Compléter » (pour les nouveaux fichiers) ; (2) synthèse d'une matière depuis Parcourir : les images des cartes sont ajoutées à la banque et signalées dans le cours par `[illustration de la question/réponse : img:N]` (l'IA ne les voit pas, elle les place d'après le contexte) ; (3) bouton « Ajouter une image » (écran du résultat, Modifier et Aperçu) : insère `![](img:N)` au curseur (ou à la fin). Max `SYN_IMG_MAX` = 24.
- Prompt : `promptSyntheseBase(s)` = `GEMINI_SYNTHESE_SYSTEM_PROMPT` + `PROMPT_IMAGES_SYNTH` (seulement s'il y a des images) : vraie illustration seulement, jamais une page de texte, une fois max chacune, garder les lignes existantes.
- Rendu : `synFigureHtml()` (`<figure class="synth-fig">`, image cliquable → visionneuse) dans l'aperçu et l'impression de secours. **Word** : `blocsVersDocxXml(blocs, medias)` écrit un `<w:drawing>` inline (max 13 × 10 cm), `word/media/imageN.jpeg`, relations `rIdImgN`, `Default Extension="jpeg"`, espaces de noms `wp`/`a`/`pic` ajoutés à `NS`. **PDF maison** : `construirePdfBlob` pose l'image (`E.imgs`, max 82 % de la largeur × 250 pt, légende en italique gris) et `pdfAssembler(pages, W, H, imgs)` écrit des XObject JPEG (`DCTDecode`, `DeviceRGB`/`DeviceGray` lu dans l'en-tête JPEG par `synJpegInfo`).

## 7. Répétition espacée et planning

Constantes : `INTERVALS = [1, 3, 7, 14, 30, 60, 90]` (jours par palier), `MASTERED_PALIER = 4` (une carte est « maîtrisée » au
palier 4).

- **Cartes neuves jamais décalées par `intervals[palier]`** dans `reprogrammerCartesMatiere()` : cet intervalle compte depuis la
  dernière révision, qui n'existe pas encore.
- **Plafonds** : `NOUVELLES_CARTES_MAX_PAR_JOUR = 20` par matière (étalement des `prochaineRevision` à la création : import IA,
  import JSON de nouvelles cartes, ajout manuel en lot ; une restauration de backup garde ses dates) et
  `CHARGE_GLOBALE_MAX_PAR_JOUR = 30` toutes matières. L'étalement respecte les deux.
- **Fenêtre des cartes neuves avant un contrôle** (`dureeMinimaleMaitrise(matiere)`, `finFenetreCartesNeuves(matiere, dateControle)`) :
  une carte introduite le jour J est maîtrisée au plus tôt à J + INTERVALS[1] + … + INTERVALS[MASTERED_PALIER-1] (intervalles resserrés
  par `getIntervalsForMatiere`, même source que `getMasteryLoad`). Dernier jour d'introduction = D − cette durée, avant la zone
  tampon. Branchée dans `meilleurJourPourCarteNeuve`, `plafonnerDateRevision` (`interdireZoneTampon`) et `finaliserImport`.
  `MARGE_CONTROLE_VISEE_JOURS = 3` : le plafond proportionnel vise une maîtrise ≥ 3 j avant le contrôle. Un changement de date de
  contrôle ramène dans la fenêtre une carte neuve placée plus tard. Pas d'alerte de surcharge (choix de l'utilisateur).
- **Rappels légers** : une carte réussie du 1er coup à sa 1re vue est reproposée le lendemain (~1/3, max 5/jour,
  `RAPPELS_LENDEMAIN_PROBA`) sans changer son palier.
- **Facilité par carte** (`facilite`, défaut 1, bornée 0,7–1,5) : vert +0,1, orange −0,1, rouge −0,2 ; allonge/raccourcit le nombre
  de jours du palier. Exportée, synchronisée, annulable (`undoLastAnswer()`).
- **Sens inversé** (`inversible`) : présentée au hasard dans un sens ou l'autre ; bouton ⇄ par carte et « Tout inverser ».
- **S'entraîner** (quiz : `exitQuiz()`, `quizFlip()`) : score, sans pression, ne modifie pas le planning et ne déclenche pas la synchro.
- **Marge avant contrôle** (`getMasteryLoad`) : calculée depuis aujourd'hui. Les cartes en retard ne sont jamais perdues, elles sont
  comptées « aujourd'hui » (`getCartesDuJour`).
- **Série (streak)** : ne casse que si un des jours sautés avait des cartes dues (`bumpStreak` + `auMoinsUneCarteDueLe`).

### Étalement des retards (`lisserRetards()`)
- **Quand** : à l'ouverture (`init()`, avant le 1er rendu), après chaque récupération de synchro et au retour au premier plan
  (hors session/quiz). Idempotent. Message « N cartes en retard étalées… » (`annoncerEtalement`, retardé de 2 s pour passer
  après le splash).
- **Règle** : on garde 30 cartes non maîtrisées aujourd'hui, les autres vont au 1er jour libre (< 30) entre demain et
  `LISSAGE_RETARDS_MAX_JOURS = 3` jours (avec un contrôle : au plus tard D − temps minimum pour monter les paliers de la carte,
  jamais après la veille). Restent en priorité : moins de marge, puis cartes ratées, puis plus anciennes. Pas de place : la carte
  reste due aujourd'hui. Ne touche pas : cartes maîtrisées, matières archivées, cartes déjà prévues plus tard.
- **RÈGLE IMPORTANTE : `lisserRetards` ne modifie JAMAIS `derniereModification`.** La synchro départage les appareils avec ce
  champ ; sinon un simple décalage écraserait une révision faite sur l'autre appareil.
- Série : marqueur `lissage-marqueur-retard` (date de la plus vieille carte en retard avant décalage), lu par
  `auMoinsUneCarteDueLe`, effacé par `bumpStreak`. Désactivable : `LISSAGE_RETARDS_ACTIF = false`.

### Format de sauvegarde v3 (`construireDonneesProgression()` / `importerProgression()`)
Cartes + `datesControle`, `matieresVides`, `matieresArchivees`, `streak`, `geminiApiKey`, `modelesSynthese`. Un ancien export (tableau
brut) reste importable. Un import qui ne contient que des matières vides les restaure ; JSON cassé, `null`, objet inconnu :
message clair, rien n'est modifié.

### Robustesse (ne pas casser)
Synchro : échecs lisibles (`syncMotifErreur()`, `syncErreurHttp()`). Génération IA (v112) : **délai maximum de 90 s par appel**
(`GEMINI_TIMEOUT_MS`, `fetchGeminiTimeout()` ; un dépassement n'est pas réessayé) et un message pour chaque cas : pas de clé, hors-ligne /
serveur injoignable / trop long (`messageErreurReseau()`), 400, 401-403, 404, 408, 413, 429, 5xx (après 2 essais), autre code
(`messageErreurGemini()`), réponse illisible, contenu bloqué, réponse vide, réponse coupée (`MAX_TOKENS`, avertissement dans la Synthèse). Les erreurs
précisent « Ton texte est conservé » quand c'est vrai. Exports : `telechargerBlob()` libère l'URL après 4 s (sinon échecs sur certains mobiles).

## 8. Rappels de révision (notifications)

Sans serveur : tout est calculé sur l'appareil. Réglages : interrupteur, heure à roues (`rappel-heure-preferee`, défaut `18:00`),
« Relancer si ignoré » (`rappel-relance-active`, `'0'` = désactivé).

- `compterCartesDuesAujourdhui()` : même définition que l'accueil et la session « Réviser » (cartes dues, maîtrisées comprises,
  matières non archivées).
- `verifierEtNotifierSiNecessaire()` : appelée à l'ouverture, toutes les 5 min et au retour au premier plan. État du jour dans
  `rappel-etat-jour` (`{jour, etape, tsPremiere}`) : 1re notif à l'heure choisie s'il reste des cartes ; **une** relance 2 h plus tard
  (`RAPPEL_RELANCE_DELAI_MS`) ; plus rien si le compte tombe à 0.
- Affichage via le service worker (`message` `SHOW_REMINDER` / `SHOW_REMINDER_RELANCE`), nécessaire en TWA. Icône : `icon-192x192-any.png`.
- `serviceWorkerPret()` attend 4 s max (sans SW, ex. navigation privée, `ready` ne se résout jamais).
- Periodic Background Sync (tag `revision-check`) : filet de sécurité non garanti, message générique (le SW n'a pas accès au `localStorage`).

## 9. Service worker

Une app installée reste vivante en arrière-plan : l'ancien SW peut survivre à un déploiement. Mesures en place :
`registerServiceWorker()` appelle `reg.update()` à chaque ouverture et ne force **jamais** de `window.location.reload()` (ça
figeait l'app) ; `skipWaiting` + `clients.claim` ; le nouveau SW sert à la prochaine ouverture normale. Cache : réseau d'abord,
cache en secours ; ne touche pas aux requêtes vers d'autres domaines (Gemini, synchro).

**Toute modification de `sw.js` → incrémenter `SW_VERSION`** (sinon certains navigateurs ignorent la mise à jour). Désinstaller/
réinstaller n'est qu'un dernier recours, quand un déploiement vérifié (bon fichier, bon nom, « Production ») ne se reflète toujours pas.
Le numéro du SW (v32) est **indépendant** du numéro de version de l'app (v92).

## 10. Synchro entre appareils (Worker Cloudflare + KV)

- Pas de temps réel : l'app récupère au démarrage (`recupererDepuisSync()`) et envoie (`envoyerVersSync()`) quand elle passe en
  arrière-plan (`visibilitychange`), à la fermeture (`pagehide`) et à la fin d'une session de révision classique
  (`exitStudySession()`, pas le quiz).
- Identifiant : « code perso » libre, `sync-code-perso`, identique sur chaque appareil. Code vide = module inactif en silence.
- Format échangé : le même JSON que l'export manuel (section 7) + `cartesSupprimees` (tombstones).
- **La fusion se fait côté app** (`fusionnerDepuisSync`) : par carte, la `derniereModification` la plus récente gagne ; un tombstone
  local plus récent que la modif reçue empêche la carte de revenir ; une carte inconnue est ajoutée comme une restauration (dates
  gardées, pas d'étalement) ; dates de contrôle, clé Gemini et modèles de synthèse ont leur propre fusion.
- **Le Worker, lui, écrase le JSON à chaque POST** (pas de fusion). Un appareil neuf doit d'abord récupérer avant d'envoyer
  (c'est ce que fait `validerCodePerso()`) ; ne jamais pousser un état vide avant d'avoir récupéré.
- **Règle du code, imposée par `cleanCode()` dans `worker.js`** : lettres `a-z A-Z`, chiffres, `-` et `_`, 1 à 100 caractères
  (espaces de bords retirés), sinon HTTP 400. Clé KV `sync:<code>`. L'app applique la même règle avant toute requête
  (`SYNC_CODE_CARACTERES`, `SYNC_CODE_LONGUEUR_MAX`, `verifierSoliditeCode()`) et nomme les caractères refusés. **Si l'une des deux
  règles change, changer l'autre.** Un code enregistré qui l'enfreint met la synchro en pause et affiche le motif (`syncErreurCodeHtml()`).
- **Partage par code (v124)** : le Worker a deux routes de plus, `POST /partage` (stocke sous `share:<CODE>` avec `expirationTtl` de 14 jours, renvoie `{code, jours}`) et `GET /partage?code=` (404 si inconnu/expiré). Clés séparées de `sync:` : aucun risque pour la synchro. Limites : 20 Mo et 3000 cartes par partage. **Le fichier `worker.js` est maintenant dans le zip** (à coller dans Cloudflare → Workers → `flashcard-sync-kv` → Modifier le code → Déployer ; **ne pas** le mettre sur Cloudflare Pages avec le reste). Il a été écrit d'après les règles documentées ici (`cleanCode`, `sync:`, binding `FLASHCARD_SYNC`, CORS ouvert, 404 JSON) et testé en local avec un faux KV ; si l'ancien `worker.js` faisait autre chose, comparer.
- Infrastructure : Worker `flashcard-sync-kv`, routes `GET /sync?code=` (404 JSON si rien) et `POST /sync?code=`. URL codée en dur
  dans `SYNC_WORKER_URL` : `https://flashcard-sync-kv.cmpsloic.workers.dev`. Namespace KV du même nom, lié par un binding dont le
  **nom de variable doit être exactement `FLASHCARD_SYNC`** (sinon erreur 1101). CORS ouvert.
- **Point de sécurité connu** : le code perso est le seul secret, et la clé Gemini fait partie des données synchronisées. Un code
  court ou devinable expose donc la clé. Le signaler si l'utilisateur choisit un code trivial.
- Si le Worker est recréé : nouveau namespace KV (ou l'existant) → Worker → binding `FLASHCARD_SYNC` → coller le code → mettre à
  jour `SYNC_WORKER_URL` dans `index.html` (sinon la synchro reste inactive, seul le bloc Réglages affiche un échec).

## 11. Génération IA

- Modèle utilisé : **`gemini-3.5-flash-lite`**, codé en dur à deux endroits : `appelerGeminiPourCartes()` (réponse JSON) et
  `appelerGeminiPourSynthese()` (texte libre), via `fetchGeminiAvecRetry`, sans repli entre versions. Clé Gemini de l'utilisateur,
  collée dans Réglages (`getGeminiKey()`). Pour changer de modèle : modifier les deux URL.
- Entrées acceptées : texte, photos, PDF, `.docx` (texte extrait dans le navigateur sans librairie : `extraireTexteDocx`), `.txt`, `.md`.
- Fonctions : `genererCartesIA()`, `raffinerCartesIA()` (ajustements), `genererCartesSupp()` (« Compléter »), `genererSynthese()`.
- **Fiche de synthèse** : style par défaut dans le prompt, « Précisions » facultatives, modèles enregistrables (`modelesSynthese`,
  exportés et synchronisés), export Word/PDF produit en JS, ajustements à l'IA, « Compléter » avec texte et/ou photos.
- **Images (v121)** : quand des photos sont jointes, `ppPartsFichiers()` les envoie précédées d'un texte « Image n : » et on ajoute `PROMPT_IMAGES` (l'IA peut ajouter `imageQuestion` / `imageReponse` = numéro de la photo, seulement pour une vraie illustration, jamais pour une page de texte ou de notes). `appelerGeminiPourCartes(…, { garderImages:true })` renvoie `nImgQ`/`nImgR` ; `ppImgResoudre()` les remplace par les photos réduites de `iaImgBanque` (numéro invalide = ignoré). La banque est vidée à la fermeture de l'aperçu. `raffinerCartesIA()` : une carte dont la question est restée identique garde ses images actuelles (corrections de l'utilisateur comprises), sinon on prend celles de l'IA ; `genererCartesSupp()` prolonge la numérotation. L'image est la photo entière réduite (pas de recadrage). « Modifier avec l'IA » (cartes déjà enregistrées) ne touche pas aux images.
- **Workers AI (Cloudflare) : absent du code actuel.** Une ancienne version essayait `${SYNC_WORKER_URL}/generer-cartes` avant Gemini ;
  ce code n'existe plus (`appelerWorkersAiPourCartes` et `USE_WORKERS_AI` introuvables). Ne pas le réintroduire sans demande.

## 12. Interface, animations, splash et logo

### Thème « Pop nuit »
Sombre en permanence, posé en dernier dans le CSS (`:root:root:root{...}`). Palette : `--paper/--bg #0c0c12`, `--card/--panel #1a1a26`,
`--ink/--cream #f5f0e6`, `--orange #ff6b3d` (`--orange-d #b8431d`), `--yellow #ffd93d` (`--yellow-d #a8891a`), `--green #2ed8a3`,
`--pink #ff4d7a`. Police Bricolage Grotesque. Les couleurs passent par les variables : ne pas réintroduire de couleurs de texte en dur.
Référence visuelle : prototype `flashcard-pop-nuit-v31.html` (téléphone) et `maquettes-chromebook-v9` (grand écran) : le prototype
est le « manteau », l'app le « mannequin » : on le suit, on ne le réinterprète pas. Règle de ton : l'utilisateur veut **très peu de
texte** à l'écran, pas de phrases qui décrivent ce qu'on peut toucher (v89).

### Écrans et briques (classes préfixées `pp-`)
- Barre du bas / latérale (`TABBAR_ITEMS`, icônes `PP_IC` / `TAB_ICON`), en-tête avec logo, pastille de série et engrenage.
- Briques : feuilles `ppSheet()` / `ppSheetClose()`, page plein écran `ppPageShow(html, classe)`, sélecteur de date `ppPickDate()`, toast `ppToast()`.
- **Révision** (`#pp-ses`, `ppSesDraw()`) : `answer()`, `undoLastAnswer()`, `flipCard()`, glissement, `sortirCarte()`. Ids `anki-card-body` /
  `quiz-anki-card-body` à conserver (raccourcis clavier).
- **Ajouter** : `renderAdd()`, composeur `.pp-cmp` (fichier ou texte > 160 caractères = générer d'autres cartes, sinon = ajustement).
  Piège : ne pas utiliser `:has(>.pp-cmp)` pour l'écran IA (l'aperçu contient aussi un `.pp-cmp`) ; on utilise `.pp-add:has(>.pp-alt)`.
- **Planning** (téléphone) : `renderPlanning()` (semaine « À venir » avec barre de marge), `ppCtrlSheet(matière)`. Sur grand écran, même
  calcul via `ppPlanCompute()` dans l'accueil.
- **Parcourir** : `renderBrowse()`, fiche `ppFiche(id)`. Menu ⋯ d'une matière (`ppGrpMenu`) : Modifier avec l'IA, Inverser, **Partager à un pote** (`ppPartagerMatiere`, v119 : fichier `Cartes <matière>.txt` en `text/plain` via Web Share, sinon téléchargement ; contient seulement question/réponse/inversible, format `{format:'flashcard-partage', matiere, cartes}` ; le pote l'importe par Ajouter → Importer, qui lit `data.matiere`). Menu ⋯ : aussi **Faire une synthèse** (`ouvrirSyntheseDepuisParcourir`, v119) : `source:'parcourir'`, le « cours » = les cartes de la matière (Q/R) ; l'écran Précisions affiche un bloc facultatif « Fichiers en plus » (`handleFichiersSynthSource`, fichiers ajoutés à `s.fichiers`) avant « Précisions pour l'IA ». `.pp-it` porte `data-id` ; `onBrowseSearchInput` garde `.pp-fp` hors des enfants supprimés.
- **Statistiques** : `ppStatsHtml()`, ouverte par la pastille de série. **Synthèse** : `#synth-overlay`, `renderSynthese()`, `ppSynSend()`.
- **Réglages** : `ppSettings()` → `ppSetDraw()` (repère `.pp-setroot`). Sections : Rappels, Génération IA (« Changer » ouvre un champ
  pré-rempli, « Retirer la clé »), Synchronisation (bouton à états `validerCodePerso()`), Sauvegarde. Ids à conserver :
  `gemini-key-input`, `sync-code-input`, `sync-btn`, `sync-statut`, `sync-code-erreur`, `import-file-input`. Phrases courtes.
  Pas de couleur de matière enregistrée : `couleurMatiere()`.
- **Accueil, grand écran sans contrôle à venir** (v119) : `ppCtlAddHtml()` met à la place du bandeau contrôle un bouton `.pp-ctl.pp-ctl-add` « Ajouter une date de contrôle » (jaune, pointillés, `+` à droite), même emplacement (colonne de droite, ligne 1). Il ouvre `ppCtrlSheet('')`. Caché sur téléphone Grand écran, bloc « Matières et contrôles » : le bouton d'en-tête s'appelle **« + Matière »** et ouvre `ppSubjSheet()` (« Nouvelle matière », v119 ; avant : « + Contrôle » → `ppCtrlSheet('')`) ; le contrôle d'une matière se règle en touchant sa ligne (CSS) ; absent s'il n'y a aucune matière active ou dès qu'un contrôle à venir existe (`getPlanningSummary()`).
- **Accueil** : la carte « À réviser aujourd'hui » (`.pp-hero`) a deux cartes dessinées derrière (`::before` pleine +8°, `::after` en contour −8°,
  derrière le bouton « Réviser »), sans animation.

### Règle d'animation : « un bouton qui s'enfonce »
Toute animation d'interaction est un bouton qui descend de la hauteur de son ombre décalée (l'ombre tombe à 0) puis revient. L'appui est net
(descente 0,07 s) ; le **retour** a un petit rebond de ressort (`--ease-press` = `--spring`, `--t-out` .36 s) ; les entrées (`ppup`, `ppcardIn`,
`ppflipIn`, `pppop`) dépassent légèrement avant de se poser. Mécanisme unique : bloc CSS « ÉTAPE C » à la fin du `<style>`.
- `--d` = profondeur (2px par défaut ; 4px pour `.pp-cta`, `.pp-show`, `.pp-ans`, `.pp-ctl`, `.home-cta`, `.modal-save` ; 3px pour `.pp-sec`,
  `.pp-back`, `.pp-snd`, `.pp-mb .pp-bk`, `.pp-pd.sel`, `.modal-cancel` ; onglet actif 4px), `--sc` = couleur de l'ombre, `--t-in` .07s, `--t-out` .2s.
- Deux listes de sélecteurs `:is(...)` (transition, appui `:active` ou `.js-press`) et **un seul script JS** qui pose `.js-press` (gardée jusqu'au
  relâchement, 120 ms minimum).
- **Nouveau bouton → l'ajouter aux deux listes ET à `sel` du script d'appui**, définir `--d` / `--sc` s'il a une ombre. Ne jamais écrire de
  `:active{transform:scale(...)}`. Exceptions : `.pp-mode`, `.pp-it`, `.pp-ghm` (`:active` seulement).
- `prefers-reduced-motion` : `--t-in` / `--t-out` ≈ 0 ; la couche « vie » et le splash s'éteignent.
- **Haptique** (`haptique(ms)`) : 6 ms à chaque appui, 10 ms au retournement, 12 / [10,40,10] / [18,50,18] à la réponse facile / difficile / pas su,
  8 ms au geste armé. Sans effet sur Chromebook et iOS.
- `.pp-pastille` et `.pp-toast` n'utilisent plus `transition:all` ; le `width` de `.pill-bubble` est gardé (le JS pilote sa largeur).

### Retournement de la carte de révision
Toucher le corps de la carte (`.pp-body`) : `.pp-sink`, descente de **9px bas ET 9px droite** (l'ombre orange est diagonale), ombre à 0. Au
relâchement, `flipCard()` / `quizFlip()` passent par `ppRetournerApresEnfoncement()` (attend au plus `PP_ENFONCE_MS = 80` ms), puis `ppSesDraw()`
recrée la carte déjà enfoncée et la fait remonter. Glissement : dès 8px, l'enfoncement est annulé et la carte suit le doigt. Longue réponse
(`.peut-defiler`, `touch-action:pan-y`) : `pointercancel` → pas de retournement. Deux taps en moins de 80 ms : un seul retournement.
- La barre du bas de la session ne bouge pas au retournement (`.pp-still`, v86) ; elle garde son animation à l'arrivée d'une nouvelle carte.
- Grand écran (v87) : le panneau réponse `.pp-ra.on` se pose comme un bouton qui remonte (`ppraIn`) et son contenu apparaît en fondu (`ppraTxt`) ;
  la question ne refait pas de fondu ; `ppKeep` mémorise la transform/box-shadow de l'ancienne carte et la phase des animations en boucle
  (plus de saut de flottement).
- Grand écran (v92) : boutons Pas su / Difficile / Facile grisés ET enfoncés avant retournement, « relâchés » au retournement (`ppUnpress` .4 s,
  décalage .04 s entre boutons, + `ppActsLit` .26 s). Le téléphone garde `viePop` en cascade. À régler ici si trop/pas assez discret.

### Faux splash (`#boot-splash`)
Calque HTML/CSS/SVG juste après `<body>`, affiché **après** le splash natif Android (il le prolonge). Fond uni `#0c0c12` (= fond de l'app : le
splash natif ne peut avoir qu'une couleur unie).
- **Logo** = deux cartes penchées (orange + coche devant, crème derrière), SVG `viewBox 512` (`#boot-splash-card`), boîte 288×288 centrée,
  `translateY(-3px)`, **mêmes coordonnées que les PNG**. Structure : `<g translate>` > `#bs-hop` > carte crème (fixe) + `<g rotate(-8…)>` qui contient les
  faces `#bs-yellow` / `#bs-orange`. **Ne jamais mettre l'attribut `transform` sur `#bs-hop`, `#bs-orange`, `#bs-yellow`** (l'animation CSS le remplacerait).
- **Règle d'or : à l'image 0 le logo est déjà posé, fixe, identique à l'icône** (raccord invisible avec le splash natif). Fixe ~0,1 s, puis l'animation
  part de cette pose.
- **Séquence 1,2 s** (~1,35 s avec le fondu ; 0,7 s et 0,95 s ont été jugés « trop rapides » : on ne coupe que les temps morts) : la carte orange
  s'enfonce de 12px en diagonale (`#bs-of` / `#bs-os`) et laisse place à la face jaune « ? » (`#bs-yf` / `#bs-ys`) qui remonte ; saut avec écrasement
  (`bsHop`) ; la face jaune s'enfonce à son tour, l'orange revient avec un 2e saut ; la coche se redessine puis pulse (`bsChk` + `bsPop`). « Flashcard »
  (`#boot-splash-word`) monte en fondu à 0,1 s. Tout est en translation/échelle (cohérent avec la règle « bouton qui s'enfonce »).
- **Sortie** : fondu doux 1,1 s → 1,35 s (`bootSplashBg` + `bsOut` : le logo rétrécit à 94 %). Le script de fin retire l'élément sur `animationend`
  (filet `setTimeout(reveal, 2000)`) et pose `body.splash-done` (les animations de l'accueil attendent cette classe).
- **Changer la durée** : modifier ensemble les `1.2s` des animations `bs*`, le délai de `bootSplashBg` et `bsOut` (1.1s), le `setTimeout` de sécurité
  (2000) et le délai du toast d'étalement (1700).

### Logo et icônes
Deux cartes **penchées** en éventail : carte orange `#ff6b3d` (ombre `#b8431d`, coche crème `#f5f0e6`) devant une carte crème `#f5f0e6` (ombre `#9c9588`).
Coins `rx=34`, trait de coche 22. Géométrie (viewBox 512) : chaque carte = ombre 170×216 en (177,154) + carte en (165,142), coche
`M204 253 L238 290 L306 210`. Devant : `rotate(-8 250 250) translate(-6 2)` ; fond : `rotate(10 250 250) translate(14 -4)`. Le tout recentré par
`translate(-6 0.5)`. Les PNG sont rendus **depuis ce même SVG** (Chromium, transparent) : raccord exact avec le faux splash.
- `icon-*-any.png` : fond transparent ; `icon-512x512-maskable.png` : même logo sur fond plein `#0c0c12`, dans la zone de sécurité.
- Aussi : `favicon` (64×64, logo agrandi) et `apple-touch-icon` (180×180, fond `#0c0c12`) en data-URI dans `<head>`.
- Logo d'en-tête : `#pp-logo-icon` reçoit le mini SVG (`renderTopbarRight()`), `.pp-logo i` fait 29×32.
- **Si le logo change** : modifier ensemble le SVG de `#boot-splash-card`, le mini SVG de `renderTopbarRight()`, les 3 PNG, le favicon et l'apple-touch-icon
  (+ repasser par PWABuilder pour le splash natif, section 5).

### Couche « vie » (v74) — l'app bouge même au repos
Purement additive : bloc CSS « COUCHE « VIE » » tout en dernier dans le `<style>` (dans `@media (prefers-reduced-motion:no-preference)`) + un `<script>` en toute fin
de fichier. Aucune logique d'app.
- **Ambiance** : `#vie-ambiance` (3 lueurs orange/rose/jaune qui dérivent, derrière tout) + canvas d'**onde de points** (une seule source au coin haut-droit,
  longueur d'onde 52 px, ~30 images/s, coupée si `document.hidden` ou `body.sans-vie`). Les écrans `.pp-page` et `#pp-ses` ont leur fond opaque : l'onde
  ne se voit que sur l'accueil. Réglages grand écran : voir tableau section 3.
- **Au repos** : logo d'en-tête qui respire + clin d'œil (`vieLogo`), gros chiffre de l'accueil dont l'ombre se creuse (`vieBreath`), bouton principal qui rayonne
  (`vieGlow`, via `filter`), icône d'onglet actif qui flotte, reflet sur les barres de progression, flamme de série lumineuse, carte de révision qui flotte
  (`vieFloat` sur `.pp-stage`, le PARENT de la carte), point de matière qui pulse.
- **Clin d'œil** : après 7 s sans toucher, le bouton « Afficher la réponse » s'enfonce tout seul (`.vie-nudge`, 600 ms, max 1 fois / 9 s), **uniquement pendant une
  session** (`body.pp-ses-on`) et jamais si une feuille/modale est ouverte. (Il n'y a plus d'anneau au toucher : `.vie-ring` n'existe plus.)
- **Règles** : (1) jamais d'animation en boucle sur `transform` / `box-shadow` d'un élément qui s'enfonce (elle écraserait `:active` / `.js-press`) → passer par un
  parent, `filter` ou `text-shadow` ; (2) « bouton qui s'enfonce » reste LE mécanisme d'appui ; (3) tout couper : classe `sans-vie` sur `<body>`.
- Non vérifié au navigateur : fluidité réelle sur Pixel 9a et Chromebook, et absence de gêne du fond animé.

## 13. Style de communication attendu

L'utilisateur n'est pas développeur : expliquer simplement, étape par étape, sans jargon non expliqué. Instructions numérotées et concrètes plutôt que
théoriques. Il écrit en français, de façon directe et familière : répondre sur le même registre. Il a déjà eu plusieurs confusions sur les noms de fichiers et
les caches (navigateur, SW, Cloudflare) : être précis et explicite sur ces points. Il préfère recevoir **un seul zip prêt à dézipper et uploader**. Il veut peu
de texte dans l'interface.

## 14. Procédure pour toute mise à jour

1. Comprendre la demande ; poser une question si elle a plusieurs lectures. Préciser **sur quel appareil** (téléphone / Chromebook / les deux).
2. **Lire le `index.html` actuel** (le demander s'il n'est pas dans la conversation), ne jamais deviner l'état du code. Chercher les fonctions par nom (`grep`).
3. Dire dès le début si la demande nécessite de repasser par PWABuilder (section 5).
4. Ne modifier que les fichiers concernés (`index.html` la plupart du temps ; `sw.js` seulement pour le cache/les notifications ; `manifest.json` pour
   nom/icônes/couleurs), par remplacements ciblés. **`sw.js` modifié → incrémenter `SW_VERSION`.**
5. Vérifier la syntaxe avec un parseur (JS, JSON) et tester dans un vrai navigateur (Chromium headless) **à 412 × 915 et à une taille grand écran** avant de livrer.
6. **Mettre à jour ce MD** : l'état courant dans les bonnes sections (pas seulement une ligne d'historique), le numéro de version en tête, `SW_VERSION`, le
   nombre de lignes si utile, puis une ligne dans la section 15.
7. **Livrer un seul zip contenant TOUS les fichiers** (3 fichiers de code, 3 icônes, `.well-known/assetlinks.json`, + le MD), noms exacts.
8. **Rappeler que le déploiement doit inclure tous les fichiers sauf le MD et `worker.js`** (section 4).
9. Pour une nouvelle IA : donner la procédure Cloudflare complète, puis test sur `https://flashcard2-4ra.pages.dev` avant de toucher à l'APK.
10. Ne proposer désinstallation/réinstallation que si un déploiement vérifié ne se reflète pas.

## 15. Historique résumé (par thème, pour comprendre l'origine des règles)

- **Interface « Pop nuit »** : portage du prototype écran par écran (v48 → v55), v55 icône « Réviser », édition de la clé Gemini, couleurs de barres (partie web).
- **Animation** : v56 règle « bouton qui s'enfonce » + carte de révision ; v73 rebond de ressort au retour + haptique ; v74 couche « vie » ; v80 onde de points qui
  traverse l'écran ; v81 onde plus épaisse ; v82 onde plus discrète et limitée sur grand écran.
- **Planning** : v57-58 barre de marge, étalement des retards ; v59 étape E + correctif d'étalement.
- **Synchro** : v60 règle du code perso.
- **Splash et logo** : v61 nouveau faux splash ; v62 nouveau logo et icônes ; v63 logo en cartes penchées ; v64 animation « enfoncement + ? » + fondu ; v65-v69 durée
  réglée (0,7 s et 0,95 s trop rapides ; retenu ~1,35 s avec fondu).
- **Chromebook** : v70 mise en page grand écran (barre latérale, clavier, souris) ; v71 révision centrée ; v72 splash propre sur grand écran ; v82 centrage + barre
  rapprochée ; v84 refonte « maquettes-chromebook-v9 » (accueil 2 colonnes, révision en deux panneaux, Parcourir liste + fiche) ; v85 planning dans l'accueil, fenêtres
  centrées, Réglages 2 colonnes, Statistiques en grille, Ajouter en carte héros ; v86 barre de session fixe au retournement (tous appareils) ; v87 retournement plus fluide ;
  v88 dessin des deux cartes derrière l'accueil (tous appareils) ; v89 textes d'aide retirés ; v90 fond bloquant derrière Statistiques/Synthèse + carte en contour inversée ;
  v91 marge de session (rebond non coupé, fond continu) ; v92 boutons de réponse « relâchés » au retournement.

- **Erreurs IA** : v112 délai maximum de 90 s sur les appels Gemini (avant : « génération en cours » infini si le serveur ne répondait jamais) + messages d'erreur détaillés pour chaque cas, cartes et synthèse.

- **Réglages** : v113 encart « Aussi sur le web » (`ppWebHtml()`, sous Synchronisation) : rappelle que l'app existe en site web et affiche l'adresse, lue sur la page (`window.location.origin`, donc toujours juste) avec un bouton « Copier » (`ppCopierLienSite()`). Rien d'affiché en localhost ou depuis un fichier local (export HTML).

- **Accueil téléphone** : v114 les deux cartes dessinées derrière « À réviser aujourd'hui » descendues d'environ 18 px (`top` 10→28 px et 52→70 px dans le bloc `@media (max-width:899px), (max-height:479px)` de v104). Grand écran inchangé.

- **Bug corrigé (v115)** : « Ajouter un contrôle » (Planning, téléphone) ouvrait la fiche d'une matière existante (ex. « Pays UE », avec « Retirer la date ») quand toutes les matières avaient déjà une date. `ppCtrlSheet('')` active maintenant `ppCtrlAjout` : titre « Ajouter un contrôle », pastilles de matières + pastille « + Matière » (`ppSubjSheet()`), pas de « Retirer la date ». Toucher une matière garde la fiche d'édition.

- **Bug corrigé (v117)** : la Synthèse restait sur « Génération en cours » à l'infini. Cause : `partiesCoursSynthese()` était appelée (génération, ajustement, « Compléter ») mais n'était définie nulle part → erreur JS avant l'envoi, sans message. La fonction existe maintenant (texte du cours + fichiers), et `genererSynthese` / `ajusterSynthese` / `completerSynthese` sont enveloppées d'un filet (`synthErreurImprevue()`) : toute erreur imprévue débloque l'écran et affiche un message.

- **Planning téléphone (v118)** : le bouton pointillé en bas de la liste des matières s'appelle maintenant « Ajouter une matière » et ouvre la feuille « Nouvelle matière » (`ppSubjSheet()`), au lieu de la feuille « Ajouter un contrôle ». Pour régler un contrôle : toucher une matière. Chromebook inchangé (le bouton « Contrôle » de l'accueil ouvre toujours `ppCtrlSheet('')`).

- **Retours à la ligne (v120)** : question et réponse d'une carte gardent maintenant leurs retours à la ligne à l'affichage (révision, panneau réponse Chromebook, fiche) via `white-space:pre-line` sur `.pp-qt` et `.pp-at`. Les textes étaient déjà enregistrés avec leurs `\n` ; seul l'affichage les écrasait, donc les cartes existantes sont corrigées d'un coup. La liste Parcourir (`.pp-it`) reste volontairement sur une ligne tronquée. `sw.js` inchangé (`SW_VERSION` inchangé).

- **Images des cartes (v121)** : images sur la question et/ou la réponse (création à la main, aperçu IA, fiche), l'IA peut en attacher parmi les photos fournies et l'utilisateur peut les changer ou les retirer. Voir la section 6 (« Images des cartes ») et la section 11. `sw.js` inchangé.
- **Visionneuse, texte facultatif, images dans les synthèses (v122)** : toucher une image de carte ou de synthèse l'agrandit (pincer, double toucher, glisser pour fermer, molette et Échap sur Chromebook) ; une carte peut n'avoir qu'une image d'un côté ; les synthèses acceptent des images (photos jointes, images des cartes d'une matière, ajout à la main) et les exportent en Word et en PDF. Voir section 6 (trois sous-sections v122). `sw.js` inchangé.
- **v126** : le calendrier de choix de date (`#pp-psheet`, `ppPickDate`) se ferme maintenant en glissant vers le bas, exactement comme les autres fenêtres du bas ; avant, seul `#pp-sheet` avait le geste. Le geste est factorisé dans `ppSwipeFeuille(feuille, voile, fermer)` (appelé pour `#pp-sheet` et `#pp-psheet` par `ppSheetSwipe`) et `ppSouris(...)` ajoute le glisser **à la souris / pavé tactile** (Chromebook, démarre après 8 px, ignore les champs de saisie, le relâchement ne déclenche pas de clic) ; `ppPageSwipe` (Statistiques) l'utilise aussi. Toute nouvelle feuille du bas doit passer par ce même geste. `sw.js` inchangé.
- **v125** : le code de partage est vérifié avec exactement l'alphabet du Worker (`[A-HJKMNP-Z2-9]`, sans I L O) ; avant, la lettre O passait la vérification locale à tort.
- **Partager par code (v124)** : « Partager » donne un code de 6 caractères via le Worker (nouveau `worker.js`, 14 jours de validité), saisi dans Ajouter → Importer ; plan B fichier ; images envoyées sans perte ; réduction d'image plus nette. Voir section 6 (« Partager des cartes par code ») et section 10. `sw.js` inchangé.
- **Images plus jolies (v123)** : coins très arrondis, liseré doux et ombre douce sur les images des cartes et des synthèses, vignettes et visionneuse arrondies aussi. CSS seulement, aucune logique changée. Voir section 6 (« Style des images »). `sw.js` inchangé.

## 16. Ce qu'il reste à faire / points ouverts

- **Côté utilisateur** : déployer le zip v92 sur Cloudflare (tous les fichiers sauf le MD). Régénérer l'APK **seulement** si ce qui est figé dans l'APK a changé
  (logo/icône, couleurs de barres, nom, signature) : demander ce qu'il a déjà installé avant de supposer. Tous les changements Chromebook et « vie » sont web seulement.
- **À vérifier sur appareils** : fluidité du faux splash, de l'enfoncement de la carte et de la couche « vie » (Pixel 9a et Chromebook) ; longues réponses qui défilent ;
  synchro avec un code valide sur les deux appareils ; sur grand écran, si les boutons de réponse (v92) sont assez/trop discrets.
- **Limite connue des images (v125)** : une photo très dense (texte fin, 4000 px) dépasse ~90 000 caractères à 720 px, donc `ppImgReduire` descend vers ~576 px (qualité ~0,64) pour tenir dans le budget localStorage ; schémas et photos simples restent à 720 px. Mesuré : la réduction par paliers (v124) est plus fidèle que l'ancienne (PSNR +4 dB, fichier ~30 % plus léger à taille égale) mais légèrement plus douce. Pistes si l'utilisateur veut plus net : WebP (~30 % plus léger, **mais** l'export Word/PDF des synthèses lit du JPEG : `synJpegInfo`, `word/media/imageN.jpeg`) ou IndexedDB.
- **À vérifier (v124)** : après avoir collé le nouveau `worker.js` dans Cloudflare, tester Partager → code → Importer sur un autre appareil ; vérifier que la synchro marche toujours (Réglages). Tant que le Worker n'est pas à jour, Partager retombe sur le fichier.
- **À vérifier (v121)** : la synchro envoie maintenant les images dans le même JSON (plus lourd) ; le code du Worker `worker.js` n'est pas dans le zip : vérifier qu'il n'impose pas de taille maximale (une valeur KV peut aller jusqu'à 25 Mo). Pas de recadrage d'image ni de stockage hors localStorage (IndexedDB) pour l'instant.
- **Limites connues** : la Synthèse n'a pas de mise en page dédiée sur grand écran (fenêtre simple) ; « réussite » dans la colonne de l'accueil grand écran = part des cartes
  déjà vues qui ne sont pas au palier 0 (approximation) ; aucune alerte de surcharge (choix de l'utilisateur).
  v119 : « Partager à un pote » dans le menu ⋯ d'une matière (Parcourir) ; Importer (Ajouter et Réglages) accepte aussi les .txt.
  v119 (suite) : rappel discret des touches Entrée / Maj / Suppr dans la barre de maîtrise de la révision (souris) ; « Faire une synthèse » dans le menu ⋯ d'une matière (Parcourir), fichiers facultatifs.
  v119 (suite) : bouton « Ajouter une date de contrôle » sur l'accueil Chromebook quand aucun contrôle n'est prévu.
  v119 (suite) : sur l'accueil Chromebook, le bouton « + Contrôle » de « Matières et contrôles » devient « + Matière » et ouvre « Nouvelle matière ».
