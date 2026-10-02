# 🃏 Flashcard

### Ton cours entre dans l'app. Il reste dans ta tête.

**Colle ton cours, prends-le en photo ou glisse ton PDF : l'IA en fait des cartes en quelques secondes. Ensuite, l'app te dit exactement quoi réviser aujourd'hui, et te prévient quand un contrôle approche.** Plus de « je commence par quoi ? », plus de révisions de dernière minute : tu arrives au contrôle avec de la marge.

![PWA](https://img.shields.io/badge/PWA-installable-ff8a2b)
![Hors ligne](https://img.shields.io/badge/hors%20ligne-oui-ffd23f)
![Sans compte](https://img.shields.io/badge/sans%20compte-oui-2b2b3a)
![Langue](https://img.shields.io/badge/langue-fran%C3%A7ais-2b2b3a)

<!-- Ajoute ici 2 ou 3 captures d'écran :
<p align="center">
  <img src="docs/capture-reviser.png" width="240" alt="Réviser">
  <img src="docs/capture-planning.png" width="240" alt="Planning">
  <img src="docs/capture-ajouter.png" width="240" alt="Ajouter">
</p>
-->

---

## ⚡ Ce qui fait la différence

### 📸 De ton cours à tes cartes en un clin d'œil
Texte collé, photo du tableau, PDF, Word, fichier texte : tu déposes, l'IA génère les cartes. Tu relis, tu corriges, tu valides. Fini les heures à recopier. Tu peux même demander à l'IA de **retoucher toute une matière** : elle te propose les changements, et c'est toi qui acceptes ou refuses carte par carte.

### 🧠 Les bonnes cartes, au bon moment
Chaque réponse (rouge, orange, vert) décide quand la carte reviendra : demain, dans 3 jours, 1 semaine, 2 semaines… jusqu'à 3 mois. Ce que tu sais déjà s'efface de ta file. Ce qui te résiste revient. Tu passes ton temps sur ce qui compte vraiment.

### 📅 Un planning qui pense à ta place
Tu donnes la date de tes contrôles, l'app calcule le reste :
- ta **marge avant chaque échéance**, visible d'un coup d'œil ;
- un badge **« À risque »** quand un contrôle approche et que ça ne suit pas, pour ne jamais être surpris ;
- les **cartes en retard étalées intelligemment** sur les jours suivants, au lieu de te tomber dessus d'un seul coup ;
- les derniers jours, **zéro carte neuve** : que de la révision, pour arriver serein ;
- le contrôle passé, la matière s'**archive toute seule**.

### 🔄 Une carte, deux sens
Un bouton ⇄ et ta carte marche dans les deux sens : question → réponse, puis réponse → question. Une seule carte, une seule progression, et l'app choisit le sens au hasard pour t'empêcher de réviser en pilote automatique.

### 📝 Ta fiche de synthèse, prête à imprimer
À partir de ton cours, l'IA rédige une fiche selon **tes consignes**. Tu la lis, tu la modifies, puis tu l'exportes en **Word ou PDF**. Tu peux garder tes consignes préférées comme modèle.

### 🔁 Ta progression te suit partout
Avec ton code perso (sans compte, sans mot de passe à inventer), tes cartes, tes paliers et ta clé IA passent d'un appareil à l'autre. Tu révises sur le téléphone dans le bus, tu retrouves tout sur la tablette le soir.

### 🤝 Partage une matière en 6 caractères
Un code, un copier-coller, et ton pote a toutes tes cartes. Aussi simple que ça.

### 🔔 Un rappel qui sait insister (gentiment)
Tu choisis l'heure. Si des cartes t'attendent, tu reçois la notification ; si tu l'ignores, un second rappel arrive 2 h plus tard. De temps en temps, l'app glisse aussi quelques cartes déjà maîtrisées pour qu'elles ne s'oublient pas.

---

## 🎮 Et au quotidien

- **Réviser** : de grands boutons de réponse toujours à portée de pouce, un bouton « annuler » si tu t'es trompé, un **mode Quiz** pour changer de rythme.
- **Série** : ta flamme monte tant que tu révises. Elle ne casse que si tu as vraiment laissé des cartes en retard.
- **Statistiques** : ce que tu maîtrises, matière par matière, en un coup d'œil.
- **Parcourir** : recherche, modifie, partage ou supprime n'importe quelle carte.
- **Cartes illustrées** : ajoute tes photos à tes cartes (schémas, cartes, formules).

## 🎨 L'esprit

Une app **fluide, vivante et cohérente**. Tout réagit au toucher : les boutons s'enfoncent comme de vrais boutons en relief, la carte se retourne tout en douceur, et le fond bouge légèrement même au repos. Le style *Pop nuit* mêle un fond sombre à des touches d'orange et de jaune. Réviser doit donner envie de rouvrir l'app, pas de la fuir.

## 📲 Installer l'application

**Sur Android (APK)**
1. Va dans la section [**Releases**](../../releases) de ce dépôt.
2. Télécharge le fichier `.apk` de la dernière version.
3. Ouvre-le et autorise l'installation depuis cette source si Android te le demande.

**Depuis le navigateur (PWA)**
1. Ouvre l'adresse de l'app dans Chrome.
2. Menu ⋮ → **Installer l'application** (ou **Ajouter à l'écran d'accueil**).

Et ça marche **sans connexion** : métro, train, salle sans réseau, tes cartes sont là.

## 🔒 Tes données

Pas de compte, pas de pub, pas de pistage. Tes cartes et ta progression restent **sur ton appareil**. La synchronisation est facultative : si tu l'actives, elle passe par ton code perso, rien d'autre. Tu peux aussi exporter toute ta progression en un fichier quand tu veux.

## 🛠️ Technique

- Application web progressive (PWA) : `index.html` + `manifest.json` + service worker `sw.js`
- HTML, CSS et JavaScript, sans framework
- Fonctionne hors ligne grâce au cache du service worker
- Génération IA avec ta propre clé Gemini (à renseigner dans les Réglages)
- Dossier `worker/` : partie serveur légère (synchronisation et génération IA)
- Hébergement : Cloudflare Pages

## 📁 Structure du dépôt

```
index.html       l'application complète
sw.js            service worker (mode hors ligne)
manifest.json    configuration PWA
icon-*.png       icônes de l'app
worker/          fonctions serveur
docs/            documentation
.well-known/     liaison avec l'app Android
```

---

<p align="center">Fait avec ❤️ pour réviser sans stress.</p>

