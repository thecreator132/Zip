// sonuc.html sayfasında sunucudan gelen çözümü adım adım gösterir.
(async () => {
  const kap = document.getElementById('sonuc');
  const veri = JSON.parse(sessionStorage.getItem('sonuc') || 'null');

  if (!veri) {
    kap.innerHTML = `
      <h1>Çözüm bulunamadı</h1>
      <p>Gösterilecek bir çözüm yok. Önce bir soru yükle.</p>
      <p><a class="buton" href="soru.html">Soru yükle</a></p>`;
    return;
  }

  if (!veri.okunabildi) {
    kap.innerHTML = `
      <h1>Soru okunamadı</h1>
      <p>${esc(veri.mesaj || 'Fotoğrafı daha net ve yakından çekmeyi dene.')}</p>
      <p><a class="buton" href="soru.html">Yeniden dene</a></p>`;
    return;
  }

  try {
    const { konular } = await konulariYukle();
    const guvenAd = { yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' }[veri.guven] || '—';
    const ilgili = konular.find((k) => k.id === veri.ilgiliKonuId);

    kap.innerHTML = `
      ${veri.demo ? '<div class="uyari">Demo yanıt gösteriliyor. Gerçek çözüm için sunucuda ANTHROPIC_API_KEY tanımlanmalı.</div>' : ''}
      <p class="soluk">
        ${esc(veri.ders || '')}${veri.konu ? ' · ' + esc(veri.konu) : ''} · Güven: ${guvenAd}
      </p>
      <h1>Çözüm</h1>

      <section class="kart">
        <h2>Soru</h2>
        <span class="kod">${esc(veri.soru)}</span>
      </section>

      <h2>Adım adım</h2>
      <ol class="adimlar">
        ${(veri.adimlar || [])
          .map(
            (a) => `
            <li>
              <h3>${esc(a.baslik)}</h3>
              <p>${esc(a.aciklama)}</p>
              ${a.ifade ? `<span class="kod">${esc(a.ifade)}</span>` : ''}
            </li>`
          )
          .join('')}
      </ol>

      <section class="kart">
        <h2>Sonuç</h2>
        <p>${esc(veri.sonuc)}</p>
      </section>

      ${
        ilgili
          ? `<p>Bu konuyu tekrar et: <a href="konu.html?id=${esc(ilgili.id)}">${esc(ilgili.baslik)}</a></p>`
          : ''
      }

      <p class="uyari">Yapay zekâ hatalı olabilir. Önemli sınavlar öncesinde çözümü öğretmeninle ya da ders kitabınla karşılaştır.</p>
      <p><a class="buton ikincil" href="soru.html">Yeni soru yükle</a></p>`;
  } catch (err) {
    kap.innerHTML = `<p class="hata-kutu">${esc(err.message)}</p>`;
  }
})();
