/* Service worker de Memoria.
   - Gère le cache basique (comme avant, pour le fonctionnement PWA hors-ligne).
   - Gère un rappel quotidien local : le client (index.html) programme un
     'setTimeout' via une notification différée en storant l'heure voulue ;
     comme un service worker peut être tué par le système à tout moment,
     on utilise plutôt un mécanisme de vérification périodique via
     'periodicSync' quand disponible, et en repli une vérification à
     chaque activation/ouverture de page (moins fiable mais fonctionne
     sans permission supplémentaire).

   IMPORTANT : incrémente SW_VERSION à chaque déploiement qui modifie ce
   fichier. Ça garantit que le navigateur voit un fichier différent et
   installe la nouvelle version au lieu de garder l'ancienne en cache.

   v3 : plus aucun window.location.reload() automatique n'est déclenché côté
   client (index.html) suite à une mise à jour de ce service worker — cf.
   bug remonté où l'app installée (mode standalone) se figeait (plus aucun
   clic possible) quelques secondes après l'ouverture, probablement à cause
   d'un reload forcé en plein milieu de l'usage. Ce SW nettoie aussi tout
   cache résiduel d'une version antérieure au démarrage, par précaution.

   v156 : v336 (statistiques : plus de cartes en pause ni de matières archivées dans les chiffres) : index.html change, donc nouvelle version du cache.

   v155 : v335 (filet de secours flash-lite avec réflexion haute pour les cartes, la synthèse et Prof) : index.html change, donc nouvelle version du cache.

   v154 : v334 (création de cartes : modèle gemini-3.5-flash + réflexion « low » avec repli automatique, comme la synthèse) : index.html change, donc nouvelle version du cache.

   v153 : v333 (synthèse : prompt de style nettoyé, style en system_instruction, ordre du message, modèle gemini-3.5-flash + réflexion « low » avec repli ; fiche d'une carte : fermer enregistre, bouton Annuler) : index.html change, donc nouvelle version du cache.

   v152 : v332 (prompt de création de cartes : listes sans oubli, cours de langue, contexte dans la question, rappel final après le cours) : index.html change, donc nouvelle version du cache.

   v151 : v331 (Prof : prompt réécrit, chaque règle dite une seule fois, rangée par thème) : index.html change, donc nouvelle version du cache.

   v150 : v330 (Prof : modèle plus gros et réflexion « medium » avec repli automatique, prompt avec table de routage des actions) : index.html change, donc nouvelle version du cache.

   v142 : v309 (Chromebook : les fenêtres épousent leur contenu, Réglages plus aérés ; import de cartes par code uniquement, plus de JSON collé).

   v141 : v308 (correctif synchro : une carte reçue sans image n'efface plus l'image locale, et une image manquante ici revient si l'autre appareil l'a ; miniatures des images dans Parcourir).

   v140 : v307 (RAPPELS APP FERMÉE par Web Push : l'app s'abonne et le Worker envoie le rappel et la relance via D1 ; Réglages : « Tester la notification », rappels aussi sur iPhone et Mac ; relance désactivée par défaut) : écoute « push », le cache « memoria-etat » survit au nettoyage des caches.

   v139 : v306 (intro, écran Prof : réponses de Prof de structures variées, plus de « tu valides ? » partout) : index.html change, donc nouvelle version du cache.

   v138 : v305 (intro, écran Prof : Prof ne répète plus la demande, il répond par de courts messages variés du type « C'est prêt, tu valides ? ») : index.html change, donc nouvelle version du cache.

   v137 : v304 (intro, écran Prof : un peu moins rapide, pause plus longue avant le message suivant) : index.html change, donc nouvelle version du cache.

   v136 : v303 (intro, écran Prof : mots, points de réflexion et enchaînement des messages plus rapides) : index.html change, donc nouvelle version du cache.

   v135 : v302 (menu de la fiche : icône pause/reprise comme sur PC ; intro : synchro avec un fichier qui voyage, Prof : fusion + déplacement en un seul message, « Appliquer » plus rapide) : index.html change, donc nouvelle version du cache.

   v133 : introduction, écran Maîtrise : les cartes se classent seules dans trois dossiers (Demain / 3 jours / 7 jours) : index.html change, donc nouvelle version du cache.

   v132 : v296 (introduction : écrans Maîtrise (frise où la carte saute de station en station, doigt de démo, étincelles) et Planning (jours réels, piles de cartes, drapeau qui vole, plus rapide)) : index.html change, donc nouvelle version du cache.

   v131 : v295 (introduction : démos automatiques — maîtrise, planning sans boutons, synchro aller-retour ; halo jaune de Prof retiré ; un seul bouton « Go réviser » à la fin) : index.html change, donc nouvelle version du cache.

   v129 : v278 (le mot-clé d'une image de Prof est effacé de la conversation au bout de 7 jours : l'image ne revient plus) : index.html change, donc nouvelle version du cache.

   v128 : v277 (titres de conversation donnés par l'IA dès le premier message ; l'image demandée à Prof revient quand on rouvre la conversation ; bouton « Image » d'une carte : menu Galerie / IA ; phrase retirée dans « Modifier avec l'IA ») : index.html change, donc nouvelle version du cache.

   v127 : v276 (fiche d'une carte : « Mettre en pause » et « Modifier » échangent leur place) : index.html change, donc nouvelle version du cache.

   v126 : v270 (Parcourir : filtre « Archivées » à côté de « En pause », les matières archivées n'encombrent plus la liste ; bouton « Désarchiver » dans la feuille d'une matière archivée) : index.html change, donc nouvelle version du cache.

   v125 : v269 (réglages d'une matière regroupés dans le menu ⋯ de Parcourir ; la feuille « À venir » ne garde que la date du contrôle ; les matières sans carte restent visibles dans Parcourir) : index.html change, donc nouvelle version du cache.

   v124 : v268 (correctif : l'accueil plantait au démarrage dès qu'il y avait des cartes, variable « mas » oubliée dans la carte « cartes en 7 jours ») : index.html change, donc nouvelle version du cache.

   v123 : v267 (carte de l'accueil : « cartes en 7 jours » à la place de la série, barres et grille des 30 jours lues dans le journal des réponses synchronisé) : index.html change, donc nouvelle version du cache.

   v122 : v266 (icône de Prof : étoile variante C agrandie dans l'en-tête et le chat, anneau doré pendant la réflexion) : index.html change, donc nouvelle version du cache.

   v121 : v265 (aperçu flottant d'une seule phrase au-dessus du clavier) : index.html change, donc nouvelle version du cache.

   v101 : v228 (Prof : champ sans barre d'autofill, « Nouvelle conversation » sans confirmation + « Annuler », animation de changement de conversation, clavier sans saut, prototype Chromebook) : index.html change, donc nouvelle version du cache.

   v89 : Prof branché à Gemini (v207) : index.html change, donc nouvelle version du cache.

   v69 : « navigation preload » : la page est demandée au réseau pendant que le service worker démarre (retour par l'icône plus rapide, donc logo natif d'Android moins longtemps) ; sauvegarde complète de l'écran : index.html change aussi.

   v68 : le faux splash se rejoue seulement après une vraie fermeture de l'app (décision selon l'heure du dernier « pagehide ») : index.html change, donc nouvelle version du cache.

   v67 : journal de diagnostic (retours à l'accueil) + instantané d'écran toutes les 3 s : index.html change, donc nouvelle version du cache.

   v60 : champs de saisie conservés lors d'un redessin (Réglages, Modifier la carte, aperçu des cartes) : index.html change, donc nouvelle version du cache.

   v50 : cadre « champ + bouton Image », confirmation avant « Remettre à zéro », message de côté vide : index.html change, donc nouvelle version du cache.

   v49 : cartes « réponse à écrire » complètes (clavier réel, quiz) : index.html change, donc nouvelle version du cache.

   v48 : renommage Flashcard → Memoria (nom du cache et titre des notifications).

   v47 : les notifications existent en français et en anglais. Le client envoie sa langue (data.lang) avec chaque message ;
   sans message (rappel générique en arrière-plan), on suit la langue de l'appareil : français pour toute variante fr, anglais sinon. */
