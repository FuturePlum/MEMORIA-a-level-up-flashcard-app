/* Worker « flashcard-sync-kv » — v123
   Binding KV : nom de variable EXACTEMENT FLASHCARD_SYNC (inchangé).

   Routes :
   - GET  /sync?code=…      synchro entre appareils (inchangé) : 404 JSON si rien de stocké
   - POST /sync?code=…      synchro : écrase le JSON stocké (inchangé)
   - POST /partage          NOUVEAU : stocke des cartes à partager, renvoie { code } (6 caractères)
   - GET  /partage?code=…   NOUVEAU : renvoie les cartes (404 si code inconnu ou expiré)

   Les partages sont rangés sous la clé « share:<CODE> » (jamais « sync:… ») et s'effacent seuls
   après 14 jours : ils ne touchent donc jamais aux données de synchro. */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };

const SYNC_MAX_CARS = 24000000;      // une valeur KV peut aller jusqu'à 25 Mo
const PARTAGE_MAX_CARS = 20000000;
const PARTAGE_MAX_CARTES = 3000;
const PARTAGE_TTL_SECONDES = 14 * 24 * 3600;
const PARTAGE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1 (faciles à confondre)
const PARTAGE_LONGUEUR = 6;

function reponseJson(objet, status) {
  return new Response(JSON.stringify(objet), { status: status || 200, headers: JSON_HEADERS });
}

function erreur(status, message) {
  return reponseJson({ error: message }, status);
}

/* Code de synchro : lettres, chiffres, - et _ ; 1 à 100 caractères (espaces de bords retirés). */
function cleanCode(brut) {
  const code = String(brut == null ? '' : brut).trim();
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(code)) return null;
  return code;
}

/* Code de partage : on tolère minuscules, espaces et tirets saisis par l'utilisateur. */
function cleanCodePartage(brut) {
  const code = String(brut == null ? '' : brut).toUpperCase().replace(/[\s-]+/g, '');
  if (code.length !== PARTAGE_LONGUEUR) return null;
  for (const c of code) if (PARTAGE_ALPHABET.indexOf(c) < 0) return null;
  return code;
}

function nouveauCodePartage() {
  const octets = new Uint8Array(PARTAGE_LONGUEUR);
  crypto.getRandomValues(octets);
  let code = '';
  for (const o of octets) code += PARTAGE_ALPHABET[o % PARTAGE_ALPHABET.length];
  return code;
}

async function routeSync(request, env, url) {
  const code = cleanCode(url.searchParams.get('code'));
  if (!code) return erreur(400, 'Code invalide : lettres, chiffres, - et _ seulement (1 à 100 caractères)');
  const cle = 'sync:' + code;

  if (request.method === 'GET') {
    const valeur = await env.FLASHCARD_SYNC.get(cle);
    if (valeur === null) return erreur(404, 'Rien de stocké pour ce code');
    return new Response(valeur, { status: 200, headers: JSON_HEADERS });
  }

  const texte = await request.text();
  if (!texte) return erreur(400, 'Corps vide');
  if (texte.length > SYNC_MAX_CARS) return erreur(413, 'Données trop lourdes');
  try { JSON.parse(texte); } catch (e) { return erreur(400, 'JSON invalide'); }
  await env.FLASHCARD_SYNC.put(cle, texte);
  return reponseJson({ ok: true });
}

async function routePartage(request, env, url) {
  if (request.method === 'GET') {
    const code = cleanCodePartage(url.searchParams.get('code'));
    if (!code) return erreur(400, 'Code invalide');
    const valeur = await env.FLASHCARD_SYNC.get('share:' + code);
    if (valeur === null) return erreur(404, 'Code introuvable ou expiré');
    return new Response(valeur, { status: 200, headers: JSON_HEADERS });
  }

  const texte = await request.text();
  if (!texte) return erreur(400, 'Corps vide');
  if (texte.length > PARTAGE_MAX_CARS) return erreur(413, 'Partage trop lourd');
  let data;
  try { data = JSON.parse(texte); } catch (e) { return erreur(400, 'JSON invalide'); }
  if (!data || data.format !== 'flashcard-partage' || !Array.isArray(data.cartes) || !data.cartes.length) {
    return erreur(400, 'Format de partage non reconnu');
  }
  if (data.cartes.length > PARTAGE_MAX_CARTES) return erreur(413, 'Trop de cartes');

  for (let essai = 0; essai < 6; essai++) {
    const code = nouveauCodePartage();
    if ((await env.FLASHCARD_SYNC.get('share:' + code)) !== null) continue; // déjà pris : on retire un autre code
    await env.FLASHCARD_SYNC.put('share:' + code, texte, { expirationTtl: PARTAGE_TTL_SECONDES });
    return reponseJson({ code, jours: PARTAGE_TTL_SECONDES / 86400 });
  }
  return erreur(500, 'Impossible de créer un code, réessaie');
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      const url = new URL(request.url);
      const chemin = url.pathname.replace(/\/+$/, '');
      if (request.method !== 'GET' && request.method !== 'POST') return erreur(405, 'Méthode non autorisée');
      if (chemin === '/sync') return await routeSync(request, env, url);
      if (chemin === '/partage') return await routePartage(request, env, url);
      return erreur(404, 'Route inconnue');
    } catch (e) {
      return erreur(500, 'Erreur interne du Worker');
    }
  }
};
