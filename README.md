# Ders Asistanı

Öğrenciler için konu anlatımı ve fotoğrafla soru çözme sitesi. Sunucu için ek bağımlılık gerekmez; Node.js 18 veya üzeri yeterlidir.

## Çalıştırma

```bash
cd ders-sitesi

# Gerçek yapay zekâ yanıtları için:
ANTHROPIC_API_KEY=sk-ant-... node server.js

# Anahtar olmadan (demo yanıtlarla arayüzü denemek için):
node server.js
```

Ardından tarayıcıda `http://localhost:3000` adresini aç.

Ortam değişkenleri:

| Değişken | Varsayılan | Açıklama |
|---|---|---|
| `ANTHROPIC_API_KEY` | (boş) | Boşsa demo yanıtlar döner. |
| `MODEL` | `claude-haiku-5-5` | Kullanılacak model. Maliyet ve kaliteye göre değiştirilebilir. |
| `PORT` | `3000` | Sunucu portu. |

## Yapı

```
ders-sitesi/
├── server.js              Sunucu: statik dosyalar, /api/coz, /api/acikla
├── public/
│   ├── index.html         Ana sayfa
│   ├── konular.html       Ders ve konu listesi
│   ├── konu.html          Konu detayı (?id=... ile)
│   ├── soru.html          Fotoğraf yükleme
│   ├── sonuc.html         Adım adım çözüm
│   ├── gizlilik.html      Gizlilik metni (taslak)
│   ├── css/style.css
│   ├── js/
│   │   ├── ortak.js       Ortak yardımcılar
│   │   ├── konular.js
│   │   ├── konu.js        Konu detayı + yapay zekâ butonları
│   │   ├── soru.js        Fotoğraf kontrolü ve gönderme
│   │   └── sonuc.js       Çözümün çizimi
│   └── veri/konular.json  Tüm konu içerikleri (tek kaynak)
└── README.md
```

## Akış

1. Öğrenci `soru.html` sayfasında ders seçer, fotoğrafı yükler.
2. `soru.js` dosya türünü ve boyutunu kontrol eder, fotoğrafı base64 olarak `POST /api/coz` ile gönderir.
3. Sunucu fotoğrafı yapay zekâ servisine iletir ve JSON biçiminde çözüm alır. Fotoğraf diske yazılmaz.
4. Çözüm `sessionStorage`'a yazılır ve `sonuc.html` adım adım gösterir. Sonuç sayfasından ilgili konuya geçilebilir.

## Varsayımlar (değiştirilebilir)

- Yapay zekâ sağlayıcısı olarak Anthropic Messages API kullanıldı. Başka bir sağlayıcıya geçmek için yalnızca `claudeCagir` fonksiyonu değiştirilmelidir.
- İlk sürümde giriş/kayıt yoktur. Her ziyaret bağımsızdır.
- Yalnızca matematik konusu tam hazırlandı; diğer konular "Yakında" olarak işaretli.
- Hedef kitle ortaokul ve lise öğrencileri; içerik Türkçe.

## Bilinen eksikler ve sonraki adımlar

- **Hız sınırı yok.** `/api/coz` ve `/api/acikla` için kullanıcı başına günlük limit eklenmeli; aksi halde API maliyeti kontrolsüz artar.
- **Önbellek yok.** Aynı fotoğraf ve aynı konu isteği tekrar tekrar API'ye gider.
- **Giriş/kayıt yok.** Geçmiş çözümleri saklamak için kullanıcı sistemi ve veritabanı (ör. PostgreSQL, Supabase) ikinci aşamada eklenebilir.
- **Gizlilik metni taslak.** KVKK uyumu için hukuki inceleme ve iletişim bilgisi gerekir.
- **Yapay zekâ çıktısı doğrulanmadı.** Çözümlerin doğruluğu için örnek sorularla test seti hazırlanmalı.
- **Hata yakalama sınırlı.** Ağ kesintilerinde kullanıcıya genel bir mesaj gösterilir; ayrıntılı izleme eklenmedi.
- **Yükleme sırasında sunucu tarafında format kontrolü** yalnızca görüntünün baytlarına bakmaz; üretim ortamında gerçek dosya türü doğrulaması eklenmelidir.