const SW_VERSION = 'v159';
const CACHE_NOM = 'memoria-' + SW_VERSION;

function enAnglais(lang){
  if(lang === 'en') return true;
  if(lang === 'fr') return false;
  try{ return !/^fr/i.test(String((self.navigator && self.navigator.language) || 'fr')); }catch(e){ return false; }
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE_NOM && n !== 'memoria-etat').map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
      .then(() => (self.registration.navigationPreload ? self.registration.navigationPreload.enable().catch(() => {}) : null))
  );
});

/* Réseau d'abord (toujours la dernière version déployée), et on garde une copie
   des fichiers du site pour le mode hors ligne. Avant, le cache n'était jamais
   rempli : hors connexion, l'app ne s'ouvrait pas du tout, sans aucune erreur
   visible. Ne touche pas aux requêtes vers d'autres domaines (Gemini, synchro). */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    try{
      /* v69 : pour l'ouverture de la page, la demande réseau est déjà partie (navigation preload) pendant que ce service worker démarrait. */
      let res = null;
      if(req.mode === 'navigate' && event.preloadResponse){ try{ res = await event.preloadResponse; }catch(e){ res = null; } }
      if(!res) res = await fetch(req);
      if(res && res.status === 200){
        const copie = res.clone();
        caches.open(CACHE_NOM).then((c) => c.put(req, copie)).catch(() => {});
      }
      return res;
    }catch(e){
      const r = await caches.match(req);
      return r || (req.mode === 'navigate' ? await caches.match('./index.html') : null) || Response.error();
    }
  })());
});

