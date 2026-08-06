import type { ArticleCard } from './schema';

export const SEED_ARTICLES: ArticleCard[] = [
  {
    id: 1,
    kicker: 'Kai Tsaye',
    headline: 'Majalisa ta amince da dokar tsare bayanan dijital domin kare ’yan kasa',
    trail: 'Sabuwar dokar za ta tilasta kamfanonin fasaha bin sharudan adana bayanai a cikin kasar tare da samar da ayyuka 25,000 a shekarar farko.',
    image: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=2000&auto=format&fit=crop',
    type: 'hero',
    pillar: 'news',
    section: 'headlines',
    author: 'Rahama Ibrahim',
    $createdAt: '2025-01-15T08:00:00Z',
    views: 12500,
  },
  {
    id: 2,
    kicker: 'Bincike',
    headline: 'Dalilin da ya sa kudin Naira ke kara kwanciyar hankali a kasuwar duniya',
    image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&auto=format&fit=crop',
    type: 'standard',
    pillar: 'news',
    section: 'headlines',
    author: 'Aminu Bello',
    $createdAt: '2025-01-15T06:30:00Z',
    views: 9800,
  },
  {
    id: 3,
    kicker: 'Sufuri',
    headline: 'Sabon tsarin jirgin kasa mai sauri ya fara tafiya tsakanin Abuja da Kaduna',
    type: 'compact',
    pillar: 'news',
    section: 'headlines',
    isLive: true,
    author: 'Aisha Musa',
    $createdAt: '2025-01-15T06:00:00Z',
    views: 7400,
  },
  {
    id: 4,
    kicker: 'Makaman Haske',
    headline: 'Gidaje 12,000 a Arewa maso Gabas sun fara amfani da hasken rana',
    type: 'compact',
    pillar: 'news',
    section: 'headlines',
    author: 'Yusuf Abdulkadir',
    $createdAt: '2025-01-15T05:00:00Z',
    views: 5200,
  },
  {
    id: 5,
    kicker: 'AFCON 2025',
    headline: 'An sanar da sabbin sunaye cikin jerin Super Eagles kafin wasan sada zumunci',
    image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1200&auto=format&fit=crop',
    type: 'standard',
    pillar: 'sport',
    section: 'sport',
    author: 'Musa Dauda',
    $createdAt: '2025-01-14T18:00:00Z',
    views: 8800,
  },
  {
    id: 6,
    kicker: 'Gasara',
    headline: 'Ndidi ya kafa sabon rikodi na kwace kwallon 18 a wasa guda',
    image: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&auto=format&fit=crop',
    type: 'compact',
    pillar: 'sport',
    section: 'sport',
    author: 'Musa Lumi',
    $createdAt: '2025-01-14T16:00:00Z',
    views: 6100,
  },
  {
    id: 7,
    author: 'Rahama Ibrahim',
    headline: 'Dalilin da ya sa siyasar kula da bayanai ta tsare martabar dimokuradiyya',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&auto=format&fit=crop',
    pillar: 'opinion',
    section: 'opinion',
    $createdAt: '2025-01-14T10:00:00Z',
    views: 4300,
  },
  {
    id: 8,
    author: 'Dr. Garba Kurfi',
    headline: 'Matakin tattabarun kudade ga kanman girma da ke jonka?',
    pillar: 'opinion',
    section: 'opinion',
    $createdAt: '2025-01-14T09:00:00Z',
    views: 3900,
  },
];

export const SEED_TICKER = [
  'Farashin danyen mai ya fadi da kashi uku sabodun karin samarwa a Afirka',
  "Jami'ar Kano ta kaddamar da tsarin karatu na AI na farko a Arewa",
  'Masu sana’ar noma sun samut tallafin ruwan sallama na zamani',
  'Matasa 5,000 sun kammala horai da Fasahar sadarwa a cibiyar Yanci Lab',
];

export const SEED_HIGHLIGHTS = [
  {
    id: 'economy',
    tag: 'Kasuwanci',
    title: 'Kasuwar hannayen jari ta yi sama da kashi 4 cikin yini biyu',
    copy: 'Masu zuba jari sun amince da kudirin gwamnati na saukakaka haraji ga masana’antchen.',
    icon: 'trend',
    accent: '#10b981',
    gradient: 'from-emerald-500/20 to-teal-500/20',
  },
  {
    id: 'radio',
    tag: 'Sauti',
    title: 'Shirin rediyon Yanci Live ya sanar da sabbin makalu daga jihohi 8',
    copy: 'Masu sauraro na iya kane da kanye shi kai tsaye tare da mika tam.',
    icon: 'radio',
    accent: '#3b82f6',
    gradient: 'from-blue-500/20 to-indigo-500/20',
  },
  {
    id: 'innovation',
    tag: 'Kirkire-kirkire',
    title: 'Matasa a Zaria sun kirkiƙiri manhajar gano gonakukan tauraro',
    copy: 'Aikin ya samu tallafin dala 150,000 dagal hadin gwiwar kungiyoyin.',
    icon: 'innovation',
    accent: '#8b5cf6',
    gradient: 'from-violet-500/20 to-purple-500/20',
  },
];

export const SEED_STATS = [
  { label: 'Labarai', value: 12500, suffix: '+' },
  { label: 'Masu karatu', value: 500, suffix: 'K+' },
  { label: 'Kasashen duniya', value: 45, suffix: '' },
];

export const SEED_SPORTS = {
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
  fixtures: [
    { id: 1, league: 'NPFL', home: 'Kano Pillars', away: 'Shooters Stars', date: 'Sat', time: '16:00', stadium: 'Sani Abacha Stadium' },
    { id: 2, league: 'NPFL', home: 'Enyimba', away: 'Rivers United', date: 'Sun', time: '18:00', stadium: 'Enugu Stadium', odds: { home: '2.10', draw: '3.20', away: '3.40' } },
  ],
  playerOfWeek: null,
};

export const SEED_TRENDING = ['#Nollywood', '#Afrobeats', '#NigerianFood', '#Fashion', '#Tech', '#Startups'];