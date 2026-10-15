// Ders Asistanı - sunucu. Ek bağımlılık gerektirmez (Node.js 18+).
// Görevleri: statik sayfaları sunmak, fotoğraf ve konu açıklaması isteklerini
// yapay zekâ servisine iletmek. Yüklenen fotoğraflar diske YAZILMAZ.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = process.env.MODEL || 'claude-haiku-5-5';
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_GOVDE = 8 * 1024 * 1024; // istek gövdesi üst sınırı (base64 büyüttüğü için)
const MAX_GORSEL = 5 * 1024 * 1024; // görüntü üst sınırı
const IZINLI_TURLER = ['image/jpeg', 'image/png', 'image/webp'];

const KONULAR = JSON.parse(
  fs.readFileSync(path.join(PUBLIC_DIR, 'veri', 'konular.json'), 'utf8')
).konular;
const HAZIR_KONU_IDLERI = KONULAR.filter((k) => k.durum === 'hazir').map((k) => k.id);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const SISTEM_COZUM = `Sen ortaokul ve lise öğrencilerine ders sorularını adım adım çözdüren, sabırlı bir öğretmen asistanısın. Tüm yanıtların Türkçe olsun.

Sana bir ders sorusunun fotoğrafı verilecek. Şunları yap:
1. Fotoğraftaki soruyu dikkatlice oku.
2. Soru okunabiliyorsa çözümü adım adım yaz. Her adımda ne yaptığını ve neden yaptığını açıkla.
3. Sonucu yerine koyarak ya da başka bir yolla kontrol et.
4. Soru okunamıyorsa ya da bir ders sorusu değilse bunu belirt.

Yanıtını yalnızca aşağıdaki JSON biçiminde ver. JSON dışında hiçbir metin ekleme.

Soru okunabiliyorsa:
{"okunabildi": true, "soru": "...", "ders": "...", "konu": "...", "guven": "yuksek|orta|dusuk", "adimlar": [{"baslik": "...", "aciklama": "...", "ifade": "..."}], "sonuc": "...", "ilgiliKonuId": "..."}

Okunamıyorsa:
{"okunabildi": false, "mesaj": "..."}

ilgiliKonuId alanına, aşağıdaki listede konuya en uygun olanın id'sini yaz. Uygun konu yoksa boş bırak.
Liste: ${HAZIR_KONU_IDLERI.join(', ')}`;

const ACIKLAMA_ISTEKLERI = {
  basit: 'Bu konuyu daha basit ve günlük hayattan örneklerle anlat. En fazla 150 kelime olsun.',
  benzer: 'Bu konuya benzer 3 soru hazırla. Her sorunun cevabını soruların altına ayrı satırda yaz.',
  hata: 'Bu konuda öğrencilerin en sık yaptığı 3 hatayı ve bu hatalardan nasıl kaçınılacağını anlat.',
};

function sendJson(res, status, obj) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}

function govdeyiOku(req) {
  return new Promise((resolve, reject) => {
    let boyut = 0;
    const parcalar = [];
    req.on('data', (parca) => {
      boyut += parca.length;
      if (boyut > MAX_GOVDE) {
        reject(new Error('TOO_LARGE'));
        req.destroy();
        return;
      }
      parcalar.push(parca);
    });
    req.on('end', () => resolve(Buffer.concat(parcalar).toString('utf8')));
    req.on('error', reject);
  });
}

async function govdeOku(req, res) {
  try {
    return JSON.parse(await govdeyiOku(req));
  } catch (err) {
    if (err.message === 'TOO_LARGE') sendJson(res, 413, { hata: 'İstek çok büyük.' });
    else sendJson(res, 400, { hata: 'Geçersiz istek.' });
    return null;
  }
}

function temizle(deger, uzunluk) {
  return typeof deger === 'string' ? deger.slice(0, uzunluk) : '';
}

// Yapay zekâ yanıtındaki JSON bloğunu ayıklar.
function jsonAyikla(metin) {
  const bas = metin.indexOf('{');
  const son = metin.lastIndexOf('}');
  if (bas === -1 || son === -1) throw new Error('Yanıtta JSON bulunamadı');
  return JSON.parse(metin.slice(bas, son + 1));
}

async function claudeCagir(sistem, icerik, maxTokens) {
  const yanit = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: sistem,
      messages: [{ role: 'user', content: icerik }],
    }),
  });
  if (!yanit.ok) throw new Error(`API ${yanit.status}: ${await yanit.text()}`);
  const veri = await yanit.json();
  return veri.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function hataYaz(res, err) {
  // Ayrıntıyı sunucu günlüğüne yaz, kullanıcıya genel mesaj göster.
  console.error('[API hatası]', err.message);
  sendJson(res, 502, { hata: 'Yapay zekâ servisine ulaşılamadı. Biraz sonra tekrar dene.' });
}

