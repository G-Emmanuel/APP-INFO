#!/usr/bin/env python3
"""Récupère les flux RSS/Atom listés dans config/sources.json et écrit docs/data/news.json.

Aucune dépendance : uniquement la bibliothèque standard de Python (3.10+).
Usage :  python scripts/fetch_news.py
"""
from __future__ import annotations

import concurrent.futures as cf
import email.utils
import hashlib
import html
import html.entities
import json
import re
import sys
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES_FILE = ROOT / "config" / "sources.json"
OUT_FILE = ROOT / "docs" / "data" / "news.json"

KEEP_DAYS = 7          # on garde une semaine d'articles
MAX_ITEMS = 900        # plafond pour garder un fichier léger
PER_SOURCE = 40        # articles lus au maximum par flux
TIMEOUT = 20
UA = "Mozilla/5.0 (compatible; DailyNewsTechInfra/1.0; +https://github.com)"

CATEGORIES = ["cyber", "it", "ia", "infra", "gaming", "culture"]

# --- Mots-clés pour ranger automatiquement les articles des sites généralistes ---
KEYWORDS = {
    "cyber": [
        "ransomware", "rançongiciel", "malware", "maliciel", "phishing", "hameçonnage", "vulnérabilité",
        "vulnerabilit", "cve-", "zero-day", "zero day", "0-day", "exploit", "faille", "breach", "fuite de données",
        "data leak", "piratage", "piraté", "hacker", "cyberattaque", "cyberattack", "cyber-attaque", "backdoor",
        "porte dérobée", "botnet", "ddos", "infostealer", "stealer", "patch tuesday", "correctif de sécurité",
        "security update", "cybersécurité", "cybersecurity", "anssi", "cert-fr", "trojan", "cheval de troie",
        "spyware", "logiciel espion", "arnaque", "scam", "apt", "edr", "siem", "sécurité informatique",
        "authentification", "mot de passe", "password", "chiffrement", "encryption",
    ],
    "ia": [
        "intelligence artificielle", "artificial intelligence", "llm", "chatgpt", "openai", "anthropic", "claude",
        "gemini", "mistral ai", "copilot", "machine learning", "apprentissage automatique", "deep learning",
        "modèle de langage", "language model", "agent ia", "ai agent", "agentic", "agentique", "gpt-", "deepseek",
        "llama", "hugging face", "génératif", "generative", "chatbot", "midjourney", "sora",
    ],
    "infra": [
        "data center", "datacenter", "data centre", "centre de données", "centres de données", "cloud", "aws",
        "azure", "google cloud", "kubernetes", "k8s", "docker", "conteneur", "container", "serveur", "server",
        "stockage", "storage", "gpu", "nvidia", "hpc", "supercalculateur", "supercomputer", "hyperscal",
        "refroidissement", "cooling", "virtualisation", "virtualization", "vmware", "proxmox", "terraform",
        "devops", "sre", "ovhcloud", "scaleway", "mégawatt", "megawatt", "nucléaire", "électricité", "power grid",
    ],
    "it": [
        "windows", "linux", "microsoft", "réseau", "network", "wi-fi", "wifi", "5g", "fibre", "routeur", "router",
        "cisco", "active directory", "powershell", "sysadmin", "mise à jour", "update", "navigateur", "browser",
        "chrome", "firefox", "android", "ios", "apple", "smartphone", "processeur", "cpu", "intel", "amd",
        "open source", "logiciel", "software", "ssd", "dns", "bgp", "ipv6", "vpn", "ubuntu", "debian", "red hat",
    ],
    "gaming": [
        "jeu vidéo", "jeux vidéo", "video game", "videogame", "gaming", "playstation", "ps5", "xbox", "nintendo",
        "switch 2", "steam", "valve", "esport", "e-sport", "game pass", "ubisoft", "epic games", "rockstar",
        "gta", "console", "gamer", "joueurs", "players", "studio de jeu", "game studio",
    ],
}
# Sigles à reconnaître en respectant la casse (« AI » mais pas « j'ai »).
CASE_SENSITIVE = {"ia": [r"\bIA\b", r"\bAI\b"], "cyber": [r"\bCVE\b"]}
TIE_ORDER = ["cyber", "ia", "infra", "it", "gaming"]

