// soru.html sayfası: fotoğrafı kontrol eder, sunucuya gönderir, sonucu saklayıp sonuç sayfasına geçer.
(() => {
  const form = document.getElementById('soru-form');
  const dosyaAlani = document.getElementById('dosya');
  const onizleme = document.getElementById('onizleme');
  const gonder = document.getElementById('gonder');
  const hata = document.getElementById('hata');

  const MAX_BOYUT = 5 * 1024 * 1024;
  const TURLER = ['image/jpeg', 'image/png', 'image/webp'];

  function hataGoster(mesaj) {
    hata.textContent = mesaj;
  }

  dosyaAlani.addEventListener('change', () => {
    const dosya = dosyaAlani.files[0];
    hataGoster('');
    onizleme.hidden = true;
    if (!dosya) return;
    if (!TURLER.includes(dosya.type)) {
      dosyaAlani.value = '';
      return hataGoster('Lütfen JPG, PNG veya WebP biçiminde bir fotoğraf seç.');
    }
    if (dosya.size > MAX_BOYUT) {
      dosyaAlani.value = '';
      return hataGoster('Fotoğraf 5 MB\'tan küçük olmalı.');
    }
    onizleme.src = URL.createObjectURL(dosya);
    onizleme.hidden = false;
  });

  function dosyayiBase64(dosya) {
    return new Promise((resolve, reject) => {
      const okuyucu = new FileReader();
      okuyucu.onload = () => resolve(okuyucu.result.split(',')[1]);
      okuyucu.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
      okuyucu.readAsDataURL(dosya);
    });
  }

  form.addEventListener('submit', async (olay) => {
    olay.preventDefault();
    hataGoster('');
    const dosya = dosyaAlani.files[0];
    if (!dosya) return hataGoster('Önce bir fotoğraf seç.');

    gonder.disabled = true;
    gonder.textContent = 'Çözülüyor...';

    try {
      const image = await dosyayiBase64(dosya);
      const yanit = await fetch('/api/coz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image,
          mediaType: dosya.type,
          ders: document.getElementById('ders').value,
          not: document.getElementById('not').value,
        }),
      });
      const veri = await yanit.json();
      if (!yanit.ok) throw new Error(veri.hata || 'Bir hata oluştu.');

      // Yalnızca çözüm metni saklanır; fotoğraf tarayıcıda da sunucuda da kalıcı olarak tutulmaz.
      sessionStorage.setItem('sonuc', JSON.stringify(veri));
      location.href = 'sonuc.html';
    } catch (err) {
      hataGoster(err.message);
      gonder.disabled = false;
      gonder.textContent = 'Soruyu Çöz';
    }
  });
})();