// API anahtarı yokken arayüzü test edebilmek için sabit bir örnek yanıt.
function demoCozum() {
  return {
    okunabildi: true,
    demo: true,
    soru: '4(x − 2) = 2x + 6',
    ders: 'Matematik',
    konu: 'Birinci dereceden denklemler',
    guven: 'yuksek',
    adimlar: [
      {
        baslik: 'Parantezi aç.',
        aciklama: 'Sol taraftaki 4, parantez içindeki her terimle çarpılır. Yalnızca x ile çarpıp 2 ile çarpmayı unutmak en sık yapılan hatadır.',
        ifade: '4x − 8 = 2x + 6',
      },
      {
        baslik: 'Bilinmeyenleri bir tarafa topla.',
        aciklama: 'Her iki taraftan 2x çıkarılır. Eşitliğin iki tarafına aynı işlem uygulandığı için denge bozulmaz.',
        ifade: '2x − 8 = 6',
      },
      {
        baslik: 'Sabit sayıları diğer tarafa geçir.',
        aciklama: 'Her iki tarafa 8 eklenir.',
        ifade: '2x = 14',
      },
      {
        baslik: 'Katsayıya böl.',
        aciklama: 'Bilinmeyenin katsayısı 2 olduğu için iki tarafı 2\'ye bölersin.',
        ifade: 'x = 7',
      },
    ],
    sonuc: 'x = 7. Kontrol: 4(7 − 2) = 20 ve 2 · 7 + 6 = 20, eşit.',
    ilgiliKonuId: 'birinci-derece-denklemler',
  };
}

async function handleCoz(req, res) {
  const govde = await govdeOku(req, res);
  if (!govde) return;
  const { image, mediaType, ders, not } = govde;

  if (
    !IZINLI_TURLER.includes(mediaType) ||
    typeof image !== 'string' ||
    !/^[A-Za-z0-9+/=\s]+$/.test(image)
  ) {
    return sendJson(res, 400, { hata: 'Yalnızca JPG, PNG veya WebP fotoğrafı yükleyebilirsin.' });
  }
  if (Math.floor((image.length * 3) / 4) > MAX_GORSEL) {
    return sendJson(res, 413, { hata: 'Fotoğraf 5 MB\'tan küçük olmalı.' });
  }
  if (!API_KEY) return sendJson(res, 200, demoCozum());

  try {
    const metin = await claudeCagir(
      SISTEM_COZUM,
      [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
        {
          type: 'text',
          text: `Ders: ${temizle(ders, 50) || 'belirtilmedi'}\nÖğrencinin notu: ${temizle(not, 300) || 'yok'}`,
        },
      ],
      2500
    );
    sendJson(res, 200, jsonAyikla(metin));
  } catch (err) {
    hataYaz(res, err);
  }
}

async function handleAcikla(req, res) {
  const govde = await govdeOku(req, res);
  if (!govde) return;
  const konu = KONULAR.find((k) => k.id === govde.konuId && k.durum === 'hazir');
  const talimat = ACIKLAMA_ISTEKLERI[govde.istek];
  if (!konu || !talimat) return sendJson(res, 400, { hata: 'Geçersiz istek.' });

  if (!API_KEY) {
    return sendJson(res, 200, {
      demo: true,
      metin: 'Demo modu: ANTHROPIC_API_KEY tanımlanmadığı için yapay zekâ yanıtı üretilmedi. Anahtarı tanımlayınca bu alanda gerçek yanıt görünür.',
    });
  }

  try {
    const metin = await claudeCagir(
      'Sen ortaokul ve lise öğrencilerine yardım eden bir öğretmen asistanısın. Türkçe, sade ve anlaşılır yaz.',
      [
        {
          type: 'text',
          text: `Konu: ${konu.baslik}\nKonunun özeti: ${konu.tanim}\n\nİstek: ${talimat}`,
        },
      ],
      1200
    );
    sendJson(res, 200, { metin });
  } catch (err) {
    hataYaz(res, err);
  }
}

function statikSun(res, urlYolu) {
  let rel = decodeURIComponent(urlYolu);
  if (rel === '/') rel = '/index.html';
  const dosya = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!dosya.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Erişim yok');
  }
  fs.readFile(dosya, (err, veri) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>Sayfa bulunamadı</h1><p><a href="/">Ana sayfaya dön</a></p>');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(dosya)] || 'application/octet-stream' });
    res.end(veri);
  });
}

const sunucu = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/coz') return handleCoz(req, res);
  if (req.method === 'POST' && url.pathname === '/api/acikla') return handleAcikla(req, res);
  if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { hata: 'Bulunamadı' });
  if (req.method !== 'GET') {
    res.writeHead(405);
    return res.end();
  }
  statikSun(res, url.pathname);
});

sunucu.listen(PORT, () => {
  console.log(`Ders Asistanı çalışıyor: http://localhost:${PORT}`);
  if (!API_KEY) {
    console.log('Uyarı: ANTHROPIC_API_KEY tanımlı değil. Demo yanıtlar kullanılacak.');
  }
});