FLAG_RULES = {
    "exploited": r"exploited in the wild|actively exploited|activement exploitée?s?|exploitée?s? activement|zero[- ]day|0-day|exploited",
    "critical": r"\bcritical\b|\bcritique\b|cvss[^0-9]{0,6}(9|10)(\.\d)?",
    "ransomware": r"ransomware|rançongiciel",
    "breach": r"\bbreach|data leak|fuite de données|\bfuite\b|leaked|dérobées",
    "patch": r"patch tuesday|security update|correctif|mise à jour de sécurité|patched|patches",
}

STOPWORDS = set("""
the and for with from that this have has are was were will into over after about more than their your what when
which while also just been being they them there here then its it's new how why who les des une pour dans avec sur
par plus aux est sont son ses leur leurs cette ces qui que quoi dont mais comme tout tous toute toutes être avoir fait
nouveau nouvelle nouveaux après avant entre selon vers chez sans sous encore déjà très bien
""".split())


def log(msg: str) -> None:
    print(msg, file=sys.stderr, flush=True)


# ---------------------------------------------------------------- téléchargement
def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5",
        "Accept-Language": "fr,en;q=0.8",
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
        return resp.read()


XML_ENTITIES = {"amp", "lt", "gt", "quot", "apos"}


def clean_xml(raw: bytes) -> bytes:
    text = raw.decode("utf-8", errors="replace") if not raw.startswith(b"<?xml") else None
    if text is None:
        m = re.match(rb'<\?xml[^>]*encoding=["\']([\w-]+)["\']', raw)
        enc = m.group(1).decode() if m else "utf-8"
        try:
            text = raw.decode(enc, errors="replace")
        except LookupError:
            text = raw.decode("utf-8", errors="replace")
    text = text.lstrip("﻿ \t\r\n")
    text = re.sub(r'^<\?xml[^>]*\?>', '<?xml version="1.0" encoding="utf-8"?>', text)

    # Entités HTML (&nbsp; …) inconnues de XML -> caractères numériques.
    def fix_entity(m: re.Match) -> str:
        name = m.group(1)
        if name in XML_ENTITIES:
            return m.group(0)
        cp = html.entities.name2codepoint.get(name)
        return f"&#{cp};" if cp else f"&amp;{name};"

    text = re.sub(r"&([A-Za-z][A-Za-z0-9]*);", fix_entity, text)
    # & isolés
    text = re.sub(r"&(?!#?\w+;)", "&amp;", text)
    # caractères de contrôle interdits en XML
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    return text.encode("utf-8")


# ---------------------------------------------------------------- analyse XML
def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower() if isinstance(tag, str) else ""


def child(el: ET.Element, *names: str) -> ET.Element | None:
    for c in el:
        if local(c.tag) in names:
            return c
    return None


def children(el: ET.Element, name: str) -> list[ET.Element]:
    return [c for c in el if local(c.tag) == name]


def text_of(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return "".join(el.itertext()).strip()


def parse_date(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        d = email.utils.parsedate_to_datetime(value)
        if d is not None:
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError, IndexError):
        pass
    try:
        d = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    m = re.match(r"(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(:\d{2})?)", value)
    if m:
        try:
            return datetime.fromisoformat(f"{m.group(1)}T{m.group(2)}").replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


IMG_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)


def find_image(item: ET.Element, html_blobs: list[str]) -> str:
    for c in item.iter():
        name = local(c.tag)
        if name in ("content", "thumbnail") and c.get("url"):
            medium = (c.get("medium") or c.get("type") or "image").lower()
            if "image" in medium or name == "thumbnail" or re.search(r"\.(jpe?g|png|webp|gif)", c.get("url", ""), re.I):
                return c.get("url")
        if name == "enclosure" and c.get("url") and "image" in (c.get("type") or "image"):
            return c.get("url")
    for blob in html_blobs:
        m = IMG_RE.search(blob or "")
        if m:
            return html.unescape(m.group(1))
    return ""


TAG_RE = re.compile(r"<[^>]+>")
JUNK_RE = re.compile(
    r"(The post .*? appeared first on .*?\.?$|L'article .*? est apparu en premier sur .*?$|"
    r"Cet article .*? est apparu en premier sur .*?$|Continue reading.*$|Lire la suite.*$|Read more.*$|\[…\]|\[\.\.\.\])",
    re.I | re.S,
)


def clean_text(raw: str, limit: int = 300) -> str:
    s = html.unescape(TAG_RE.sub(" ", raw or ""))
    s = JUNK_RE.sub("", s)
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) > limit:
        cut = s[:limit].rsplit(" ", 1)[0].rstrip(",;:.-– ")
        s = cut + "…"
    return s


TRACKING = re.compile(r"^(utm_|fbclid|gclid|mc_|ref$|xtor|at_)")


