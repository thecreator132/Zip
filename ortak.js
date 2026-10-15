// Tüm sayfalarda ortak yardımcı fonksiyonlar.

// HTML'e yazılacak metni güvenli hale getirir.
function esc(deger) {
  return String(deger ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

// Konu verisini (dersler ve konular) yükler.
async function konulariYukle() {
  const yanit = await fetch('veri/konular.json');
  if (!yanit.ok) throw new Error('İçerik yüklenemedi. Sayfayı yenilemeyi dene.');
  return yanit.json();
}
