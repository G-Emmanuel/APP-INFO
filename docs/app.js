/* Daily News Tech & Infra : logique de l'application (aucune dépendance). */
(() => {
  'use strict';

  // ------------------------------------------------------------------ réglages
  const CATS = {
    cyber:   { label: 'Cybersécurité',             short: 'Cyber',          quota: 4 },
    it:      { label: 'Réseau, systèmes & DevOps', short: 'Réseau & DevOps', quota: 2 },
    ia:      { label: 'Intelligence artificielle', short: 'IA',             quota: 2 },
    infra:   { label: 'Cloud & data centers',      short: 'Cloud & Infra',  quota: 2 },
    gaming:  { label: 'Gaming',                    short: 'Gaming',         quota: 2 },
    culture: { label: 'Pour aller plus loin',      short: 'Culture G',      quota: 2 },
  };
  const ORDER = ['cyber', 'it', 'ia', 'infra', 'gaming', 'culture'];
  const TECH = new Set(['cyber', 'it', 'ia', 'infra']);
  const DATA_URL = 'data/news.json';
  const PAGE = 30;
  const AUTO_REFRESH_MS = 5 * 60 * 1000;
  const FLAG_TAGS = {
    exploited:  ['Exploitée', 'bad'],
    critical:   ['Critique', 'warn'],
    ransomware: ['Rançongiciel', 'bad'],
    breach:     ['Fuite de données', 'warn'],
    patch:      ['Correctif', 'ok'],
  };

  // ------------------------------------------------------------------ stockage local
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };

  const state = {
    data: null,
    items: [],
    sources: {},
    view: 'briefing',
    period: store.get('dn-period', 48),
    lang: store.get('dn-lang', 'all'),
    sort: store.get('dn-sort', 'date'),
    cats: new Set(store.get('dn-cats', [])),
    q: '',
    shown: PAGE,
    alertFilter: 'all',
    read: new Set(store.get('dn-read', [])),
    favs: store.get('dn-favs', {}),
    hidden: new Set(store.get('dn-hidden-sources', [])),
    newSince: store.get('dn-last-visit', 0),
    pending: null,
    lastCheck: 0,
    installEvent: null,
  };

  // ------------------------------------------------------------------ outils
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '#');
  const nowSec = () => Date.now() / 1000;
  const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;
  const dayKey = (ts) => new Date(ts * 1000).toLocaleDateString('sv-SE');

  function rel(ts) {
    const s = nowSec() - ts;
    if (s < 90) return "à l'instant";
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    if (s < 86400) return `il y a ${Math.round(s / 3600)} h`;
    const d = new Date(ts * 1000);
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'hier ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function dayLabel(key) {
    const today = new Date().toLocaleDateString('sv-SE');
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (key === today) return "Aujourd'hui";
    if (key === y.toLocaleDateString('sv-SE')) return 'Hier';
    return new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  let toastTimer = 0;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  // ------------------------------------------------------------------ données
  function setData(data) {
    state.data = data;
    state.sources = {};
    for (const s of data.sources || []) state.sources[s.id] = s;
    state.items = (data.items || []).map((it) => {
      it._hay = norm(`${it.title} ${it.summary} ${it.summary_fr || ''} ${sourceName(it.source)} ${(it.cves || []).join(' ')} ${it.ref || ''}`);
      it._seen = Date.parse(it.first_seen || it.published) || it.ts * 1000;
      return it;
    });
    state.pending = null;
    $('#newbar').hidden = true;
  }

  function sourceName(id) { return state.sources[id]?.name || id; }

  async function load({ manual = false } = {}) {
    const btn = $('#refreshBtn');
    btn.classList.add('spin');
    state.lastCheck = Date.now();
    try {
      const res = await fetch(`${DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      apply(data, manual);
    } catch (err) {
      if (!state.data) {
        $('#view').innerHTML = `<div class="empty"><strong>Impossible de charger les actus</strong>Vérifie ta connexion puis appuie sur le bouton Actualiser en haut.</div>`;
      } else if (manual) {
        toast('Pas de connexion. Les actus affichées sont les dernières enregistrées.');
      }
    } finally {
      btn.classList.remove('spin');
      updateStatus();
    }
  }

  function apply(data, manual) {
    const first = !state.data;
    if (!first && data.generated_at === state.data.generated_at) {
      if (manual) toast('Tout est à jour');
      return;
    }
    const known = new Set(state.items.map((i) => i.id));
    const fresh = first ? 0 : data.items.filter((i) => !known.has(i.id) && !state.hidden.has(i.source)).length;
    if (first || manual || window.scrollY < 300) {
      setData(data);
      render();
      if (fresh) toast(plural(fresh, 'nouvel article', 'nouveaux articles'));
      else if (manual && !first) toast('Actus mises à jour');
    } else if (fresh) {
      state.pending = data;
      $('#newbarBtn').textContent = `${plural(fresh, 'nouvel article', 'nouveaux articles')} · Afficher`;
      $('#newbar').hidden = false;
    } else {
      setData(data);
      updateStatus();
    }
  }

  function updateStatus() {
    const el = $('#status'), txt = $('#statusText');
    el.classList.remove('stale', 'offline');
    if (!state.data) { txt.textContent = navigator.onLine ? 'Chargement…' : 'Hors ligne'; return; }
    const gen = Date.parse(state.data.generated_at) / 1000;
    const age = nowSec() - gen;
    if (!navigator.onLine) { el.classList.add('offline'); txt.textContent = 'Hors ligne · ' + rel(gen); }
    else { txt.textContent = 'MAJ ' + rel(gen); if (age > 3 * 3600) el.classList.add('stale'); }
    el.title = 'Dernière collecte des sources : ' + new Date(gen * 1000).toLocaleString('fr-FR');
  }

  // ------------------------------------------------------------------ filtres
  const baseVisible = (it) => !state.hidden.has(it.source) && (state.lang === 'all' || it.lang === state.lang);
  const inPeriod = (it) => nowSec() - it.ts <= state.period * 3600;
  function matchesQuery(it) {
    if (!state.q) return true;
    return norm(state.q).split(/\s+/).filter(Boolean).every((t) => it._hay.includes(t));
  }
  function dedupe(list) {
    const seen = new Set();
    return list.filter((it) => {
      const k = it.cluster || it.id;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  function score(it) {
    const ageH = (nowSec() - it.ts) / 3600;
    return (it.importance || 0) + 6 * Math.exp(-ageH / 20) + (it.lang === 'FR' ? 0.3 : 0) + (it.image ? 0.2 : 0);
  }
  const isAlert = (it) => it.cat === 'cyber' && (it.alert || it.flags.includes('exploited') || it.flags.includes('critical'));

  // ------------------------------------------------------------------ rendu d'un article
  function tagsHtml(it) {
    const out = [];
    if (it.ref) out.push(`<span class="tag ref">${esc(it.ref)}</span>`);
    if (TECH.has(it.cat)) for (const f of it.flags || []) if (FLAG_TAGS[f]) out.push(`<span class="tag ${FLAG_TAGS[f][1]}">${FLAG_TAGS[f][0]}</span>`);
    const cves = it.cves || [];
    cves.slice(0, 2).forEach((c) => out.push(`<span class="tag">${esc(c)}</span>`));
    if (cves.length > 2) out.push(`<span class="tag">+${cves.length - 2} CVE</span>`);
    return out.join('');
  }

  function articleHtml(it, { thumb = true } = {}) {
    const cat = CATS[it.cat] ? it.cat : 'it';
    const read = state.read.has(it.id);
    const fav = !!state.favs[it.id];
    const isNew = state.newSince && it._seen > state.newSince && !read;
    const also = (it.also || []).filter((a) => !state.hidden.has(a.source));
    const alsoHtml = also.length
      ? `<span class="also">Aussi chez ${also.map((a) => `<a href="${esc(safeUrl(a.link))}" target="_blank" rel="noopener" data-open="${esc(it.id)}">${esc(sourceName(a.source))}</a>`).join(', ')}</span>`
      : '';
    const name = it.sourceName || sourceName(it.source);
    return `<li><article class="art${read ? ' read' : ''}" style="--c: var(--c-${cat})" data-id="${esc(it.id)}">
      <div class="art-body">
        <div class="art-meta">
          <span class="cat">${esc(CATS[cat].short)}</span>
          <span>${esc(name)}</span><span>${esc(it.lang)}</span>
          <time datetime="${esc(it.published)}">${esc(rel(it.ts))}</time>
          ${isNew ? '<span class="new">Nouveau</span>' : ''}
        </div>
        <h3 class="art-title"><a href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener" data-open="${esc(it.id)}">${esc(it.title)}</a></h3>
        ${it.summary_fr
          ? `<p class="art-sum fr"${it.lang !== 'FR' ? ' title="Résumé traduit en français"' : ''}>${esc(it.summary_fr)}</p>`
          : it.summary ? `<p class="art-sum">${esc(it.summary)}</p>` : ''}
        <div class="art-foot">
          ${tagsHtml(it)}${alsoHtml}
          <div class="actions">
            <button class="act" type="button" data-fav="${esc(it.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/></svg>
            </button>
            <button class="act" type="button" data-share="${esc(it.id)}" aria-label="Partager">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M6 12v7h12v-7"/></svg>
            </button>
          </div>
        </div>
      </div>
      ${thumb && it.image ? `<img class="art-thumb" src="${esc(safeUrl(it.image))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
    </article></li>`;
  }

  // ------------------------------------------------------------------ vues
  function renderBriefing() {
    const pool = state.items.filter(baseVisible);
    const used = new Set();
    const sections = [];
    let total = 0, words = 0;

    const alerts = dedupe(pool
      .filter((it) => (it.source === 'certfr-alertes' && nowSec() - it.ts <= 72 * 3600) ||
                      (it.cat === 'cyber' && it.flags.includes('exploited') && nowSec() - it.ts <= 48 * 3600))
      .sort((a, b) => score(b) - score(a))).slice(0, 3);
    for (const it of alerts) used.add(it.cluster || it.id);

    for (const cat of ORDER) {
      const want = CATS[cat].quota;
      const picked = [];
      const perSource = {};
      for (const hours of [36, 72, 168]) {
        if (picked.length >= want) break;
        const cands = pool
          .filter((it) => it.cat === cat && nowSec() - it.ts <= hours * 3600 && !used.has(it.cluster || it.id))
          .sort((a, b) => score(b) - score(a));
        for (const it of cands) {
          if (picked.length >= want) break;
          const max = cat === 'culture' ? 1 : 2;
          if ((perSource[it.source] || 0) >= max) continue;
          picked.push(it);
          used.add(it.cluster || it.id);
          perSource[it.source] = (perSource[it.source] || 0) + 1;
        }
      }
      if (picked.length) {
        sections.push({ cat, items: picked });
        total += picked.length;
        for (const it of picked) words += (it.title + ' ' + (it.summary_fr || it.summary)).split(/\s+/).length;
      }
    }



    const count48 = pool.filter((it) => nowSec() - it.ts <= 48 * 3600).length;
    const minutes = Math.max(3, Math.round(words / 170 + total * 0.4));
    const date = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    let html = `<header class="view-head">
      <p class="eyebrow">${esc(date)}</p>
      <h1 class="view-title">Le briefing du jour</h1>
      <p class="view-lede">Une sélection des sujets les plus importants des dernières 36 heures, choisis parmi ${count48} articles de ${Object.keys(state.sources).length} sources.</p>
      <div class="digest-meta"><span><b>${total}</b> articles</span><span>Lecture <b>~${minutes} min</b></span></div>
    </header>`;

    if (alerts.length) {
      html += `<section class="alertstrip" aria-labelledby="alertsTitle">
        <h2 id="alertsTitle">À surveiller</h2>
        <ul>${alerts.map((it) => `<li>${it.ref ? `<span class="tag ref">${esc(it.ref)}</span>` : '<span class="tag bad">Exploitée</span>'}<a href="${esc(safeUrl(it.link))}" target="_blank" rel="noopener" data-open="${esc(it.id)}">${esc(it.title)}</a></li>`).join('')}</ul>
      </section>`;
    }

    for (const s of sections) {
      const n = pool.filter((it) => it.cat === s.cat && nowSec() - it.ts <= 48 * 3600).length;
      html += `<section class="section" aria-labelledby="sec-${s.cat}">
        <div class="section-head" style="--c: var(--c-${s.cat})">
          <span class="swatch" aria-hidden="true"></span>
          <h2 id="sec-${s.cat}">${esc(CATS[s.cat].label)}</h2>
          <button class="more" type="button" data-goto-cat="${s.cat}">Tout voir (${n})</button>
        </div>
        <ul class="list">${s.items.map((it) => articleHtml(it)).join('')}</ul>
      </section>`;
    }
    if (!sections.length) html += emptyHtml('Aucun article pour le moment', 'Vérifie tes filtres de langue et de sources dans les réglages.');
    return html;
  }

  function filteredFeed() {
    let list = state.items.filter((it) => baseVisible(it) && inPeriod(it) && matchesQuery(it) && (state.cats.size ? state.cats.has(it.cat) : (state.q || it.cat !== 'culture')));
    list = state.sort === 'score' ? list.sort((a, b) => score(b) - score(a)) : list.sort((a, b) => b.ts - a.ts);
    return dedupe(list);
  }

  function renderFeed() {
    const list = filteredFeed();
    const shown = list.slice(0, state.shown);
    const label = state.cats.size ? Array.from(state.cats).map((c) => CATS[c].short).join(', ') : (state.q ? 'Toutes les rubriques' : 'Toute la tech');
    let html = `<header class="view-head">
      <p class="eyebrow">${esc(label)} · ${state.period === 168 ? '7 jours' : state.period + ' h'}</p>
      <h1 class="view-title">${state.q ? `Résultats pour « ${esc(state.q)} »` : 'Le fil'}</h1>
      <p class="view-lede">${plural(list.length, 'article', 'articles')}${state.sort === 'score' ? ', classés par importance' : ', du plus récent au plus ancien'}. Les sujets couverts par plusieurs médias sont regroupés.</p>
    </header>`;
    if (!list.length) return html + emptyHtml('Aucun article ne correspond', 'Élargis la période, change de rubrique ou modifie ta recherche.');

    if (state.sort === 'date') {
      let current = '', group = [];
      const flush = () => { if (group.length) html += `<h2 class="day">${esc(dayLabel(current))}</h2><section class="section"><ul class="list">${group.join('')}</ul></section>`; };
      for (const it of shown) {
        const k = dayKey(it.ts);
        if (k !== current) { flush(); current = k; group = []; }
        group.push(articleHtml(it));
      }
      flush();
    } else {
      html += `<section class="section"><ul class="list">${shown.map((it) => articleHtml(it)).join('')}</ul></section>`;
    }
    if (list.length > shown.length) {
      html += `<button class="btn ghost loadmore" type="button" data-more>Afficher plus (${list.length - shown.length} restants)</button>`;
    }
    return html;
  }

  function renderAlerts() {
    let list = state.items.filter((it) => baseVisible(it) && inPeriod(it) && matchesQuery(it) && isAlert(it));
    const f = state.alertFilter;
    if (f === 'cert') list = list.filter((it) => it.source.startsWith('certfr'));
    if (f === 'exploited') list = list.filter((it) => it.flags.includes('exploited'));
    if (f === 'critical') list = list.filter((it) => it.flags.includes('critical'));
    list = dedupe(list.sort((a, b) => b.ts - a.ts));
    const btn = (k, l) => `<button type="button" data-alert-filter="${k}" aria-pressed="${f === k}">${l}</button>`;
    let html = `<header class="view-head">
      <p class="eyebrow">Sécurité · ${state.period === 168 ? '7 jours' : state.period + ' h'}</p>
      <h1 class="view-title">Alertes et failles</h1>
      <p class="view-lede">Les alertes et avis du CERT-FR, plus les failles signalées comme exploitées ou critiques par la presse spécialisée.</p>
    </header>
    <div class="seg" role="group" aria-label="Type d'alerte">${btn('all', 'Tout')}${btn('cert', 'CERT-FR')}${btn('exploited', 'Exploitées')}${btn('critical', 'Critiques')}</div>`;
    if (!list.length) return html + emptyHtml('Rien à signaler', 'Aucune alerte sur cette période avec ces filtres.');
    return html + `<section class="section"><ul class="list">${list.slice(0, 150).map((it) => articleHtml(it, { thumb: false })).join('')}</ul></section>`;
  }

  function renderFavs() {
    const list = Object.values(state.favs).filter(matchesQuery).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    let html = `<header class="view-head">
      <p class="eyebrow">Gardés pour plus tard</p>
      <h1 class="view-title">Favoris</h1>
      <p class="view-lede">Tes favoris restent enregistrés sur cet appareil, même quand l'article sort du fil.</p>
    </header>`;
    if (!list.length) return html + emptyHtml('Aucun favori pour l’instant', 'Appuie sur l’étoile d’un article pour le garder ici.');
    return html + `<section class="section"><ul class="list">${list.map((it) => {
      it._hay = it._hay || norm(`${it.title} ${it.summary} ${it.sourceName || ''}`);
      return articleHtml(it);
    }).join('')}</ul></section>`;
  }

  function emptyHtml(title, text) { return `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`; }

  // ------------------------------------------------------------------ colonne latérale
  function pickNotion() {
    const G = window.GLOSSARY || [];
    if (!G.length) return null;
    const recent = state.items.filter((it) => nowSec() - it.ts <= 48 * 3600);
    const counts = G.map((g) => {
      const res = g.match.map((m) => new RegExp(m));
      return recent.filter((it) => res.some((r) => r.test(it._hay))).length;
    });
    const today = new Date().toLocaleDateString('sv-SE');
    const saved = store.get('dn-notion', { date: '', term: '', history: [] });
    let idx = saved.date === today ? G.findIndex((g) => g.term === saved.term) : -1;
    if (idx < 0) {
      const history = saved.history || [];
      const ranked = G.map((g, i) => i).filter((i) => counts[i] > 0 && !history.includes(G[i].term)).sort((a, b) => counts[b] - counts[a]);
      if (ranked.length) idx = ranked[0];
      else {
        const dayNum = Math.floor(Date.now() / 86400000);
        idx = dayNum % G.length;
      }
      store.set('dn-notion', { date: today, term: G[idx].term, history: [G[idx].term, ...history].slice(0, 10) });
    }
    return { g: G[idx], n: counts[idx] };
  }

  function renderSide() {
    if (!state.data) return '';
    let html = '';
    const notion = pickNotion();
    if (notion) {
      const { g, n } = notion;
      html += `<section class="panel" aria-labelledby="notionTitle">
        <h2 id="notionTitle">La notion du jour</h2>
        <p class="notion-term">${esc(g.term)}</p>
        ${n ? `<p class="notion-seen">Repérée dans ${plural(n, 'article', 'articles')} ces dernières 48 h</p>` : ''}
        <p class="notion-def">${esc(g.def)}</p>
        <div class="notion-links">
          ${n ? `<button type="button" data-search="${esc(g.search)}">Voir les articles</button>` : ''}
          <a href="${esc(g.url)}" target="_blank" rel="noopener">En savoir plus</a>
        </div>
      </section>`;
    }

    const day = state.items.filter((it) => baseVisible(it) && nowSec() - it.ts <= 24 * 3600);
    const counts = ORDER.map((c) => day.filter((it) => it.cat === c).length);
    const max = Math.max(1, ...counts);
    html += `<section class="panel" aria-labelledby="statsTitle">
      <h2 id="statsTitle">Les dernières 24 h</h2>
      <ul class="bars">${ORDER.map((c, i) => `<li style="--c: var(--c-${c})">
        <button class="lbl" type="button" data-goto-cat="${c}"><i aria-hidden="true"></i>${esc(CATS[c].short)}</button>
        <span class="track"><span class="fill" style="width: ${(counts[i] / max) * 100}%"></span></span>
        <span class="n">${counts[i]}</span></li>`).join('')}</ul>
      <p class="panel-foot">${plural(day.length, 'article publié', 'articles publiés')} en 24 h.</p>
    </section>`;

    const src = Object.values(state.sources);
    const ok = src.filter((s) => s.ok).length;
    html += `<section class="panel" aria-labelledby="srcTitle">
      <h2 id="srcTitle">Sources</h2>
      <p class="hint">${ok} sur ${src.length} sources ont répondu à la dernière collecte${state.hidden.size ? `, ${state.hidden.size} masquée${state.hidden.size > 1 ? 's' : ''} par toi` : ''}. Le fil se met à jour automatiquement toutes les 30 minutes environ.</p>
      <p class="panel-foot"><button type="button" data-open-settings>Gérer les sources</button></p>
    </section>`;
    return html;
  }

  // ------------------------------------------------------------------ barre de filtres
  function renderChips() {
    const pool = state.items.filter((it) => baseVisible(it) && inPeriod(it));
    const all = state.cats.size === 0;
    const tech = pool.filter((it) => it.cat !== 'culture').length;
    let html = `<button class="chip" type="button" data-cat="all" aria-pressed="${all}">Toute la tech <small>${tech}</small></button>`;
    for (const c of ORDER) {
      const n = pool.filter((it) => it.cat === c).length;
      html += `<button class="chip" type="button" data-cat="${c}" style="--c: var(--c-${c})" aria-pressed="${state.view === 'fil' && state.cats.has(c)}"><i aria-hidden="true"></i>${esc(CATS[c].short)} <small>${n}</small></button>`;
    }
    $('#chips').innerHTML = html;
  }

  function syncToolbar() {
    const v = state.view;
    $('#toolbar').hidden = v === 'favoris' && !Object.keys(state.favs).length;
    $$('[data-period]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.period) === state.period)));
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === state.lang)));
    $$('[data-sort]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === state.sort)));
    $('[data-period]').parentElement.hidden = v === 'briefing' || v === 'favoris';
    $('[data-sort]').parentElement.hidden = v !== 'fil';
    $('[data-lang]').parentElement.hidden = v === 'favoris';
    $('#chips').hidden = v === 'alertes' || v === 'favoris';
    if (!$('#chips').hidden) renderChips();
  }

  // ------------------------------------------------------------------ rendu général
  function render() {
    if (!state.data) return;
    $$('[data-view]').forEach((a) => { if (a.dataset.view === state.view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    syncToolbar();
    const view = $('#view');
    view.innerHTML = state.view === 'fil' ? renderFeed()
      : state.view === 'alertes' ? renderAlerts()
      : state.view === 'favoris' ? renderFavs()
      : renderBriefing();
    $('#side').innerHTML = renderSide();

    const badgeN = state.items.filter((it) => baseVisible(it) && nowSec() - it.ts <= 24 * 3600 &&
      (it.source === 'certfr-alertes' || (it.cat === 'cyber' && it.flags.includes('exploited')))).length;
    const badge = $('#alertBadge');
    badge.hidden = !badgeN;
    badge.textContent = badgeN > 9 ? '9+' : String(badgeN);
    updateStatus();
  }

  function go(view) {
    if (location.hash !== '#' + view) location.hash = view;
    else route();
  }

  function route() {
    const h = location.hash.replace('#', '');
    const v = ['briefing', 'fil', 'alertes', 'favoris'].includes(h) ? h : 'briefing';
    const changed = v !== state.view;
    state.view = v;
    state.shown = PAGE;
    render();
    if (changed) window.scrollTo({ top: 0 });
  }

  // ------------------------------------------------------------------ actions
  function markRead(id) {
    if (state.read.has(id)) return;
    state.read.add(id);
    const arr = Array.from(state.read);
    store.set('dn-read', arr.slice(-4000));
    const el = $(`.art[data-id="${CSS.escape(id)}"]`);
    if (el) { el.classList.add('read'); const n = $('.new', el); if (n) n.remove(); }
  }

  function findItem(id) { return state.items.find((i) => i.id === id) || state.favs[id]; }

  function toggleFav(id, btn) {
    if (state.favs[id]) {
      delete state.favs[id];
      toast('Retiré des favoris');
    } else {
      const it = findItem(id);
      if (!it) return;
      const keep = ['id', 'title', 'link', 'summary', 'summary_fr', 'image', 'source', 'lang', 'cat', 'published', 'ts', 'flags', 'cves', 'ref'];
      const snap = {};
      for (const k of keep) snap[k] = it[k];
      snap.sourceName = sourceName(it.source);
      snap.savedAt = Date.now();
      state.favs[id] = snap;
      toast('Ajouté aux favoris');
    }
    store.set('dn-favs', state.favs);
    if (state.view === 'favoris') render();
    else if (btn) {
      const on = !!state.favs[id];
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
    }
  }

  async function share(id) {
    const it = findItem(id);
    if (!it) return;
    if (navigator.share) {
      try { await navigator.share({ title: it.title, url: it.link }); } catch (e) { /* partage annulé */ }
      return;
    }
    try { await navigator.clipboard.writeText(it.link); toast('Lien copié'); }
    catch (e) { toast('Copie impossible : ouvre l’article pour récupérer le lien'); }
  }

  // ------------------------------------------------------------------ réglages
  function renderSettings() {
    const theme = store.get('dn-theme-choice', 'auto');
    $$('[data-theme-choice]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === theme)));
    const groups = {};
    for (const s of Object.values(state.sources)) {
      const cat = s.cat === 'auto' ? 'auto' : s.cat;
      (groups[cat] = groups[cat] || []).push(s);
    }
    const names = { ...Object.fromEntries(ORDER.map((c) => [c, CATS[c].label])), auto: 'Sites généralistes (rubrique choisie selon l’article)' };
    $('#sourceList').innerHTML = [...ORDER, 'auto'].filter((c) => groups[c]).map((c) => `
      <div class="source-group" style="--c: ${c === 'auto' ? 'var(--muted)' : `var(--c-${c})`}">
        <h3><i aria-hidden="true"></i>${esc(names[c])}</h3>
        ${groups[c].map((s) => `<label class="src">
          <input type="checkbox" id="src-${esc(s.id)}" data-src="${esc(s.id)}" ${state.hidden.has(s.id) ? '' : 'checked'}>
          <span class="name">${esc(s.name)} <small class="st">${esc(s.lang)}</small></span>
          <span class="st ${s.ok ? '' : 'err'}">${s.ok ? `${s.count} art.` : 'En panne'}</span>
        </label>`).join('')}
      </div>`).join('');
    $('#readCount').textContent = `${plural(state.read.size, 'article marqué', 'articles marqués')} comme lu sur cet appareil.`;
    $('#installBtn').hidden = !state.installEvent;
  }

  function applyTheme(choice) {
    store.set('dn-theme-choice', choice);
    try { if (choice === 'auto') localStorage.removeItem('dn-theme'); else localStorage.setItem('dn-theme', choice); } catch (e) { /* ignore */ }
    if (choice === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = choice;
    renderSettings();
  }

  // ------------------------------------------------------------------ évènements
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open],[data-fav],[data-share],[data-goto-cat],[data-cat],[data-more],[data-search],[data-open-settings],[data-period],[data-lang],[data-sort],[data-alert-filter],[data-theme-choice]');
    if (!t) return;
    const d = t.dataset;
    if (d.open) { markRead(d.open); return; }
    if (d.fav) { toggleFav(d.fav, t); return; }
    if (d.share) { share(d.share); return; }
    if (d.gotoCat) { state.cats = new Set([d.gotoCat]); store.set('dn-cats', [...state.cats]); state.q = ''; $('#search').value = ''; if (state.period < 48) state.period = 48; go('fil'); return; }
    if (d.cat) {
      if (d.cat === 'all') state.cats.clear();
      else if (state.view !== 'fil') state.cats = new Set([d.cat]);
      else if (state.cats.has(d.cat)) state.cats.delete(d.cat);
      else state.cats.add(d.cat);
      store.set('dn-cats', [...state.cats]);
      state.shown = PAGE;
      if (state.view !== 'fil') go('fil'); else render();
      return;
    }
    if ('more' in d) { state.shown += PAGE; render(); return; }
    if (d.search) { state.q = d.search; $('#search').value = d.search; state.cats.clear(); state.period = 48; go('fil'); return; }
    if ('openSettings' in d) { openSettings(); return; }
    if (d.period) { state.period = Number(d.period); store.set('dn-period', state.period); state.shown = PAGE; render(); return; }
    if (d.lang) { state.lang = d.lang; store.set('dn-lang', state.lang); state.shown = PAGE; render(); return; }
    if (d.sort) { state.sort = d.sort; store.set('dn-sort', state.sort); state.shown = PAGE; render(); return; }
    if (d.alertFilter) { state.alertFilter = d.alertFilter; render(); return; }
    if (d.themeChoice) { applyTheme(d.themeChoice); return; }
  });
  // Clic molette / ouverture en arrière-plan
  document.addEventListener('auxclick', (e) => { const a = e.target.closest('[data-open]'); if (a) markRead(a.dataset.open); });
  // Image cassée : on la retire
  document.addEventListener('error', (e) => { if (e.target.classList && e.target.classList.contains('art-thumb')) e.target.remove(); }, true);

  let searchTimer = 0;
  $('#search').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = e.target.value.trim();
      state.shown = PAGE;
      if (state.q && (state.view === 'briefing')) go('fil');
      else render();
    }, 180);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); $('#search').focus(); }
  });

  $('#refreshBtn').addEventListener('click', () => load({ manual: true }));
  $('#newbarBtn').addEventListener('click', () => {
    if (state.pending) { setData(state.pending); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });

  function openSettings() {
    renderSettings();
    const dlg = $('#settings');
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#settings').addEventListener('change', (e) => {
    const id = e.target.dataset && e.target.dataset.src;
    if (!id) return;
    if (e.target.checked) state.hidden.delete(id); else state.hidden.add(id);
    store.set('dn-hidden-sources', [...state.hidden]);
    render();
  });
  $('#settings').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });
  $('#clearRead').addEventListener('click', () => {
    state.read.clear();
    store.set('dn-read', []);
    renderSettings();
    render();
    toast('Historique de lecture effacé');
  });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); state.installEvent = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => {
    if (!state.installEvent) return;
    state.installEvent.prompt();
    try { await state.installEvent.userChoice; } catch (e) { /* ignore */ }
    state.installEvent = null;
    $('#installBtn').hidden = true;
  });

  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => { updateStatus(); load(); });
  window.addEventListener('offline', updateStatus);

  // « Nouveau » = arrivé depuis ta dernière visite
  const saveVisit = () => store.set('dn-last-visit', Date.now());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveVisit();
    else if (Date.now() - state.lastCheck > 60 * 1000) load();
  });
  window.addEventListener('pagehide', saveVisit);
  setInterval(() => { if (document.visibilityState === 'visible') load(); }, AUTO_REFRESH_MS);
  setInterval(updateStatus, 30 * 1000);

  // ------------------------------------------------------------------ démarrage
  const choice = store.get('dn-theme-choice', 'auto');
  if (choice !== 'auto') document.documentElement.dataset.theme = choice;
  state.view = ['briefing', 'fil', 'alertes', 'favoris'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'briefing';
  if (!state.newSince) saveVisit();
  load();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* hors ligne indisponible */ });
  }
})();