def canonical(url: str) -> str:
    try:
        p = urllib.parse.urlsplit(url.strip())
        q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not TRACKING.match(k)]
        return urllib.parse.urlunsplit((p.scheme, p.netloc.lower(), p.path, urllib.parse.urlencode(q), ""))
    except ValueError:
        return url.strip()


def parse_feed(raw: bytes) -> list[dict]:
    root = ET.fromstring(clean_xml(raw))
    kind = local(root.tag)
    if kind == "feed":
        entries = children(root, "entry")
    else:
        channel = child(root, "channel")
        entries = children(channel, "item") if channel is not None else []
        if not entries:
            entries = children(root, "item")  # RSS 1.0 / RDF

    out = []
    for it in entries[:PER_SOURCE]:
        title = clean_text(text_of(child(it, "title")), 220)
        link = ""
        if kind == "feed":
            links = children(it, "link")
            alt = [l for l in links if (l.get("rel") or "alternate") == "alternate"]
            pick = (alt or links or [None])[0]
            link = pick.get("href", "") if pick is not None else ""
        else:
            link = text_of(child(it, "link"))
            if not link:
                guid = child(it, "guid")
                if guid is not None and (guid.get("isPermaLink") or "true") != "false":
                    link = text_of(guid)
        if not title or not link.startswith("http"):
            continue

        desc_el = child(it, "description", "summary")
        content_el = child(it, "encoded", "content")
        desc_raw = text_of(desc_el)
        content_raw = text_of(content_el) if content_el is not None and content_el.get("url") is None else ""
        summary = clean_text(desc_raw or content_raw)
        if len(summary) < 60 and content_raw:
            summary = clean_text(content_raw)

        date = None
        for name in ("pubdate", "published", "updated", "date", "issued", "modified"):
            date = parse_date(text_of(child(it, name)))
            if date:
                break

        out.append({
            "title": title,
            "link": canonical(link),
            "summary": summary,
            "image": find_image(it, [desc_raw, content_raw]),
            "date": date,
        })
    return out


# ---------------------------------------------------------------- enrichissement
def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    return "".join(ch for ch in s if not unicodedata.combining(ch))


def classify(title: str, summary: str, default: str) -> str:
    if default != "auto":
        return default
    hay_title, hay_sum = title.lower(), summary.lower()
    scores = {}
    for cat, words in KEYWORDS.items():
        s = 0.0
        for w in words:
            if w in hay_title:
                s += 2
            elif w in hay_sum:
                s += 1
        for pat in CASE_SENSITIVE.get(cat, []):
            if re.search(pat, title):
                s += 2
            elif re.search(pat, summary):
                s += 1
        scores[cat] = s
    best = max(scores.values())
    if best <= 0:
        return "it"
    return next(c for c in TIE_ORDER if scores[c] == best)


CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}", re.I)
CERT_RE = re.compile(r"CERTFR-\d{4}-(?:ALE|AVI|ACT|CTI|IOC|DUR)-\d+", re.I)


def enrich(item: dict, src: dict) -> dict:
    blob = f"{item['title']} {item['summary']}"
    low = blob.lower()
    flags = [name for name, pat in FLAG_RULES.items() if re.search(pat, low)]
    cves = sorted({c.upper() for c in CVE_RE.findall(blob)})[:4]
    ref = CERT_RE.search(blob) or CERT_RE.search(item["link"].upper())
    cat = classify(item["title"], item["summary"], src["cat"])

    importance = 0.0
    if src.get("alert"):
        importance += 5 if "alerte" in src["id"] else 1
    importance += 4 if "exploited" in flags else 0
    importance += 2 if "critical" in flags else 0
    importance += 1.5 if "ransomware" in flags else 0
    importance += 1.5 if "breach" in flags else 0
    importance += 0.5 if cves else 0

    return {
        "id": hashlib.sha1(item["link"].encode()).hexdigest()[:12],
        "title": item["title"],
        "link": item["link"],
        "summary": item["summary"],
        "image": item["image"],
        "source": src["id"],
        "lang": src["lang"],
        "cat": cat,
        "alert": bool(src.get("alert")),
        "flags": flags,
        "cves": cves,
        "ref": ref.group(0).upper() if ref else "",
        "importance": round(importance, 2),
    }


def tokens(title: str) -> set[str]:
    words = re.findall(r"[a-z0-9][a-z0-9\-\.]{2,}", norm(title))
    return {w.strip(".-") for w in words if w not in STOPWORDS and len(w) >= 4}


