// konu.html?id=... sayfasında seçilen konunun içeriğini çizer.
(async () => {
  const kap = document.getElementById('icerik');
  try {
    const { dersler, konular } = await konulariYukle();
    const id = new URLSearchParams(location.search).get('id');
    const konu = konular.find((k) => k.id === id);

    if (!konu) {
      kap.innerHTML = `
        <h1>Konu bulunamadı</h1>
        <p><a href="konular.html">Konular sayfasına dön</a></p>`;
      return;
    }

    const dersAd = dersler.find((d) => d.id === konu.ders)?.ad || '';
    document.title = `${konu.baslik} · Ders Asistanı`;

    if (konu.durum !== 'hazir') {
      kap.innerHTML = `
        <p class="soluk"><a href="konular.html">Konular</a> / ${esc(dersAd)}</p>
        <h1>${esc(konu.baslik)}</h1>
        <p>Bu konunun içeriği hazırlanıyor.</p>
        <p><a href="konular.html">Hazır konulara dön</a></p>`;
      return;
    }

    const ilgiliKonular = (konu.ilgili || [])
      .map((ilgiliId) => konular.find((k) => k.id === ilgiliId))
      .filter(Boolean);

    kap.innerHTML = `
      <p class="soluk"><a href="konular.html">Konular</a> / ${esc(dersAd)}</p>
      <h1>${esc(konu.baslik)}</h1>
      <p>${esc(konu.tanim)}</p>

      <section class="kart">
        <h2>Bir örnekle bakalım</h2>
        <p><strong>Soru:</strong></p>
        <span class="kod">${esc(konu.ornek.soru)}</span>
        <ol class="adimlar">
          ${konu.ornek.adimlar.map((a) => `<li><p>${esc(a)}</p></li>`).join('')}
        </ol>
        <p><strong>Kontrol:</strong> ${esc(konu.ornek.kontrol)}</p>
      </section>

      <section class="kart">
        <h2>Aklında tut</h2>
        <ul>
          ${konu.aklindaTut.map((m) => `<li>${esc(m)}</li>`).join('')}
        </ul>
      </section>

      <section class="kart">
        <h2>Yapay zekâ ile daha fazlası</h2>
        <div class="butonlar">
          <button class="buton ikincil" data-istek="basit">Daha basit anlat</button>
          <button class="buton ikincil" data-istek="benzer">Benzer 3 soru hazırla</button>
          <button class="buton ikincil" data-istek="hata">Sık yapılan hatalar</button>
        </div>
        <div class="cikti" id="cikti" aria-live="polite">Bir seçenek seç; yanıt burada görünecek.</div>
      </section>

      <section class="kart">
        <h2>Mini test</h2>
        <p>${esc(konu.miniTest.soru)}</p>
        <details>
          <summary>Cevabı göster</summary>
          <p>${esc(konu.miniTest.cevap)}</p>
        </details>
      </section>

      ${
        ilgiliKonular.length
          ? `<section>
               <h2>İlgili konular</h2>
               <ul class="liste">
                 ${ilgiliKonular
                   .map(
                     (k) => `<li><a href="konu.html?id=${esc(k.id)}">${esc(k.baslik)}</a>
                       ${k.durum === 'hazir' ? '' : '<span class="etiket yakinda">Yakında</span>'}</li>`
                   )
                   .join('')}
               </ul>
             </section>`
          : ''
      }

      <p class="kart"><a href="soru.html">Takıldığın bir soruyu fotoğrafla çöz →</a></p>`;

    const cikti = document.getElementById('cikti');
    kap.querySelectorAll('[data-istek]').forEach((dugme) => {
      dugme.addEventListener('click', async () => {
        cikti.textContent = 'Düşünülüyor...';
        dugme.disabled = true;
        try {
          const yanit = await fetch('/api/acikla', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ konuId: konu.id, istek: dugme.dataset.istek }),
          });
          const veri = await yanit.json();
          if (!yanit.ok) throw new Error(veri.hata || 'Bir hata oluştu.');
          cikti.textContent = veri.metin;
        } catch (err) {
          cikti.textContent = err.message;
        } finally {
          dugme.disabled = false;
        }
      });
    });
  } catch (err) {
    kap.innerHTML = `<p class="hata-kutu">${esc(err.message)}</p>`;
  }
})();