/* Le client envoie le nombre de cartes dues + l'heure de rappel voulue ;
   on affiche la notification tout de suite si on est appelés au bon
   moment (voir périodicité côté client dans registerServiceWorker). */
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if(data.type === 'SHOW_REMINDER'){
    const count = data.count || 0;
    if(count <= 0) return;
    self.registration.showNotification('Memoria', {
      body: enAnglais(data.lang)
        ? (count === 1 ? '1 card to review today.' : `${count} cards to review today.`)
        : (count === 1
          ? '1 carte à réviser aujourd\'hui.'
          : `${count} cartes à réviser aujourd'hui.`),
      icon: './icon-192x192-any.png',
      badge: './icon-192x192-any.png',
      tag: 'revision-rappel',
      renotify: true
    });
  }
  if(data.type === 'SHOW_REMINDER_RELANCE'){
    const count = data.count || 0;
    if(count <= 0) return;
    self.registration.showNotification('Memoria', {
      body: enAnglais(data.lang)
        ? (count === 1 ? 'Still 1 card waiting today.' : `Still ${count} cards waiting today.`)
        : (count === 1
          ? 'Toujours 1 carte en attente aujourd\'hui.'
          : `Toujours ${count} cartes en attente aujourd'hui.`),
      icon: './icon-192x192-any.png',
      badge: './icon-192x192-any.png',
      tag: 'revision-rappel',
      renotify: true
    });
  }
});

/* Périodic Background Sync : si le navigateur le permet (Chrome Android,
   sous condition que l'app soit installée et utilisée régulièrement),
   on peut vérifier périodiquement en arrière-plan sans que l'app soit
   ouverte. Ce n'est pas garanti sur tous les appareils. */
