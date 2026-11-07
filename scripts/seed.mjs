import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL;

export async function seedDatabase(pool) {
  console.log('[SEED] Starting database initialization...');

  // ── 1. ROLES ─────────────────────────────────────────────────────────────
  console.log('[SEED] Seeding roles...');
  const allPerms = [
    'read_articles', 'create_articles', 'edit_own_articles', 'publish_articles',
    'edit_others_articles', 'delete_articles', 'manage_categories', 'manage_media',
    'manage_comments', 'manage_users', 'manage_roles', 'manage_settings',
    'manage_newsletter', 'view_analytics', 'manage_analytics', 'export_data',
    'manage_elections', 'manage_live_blog', 'manage_highlights', 'manage_sports',
    'manage_layout', 'manage_seo', 'manage_notifications'
  ];

  const roles = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Cikakken ikon kula da kowane bangare na jarida',
      permissions: allPerms,
    },
    {
      id: 'managing_editor',
      name: 'Babban Edita',
      description: 'Kula da labarai, marubuta, zabe, da buga rahotanni',
      permissions: allPerms.filter((p) => !['manage_users', 'manage_roles', 'manage_settings'].includes(p)),
    },
    {
      id: 'editor',
      name: 'Edita',
      description: 'Gyara da amincewa da labarai da kuma buga su',
      permissions: ['read_articles', 'create_articles', 'edit_own_articles', 'publish_articles', 'edit_others_articles', 'manage_categories', 'manage_media', 'manage_live_blog', 'view_analytics'],
    },
    {
      id: 'author',
      name: 'Marubuci',
      description: 'Rubuta labarai da shigar da hotuna',
      permissions: ['read_articles', 'create_articles', 'edit_own_articles', 'publish_articles', 'manage_media'],
    },
    {
      id: 'contributor',
      name: 'Mai Ba Da Gudunmawa',
      description: 'Rubuta danyen labari ba tare da damar bugawa ba',
      permissions: ['read_articles', 'create_articles', 'edit_own_articles'],
    },
    {
      id: 'reader',
      name: 'Mai Karatu',
      description: 'Mai karanta labarai da yin sharhi',
      permissions: ['read_articles'],
    },
  ];

  for (const r of roles) {
    await pool.query(
      `INSERT INTO roles (id, name, description, permissions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.description, JSON.stringify(r.permissions)]
    );
  }

  // ── 2. INITIAL SUPERADMIN USER ───────────────────────────────────────────
  console.log('[SEED] Seeding initial admin user...');
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || 'admin@yanci.ng').toLowerCase().trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123456';
  const passwordHash = bcrypt.hashSync(adminPassword, 10);
  const adminId = 'usr_admin_initial';

  await pool.query(
    `INSERT INTO users (id, email, password_hash, name, role, active)
     VALUES ($1, $2, $3, $4, 'super_admin', true)
     ON CONFLICT (email) DO NOTHING`,
    [adminId, adminEmail, passwordHash, 'Babban Edita (Admin)']
  );

  // ── 3. SITE SETTINGS ─────────────────────────────────────────────────────
  console.log('[SEED] Seeding site settings...');
  const defaultSettings = [
    ['site_name', 'Yanci'],
    ['site_tagline', "Labaran Gaskiya Da Aminci Ga Al'umma"],
    ['site_description', 'Yanci babbar jaridar intanet ce da ke kawo ingantattun labarai, bincike da sharhi a harshen Hausa.'],
    ['contact_email', 'info@yanci.ng'],
    ['contact_phone', '+234 800 000 0000'],
    ['contact_address', 'Abuja, Nigeria'],
    ['footer_text', '© 2025 Yanci Media. Dukkan hakkoki a kiyaye.'],
    ['primary_color', '#0f3036'],
  ];

  for (const [key, value] of defaultSettings) {
    await pool.query(
      `INSERT INTO settings (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO NOTHING`,
      [key, value]
    );
  }

  // ── 4. HOMEPAGE LAYOUT ───────────────────────────────────────────────────
  console.log('[SEED] Seeding homepage layout...');
  const modules = [
    { key: 'breaking', position: 0, enabled: true },
    { key: 'headlines', position: 1, enabled: true },
    { key: 'opinion', position: 2, enabled: true },
    { key: 'sport', position: 3, enabled: true },
    { key: 'culture', position: 4, enabled: true },
    { key: 'trending', position: 5, enabled: true },
    { key: 'stats', position: 6, enabled: true },
    { key: 'video', position: 7, enabled: true },
  ];

  for (const mod of modules) {
    await pool.query(
      `INSERT INTO homepage_layout (id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [mod.key, JSON.stringify(mod)]
    );
  }

  // ── 5. HOMEPAGE STATS & HIGHLIGHTS ───────────────────────────────────────
  console.log('[SEED] Seeding stats and highlights...');
  const stats = [
    { id: 'stat-1', label: 'Labarai', value: 12500, suffix: '+', order: 1 },
    { id: 'stat-2', label: 'Masu karatu', value: 500, suffix: 'K+', order: 2 },
    { id: 'stat-3', label: 'Kasashen duniya', value: 45, suffix: '', order: 3 },
  ];

  for (const s of stats) {
    await pool.query(
      `INSERT INTO homepage_stats (id, label, value, suffix, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.label, String(s.value), s.suffix, s.order]
    );
  }

  const highlights = [
    {
      id: 'economy',
      tag: 'Kasuwanci',
      title: 'Kasuwar hannayen jari ta yi sama da kashi 4 cikin yini biyu',
      copy: 'Masu zuba jari sun amince da kudirin gwamnati na saukaka haraji ga masana’antu.',
      icon: 'trend',
      accent: '#10b981',
      gradient: 'from-emerald-500/20 to-teal-500/20',
      order: 1,
    },
    {
      id: 'radio',
      tag: 'Sauti',
      title: 'Shirin rediyon Yanci Live ya sanar da sabbin makalu daga jihohi 8',
      copy: 'Masu sauraro na iya sauraron labaran kai tsaye tare da mika ra’ayoyinsu.',
      icon: 'radio',
      accent: '#3b82f6',
      gradient: 'from-blue-500/20 to-indigo-500/20',
      order: 2,
    },
    {
      id: 'innovation',
      tag: 'Kirkire-kirkire',
      title: 'Matasa a Zaria sun kirkiro manhajar gano gonaki ta tauraron dan adam',
      copy: 'Aikin ya samu tallafin dala 150,000 daga hadin gwiwar kungiyoyin fasaha.',
      icon: 'innovation',
      accent: '#8b5cf6',
      gradient: 'from-violet-500/20 to-purple-500/20',
      order: 3,
    },
  ];

  for (const h of highlights) {
    await pool.query(
      `INSERT INTO highlights (id, title, subtitle, category, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO NOTHING`,
      [h.id, h.title, h.copy, h.tag, h.order]
    );
  }

  // ── 6. SPORTS DATA ───────────────────────────────────────────────────────
  console.log('[SEED] Seeding sports data...');
  const sports = {
    liveMatches: [
      {
        id: 'npfl-1',
        isLive: true,
        league: 'NPFL',
        homeTeam: 'Kano Pillars',
        awayTeam: 'Enyimba',
        homeLogo: 'KP',
        awayLogo: 'EN',
        homeScore: 2,
        awayScore: 1,
        minute: "67'",
        events: [
          { minute: "12'", player: 'Ibrahim Mustafa', team: 'home', score: '1-0' },
          { minute: "39'", player: 'Ekong Balogun', team: 'away', score: '1-1' },
        ],
      },
    ],
    standings: [
      { pos: 1, team: 'Kano Pillars', p: 24, gd: 18, pts: 52 },
      { pos: 2, team: 'Enyimba', p: 24, gd: 14, pts: 49 },
      { pos: 3, team: 'Rivers United', p: 24, gd: 11, pts: 47 },
      { pos: 4, team: 'Enugu Rangers', p: 24, gd: 6, pts: 44 },
      { pos: 5, team: 'Remo Stars', p: 24, gd: 2, pts: 41 },
    ],
    upcomingFixtures: [
      { id: 1, league: 'NPFL', home: 'Kano Pillars', away: 'Shooting Stars', date: 'Sat', time: '16:00', stadium: 'Sani Abacha Stadium' },
      { id: 2, league: 'NPFL', home: 'Enyimba', away: 'Rivers United', date: 'Sun', time: '18:00', stadium: 'Aba Township Stadium' },
    ],
  };

  await pool.query(
    `INSERT INTO sports_data (id, live_matches, standings, upcoming_fixtures, updated_at)
     VALUES ('default', $1, $2, $3, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(sports.liveMatches), JSON.stringify(sports.standings), JSON.stringify(sports.upcomingFixtures)]
  );

  // ── 7. READER POLL ───────────────────────────────────────────────────────
  console.log('[SEED] Seeding poll...');
  const pollOptions = [
    { id: 'opt-1', text: 'E, ina goyon baya sosai', votes: 142 },
    { id: 'opt-2', text: "A'a, ban goyi baya ba", votes: 218 },
    { id: 'opt-3', text: 'Ina bukatar karin bayani', votes: 65 },
    { id: 'opt-4', text: "Ba ni da tabbataccen ra'ayi", votes: 23 },
  ];

  await pool.query(
    `INSERT INTO polls (id, question, description, category, options, total_votes, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO NOTHING`,
    [
      'poll-haraji-2025',
      'Kuna goyon bayan sabon tsarin harajin da gwamnati ta gabatar?',
      "Bayanin ra'ayin al'umma game da sabbin sauye-sauyen haraji da manufofin tattalin arziki a Najeriya.",
      "Ra'ayin Jama'a",
      JSON.stringify(pollOptions),
      448,
      true,
    ]
  );

  // ── 8. ELECTION HUB DATA ─────────────────────────────────────────────────
  console.log('[SEED] Seeding election hub...');
  const electionId = 'zaben-shugaban-kasa-2027';
  await pool.query(
    `INSERT INTO elections (id, name, full_name, date, status, type, electoral_body, description, published)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
     ON CONFLICT (id) DO NOTHING`,
    [
      electionId,
      'Zaben Shugaban Kasa 2027',
      'Babban Zaben Shugaban Kasa da Majalisar Tarayya Ta Najeriya 2027',
      '2027-02-27',
      'active',
      'general',
      'INEC',
      'Cikakken bayanin zaben shugaban kasar Najeriya da zai gudana a watan Fabrairu 2027.',
    ]
  );

  const candidatesList = [
    {
      id: 'cand-apc',
      name: 'Bola Ahmed Tinubu',
      party: 'All Progressives Congress',
      partyAbbr: 'APC',
      runningMate: 'Kashim Shettima',
      bio: 'Dan takarar jam’iyyar APC kuma shugaban kasa mai ci.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
      manifesto: 'Gina tattalin arziki, inganta tsaro da samar da ayyukan yi.',
    },
    {
      id: 'cand-pdp',
      name: 'Atiku Abubakar',
      party: "Peoples Democratic Party",
      partyAbbr: 'PDP',
      runningMate: 'Ifeanyi Okowa',
      bio: 'Tsohon mataimakin shugaban kasar Najeriya.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop',
      manifesto: 'Sake fasalin kasa, hada kan al’umma da bunkasa masana’antu.',
    },
    {
      id: 'cand-nnpp',
      name: 'Rabiu Musa Kwankwaso',
      party: 'New Nigeria Peoples Party',
      partyAbbr: 'NNPP',
      runningMate: 'Bishop Isaac Idahosa',
      bio: 'Tsohon gwamnan jihar Kano kuma tsohon ministan tsaro.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop',
      manifesto: 'Ilimi kyauta ga kowa, yaki da cin hanci da inganta tsaro.',
    },
    {
      id: 'cand-lp',
      name: 'Peter Obi',
      party: 'Labour Party',
      partyAbbr: 'LP',
      runningMate: 'Yusuf Datti Baba-Ahmed',
      bio: 'Tsohon gwamnan jihar Anambra kuma dan kasuwa.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop',
      manifesto: 'Mayar da Najeriya daga kasa mai cinye kudi zuwa mai samarwa.',
    },
  ];

  for (const c of candidatesList) {
    await pool.query(
      `INSERT INTO candidates (id, election_id, name, party, party_abbr, running_mate, bio, avatar, status, manifesto)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
       ON CONFLICT (id) DO NOTHING`,
      [c.id, electionId, c.name, c.party, c.partyAbbr, c.runningMate, c.bio, c.avatar, c.manifesto]
    );
  }

  // Sample election results
  const sampleResults = [
    { id: 'res-kano-nnpp', state: 'Kano', candId: 'cand-nnpp', votes: 997279, pct: '56.40', units: 8520 },
    { id: 'res-kano-apc', state: 'Kano', candId: 'cand-apc', votes: 517341, pct: '29.30', units: 8520 },
    { id: 'res-lagos-apc', state: 'Lagos', candId: 'cand-apc', votes: 572606, pct: '45.10', units: 13325 },
    { id: 'res-lagos-lp', state: 'Lagos', candId: 'cand-lp', votes: 582454, pct: '45.80', units: 13325 },
    { id: 'res-kaduna-pdp', state: 'Kaduna', candId: 'cand-pdp', votes: 554360, pct: '41.20', units: 8012 },
    { id: 'res-kaduna-apc', state: 'Kaduna', candId: 'cand-apc', votes: 399293, pct: '29.70', units: 8012 },
  ];

  for (const r of sampleResults) {
    await pool.query(
      `INSERT INTO election_results (id, election_id, candidate_id, state, votes, percentage, reporting_units, last_updated)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [r.id, electionId, r.candId, r.state, r.votes, r.pct, r.units]
    );
  }

  // Fact checks
  const facts = [
    {
      id: 'fc-vat-increase',
      electionId,
      claim: 'Gwamnatin tarayya ta kara kudin harajin VAT zuwa kashi 15% a sabuwar dokar kasafin kudi.',
      claimant: "Kungiyar 'Yan Kasuwa",
      date: '2025-01-12',
      verdict: 'karya',
      explanation: 'Binciken Yanci ya tabbatar da cewa harajin VAT yana nan a kan kashi 7.5%, ba a yi wani kari ba.',
      sources: 'Ma’aikatar Kudi ta Tarayya (FMF) da Hukumar Karbar Haraji ta Kasa (FIRS).',
      tags: ['Tattalin Arziki', 'Haraji', 'Gaskiya'],
    },
    {
      id: 'fc-inec-bvas',
      electionId,
      claim: 'Hukumar INEC ta janye amfani da na’urar BVAS a zaben 2027.',
      claimant: 'Wani sako da ke yawo a WhatsApp',
      date: '2025-01-10',
      verdict: 'karya',
      explanation: 'INEC ta fitar da sanarwa a hukumance tana karyata batun tare da tabbatar da cewa za a ci gaba da amfani da na’urar BVAS.',
      sources: 'Kakakin Hukumar INEC, Festus Okoye.',
      tags: ['Zabe', 'INEC', 'BVAS'],
    },
  ];

  for (const f of facts) {
    await pool.query(
      `INSERT INTO factchecks (id, election_id, claim, claimant, date, verdict, explanation, sources, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [f.id, f.electionId, f.claim, f.claimant, f.date, f.verdict, f.explanation, f.sources, JSON.stringify(f.tags)]
    );
  }

  // ── 9. ARTICLES ──────────────────────────────────────────────────────────
  console.log('[SEED] Seeding articles...');
  const articles = [
    {
      id: 'art-1',
      slug: 'majalisa-ta-amince-da-dokar-tsare-bayanan-dijital',
      headline: 'Majalisa ta amince da dokar tsare bayanan dijital domin kare ’yan kasa',
      kicker: 'Kai Tsaye',
      trail: 'Sabuwar dokar za ta tilasta kamfanonin fasaha bin sharudan adana bayanai a cikin kasar tare da samar da ayyuka 25,000 a shekarar farko.',
      body: `Majalisar Dokokin Najeriya ta amince da gagarumar dokar tsare bayanan sirri na dijital bayan kwashe watanni ana tattaunawa tsakanin masana fasaha, jami'an tsaro da kuma 'yan kasuwa.

Wannan doka na da nufin kare bayanan sirri na 'yan kasa daga amfani da su ba bisa ka'ida ba ta hanyar manhajoji da shafukan sada zumunta na kasashen waje.

Babban jami'in hukumar kula da harkokin sadarwa ya bayyana cewa dokar za ta tilasta dukkan kamfanonin da ke da masu amfani fiye da dubu dari a Najeriya su ajiye wani bangare na bayanan a cikin kasa.

Bugu da kari, matakin zai bunkasa masana'antar cibiyoyin adana bayanai (Data Centers) tare da samar da sabbin guraben ayyukan yi sama da 25,000 a cikin shekaru biyu masu zuwa.`,
      image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600&auto=format&fit=crop',
      pillar: 'news',
      section: 'headlines',
      type: 'hero',
      author: 'Rahama Ibrahim',
      isLive: false,
      views: 12500,
    },
    {
      id: 'art-2',
      slug: 'dalilin-da-ya-sa-kudin-naira-ke-kara-kwanciyar-hankali',
      headline: 'Dalilin da ya sa kudin Naira ke kara kwanciyar hankali a kasuwar duniya',
      kicker: 'Bincike',
      trail: 'Matakan da Babban Bankin Najeriya ya dauka sun fara haifar da da mai ido yayin da aka samu karuwar kudaden waje da ke shigowa.',
      body: `Kudin Najeriya, Naira, ya samu gagarumar nasara a makonnin da suka gabata a kasuwar canji ta hukumance da kuma kasuwar bayan fage.

Binciken da wakilinmu ya gudanar ya nuna cewa karuwar shigo da man fetur da matatar man Dangote ta fara yi ya rage yawan bukatar dalar Amurka da ake kashewa a waje.

Haka kuma, sabbin sauye-sauyen da Babban Bankin CBN ya yi kan yadda ake tafiyar da kudaden da 'yan Najeriya mazauna kasashen waje ke aiko gida sun taimaka matuka wajen habaka kasuwar.

Masana tattalin arziki sun yi hasashen cewa idan aka ci gaba a kan wannan turba, farashin kayan abinci da sauran kayayyakin masarufi zai fara sauka a hankali a kasuwannin kasar.`,
      image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop',
      pillar: 'news',
      section: 'headlines',
      type: 'standard',
      author: 'Aminu Bello',
      isLive: false,
      views: 9800,
    },
    {
      id: 'art-3',
      slug: 'sabon-tsarin-jirgin-kasa-abuja-kaduna',
      headline: 'Sabon tsarin jirgin kasa mai sauri ya fara tafiya tsakanin Abuja da Kaduna',
      kicker: 'Sufuri',
      trail: 'Hukumar kula da layin dogo ta kaddamar da sabbin motocin jirgi masu amfani da wutar lantarki da hasken rana.',
      body: `An fara jigilar fasinjoji a kan sabon tsarin jirgin kasa mai amfani da wutar lantarki tsakanin babban birnin tarayya Abuja da birnin Kaduna.

Jirgin wanda ke tafiya a kan gudun kilomita 160 a kowace sa'a zai rage tsawon lokacin tafiyar zuwa mintuna 45 kacal.

Gwamnati ta tabbatar da cewa an girke kyamarorin tsaro na zamani da na'urorin bibiyar motsi a dukkan tsawon layin dogon domin tabbatar da lafiyar fasinjoji da kayayyakinsu.`,
      image: 'https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=1200&auto=format&fit=crop',
      pillar: 'news',
      section: 'headlines',
      type: 'compact',
      author: 'Aisha Musa',
      isLive: true,
      views: 7400,
    },
    {
      id: 'art-4',
      slug: 'ndidi-ya-kafa-sabon-rikodi-na-kwallon-kafa',
      headline: 'Ndidi ya kafa sabon rikodi na kwace kwallon 18 a wasa guda',
      kicker: 'Wasanni',
      trail: 'Kyaftin din Super Eagles ya nuna bajinta ta ban mamaki yayin da kungiyarsa ta doke abokan hamayyarta a gasar Firimiya.',
      body: `Dan wasan tsakiyar Najeriya Wilfred Ndidi ya nuna kwarewa ta musamman inda ya kafa sabon tarihin zama dan wasan da ya fi kwace kwallon a wasa guda a wannan kakar.

Masana harkokin kwallon kafa sun yabawa dan wasan kan yadda yake jagorantar tawagarsa a lokacin da ake fafata manyan wasanni.

A cikin wata hira bayan kammala wasan, Ndidi ya sadaukar da wannan nasara ga magoya bayan kwallon kafa a Najeriya tare da jaddada kudirinsa na ci gaba da jajircewa.`,
      image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&auto=format&fit=crop',
      pillar: 'sport',
      section: 'sport',
      type: 'standard',
      author: 'Musa Lumi',
      isLive: false,
      views: 6100,
    },
    {
      id: 'art-5',
      slug: 'dalilin-da-ya-sa-siyasar-kula-da-bayanai-ta-tsare-martabar-dimokuradiyya',
      headline: 'Dalilin da ya sa siyasar kula da bayanai ta tsare martabar dimokuradiyya',
      kicker: "Ra'ayi",
      trail: 'A lokacin da kafafen yada labarai na zamani ke cike da labaran karya, akwai bukatar kowa ya zama mai tace abin da yake karantawa da yadawa.',
      body: `A wannan karni na fasaha, bayanan da muke karantawa a kowace rana suna da tasiri mai karfi kan yadda muke yanke shawara a matsayinmu na al'umma.

Idan labaran karya suka mamaye shafukan intanet, hakan na iya zubar da mutuncin dimokuradiyya da haifar da rashin fahimta a tsakanin al'ummu daban-daban.

Wajibi ne hukumomi, 'yan jarida da kuma masu amfani da kafafen sada zumunta su hada hannu wajen tabbatar da ingancin labarai kafin raba su ga jama'a.`,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
      pillar: 'opinion',
      section: 'opinion',
      type: 'standard',
      author: 'Dr. Garba Kurfi',
      isLive: false,
      views: 4300,
    },
  ];

  for (const a of articles) {
    await pool.query(
      `INSERT INTO articles (
        id, slug, headline, kicker, trail, body, image, pillar, section, type, author, is_live, views, status, publish_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'published', NOW(), NOW(), NOW())
      ON CONFLICT (id) DO NOTHING`,
      [
        a.id, a.slug, a.headline, a.kicker, a.trail, a.body, a.image, a.pillar, a.section, a.type, a.author, a.isLive, a.views
      ]
    );
  }

  // ── 10. MULTIMEDIA VIDEOS ────────────────────────────────────────────────
  console.log('[SEED] Seeding multimedia videos...');
  const videosList = [
    {
      id: 'vid-1',
      title: 'Tattaunawa ta Musamman: Kalubalen Tattalin Arziki da Hanyoyin Magance Su',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeId: 'dQw4w9WgXcQ',
      description: 'Cikakken shirin tattaunawa da masana tattalin arziki kan hanyoyin bunkasa masana’antu a Arewacin Najeriya.',
      thumbnail: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop',
      order: 0,
      published: true,
    },
    {
      id: 'vid-2',
      title: 'Kimanin Matasa 5,000 Sun Kammala Horon Fasahar AI a Yanci Lab',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youtubeId: 'dQw4w9WgXcQ',
      description: 'Yadda matasan suka baje kolin fasahohin da suka kirkiro a bikin yaye dalibai.',
      thumbnail: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop',
      order: 1,
      published: true,
    },
  ];

  for (const v of videosList) {
    await pool.query(
      `INSERT INTO videos (id, title, url, youtube_id, description, thumbnail, "order", published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [v.id, v.title, v.url, v.youtubeId, v.description, v.thumbnail, v.order, v.published]
    );
  }

  console.log('[SEED] ✅ Database seeded successfully!');
  console.log('────────────────────────────────────────────────────────────');
  console.log('🔑 INITIAL SUPERADMIN CREDENTIALS:');
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log('────────────────────────────────────────────────────────────');
}

// Standalone execution
if (process.argv[1] && process.argv[1].endsWith('seed.mjs')) {
  if (!connectionString) {
    console.error('[SEED] ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  const pool = new pg.Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
    max: 1,
  });

  try {
    await seedDatabase(pool);
  } catch (error) {
    console.error('[SEED] ❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
