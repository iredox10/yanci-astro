import type { GalleryItem } from '../components/PhotoGallery';
import type { Pillar } from './schema';

export interface GalleryEssay {
  id: string;
  slug: string;
  title: string;
  kicker?: string;
  description: string;
  lead?: string;
  pillar?: Pillar | string;
  section?: string;
  photographer: string;
  publishedAt: string;
  coverImage?: string;
  items: GalleryItem[];
  tags?: string[];
  readTime?: string;
}

export const SEED_GALLERIES: GalleryEssay[] = [
  {
    id: '1',
    slug: 'hawan-daushe-kano',
    title: "Hawan Daushe a Kano: Hotunan Bikin Al'ada Da Sarautar Gargajiya",
    kicker: "Al'ada Da Tarihi",
    description: "Wani kallo mai zurfi kan kwalliyar dawaki, dakarun sarki da gagarumar al'adar Hawan Daushe a birnin Kano.",
    lead: "Bikin Hawan Daushe na daya daga cikin tsoffin bukukuwan al'adu a tarihin Afirka ta Yamma. Dubban mutane na taruwa a kofar Kudu ta fadar Mai Martaba Sarkin Kano domin shaida bajintar mahaya dawaki da ado na alfarma.",
    pillar: 'culture',
    section: "Al'adu",
    photographer: 'Aliyu Babangida & Sani Tukur',
    publishedAt: '2025-04-12T10:00:00Z',
    coverImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600&auto=format&fit=crop',
    tags: ['Kano', 'Durbar', "Al'adu", 'Sarauta', 'Hotuna'],
    readTime: 'Minti 4 na kallo',
    items: [
      {
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600&auto=format&fit=crop',
        title: 'Kayan Ado na Sarauta',
        caption: 'Mahayan dawaki sanye da rawani da rigunan ado na alfarma yayin da suke shirin faretin Hawan Daushe a Kofar Kudu.',
        credit: 'Aliyu Babangida / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop',
        title: 'Bikin Kadaka Da Kakaki',
        caption: 'Masu busa kakaki da kidan algaita na sanar da fitowar ayarin Mai Martaba Sarki daga cikin fada.',
        credit: 'Sani Tukur / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop',
        title: 'Dawakan Yaki Da Ado',
        caption: 'Dawaki da aka yi wa ado da kayan tagulla, sulke da fatar dabba na musamman da aka kera a kasuwar Kurmi.',
        credit: 'Aliyu Babangida / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=1600&auto=format&fit=crop',
        title: "Jama'a a Ganuwar Birni",
        caption: "Mazauna birnin Kano da baki daga kasashen ketare sun cika gefen titi da kan tsohuwar ganuwar birni domin kallo.",
        credit: 'Aliyu Babangida / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1600&auto=format&fit=crop',
        title: 'Gaisuwa Ga Sarki',
        caption: "Hakimai da Dagatai suna mikawa Mai Martaba Sarkin Kano gaisuwar mubaya'a a karshen zagayen bikin.",
        credit: 'Sani Tukur / Yanci',
      },
    ],
  },
  {
    id: '2',
    slug: 'sauyin-hasken-rana',
    title: 'Hasken Rana a Karkara: Yadda Makamashin Zamani Ke Sauya Rayuwar Al’umma',
    kicker: 'Makamashi Da Rayuwa',
    description: 'Yadda kananan ayyukan hasken rana ke samar da wutar lantarki ga makarantu, asibitoci da gonakin karkara a Arewacin Najeriya.',
    lead: 'A kauyukan da ba su da hanyar sadarwa da wutar lantarki ta kasa, hasken rana ya zama ginshikin canjin tattalin arziki, ilimi da kiwon lafiya.',
    pillar: 'lifestyle',
    section: 'Fasaha',
    photographer: 'Fatima S. Bello',
    publishedAt: '2025-05-02T14:30:00Z',
    coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1600&auto=format&fit=crop',
    tags: ['Hasken Rana', 'Makamashi', 'Fasaha', 'Karkara'],
    readTime: 'Minti 3 na kallo',
    items: [
      {
        url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1600&auto=format&fit=crop',
        title: 'Tashar Hasken Rana a Kauye',
        caption: 'Kananan fale-falen hasken rana da aka kafa a wata cibiyar kiwon lafiya a jihar Jigawa don sanyaya magunguna.',
        credit: 'Fatima S. Bello / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=1600&auto=format&fit=crop',
        title: 'Ban Ruwa Ga Manoma',
        caption: 'Injin ban ruwa mai amfani da hasken rana yana taimakawa manoman rani a gefen kogin Hadejia.',
        credit: 'Fatima S. Bello / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=1600&auto=format&fit=crop',
        title: 'Karatun Dare a Makarantar Firamare',
        caption: 'Dalibai suna amfani da fitilar hasken rana don yin bitar karatu da daddare bayan faduwar rana.',
        credit: 'Fatima S. Bello / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1600&auto=format&fit=crop',
        title: 'Kwarewar Matasa a Fasahar Makamashi',
        caption: "Matasan karkara da aka horar kan gyara da kiyaye na'urorin hasken rana a cibiyar fasaha.",
        credit: 'Fatima S. Bello / Yanci',
      },
    ],
  },
  {
    id: '3',
    slug: 'kasuwar-kurmi-sarrafa-fata',
    title: "Kasuwar Kurmi: Dattijan Masu Sana'ar Hannu Da Sabbin Kirkire-Kirkire",
    kicker: "Sana'o'in Gargajiya",
    description: "Wani yawon hoto a cikin tsohuwar kasuwar Kurmi da Kofar Mata Dye Pits a birnin Kano.",
    lead: "Kasuwar Kurmi tana daya daga cikin tsoffin cibiyoyin kasuwanci a Afirka. A yau, matasa da dattijan masu sana'ar hannu na ci gaba da kiyaye dabarun sarrafa fata, rini da sassaka.",
    pillar: 'culture',
    section: "Al'adu",
    photographer: 'Ibrahim Mustapha',
    publishedAt: '2025-06-18T09:15:00Z',
    coverImage: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600&auto=format&fit=crop',
    tags: ['Kasuwar Kurmi', 'Rini', 'Kano', 'Sanaa'],
    readTime: 'Minti 3 na kallo',
    items: [
      {
        url: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1600&auto=format&fit=crop',
        title: 'Ramin Rini na Kofar Mata',
        caption: 'Masu rini suna sarrafa kalar shuni a ramukan rini na Kofar Mata da aka kafa tun a shekarar 1498.',
        credit: 'Ibrahim Mustapha / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1600&auto=format&fit=crop',
        title: 'Sarrafa Fatar Dabba',
        caption: 'Gwanaye a harkar jeme fata suna shirya fatar akuyoyi da shanu domin dinkin takalma da jakunkuna.',
        credit: 'Ibrahim Mustapha / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1600&auto=format&fit=crop',
        title: 'Dinkin Gargajiya a Kasuwar Kurmi',
        caption: 'Wani tsohon mai dinki yana sanya ado a kan babbar riga da zare mai sheki.',
        credit: 'Ibrahim Mustapha / Yanci',
      },
    ],
  },
  {
    id: '4',
    slug: 'wasan-dambe-arewa',
    title: 'Wasan Dambe: Jaruman Gargajiya Da Karfin Hali',
    kicker: "Wasanni Da Al'ada",
    description: 'Fafatawar mayaka a filin wasan dambe na gargajiya a Kano da Katagum.',
    lead: "Wasan dambe ya wuce gasar karfi kawai; wata al'ada ce mai cike da rera taken jarunta, kidan ganguna da girmama abokin karawa.",
    pillar: 'sport',
    section: 'Wasanni',
    photographer: 'Garba Danladi',
    publishedAt: '2025-07-04T16:00:00Z',
    coverImage: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&auto=format&fit=crop',
    tags: ['Dambe', 'Wasanni', 'Kano', 'Katagum'],
    readTime: 'Minti 3 na kallo',
    items: [
      {
        url: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=1600&auto=format&fit=crop',
        title: 'Nade Hannu Da Kara',
        caption: "Dan dambe yana kulla igiyar 'kara' a hannun damarsa kafin shiga fagen daga.",
        credit: 'Garba Danladi / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1600&auto=format&fit=crop',
        title: 'Kidan Ganguna Da Zuga',
        caption: 'Makada da maroka na rera taken jarunta domin kara wa mayaka kwarin gwiwa a filin dambe.',
        credit: 'Garba Danladi / Yanci',
      },
      {
        url: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?w=1600&auto=format&fit=crop',
        title: 'Fafatawa a Tsakiyar Filin',
        caption: 'Bugu da kiyaye kai: Mayaka biyu suna neman damar kifar da juna a gaban alkalan wasa.',
        credit: 'Garba Danladi / Yanci',
      },
    ],
  },
];
