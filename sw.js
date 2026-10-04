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
const SW_VERSION = 'v117';
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
      .then((noms) => Promise.all(noms.filter((n) => n !== CACHE_NOM).map((n) => caches.delete(n))))
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
