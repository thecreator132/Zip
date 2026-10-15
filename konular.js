// konular.html sayfasında ders ve konu listesini çizer.
(async () => {
  const kutu = document.getElementById('liste');
  if (!kutu) return;
  try {
    const { dersler, konular } = await konulariYukle();
    kutu.innerHTML = dersler
      .map((ders) => {
        const satirlar = konular
          .filter((k) => k.ders === ders.id)
          .map(
            (k) => `
            <li>
              <a href="konu.html?id=${esc(k.id)}">${esc(k.baslik)}</a>
              ${k.durum === 'hazir' ? '' : '<span class="etiket yakinda">Yakında</span>'}
            </li>`
          )
          .join('');
        return `
          <section class="kart">
            <h2>${esc(ders.ad)}</h2>
            <ul class="liste">${satirlar}</ul>
          </section>`;
      })
      .join('');
  } catch (err) {
    kutu.innerHTML = `<p class="hata-kutu">${esc(err.message)}</p>`;
  }
})();
