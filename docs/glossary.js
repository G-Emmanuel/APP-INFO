/* Lexique de la « Notion du jour ».
   L'appli choisit chaque jour la notion la plus présente dans l'actu des dernières 48 h.
   match : expressions cherchées dans les titres et résumés (minuscules, sans accents).
   search : texte placé dans la recherche quand on clique « Voir les articles ». */
window.GLOSSARY = [
  {
    term: "Vulnérabilité zero-day",
    match: ["zero[- ]?day", "\\b0-day\\b", "jour zero"],
    search: "zero-day",
    def: "Une faille de sécurité exploitée par des attaquants avant que l'éditeur ne l'ait corrigée, ou même avant qu'il ne la connaisse. Le nom vient du fait que les défenseurs ont eu « zéro jour » pour s'y préparer. Tant qu'aucun correctif n'existe, on limite les dégâts avec des mesures de contournement : désactiver la fonction touchée, filtrer le trafic, surveiller les journaux.",
    url: "https://fr.wikipedia.org/wiki/Vuln%C3%A9rabilit%C3%A9_zero-day"
  },
  {
    term: "CVE",
    match: ["\\bcve-\\d{4}"],
    search: "CVE-",
    def: "CVE (Common Vulnerabilities and Exposures) est le catalogue mondial des failles de sécurité publiques. Chaque faille reçoit un identifiant unique, comme CVE-2026-12345, que tout le monde utilise pour en parler : éditeurs, CERT, outils de scan. Cela permet de vérifier rapidement si ses propres systèmes sont concernés.",
    url: "https://fr.wikipedia.org/wiki/Common_Vulnerabilities_and_Exposures"
  },
  {
    term: "Score CVSS",
    match: ["\\bcvss\\b"],
    search: "CVSS",
    def: "Le CVSS note la gravité d'une faille de 0 à 10. Il tient compte de la facilité d'exploitation (à distance ou non, avec ou sans compte) et de l'impact sur la confidentialité, l'intégrité et la disponibilité. Au-dessus de 9, la faille est dite critique et doit être corrigée en priorité.",
    url: "https://fr.wikipedia.org/wiki/Common_Vulnerability_Scoring_System"
  },
  {
    term: "Catalogue KEV",
    match: ["\\bkev\\b", "known exploited"],
    search: "KEV",
    def: "Le KEV (Known Exploited Vulnerabilities) est la liste tenue par la CISA, l'agence américaine de cybersécurité, des failles dont l'exploitation réelle est confirmée. Les administrations américaines ont une date limite pour les corriger. Pour tout le monde, c'est un bon outil pour décider quels correctifs installer en premier.",
    url: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
  },
  {
    term: "Rançongiciel",
    match: ["ransomware", "rancongiciel"],
    search: "ransomware",
    def: "Un rançongiciel chiffre les fichiers d'une victime puis exige une rançon pour les déchiffrer. Les groupes actuels volent aussi les données avant de les chiffrer et menacent de les publier : c'est la double extorsion. Les meilleures protections restent des sauvegardes hors ligne, des correctifs à jour et une authentification forte.",
    url: "https://fr.wikipedia.org/wiki/Ran%C3%A7ongiciel"
  },
  {
    term: "Hameçonnage",
    match: ["phishing", "hameconnage", "smishing", "quishing"],
    search: "phishing",
    def: "L'hameçonnage consiste à se faire passer pour une entité de confiance (banque, collègue, service en ligne) pour obtenir des identifiants ou faire cliquer sur un lien piégé. Il passe par mail, SMS (smishing) ou QR code (quishing). C'est encore la première porte d'entrée de la plupart des cyberattaques.",
    url: "https://fr.wikipedia.org/wiki/Hame%C3%A7onnage"
  },
  {
    term: "Infostealer",
    match: ["infostealer", "info-stealer", "\\bstealer"],
    search: "stealer",
    def: "Un infostealer est un logiciel malveillant qui aspire les mots de passe, cookies de session et portefeuilles crypto enregistrés sur un poste. Les données volées sont revendues en lots sur des marchés criminels. Avec un cookie de session volé, un attaquant peut parfois contourner la double authentification.",
    url: "https://en.wikipedia.org/wiki/Infostealer"
  },
  {
    term: "Attaque de la chaîne d'approvisionnement",
    match: ["supply[- ]chain", "chaine d.approvisionnement", "trojanized", "verole", "malicious package", "paquet malveillant", "\\bnpm\\b", "\\bpypi\\b"],
    search: "supply chain",
    def: "Au lieu de viser directement sa cible, l'attaquant compromet un fournisseur ou un composant qu'elle utilise : une bibliothèque open source, une extension, un outil de mise à jour. Le code piégé arrive ainsi chez des milliers de victimes par un canal de confiance. Vérifier l'origine des dépendances et limiter les droits des extensions réduit ce risque.",
    url: "https://en.wikipedia.org/wiki/Supply_chain_attack"
  },
  {
    term: "Patch Tuesday",
    match: ["patch tuesday"],
    search: "Patch Tuesday",
    def: "Le deuxième mardi de chaque mois, Microsoft publie d'un coup les correctifs de sécurité de ses produits. D'autres éditeurs, comme Adobe ou SAP, publient le même jour. Les équipes IT planifient donc leurs tests et déploiements autour de cette date.",
    url: "https://fr.wikipedia.org/wiki/Patch_Tuesday"
  },
  {
    term: "Exécution de code à distance (RCE)",
    match: ["\\brce\\b", "remote code execution", "execution de code (arbitraire )?a distance"],
    search: "RCE",
    def: "Une RCE permet à un attaquant de faire exécuter ses propres commandes sur une machine depuis le réseau, sans y avoir accès physiquement. C'est l'un des types de failles les plus graves, car il donne souvent le contrôle complet du système. Une RCE sans authentification sur un service exposé à Internet est à corriger immédiatement.",
    url: "https://en.wikipedia.org/wiki/Arbitrary_code_execution"
  },
  {
    term: "Attaque DDoS",
    match: ["\\bddos\\b", "deni de service"],
    search: "DDoS",
    def: "Une attaque par déni de service distribué inonde un site ou un réseau de requêtes venues de milliers de machines à la fois, jusqu'à le rendre inaccessible. Les attaquants utilisent souvent des botnets d'objets connectés piratés. On s'en protège avec des services de filtrage capables d'absorber d'énormes volumes de trafic.",
    url: "https://fr.wikipedia.org/wiki/Attaque_par_d%C3%A9ni_de_service"
  },
  {
    term: "Botnet",
    match: ["\\bbotnets?\\b"],
    search: "botnet",
    def: "Un botnet est un réseau d'appareils infectés (PC, routeurs, caméras) que des criminels pilotent à distance. Ils s'en servent pour lancer des DDoS, envoyer du spam ou masquer leur trafic. Changer les mots de passe par défaut et mettre à jour ses équipements évite d'en faire partie.",
    url: "https://fr.wikipedia.org/wiki/Botnet"
  },
  {
    term: "EDR",
    match: ["\\bedr\\b", "\\bxdr\\b", "endpoint detection"],
    search: "EDR",
    def: "Un EDR (Endpoint Detection and Response) surveille en continu le comportement des postes et serveurs pour repérer les attaques, pas seulement les fichiers connus comme malveillants. Il peut isoler une machine du réseau et garder une trace de ce qui s'est passé. Les attaquants cherchent d'ailleurs souvent à le désactiver en premier.",
    url: "https://en.wikipedia.org/wiki/Endpoint_detection_and_response"
  },
  {
    term: "Authentification multifacteur",
    match: ["\\bmfa\\b", "\\b2fa\\b", "multi-?factor", "multifacteur", "double authentification", "passkey"],
    search: "MFA",
    def: "L'authentification multifacteur demande au moins deux preuves d'identité : quelque chose que l'on sait (mot de passe), que l'on possède (téléphone, clé) ou que l'on est (empreinte). Un mot de passe volé ne suffit alors plus. Les clés physiques et les passkeys résistent mieux à l'hameçonnage que les codes par SMS.",
    url: "https://fr.wikipedia.org/wiki/Authentification_multifacteur"
  },
  {
    term: "Zero Trust",
    match: ["zero[- ]trust"],
    search: "zero trust",
    def: "Le Zero Trust part du principe qu'aucun utilisateur ni appareil n'est digne de confiance par défaut, même à l'intérieur du réseau de l'entreprise. Chaque accès est vérifié selon l'identité, l'état de l'appareil et le contexte. Ce modèle remplace peu à peu l'idée d'un réseau interne protégé par un simple pare-feu.",
    url: "https://en.wikipedia.org/wiki/Zero_trust_architecture"
  },
  {
    term: "VPN",
    match: ["\\bvpn\\b"],
    search: "VPN",
    def: "Un VPN crée un tunnel chiffré entre un appareil et un réseau distant. En entreprise, il permet aux salariés d'accéder au réseau interne depuis l'extérieur. Les passerelles VPN sont très visées par les attaquants, car une faille sur ces équipements ouvre directement l'accès au réseau.",
    url: "https://fr.wikipedia.org/wiki/R%C3%A9seau_priv%C3%A9_virtuel"
  },
  {
    term: "Pare-feu",
    match: ["firewall", "pare-feu", "\\bfortigate\\b", "\\bpalo alto\\b", "\\basa\\b"],
    search: "firewall",
    def: "Un pare-feu filtre le trafic réseau selon des règles : il laisse passer ce qui est autorisé et bloque le reste. Les pare-feu de nouvelle génération inspectent aussi les applications et peuvent faire office de passerelle VPN. Placés en bordure du réseau, ils sont exposés à Internet, d'où l'urgence de corriger leurs failles.",
    url: "https://fr.wikipedia.org/wiki/Pare-feu_(informatique)"
  },
  {
    term: "BGP",
    match: ["\\bbgp\\b"],
    search: "BGP",
    def: "BGP (Border Gateway Protocol) est le protocole qui permet aux grands réseaux d'Internet d'échanger leurs routes. C'est lui qui décide par où passe le trafic d'un pays ou d'un opérateur à l'autre. Une erreur de configuration BGP peut couper l'accès à un service mondial en quelques minutes.",
    url: "https://fr.wikipedia.org/wiki/Border_Gateway_Protocol"
  },
  {
    term: "DNS",
    match: ["\\bdns\\b"],
    search: "DNS",
    def: "Le DNS est l'annuaire d'Internet : il traduit un nom comme exemple.fr en adresse IP. Quand un serveur DNS tombe, les sites restent en ligne mais deviennent introuvables. Les attaquants l'utilisent aussi pour rediriger des victimes ou faire sortir des données discrètement.",
    url: "https://fr.wikipedia.org/wiki/Domain_Name_System"
  },
  {
    term: "Active Directory",
    match: ["active directory", "\\bentra id\\b"],
    search: "Active Directory",
    def: "Active Directory est l'annuaire de Microsoft qui gère les comptes, groupes et droits d'accès dans la plupart des entreprises. Qui contrôle l'AD contrôle en pratique tout le réseau Windows. C'est pourquoi les attaquants cherchent à y obtenir des droits d'administrateur de domaine.",
    url: "https://fr.wikipedia.org/wiki/Active_Directory"
  },
  {
    term: "Hyperviseur",
    match: ["hyperviseur", "hypervisor", "\\besxi\\b", "vmware", "proxmox", "hyper-v"],
    search: "VMware",
    def: "Un hyperviseur est le logiciel qui fait tourner plusieurs machines virtuelles sur un même serveur physique, en partageant processeur, mémoire et stockage. VMware ESXi, Hyper-V et Proxmox sont les plus connus. Compromettre un hyperviseur donne accès à toutes les machines qu'il héberge.",
    url: "https://fr.wikipedia.org/wiki/Hyperviseur"
  },
  {
    term: "Conteneur",
    match: ["\\bdocker\\b", "conteneur", "\\bcontainers?\\b"],
    search: "Docker",
    def: "Un conteneur emballe une application avec tout ce dont elle a besoin pour tourner, mais partage le noyau du système hôte. Il est donc beaucoup plus léger qu'une machine virtuelle et démarre en quelques secondes. Docker a popularisé cette technique, devenue la norme pour déployer des applications.",
    url: "https://en.wikipedia.org/wiki/Containerization_(computing)"
  },
  {
    term: "Kubernetes",
    match: ["kubernetes", "\\bk8s\\b"],
    search: "Kubernetes",
    def: "Kubernetes orchestre des conteneurs sur un ensemble de serveurs : il les démarre, les répartit, les redémarre en cas de panne et ajuste leur nombre selon la charge. Créé par Google, il est devenu le standard du cloud moderne. Sa puissance a un prix : il est complexe à configurer et à sécuriser.",
    url: "https://fr.wikipedia.org/wiki/Kubernetes"
  },
  {
    term: "PUE d'un data center",
    match: ["\\bpue\\b", "data ?cent(er|re)s?", "centres? de donnees"],
    search: "data center",
    def: "Le PUE (Power Usage Effectiveness) mesure l'efficacité énergétique d'un data center : c'est l'énergie totale consommée divisée par celle utilisée par les serveurs eux-mêmes. Un PUE de 1,2 signifie que 20 % de l'électricité part dans le refroidissement et le reste du bâtiment. Avec l'essor de l'IA, ce chiffre et la consommation d'eau sont surveillés de près.",
    url: "https://en.wikipedia.org/wiki/Power_usage_effectiveness"
  },
  {
    term: "Hyperscaler",
    match: ["hyperscal"],
    search: "hyperscaler",
    def: "On appelle hyperscalers les géants du cloud capables de faire grandir leur infrastructure à une échelle mondiale : AWS, Microsoft Azure, Google Cloud, et en partie Meta ou Oracle. Ils construisent leurs propres data centers, puces et réseaux. Leurs dépenses d'investissement pèsent désormais sur les marchés de l'énergie et des composants.",
    url: "https://en.wikipedia.org/wiki/Hyperscale_computing"
  },
  {
    term: "GPU",
    match: ["\\bgpus?\\b", "processeur graphique"],
    search: "GPU",
    def: "Un GPU est un processeur conçu pour faire des milliers de calculs simples en parallèle. Créé pour l'affichage 3D des jeux vidéo, il s'est révélé idéal pour entraîner et faire tourner les modèles d'IA. Nvidia domine ce marché, ce qui explique les tensions sur les prix et les livraisons.",
    url: "https://fr.wikipedia.org/wiki/Processeur_graphique"
  },
  {
    term: "Grand modèle de langage (LLM)",
    match: ["\\bllms?\\b", "large language model", "modeles? de langage"],
    search: "LLM",
    def: "Un LLM est un modèle d'IA entraîné sur d'énormes quantités de texte pour prédire le mot suivant. À grande échelle, cette capacité lui permet de rédiger, résumer, traduire ou écrire du code. ChatGPT, Claude, Gemini et Mistral reposent sur ce principe.",
    url: "https://fr.wikipedia.org/wiki/Grand_mod%C3%A8le_de_langage"
  },
  {
    term: "Agent IA",
    match: ["\\bagents? (d.)?ia\\b", "\\bai agents?\\b", "agentic", "agentique"],
    search: "agent",
    def: "Un agent IA est un modèle de langage à qui l'on donne des outils (navigateur, terminal, messagerie) et un objectif, et qui enchaîne lui-même les étapes pour l'atteindre. Il ne se contente plus de répondre : il agit. Cela pose de nouvelles questions de sécurité, car un agent trompé peut exécuter de vraies actions.",
    url: "https://en.wikipedia.org/wiki/Intelligent_agent"
  },
  {
    term: "Injection de prompt",
    match: ["prompt injection", "injection de prompt"],
    search: "prompt injection",
    def: "L'injection de prompt consiste à cacher des instructions dans un contenu lu par une IA (page web, mail, document) pour détourner son comportement. Par exemple, un texte invisible peut demander à un assistant de divulguer des données. C'est aujourd'hui l'une des principales failles des applications basées sur des LLM.",
    url: "https://en.wikipedia.org/wiki/Prompt_injection"
  },
  {
    term: "RAG",
    match: ["\\brag\\b", "retrieval[- ]augmented"],
    search: "RAG",
    def: "Le RAG (Retrieval-Augmented Generation) consiste à aller chercher des documents pertinents dans une base avant de demander à un LLM de répondre. Le modèle s'appuie alors sur des informations précises et à jour au lieu de sa seule mémoire. C'est la méthode la plus courante pour brancher une IA sur les documents d'une entreprise.",
    url: "https://en.wikipedia.org/wiki/Retrieval-augmented_generation"
  },
  {
    term: "Modèle à poids ouverts",
    match: ["open[- ]weights?", "poids ouverts", "ouvre les poids", "open[- ]source (ai|model)"],
    search: "open",
    def: "Un modèle à poids ouverts (open-weight) est un modèle d'IA dont les paramètres entraînés sont téléchargeables. On peut le faire tourner sur ses propres serveurs et l'adapter, sans dépendre d'une API. Ce n'est pas toujours de l'open source complet : les données et le code d'entraînement restent souvent privés.",
    url: "https://en.wikipedia.org/wiki/Open-source_artificial_intelligence"
  },
  {
    term: "Hallucination d'IA",
    match: ["hallucin"],
    search: "hallucin",
    def: "On parle d'hallucination quand un modèle d'IA affirme avec assurance quelque chose de faux : une source inventée, un chiffre erroné, une fonction de code qui n'existe pas. Elle vient du fait que le modèle produit du texte plausible, pas forcément vrai. D'où l'importance de vérifier les réponses et de citer des sources.",
    url: "https://fr.wikipedia.org/wiki/Hallucination_(intelligence_artificielle)"
  },
  {
    term: "Open source",
    match: ["open[- ]source", "logiciel libre"],
    search: "open source",
    def: "Un logiciel open source publie son code et autorise chacun à le lire, le modifier et le redistribuer selon sa licence. Linux, Firefox ou Kubernetes en sont des exemples. Une grande partie d'Internet repose sur des projets maintenus par quelques bénévoles, ce qui en fait aussi une cible.",
    url: "https://fr.wikipedia.org/wiki/Open_source"
  },
  {
    term: "RGPD",
    match: ["\\brgpd\\b", "\\bgdpr\\b", "\\bcnil\\b"],
    search: "RGPD",
    def: "Le RGPD est le règlement européen sur la protection des données personnelles, en vigueur depuis 2018. Il impose de justifier chaque collecte, de sécuriser les données et de signaler les fuites sous 72 heures. En France, la CNIL contrôle son application et peut infliger des amendes.",
    url: "https://www.cnil.fr/fr/reglement-europeen-protection-donnees"
  },
  {
    term: "Directive NIS 2",
    match: ["\\bnis ?2\\b"],
    search: "NIS",
    def: "NIS 2 est une directive européenne qui oblige des milliers d'organisations à renforcer leur cybersécurité : énergie, santé, transport, collectivités, numérique et bien d'autres. Elle impose une gestion des risques, des signalements d'incidents et engage la responsabilité des dirigeants. En France, l'ANSSI accompagne sa mise en œuvre.",
    url: "https://fr.wikipedia.org/wiki/Directive_NIS_2"
  },
  {
    term: "IPv6",
    match: ["\\bipv6\\b"],
    search: "IPv6",
    def: "IPv6 est la version moderne du protocole d'adressage d'Internet. Les adresses IPv4, sur 32 bits, sont épuisées ; IPv6 en utilise 128, soit un nombre quasi illimité. Sa généralisation simplifie les réseaux, mais beaucoup d'entreprises font encore cohabiter les deux versions.",
    url: "https://fr.wikipedia.org/wiki/IPv6"
  },
  {
    term: "Wi-Fi 7",
    match: ["wi-?fi 7", "802\\.11be"],
    search: "Wi-Fi 7",
    def: "Le Wi-Fi 7 (norme 802.11be) peut utiliser plusieurs bandes de fréquences en même temps grâce au MLO (Multi-Link Operation). Il promet des débits plus élevés et une latence plus faible, utile pour la réalité virtuelle ou le jeu en ligne. Il faut un routeur et un appareil compatibles pour en profiter.",
    url: "https://fr.wikipedia.org/wiki/Wi-Fi_7"
  },
  {
    term: "Ray tracing",
    match: ["ray[- ]?tracing", "path tracing", "lancer de rayons?"],
    search: "ray tracing",
    def: "Le ray tracing calcule le trajet des rayons de lumière dans une scène 3D pour obtenir des reflets, ombres et éclairages réalistes. Longtemps réservé au cinéma, il est devenu possible en temps réel dans les jeux grâce aux GPU récents. Il reste très gourmand en calcul.",
    url: "https://fr.wikipedia.org/wiki/Lancer_de_rayon"
  },
  {
    term: "Upscaling par IA (DLSS, FSR)",
    match: ["\\bdlss\\b", "\\bfsr\\b", "upscal", "frame generation"],
    search: "DLSS",
    def: "L'upscaling par IA calcule l'image d'un jeu en basse définition, puis l'agrandit avec un réseau de neurones pour qu'elle paraisse nette. On gagne beaucoup d'images par seconde pour une perte de qualité faible. DLSS chez Nvidia et FSR chez AMD sont les deux techniques les plus répandues.",
    url: "https://fr.wikipedia.org/wiki/Deep_Learning_Super_Sampling"
  },
  {
    term: "Cryptographie post-quantique",
    match: ["post-?quanti", "quantum[- ]safe", "ordinateurs? quantiques?", "quantum comput"],
    search: "quanti",
    def: "Un ordinateur quantique assez puissant pourrait casser les algorithmes de chiffrement utilisés aujourd'hui, comme RSA. La cryptographie post-quantique regroupe de nouveaux algorithmes conçus pour lui résister. Les organisations commencent dès maintenant la migration, car des données volées aujourd'hui pourraient être déchiffrées plus tard.",
    url: "https://fr.wikipedia.org/wiki/Cryptographie_post-quantique"
  },
  {
    term: "Portefeuille crypto matériel",
    match: ["hardware wallet", "portefeuilles? materiels?", "\\btrezor\\b", "\\bledger\\b", "crypto heist", "cryptomonnaie"],
    search: "crypto",
    def: "Un portefeuille matériel est un petit appareil qui garde hors ligne les clés privées donnant accès à des cryptomonnaies. Les transactions y sont signées sans que la clé ne quitte l'appareil. C'est plus sûr qu'un portefeuille logiciel, à condition d'acheter l'appareil chez le fabricant pour éviter les modèles piégés.",
    url: "https://en.wikipedia.org/wiki/Cryptocurrency_wallet"
  }
];