self.addEventListener('periodicsync', (event) => {
  if(event.tag === 'revision-check'){
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify(){
  try{
    const clientsList = await self.clients.matchAll({ type: 'window' });
    if(clientsList.length > 0){
      // Une fenêtre est ouverte : on la laisse gérer elle-même via message.
      return;
    }
    // Pas de fenêtre ouverte : on ne peut pas recalculer le nombre de
    // cartes dues sans accès aux données de l'app (stockées en
    // localStorage, inaccessible depuis le service worker). On affiche
    // donc un rappel générique dans ce cas.
    await self.registration.showNotification('Memoria', {
      body: enAnglais() ? 'Remember to review your cards today!' : 'Pense à réviser tes cartes aujourd\'hui !',
      icon: './icon-192x192-any.png',
      badge: './icon-192x192-any.png',
      tag: 'revision-rappel',
      renotify: true
    });
  }catch(e){}
}


/* v307 : Web Push. Le Worker réveille ce service worker à l'heure du rappel (puis pour la relance), même app fermée. L'envoi n'a pas de
   contenu : le texte est écrit ici, avec le nombre de cartes que l'app a mis de côté dans le cache « memoria-etat » (/etat-rappel).
   Une notification est TOUJOURS affichée (obligatoire, surtout sur iPhone). 1er envoi du jour = rappel ; 2e = relance. */
async function lireCacheEtat(chemin){
  try{
    const c = await caches.open('memoria-etat');
    const r = await c.match(chemin);
    return r ? await r.json() : null;
  }catch(e){ return null; }
}
async function ecrireCacheEtat(chemin, obj){
  try{
    const c = await caches.open('memoria-etat');
    await c.put(chemin, new Response(JSON.stringify(obj), { headers: { 'Content-Type': 'application/json' } }));
  }catch(e){}
}
function jourLocalSw(){
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function afficherPush(){
  const etat = await lireCacheEtat('/etat-rappel');
  const en = enAnglais(etat && etat.lang);
  const jour = jourLocalSw();
  const base = { icon: './icon-192x192-any.png', badge: './icon-192x192-any.png' };
  if(etat && etat.test && Date.now() - etat.test < 3 * 60 * 1000){
    let etatApp = 'fermee';
    try{
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if(fenetres.some((c) => c.visibilityState === 'visible')) etatApp = 'ouverte';
      else if(fenetres.length) etatApp = 'arriere';
    }catch(e){}
    const corpsTest = {
      fermee: en ? 'Test OK: the app was closed, reminders will reach you too.' : 'Test réussi : l\'app était fermée, les rappels t\'arriveront aussi.',
      arriere: en ? 'Test received, but the app was still running in the background. Remove it from recent apps and test again.' : 'Test reçu, mais l\'app tournait encore en arrière-plan. Retire-la des applis récentes et refais le test.',
      ouverte: en ? 'Test received, but the app was still open. Close it and test again.' : 'Test reçu, mais l\'app était encore ouverte. Ferme-la et refais le test.'
    }[etatApp];
    await self.registration.showNotification('Memoria', Object.assign({ body: corpsTest, tag: 'revision-test', renotify: true }, base));
    return;
  }
  const rangBrut = await lireCacheEtat('/push-jour');
  const rang = (rangBrut && rangBrut.jour === jour ? rangBrut.n : 0) + 1;
  await ecrireCacheEtat('/push-jour', { jour, n: rang });
  const n = (etat && etat.jour === jour) ? (etat.count || 0) : 0; // nombre connu seulement s'il date d'aujourd'hui
  let corps;
  if(rang >= 2){
    corps = n > 0
      ? (en ? (n === 1 ? 'Still 1 card waiting today.' : 'Still ' + n + ' cards waiting today.')
            : (n === 1 ? 'Toujours 1 carte en attente aujourd\'hui.' : 'Toujours ' + n + ' cartes en attente aujourd\'hui.'))
      : (en ? 'You still have cards to review today.' : 'Il te reste des cartes à réviser aujourd\'hui.');
  }else{
    corps = n > 0
      ? (en ? (n === 1 ? '1 card to review today.' : n + ' cards to review today.')
            : (n === 1 ? '1 carte à réviser aujourd\'hui.' : n + ' cartes à réviser aujourd\'hui.'))
      : (en ? 'Remember to review your cards today!' : 'Pense à réviser tes cartes aujourd\'hui !');
  }
  /* Même tag que les rappels locaux : une notification déjà affichée est remplacée (pas de pile). Pas de nouvelle vibration pour un 1er
     envoi qui remplace une notification encore là ; la relance vibre toujours. */
  let existe = false;
  try{ existe = (await self.registration.getNotifications({ tag: 'revision-rappel' })).length > 0; }catch(e){}
  await self.registration.showNotification('Memoria', Object.assign({ body: corps, tag: 'revision-rappel', renotify: !(rang < 2 && existe) }, base));
}
self.addEventListener('push', (event) => {
  event.waitUntil(afficherPush().catch(() => self.registration.showNotification('Memoria', {
    body: enAnglais() ? 'Remember to review your cards today!' : 'Pense à réviser tes cartes aujourd\'hui !',
    icon: './icon-192x192-any.png', badge: './icon-192x192-any.png', tag: 'revision-rappel'
  })));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsList) => {
      for(const client of clientsList){
        if('focus' in client) return client.focus();
      }
      if(self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