def cluster(items: list[dict]) -> None:
    """Regroupe les articles qui parlent du même sujet (mêmes mots du titre ou même CVE)."""
    toks = [tokens(i["title"]) for i in items]
    parent = list(range(len(items)))

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for a in range(len(items)):
        for b in range(a + 1, len(items)):
            if items[a]["source"] == items[b]["source"]:
                continue
            shared_cve = set(items[a]["cves"]) & set(items[b]["cves"])
            inter = toks[a] & toks[b]
            union = toks[a] | toks[b]
            similar = len(inter) >= 3 and union and len(inter) / len(union) >= 0.4
            if shared_cve or similar:
                parent[find(a)] = find(b)

    groups: dict[int, list[int]] = {}
    for i in range(len(items)):
        groups.setdefault(find(i), []).append(i)

    for members in groups.values():
        srcs = {items[i]["source"] for i in members}
        bonus = min(1.5 * (len(srcs) - 1), 6)
        leader = max(members, key=lambda i: (items[i]["importance"], -items[i]["ts"]))
        cid = items[leader]["id"]
        for i in members:
            items[i]["cluster"] = cid
            items[i]["coverage"] = len(srcs)
            items[i]["importance"] = round(items[i]["importance"] + bonus, 2)
            items[i]["also"] = [
                {"source": items[j]["source"], "link": items[j]["link"]}
                for j in members if items[j]["source"] != items[i]["source"]
            ][:4]


# ---------------------------------------------------------------- programme principal
def fetch_source(src: dict) -> tuple[dict, list[dict], str]:
    try:
        raw = download(src["url"])
        return src, parse_feed(raw), ""
    except Exception as exc:  # une source en panne ne doit pas bloquer les autres
        return src, [], f"{type(exc).__name__}: {exc}"[:200]


def main() -> int:
    config = json.loads(SOURCES_FILE.read_text(encoding="utf-8"))
    sources = config["sources"]
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=KEEP_DAYS)
    started = time.time()

    previous: dict[str, dict] = {}
    if OUT_FILE.exists():
        try:
            for it in json.loads(OUT_FILE.read_text(encoding="utf-8")).get("items", []):
                previous[it["id"]] = it
        except (json.JSONDecodeError, KeyError):
            pass

    status, fresh = [], {}
    with cf.ThreadPoolExecutor(max_workers=12) as pool:
        for src, entries, error in pool.map(fetch_source, sources):
            kept = 0
            for e in entries:
                d = e["date"] or now
                if d > now + timedelta(hours=2):
                    d = now
                if d < cutoff:
                    continue
                item = enrich(e, src)
                prev = previous.get(item["id"])
                item["first_seen"] = prev["first_seen"] if prev else now.isoformat(timespec="seconds")
                item["published"] = d.astimezone(timezone.utc).isoformat(timespec="seconds")
                item["ts"] = int(d.timestamp())
                if item["id"] not in fresh:
                    fresh[item["id"]] = item
                    kept += 1
            status.append({
                "id": src["id"], "name": src["name"], "lang": src["lang"], "cat": src["cat"],
                "site": "{0.scheme}://{0.netloc}".format(urllib.parse.urlsplit(src["url"])),
                "ok": not error and bool(entries), "count": kept, "error": error,
            })
            log(f"{'OK ' if not error else 'ERR'} {src['name']:<30} {kept:>3} {error}")

    # Les articles déjà connus qui ont disparu du flux restent jusqu'à leurs 7 jours.
    src_ids = {s["id"] for s in sources}
    for pid, prev in previous.items():
        if pid not in fresh and prev.get("source") in src_ids and prev.get("ts", 0) >= cutoff.timestamp():
            for k in ("cluster", "coverage", "also"):
                prev.pop(k, None)
            prev["importance"] = prev.get("base_importance", prev.get("importance", 0))
            fresh[pid] = prev

    items = sorted(fresh.values(), key=lambda i: i["ts"], reverse=True)[:MAX_ITEMS]
    for it in items:
        it["base_importance"] = it.get("base_importance", it["importance"])
        it["importance"] = it["base_importance"]
    cluster(items)

    payload = {
        "generated_at": now.isoformat(timespec="seconds"),
        "took_seconds": round(time.time() - started, 1),
        "categories": CATEGORIES,
        "sources": status,
        "items": items,
    }
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = OUT_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    tmp.replace(OUT_FILE)
    ok = sum(1 for s in status if s["ok"])
    log(f"\n{len(items)} articles, {ok}/{len(status)} sources OK, {payload['took_seconds']} s -> {OUT_FILE}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
