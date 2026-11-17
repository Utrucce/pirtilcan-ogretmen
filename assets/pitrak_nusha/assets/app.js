/* Pıtrak Nüsha — Uygulama Arayüzü, Kademeli Sihirbaz & Tek Soru Stüdyosu */
(() => {
  const $ = s => document.querySelector(s);
  const DB = window.DB;
  const Exp = window.Exp;
  let doc = null;
  let singleDoc = null;
  let saveT = null, renderT = null, renderTok = 0, zoom = 0, openId = null, singleTarget = null;
  let sheets = [];
  
  /* ============================================================ */
  /* ÜRETİM MODU YÖNETİMİ: YARDIMLI MOD (VARSAYILAN) & ÜSTAT MODU */
  /* ============================================================ */
  let appCreationMode = localStorage.getItem('pitrak_creation_mode') || 'guided'; // 'guided' (varsayılan) | 'pro'
  let guidedNushaStep = 1;
  let guidedNushaMaxUnlocked = 1;
  let guidedSingleStep = 1;
  let guidedSingleMaxUnlocked = 1;

  function setCreationMode(mode) {
    appCreationMode = mode;
    localStorage.setItem('pitrak_creation_mode', mode);
    updateModeButtonsUI();
    if (doc) buildStep();
    if (singleDoc) buildSingleStep();
    toast(mode === 'guided' ? '💡 Yardımlı Mod devrede: Adım adım, sade ve kolay akış!' : '⚡ Üstat Modu devrede: Tüm gelişmiş ayarlar açık!');
  }

  function updateModeButtonsUI() {
    const isGuided = appCreationMode === 'guided';
    
    // Nüsha Düzenleyici Butonu
    const b1 = $('#btnModeToggle');
    if (b1) {
      b1.className = 'mode-toggle-btn' + (isGuided ? '' : ' pro-mode');
      const icon1 = b1.querySelector ? b1.querySelector('.mode-icon') : null;
      if (icon1) icon1.textContent = isGuided ? '🧭' : '⚜️';
      const name1 = b1.querySelector ? b1.querySelector('.mode-name') : null;
      if (name1) name1.textContent = isGuided ? 'Yardımlı Mod' : 'Üstat Modu';
      const pill1 = b1.querySelector ? b1.querySelector('.mode-switch-pill') : null;
      if (pill1) pill1.textContent = isGuided ? '⇄ Üstat Modu' : '⇄ Yardımlı Mod';
    }

    // Tek Soruluk Görsel Çıktı Butonu
    const b2 = $('#btnSingleModeToggle');
    if (b2) {
      b2.className = 'mode-toggle-btn' + (isGuided ? '' : ' pro-mode');
      const icon2 = b2.querySelector ? b2.querySelector('.mode-icon') : null;
      if (icon2) icon2.textContent = isGuided ? '🧭' : '⚜️';
      const name2 = b2.querySelector ? b2.querySelector('.mode-name') : null;
      if (name2) name2.textContent = isGuided ? 'Yardımlı Mod' : 'Üstat Modu';
      const pill2 = b2.querySelector ? b2.querySelector('.mode-switch-pill') : null;
      if (pill2) pill2.textContent = isGuided ? '⇄ Üstat Modu' : '⇄ Yardımlı Mod';
    }
  }

  const btnModeToggle = $('#btnModeToggle');
  if (btnModeToggle) {
    btnModeToggle.onclick = () => {
      setCreationMode(appCreationMode === 'guided' ? 'pro' : 'guided');
    };
  }

  const btnSingleModeToggle = $('#btnSingleModeToggle');
  if (btnSingleModeToggle) {
    btnSingleModeToggle.onclick = () => {
      setCreationMode(appCreationMode === 'guided' ? 'pro' : 'guided');
    };
  }
  
  let activeStep = 1;
  let activeShelfTab = 'nushalar'; // 'nushalar' | 'obekler'
  let renamingDocId = null;

  const STEP_DEFS = [
    { step: 1, id: 'bilgi', title: 'Nüsha Bilgileri ve Kapak', short: 'Bilgiler' },
    { step: 2, id: 'icerik', title: 'Soruları ve Çözümleri Yaz', short: 'Sorular' },
    { step: 3, id: 'duzen', title: 'Mizanpaj ve Yazı Ayarları', short: 'Mizanpaj' },
    { step: 4, id: 'cevap', title: 'Cevap Anahtarı Tablosu ve Çözümler', short: 'Cevap & Çözüm' },
    { step: 5, id: 'indir', title: 'Tamamlama ve Belgeyi İndir', short: 'İndir' },
  ];

  /* ---------- Yardımcılar ---------- */
  const get = (p) => p.split('.').reduce((o, k) => (o ? o[k] : undefined), doc);
  const set = (p, v) => { const k = p.split('.'); const last = k.pop(); k.reduce((o, x) => o[x], doc)[last] = v; };
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2800); }
  function fmtDate(ts) { return new Date(ts).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); }
  function qCount(d) { return (d.items || []).filter(i => i.t === 'q' || i.t === 'note').length; }

  function readImage(file, { max = 1400, png = false } = {}) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const im = new Image();
        im.onerror = rej;
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const w = Math.round(im.width * k), h = Math.round(im.height * k);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const g = c.getContext('2d'); if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); }
          g.drawImage(im, 0, 0, w, h);
          res({ url: png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.90), w, h });
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ---------- Kayıt ve Önizleme (Çok Sayfalı Nüsha) ---------- */
  function changed(structural) {
    const _s1 = $('#saveState'); if (_s1) _s1.textContent = 'Yazılıyor…';
    clearTimeout(saveT);
    saveT = setTimeout(flush, 600);
    clearTimeout(renderT);
    renderT = setTimeout(renderPreview, structural ? 60 : 250);
  }

  async function flush() {
    clearTimeout(saveT); if (!doc) return;
    doc.updated = Date.now();
    try {
      await DB.put(JSON.parse(JSON.stringify(doc)));
      const _s1 = $('#saveState'); if (_s1) _s1.textContent = 'Rafa kaldırıldı ✓';
    } catch (e) {
      const _s1 = $('#saveState'); if (_s1) _s1.textContent = 'Kaydedilemedi';
      toast('Tarayıcı kaydı başarısız oldu. Yer açmayı deneyin.');
    }
  }

  async function renderPreview() {
    if (!doc) return;
    const tok = ++renderTok;
    try { await Exp.ready(doc); } catch (e) {}
    if (tok !== renderTok) return;
    const r = $('#exportRoot'); r.innerHTML = '';
    const pages = buildDoc(doc, r);
    const holder = $('#pages'); holder.innerHTML = ''; sheets = [];
    pages.forEach(p => {
      const s = document.createElement('div'); s.className = 'sheet'; s.appendChild(p); holder.appendChild(s); sheets.push({ s, p });
    });
    r.innerHTML = '';
    const countEl = $('#previewPageCount');
    if (countEl) countEl.textContent = pages.length ? `(${pages.length} Sayfa)` : '';
    applyZoom();
  }

  function fitScale() {
    if (!doc) return 1;
    const [w] = PAGES[doc.layout.page] || PAGES.A4;
    const scrollEl = $('#previewScroll');
    const availableW = scrollEl ? Math.max(180, scrollEl.clientWidth - 24) : 340;
    return Math.min(1.4, Math.max(0.2, availableW / mmPx(w)));
  }

  function applyZoom() {
    if (!doc) return;
    const k = zoom || fitScale();
    const [w, h] = PAGES[doc.layout.page] || PAGES.A4;
    sheets.forEach(({ s, p }) => {
      s.style.width = mmPx(w) * k + 'px';
      s.style.height = mmPx(h) * k + 'px';
      p.style.transform = `scale(${k})`;
    });
    const lbl = $('#zoomLbl');
    if (lbl) lbl.textContent = zoom ? Math.round(k * 100) + '%' : 'Sığdır';
  }

  /* ---------- Temel Kontrol Elemanları ---------- */
  function row(label, node, hint) {
    const d = document.createElement('div'); d.className = 'f';
    if (label) { const l = document.createElement('label'); l.textContent = label; d.appendChild(l); }
    d.appendChild(node);
    if (hint) { const h = document.createElement('div'); h.className = 'hint-t'; h.textContent = hint; d.appendChild(h); }
    return d;
  }
  function mk(tag, props = {}, kids = []) {
    const e = document.createElement(tag);
    Object.assign(e, props);
    kids.forEach(k => k && e.append(k));
    return e;
  }
  function txt(label, path, o = {}) {
    const i = mk(o.area ? 'textarea' : 'input', { value: get(path) || '', placeholder: o.ph || '', rows: o.rows || 4 });
    i.oninput = () => { set(path, i.value); changed(); };
    return row(label, i, o.hint);
  }
  function sw(label, path, after) {
    const i = mk('input', { type: 'checkbox', checked: !!get(path) });
    i.onchange = () => { set(path, i.checked); changed(true); after && after(); };
    return mk('label', { className: 'check' }, [i, ' ' + label]);
  }
  function seg(label, path, opts, after) {
    const d = mk('div', { className: 'seg' });
    opts.forEach(([v, t]) => {
      const b = mk('button', { type: 'button', textContent: t, className: get(path) === v ? 'on' : '' });
      b.onclick = () => {
        set(path, v);
        [...d.children].forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        changed(true);
        after && after();
      };
      d.appendChild(b);
    });
    return row(label, d);
  }
  function sel(label, path, opts) {
    const s = mk('select');
    opts.forEach(([v, t]) => s.appendChild(mk('option', { value: v, textContent: t, selected: String(get(path)) === String(v) })));
    s.onchange = () => {
      const raw = s.value;
      set(path, typeof get(path) === 'number' ? Number(raw) : raw);
      changed(true);
    };
    return row(label, s);
  }
  function rng(label, path, min, max, step, unit) {
    const i = mk('input', { type: 'range', min, max, step, value: get(path) });
    const o = mk('span', { className: 'rv', textContent: get(path) + ' ' + unit });
    i.oninput = () => { set(path, Number(i.value)); o.textContent = i.value + ' ' + unit; changed(); };
    return row(label, mk('div', { className: 'rng' }, [i, o]));
  }
  function col(label, path) {
    const i = mk('input', { type: 'color', value: get(path) });
    i.oninput = () => { set(path, i.value); changed(); };
    return mk('label', { className: 'colr' }, [i, mk('span', { textContent: label })]);
  }
  function pickFile(label, onFile, o) {
    const i = mk('input', { type: 'file', accept: 'image/*', hidden: true });
    i.onchange = async () => { if (!i.files[0]) return; try { onFile(await readImage(i.files[0], o)); } catch (e) { toast('Görsel okunamadı.'); } i.value = ''; };
    const b = mk('button', { type: 'button', className: 'btn small', textContent: label });
    b.onclick = () => i.click();
    return mk('span', {}, [b, i]);
  }

  /* ---------- Soru Kökü Renk Seçici & Hızlı Palet ---------- */
  const STEM_PALETTE = [
    { name: 'Koyu Bordo', color: '#8b0000', icon: '🍷' },
    { name: 'Selçuklu Kahvesi', color: '#6b4426', icon: '🍫' },
    { name: 'Zümrüt Yeşili', color: '#1b4332', icon: '🌿' },
    { name: 'Gece Mavisi', color: '#1a365d', icon: '🔷' },
    { name: 'Altın Hardal', color: '#c07d18', icon: '🌟' },
    { name: 'Gül Pembesi', color: '#f72585', icon: '🌸' },
    { name: 'Turkuaz', color: '#70d6ff', icon: '💎' },
    { name: 'Koyu Füme', color: '#2d3748', icon: '🖤' },
    { name: 'Saf Beyaz', color: '#ffffff', icon: '⚪' }
  ];

  function makeStemColorBar(currentColor, onColorChange, title = '🎯 Soru Kökü Vurgu Rengi:') {
    const wrap = mk('div', { className: 'stem-color-bar' });
    wrap.append(mk('span', { className: 'stem-color-label', textContent: title }));

    const swatches = mk('div', { className: 'stem-swatches' });
    const curNorm = (currentColor || '').toLowerCase();

    STEM_PALETTE.forEach(p => {
      const chip = mk('button', {
        type: 'button',
        className: 'stem-chip' + (curNorm === p.color.toLowerCase() ? ' active' : ''),
        style: `background-color:${p.color};`,
        title: `${p.icon} ${p.name} (${p.color})`
      });
      chip.onclick = () => {
        swatches.querySelectorAll('.stem-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        customInp.value = p.color;
        onColorChange(p.color);
      };
      swatches.append(chip);
    });

    const customLabel = mk('label', { className: 'stem-custom-picker' });
    const customInp = mk('input', { type: 'color', value: currentColor || '#6b4426' });
    customInp.oninput = () => {
      swatches.querySelectorAll('.stem-chip').forEach(c => c.classList.remove('active'));
      onColorChange(customInp.value);
    };
    customLabel.append(customInp, mk('span', { textContent: 'Özel Renk' }));
    swatches.append(customLabel);
    wrap.append(swatches);

    return wrap;
  }

  /* ---------- Otomatik Altını Çiz (__metin__) Araç Çubuğu ---------- */
  function wrapTextareaSelection(ta, prefix, suffix, fallbackText = '') {
    let start = ta.selectionStart;
    let end = ta.selectionEnd;
    const text = ta.value;
    let sel = text.slice(start, end);

    // Eğer kullanıcı hiçbir şey seçmediyse ama imleç bir kelimenin üzerindeyse:
    // O kelimeyi otomatik seç ve altını çiz!
    if (!sel && text.length > 0) {
      let wordStart = start;
      let wordEnd = start;
      while (wordStart > 0 && /[^\s.,!?;:()[\]]/.test(text[wordStart - 1])) {
        wordStart--;
      }
      while (wordEnd < text.length && /[^\s.,!?;:()[\]]/.test(text[wordEnd])) {
        wordEnd++;
      }
      if (wordEnd > wordStart) {
        start = wordStart;
        end = wordEnd;
        sel = text.slice(start, end);
      }
    }

    const insertText = sel || fallbackText || 'önemli';
    const replacement = prefix + insertText + suffix;
    ta.value = text.slice(0, start) + replacement + text.slice(end);
    ta.focus();
    ta.selectionStart = start + prefix.length;
    ta.selectionEnd = start + prefix.length + insertText.length;
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function makeTextareaWithToolbar(ta) {
    const wrap = mk('div', { className: 'ta-wrap-with-toolbar' });
    const bar = mk('div', { className: 'ta-toolbar' });

    // Soru kökü butonu kullanıcı isteğiyle silindi (artık ayrı pencerede yer alıyor).
    // Yalnızca seçili kelime veya cümleye otomatik işleyen Altını Çiz butonu yer alır:
    const btnUnderline = mk('button', {
      type: 'button',
      className: 'tb-btn tb-underline',
      title: 'Seçili kelime veya cümlenin altını çiz (__)',
      innerHTML: '<span><u>U</u> Seçilenin Altını Çiz</span> <kbd>__</kbd>'
    });
    // onmousedown preventDefault ile butona tıklandığında metin kutusundaki seçimin kaybolması önlenir!
    btnUnderline.onmousedown = (e) => e.preventDefault();
    btnUnderline.onclick = (e) => {
      e.preventDefault();
      wrapTextareaSelection(ta, '__', '__');
    };
    bar.append(btnUnderline);

    wrap.append(bar);
    wrap.append(ta);
    return wrap;
  }

  /* ---------- Kademeli Sihirbaz (Wizard) ---------- */
  function goToStep(s) {
    if (s < 1) s = 1;
    if (s > 5) s = 5;
    activeStep = s;
    buildStep();
    const ed = $('#editor');
    if (ed) ed.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(applyZoom, 50);
  }

    function buildStep() {
    if (!doc) return;
    updateModeButtonsUI();

    // ÜSTAT MODU (5 Büyük Aşama)
    if (appCreationMode === 'pro') {
      $('#wizardStepper').hidden = false;
      buildProStep();
      return;
    }

    // YARDIMLI MOD (7 Adım Adım Mikro-Aşama)
    $('#wizardStepper').hidden = true;
    buildGuidedNushaStep();
  }

  function buildProStep() {
    const proFooter = $('#stepNavFooter');
    if (proFooter) proFooter.hidden = false;

    document.querySelectorAll('.step-btn').forEach(btn => {
      const st = parseInt(btn.dataset.step);
      btn.classList.toggle('active', st === activeStep);
      btn.classList.toggle('done', st < activeStep);
    });

    const isNotes = doc.kind === 'Ders Notu';
    const s2Lbl = $('#step2Label');
    if (s2Lbl) s2Lbl.textContent = isNotes ? 'Notlar' : 'Sorular';

    const def = STEP_DEFS[activeStep - 1];
    $('#stepBadge').textContent = `Adım ${activeStep} / 5`;
    $('#stepTitle').textContent = isNotes && activeStep === 2 ? 'Konu Notları ve Özeti Yaz' : def.title;

    const body = $('#stepBody');
    body.innerHTML = '';
    const renderers = [step1Bilgi, step2Icerik, step3Duzen, step4Cevap, step5Indir];
    body.appendChild(renderers[activeStep - 1]());

    const btnPrev = $('#btnPrevStep');
    const btnNext = $('#btnNextStep');

    if (activeStep === 1) {
      btnPrev.disabled = true;
      btnPrev.textContent = '← İlk Adım';
    } else {
      btnPrev.disabled = false;
      const prevDef = STEP_DEFS[activeStep - 2];
      btnPrev.textContent = `← ${prevDef.short}`;
      btnPrev.onclick = () => goToStep(activeStep - 1);
    }

    if (activeStep === 5) {
      btnNext.textContent = '✓ Rafa Kaydet & Bitir';
      btnNext.onclick = async () => { await flush(); doc = null; show('home'); drawShelf(); };
    } else {
      const nextDef = STEP_DEFS[activeStep];
      btnNext.textContent = `${nextDef.short} →`;
      btnNext.onclick = () => goToStep(activeStep + 1);
    }

    renderPreview();
  }

  
  /* ---------- YARDIMLI MOD: Soru Bankası (10 Adım Adım Mikro Aşama) ---------- */
  const GUIDED_NUSHA_DEFS = [
    { num: 1, short: 'Başlık', category: '1. Aşama: Nüsha Bilgisi', title: '1. Nüsha Adı ve Ders Bilgileri', desc: 'Kitap veya fasikülünüz için başlık, alt başlık ve hazırlayan bilgilerini belirleyin.' },
    { num: 2, short: 'Kapak Tercihi', category: '1. Aşama: Nüsha Bilgisi', title: '2. Kapak Sayfası Tercihi', desc: 'Nüshanın başında özel bir kapak sayfası yer alsın mı?' },
    { num: 3, short: 'Kapak Tasarımı', category: '1. Aşama: Nüsha Bilgisi', title: '3. Kapak Tasarımı & Görseli', desc: 'Kapağınız için renk veya açık kaynaklardan sanatsal bir görsel seçin.' },
    { num: 4, short: 'Soru Ekle', category: '2. Aşama: Soruları Yaz', title: '4. Soruları Sisteme Ekle', desc: 'Sorularınızı tek tek yazabilir veya yapay zekâ formatıyla topluca ekleyebilirsiniz.' },
    { num: 5, short: 'Soruları Düzenle', category: '2. Aşama: Soruları Yaz', title: '5. Soru Metinleri, Kökler ve Şıklar', desc: 'Sorularınızın öncül metinlerini, kalın soru köklerini ve şıklarını kontrol edin.' },
    { num: 6, short: 'Sayfa Düzeni', category: '3. Aşama: Mizanpaj', title: '6. Sayfa Düzeni ve Mizanpaj', desc: 'Tek sütun mu, çift sütun mu? Kenar ve ayırıcı çizgileri belirleyin.' },
    { num: 7, short: 'Yazı Tipi', category: '3. Aşama: Mizanpaj', title: '7. Yazı Tipi (Tipografi) ve Boyutları', desc: 'Metinlerin okunurluğunu ve yazı karakterini belirleyin.' },
    { num: 8, short: 'Kağıt & Logo', category: '3. Aşama: Mizanpaj', title: '8. Sayfa Kağıdı ve Kurum Logosu', desc: 'Sayfalara hafif kağıt dokusu veya kurum logonuzu filigran olarak ekleyin.' },
    { num: 9, short: 'Cevap Tablosu', category: '4. Aşama: Cevap Anahtarı', title: '9. Cevap Anahtarı Tablosu', desc: 'Belgenin en sonuna toplu cevap anahtarı tablosu eklensin mi?' },
    { num: 10, short: 'İndir', category: '5. Aşama: Tamamlama', title: '10. Tebrikler! Nüshanız Hazır ✦', desc: 'Soru bankanız başarıyla dizildi. Baskıya hazır olarak indirebilirsiniz.' }
  ];

  function buildGuidedNushaStep() {
    const body = $('#stepBody');
    if (!body) return;
    body.innerHTML = '';

    // Eski Pro Navigasyon Footer'ını gizle (Yardımlı mod kartının kendi footer'ı var)
    const proFooter = $('#stepNavFooter');
    if (proFooter) proFooter.hidden = true;

    const totalSteps = GUIDED_NUSHA_DEFS.length;
    if (guidedNushaStep > totalSteps) guidedNushaStep = totalSteps;
    const curDef = GUIDED_NUSHA_DEFS[guidedNushaStep - 1];

    // Üst Bilgi Rozetlerini Güncelle
    const badgeEl = $('#stepBadge');
    if (badgeEl) badgeEl.textContent = `Adım ${guidedNushaStep} / ${totalSteps} (Yardımlı Mod)`;
    const titleEl = $('#stepTitle');
    if (titleEl) titleEl.textContent = curDef.title;

    // Guided Stepper Navigation Bar
    const track = mk('div', { className: 'guided-track' });
    GUIDED_NUSHA_DEFS.forEach(d => {
      const isLocked = d.num > guidedNushaMaxUnlocked;
      const isDone = d.num < guidedNushaStep;
      const isActive = d.num === guidedNushaStep;
      const node = mk('button', {
        type: 'button',
        className: 'guided-step-node' + (isActive ? ' active' : '') + (isDone ? ' done' : '') + (isLocked ? ' locked' : ''),
        title: d.title,
        textContent: (isDone ? '✓ ' : '') + d.num + '. ' + d.short
      });
      if (!isLocked) {
        node.onclick = () => {
          guidedNushaStep = d.num;
          buildStep();
        };
      }
      track.appendChild(node);
    });
    body.appendChild(track);

    // Kart Elemanı
    const card = mk('div', { className: 'guided-card' });
    card.append(mk('div', { className: 'guided-card-head' }, [
      mk('div', { className: 'guided-badge-row', style: 'display:flex; gap:8px; align-items:center; margin-bottom:8px;' }, [
        mk('span', { className: 'guided-badge', textContent: `Adım ${guidedNushaStep} / ${totalSteps}` }),
        mk('span', { className: 'guided-cat-pill', style: 'font-size:11px; font-weight:700; color:#856404; background:#fff3cd; padding:2px 8px; border-radius:10px;', textContent: curDef.category })
      ]),
      mk('h3', { className: 'guided-title', textContent: curDef.title }),
      mk('p', { className: 'guided-desc', textContent: curDef.desc })
    ]));

    const cardContent = mk('div', { className: 'guided-body' });

    // ADIM İÇERİKLERİ
    if (guidedNushaStep === 1) {
      cardContent.append(txt('Nüsha Başlığı', 'title', { ph: 'Örn. 10. Sınıf Türk Dili ve Edebiyatı Soru Bankası' }));
      cardContent.append(txt('Alt Başlık / Dönem', 'subtitle', { ph: 'Örn. 2026-2027 Eğitim Öğretim Yılı — 1. Fasikül' }));
      cardContent.append(txt('Hazırlayan / Kurum', 'author', { ph: 'Örn. Sertan Çubukcu / Pıtrak Akademi' }));
    } else if (guidedNushaStep === 2) {
      cardContent.append(sw('Nüshanın Başında Özel Kapak Sayfası Yer Alsın', 'cover.enabled', () => { changed(true); buildStep(); }));
      cardContent.append(mk('div', {
        style: 'margin-top:14px; padding:12px; background:#fbf5ec; border-radius:8px; border:1px solid #ebd9c0; font-size:13px; color:#6b4426;'
      }, [
        mk('span', { textContent: doc.cover && doc.cover.enabled ? '✓ Kapak sayfası devrede. Sonraki adımda kapak zeminini veya görselini belirleyebilirsiniz.' : 'ℹ️ Kapak kapalı. Nüshanız doğrudan ilk sayfadaki sorularla başlayacaktır.' })
      ]));
    } else if (guidedNushaStep === 3) {
      if (!doc.cover || !doc.cover.enabled) {
        cardContent.append(mk('div', { className: 'empty', textContent: 'Kapak sayfası önceki adımda kapalı olarak seçildi. Sonraki adıma geçebilirsiniz.' }));
      } else {
        cardContent.append(seg('Kapağın Görünümü', 'cover.mode', [
          ['color', 'Sade Renk / Doku'],
          ['image', 'Özel Kapak Görseli']
        ], () => { changed(true); buildStep(); }));

        if (doc.cover.mode === 'color') {
          cardContent.append(col('Kapak Arka Plan Rengi', 'cover.color'));
        } else {
          const up = pickFile('📁 Cihazdan Görsel Seç', r => {
            doc.cover.image = r.url;
            changed();
            buildStep();
          }, { max: 1400 });

          const btnSearchCover = mk('button', {
            type: 'button',
            className: 'btn small primary',
            style: 'background:var(--accent);color:#fff;margin-left:8px;',
            textContent: '🌐 Açık Kaynaktan Görsel Ara',
            onclick: () => openImageSearch('Kapak İçin Görsel Ara', dataUrl => {
              doc.cover.image = dataUrl;
              doc.cover.mode = 'image';
              changed(true);
              buildStep();
            })
          });

          cardContent.append(row('Kapak Görseli', mk('div', { className: 'inline' }, [up, btnSearchCover])));

          if (doc.cover.image) {
            const thumbWrap = mk('div', { style: 'margin-top:10px; display:flex; align-items:center; gap:12px;' });
            const thumb = mk('img', { src: doc.cover.image, style: 'height:65px; border-radius:6px; border:1px solid var(--line);' });
            const btnRm = mk('button', {
              type: 'button',
              className: 'btn small danger',
              textContent: 'Görseli Kaldır',
              onclick: () => { doc.cover.image = null; changed(true); buildStep(); }
            });
            thumbWrap.append(thumb, btnRm);
            cardContent.append(thumbWrap);
          }
        }
      }
    } else if (guidedNushaStep === 4) {
      const qNum = (doc.items || []).filter(i => i.t === 'q').length;
      const noteNum = (doc.items || []).filter(i => i.t === 'note').length;
      
      const statusBox = mk('div', {
        style: 'background:#fdf8f0; border:1.5px solid #e5cba4; border-radius:10px; padding:14px; margin-bottom:14px;'
      }, [
        mk('div', { style: 'font-size:15px; font-weight:800; color:var(--accent); margin-bottom:4px;', textContent: `Mevcut Soru Sayısı: ${qNum} Soru ${noteNum ? `· ${noteNum} Not` : ''}` }),
        mk('div', { style: 'font-size:13px; color:#6b5d52;', textContent: qNum > 0 ? 'Sorularınız sisteme yüklendi. Sonraki adımda sorularınızı inceleyip düzenleyebilirsiniz.' : 'Devam edebilmek için lütfen aşağıdaki yöntemlerden biriyle soru ekleyin.' })
      ]);
      cardContent.append(statusBox);

      const addGrid = mk('div', { style: 'display:grid; grid-template-columns:1fr; gap:10px;' }, [
        mk('button', {
          type: 'button',
          className: 'btn primary',
          style: 'padding:14px; font-size:14.5px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px;',
          innerHTML: '<span>⚡ Yapay Zekâ Destekli Toplu Soru Ekle</span>',
          onclick: () => {
            $('#bulkText').value = '';
            $('#dlgBulk').showModal();
          }
        }),
        mk('button', {
          type: 'button',
          className: 'btn',
          style: 'padding:12px; font-size:14px; font-weight:600;',
          textContent: '+ Tek Tek Soru Yazarak Ekle',
          onclick: () => {
            const q = newQuestion();
            addItem(q);
            guidedNushaStep = 5;
            buildStep();
            toast('Yeni soru eklendi!');
          }
        })
      ]);
      cardContent.append(addGrid);
    } else if (guidedNushaStep === 5) {
      cardContent.append(step2Icerik());
    } else if (guidedNushaStep === 6) {
      cardContent.append(seg('Sayfa Sütun Düzeni', 'layout.cols', [
        ['1', '📄 Tek Sütun (Ferah)'],
        ['2', '📑 Çift Sütun (Sınav Formatı)']
      ], () => { changed(true); renderPreview(); }));

      cardContent.append(sw('Sütunlar Arasına İnce Çizgi Çekilsin', 'layout.colRule', () => { changed(true); renderPreview(); }));
      cardContent.append(sw('Sayfa Kenarlarına Zarif Çerçeve Çizgisi Eklensin', 'layout.border', () => { changed(true); renderPreview(); }));
      cardContent.append(sel('Soru Numarası Formatı', 'layout.numStyle', [
        ['num', '1. 2. 3. (Standart)'],
        ['badge', '[ 1 ] [ 2 ] (Rozet Kutusu)'],
        ['qnum', 'Soru 1. Soru 2.']
      ]));
    } else if (guidedNushaStep === 7) {
      cardContent.append(sel('Ana Yazı Tipi (Font)', 'type.family', [
        ['Merriweather, Georgia, serif', 'Merriweather (Klasik Kitap)'],
        ['Inter, system-ui, sans-serif', 'Inter (Modern & Net)'],
        ['Lora, Georgia, serif', 'Lora (Zarif Edebi)'],
        ['Georgia, serif', 'Georgia (Standart Roman)'],
        ['"Times New Roman", Times, serif', 'Times New Roman (Geleneksel)']
      ]));

      cardContent.append(rng('Yazı Boyutu (Punto)', 'type.basePt', 8, 14, 0.5, 'pt'));
      cardContent.append(rng('Satır Yüksekliği (Ferahlık)', 'type.lineHeight', 1.2, 2.0, 0.1, 'kat'));

      cardContent.append(row('Yazı Renkleri', mk('div', { className: 'inline' }, [
        col('Gövde Metni', 'type.color'),
        col('Vurgu / Başlıklar', 'type.accent')
      ])));

      const curStemGuided = (doc.type && doc.type.stemColor) || (doc.type && doc.type.accent) || '#6b4426';
      cardContent.append(makeStemColorBar(curStemGuided, c => {
        if (!doc.type) doc.type = {};
        doc.type.stemColor = c;
        changed(true);
      }, '🎯 Soru Kökü Vurgu Rengi:'));
    } else if (guidedNushaStep === 8) {
      cardContent.append(sel('Sayfa Kağıt Dokusu & Rengi', 'layout.paper', [
        ['white', 'Bembeyaz Kağıt'],
        ['cream', 'Fildişi / Krem Kağıt'],
        ['parchment', 'Hafif Antik Parşömen']
      ]));

      cardContent.append(sw('Arka Plana Filigran / Kurum Logosu Eklensin', 'watermark.enabled', () => {
        changed(true);
        buildStep();
      }));

      if (doc.watermark && doc.watermark.enabled) {
        cardContent.append(seg('Filigran Türü', 'watermark.kind', [
          ['text', 'Metin Filigranı'],
          ['image', 'Özel Logo / Görsel']
        ], () => { changed(true); buildStep(); }));

        if (doc.watermark.kind === 'image') {
          const picker = pickFile('📁 Kurum Logonuzu Yükleyin', dataUrl => {
            doc.watermark.image = dataUrl;
            changed(true);
            buildStep();
          }, { max: 1200, png: true });
          cardContent.append(row('Filigran Görseli', picker));
          cardContent.append(rng('Görsel Boyutu', 'watermark.imageWidth', 10, 80, 5, '%'));
        } else {
          cardContent.append(txt('Filigran Metni', 'watermark.text', { ph: 'Örn. PITRAK AKADEMİ' }));
          cardContent.append(rng('Metin Boyutu', 'watermark.size', 12, 60, 2, 'pt'));
          cardContent.append(col('Filigran Rengi', 'watermark.color'));
        }
        cardContent.append(rng('Saydamlık (Opaklık)', 'watermark.opacity', 5, 50, 1, '%'));
      }
    } else if (guidedNushaStep === 9) {
      cardContent.append(step4Cevap());
    } else if (guidedNushaStep === 10) {
      cardContent.append(step5Indir());
    }

    card.append(cardContent);

    // İleri / Geri Navigasyon
    const nav = mk('div', { className: 'guided-footer-nav' });
    const btnPrev = mk('button', {
      type: 'button',
      className: 'btn ghost',
      textContent: '← Önceki Adım',
      disabled: guidedNushaStep === 1,
      onclick: () => {
        if (guidedNushaStep > 1) {
          guidedNushaStep--;
          buildStep();
        }
      }
    });

    const isLast = guidedNushaStep === totalSteps;
    const btnNext = mk('button', {
      type: 'button',
      className: 'btn primary',
      style: 'font-weight:700;',
      textContent: isLast ? '✓ Rafa Kaydet & Bitir' : `Sonraki Adım (${guidedNushaStep + 1}/${totalSteps}) ➔`,
      onclick: async () => {
        if (isLast) {
          await flush();
          doc = null;
          show('home');
          drawShelf();
          toast('Nüsha başarıyla rafa kaydedildi!');
          return;
        }

        // Biri bitmeden diğerine geçilmez kuralı (Validation)
        if (guidedNushaStep === 1 && !doc.title.trim()) {
          toast('Lütfen devam etmeden önce nüshanıza bir başlık belirleyin.');
          const tInp = $('input[placeholder*="Türk Dili"]');
          if (tInp) tInp.focus();
          return;
        }
        if (guidedNushaStep === 4 && !(doc.items || []).filter(i => i.t === 'q' || i.t === 'note').length) {
          toast('Lütfen devam etmeden önce en az bir soru ekleyin.');
          return;
        }

        guidedNushaStep++;
        guidedNushaMaxUnlocked = Math.max(guidedNushaMaxUnlocked, guidedNushaStep);
        buildStep();
      }
    });

    nav.append(btnPrev, btnNext);
    card.append(nav);
    body.appendChild(card);

    // Canlı Önizleme Tetikle
    renderPreview();
  }
  
  /* ADIM 1: Nüsha Bilgileri ve Kapak */
  function step1Bilgi() {
    const d = mk('div', { className: 'tp' });
    d.append(txt('Nüsha Başlığı', 'title', { ph: 'Örn. Türk Dili ve Edebiyatı Soru Bankası' }));
    d.append(seg('Nüsha Türü', 'kind', [
      ['Soru Bankası', 'Soru Bankası'],
      ['Ders Notu', 'Ders Notu']
    ], () => buildStep()));

    const coverBox = mk('div', { className: 'setting-card' });
    coverBox.append(mk('h4', { className: 'setting-head', textContent: 'Kapak Tasarımı' }));
    coverBox.append(sw('Nüshaya Kapak Sayfası Eklensin', 'cover.enabled', buildStep));

    if (doc.cover && doc.cover.enabled) {
      const C = 'cover.';
      coverBox.append(seg('Kapağın Dokusu', C + 'mode', [['color', 'Sade Renk'], ['image', 'Kendi Görselim']], buildStep));
      if (doc.cover.mode === 'image') {
        const info = mk('div', { className: 'muted small', textContent: doc.cover.image ? 'Görsel yerleşti ✓' : 'Henüz görsel seçilmedi' });
        const up = pickFile('📁 Cihazdan Seç', r => { doc.cover.image = r.url; changed(true); buildStep(); }, { max: 1800 });
        const btnSearchCover = mk('button', {
          type: 'button',
          className: 'btn small primary',
          style: 'background:var(--accent);color:#fff;',
          textContent: '🌐 Açık Kaynaktan Ara',
          onclick: () => openImageSearch('Kapak İçin Görsel Ara', dataUrl => {
            doc.cover.image = dataUrl;
            doc.cover.mode = 'image';
            changed(true);
            buildStep();
          })
        });
        const rm = mk('button', { className: 'btn ghost small', textContent: 'Kaldır', onclick: () => { doc.cover.image = null; changed(true); buildStep(); } });
        coverBox.append(row('Kapak Görseli', mk('div', { className: 'inline', style: 'gap:8px;' }, [up, btnSearchCover, rm, info])));
        coverBox.append(sw('Yazılar görselin üstünde görünsün', C + 'showText', buildStep));
      }
      if (doc.cover.mode !== 'image' || doc.cover.showText) {
        coverBox.append(txt('Kapak Başlığı', C + 'title', { ph: doc.title }));
        coverBox.append(txt('Alt Başlık', C + 'subtitle', { ph: 'Örn. 2026 Güz Dönemi — 1. Cilt' }));
        coverBox.append(txt('Hazırlayan / Kurum', C + 'author', { ph: 'Örn. Sertan Çubukcu / Pıtrak Akademi' }));
      }
      coverBox.append(row('Kapak Renkleri', mk('div', { className: 'inline' }, [col('Zemin', C + 'bg'), col('Yazı', C + 'fg')])));
    }
    d.append(coverBox);

    const prefBox = mk('div', { className: 'setting-card' });
    prefBox.append(mk('h4', { className: 'setting-head', textContent: 'Önsöz Sayfası' }));
    prefBox.append(sw('Önsöz Sayfası Eklensin', 'preface.enabled', buildStep));

    if (doc.preface && doc.preface.enabled) {
      const P = 'preface.';
      prefBox.append(txt('Önsöz Başlığı', P + 'title'));
      prefBox.append(txt('Önsöz Metni', P + 'text', { area: true, rows: 6, ph: 'Okurlarınıza birkaç içten söz…' }));
      prefBox.append(txt('İmza', P + 'signature', { ph: 'Ad Soyad' }));
      
      const linkWrap = mk('div', { className: 'links-wrap' });
      prefBox.append(row('Tıklanabilir İletişim / Sosyal Medya Bağlantıları', linkWrap));
      const drawLinks = () => {
        linkWrap.innerHTML = '';
        (doc.preface.links || []).forEach((l, i) => {
          const item = mk('div', { className: 'link-row' });
          const selPlat = mk('select');
          Object.entries(PLATFORMS).forEach(([k, v]) => selPlat.append(mk('option', { value: k, textContent: v.icon + ' ' + v.name, selected: l.platform === k })));
          selPlat.onchange = () => { l.platform = selPlat.value; changed(); };
          const valInp = mk('input', { value: l.value || '', placeholder: 'Kullanıcı adı veya link' });
          valInp.oninput = () => { l.value = valInp.value; changed(); };
          const delBtn = mk('button', { className: 'icon-btn small', textContent: '✕', title: 'Sil', onclick: () => { doc.preface.links.splice(i, 1); changed(); drawLinks(); } });
          item.append(selPlat, valInp, delBtn);
          linkWrap.append(item);
        });
        const addBtn = mk('button', { className: 'btn ghost small', textContent: '+ Yeni Bağlantı Ekle', onclick: () => { doc.preface.links = doc.preface.links || []; doc.preface.links.push({ platform: 'instagram', value: '' }); changed(); drawLinks(); } });
        linkWrap.append(addBtn);
      };
      drawLinks();
    }
    d.append(prefBox);

    return d;
  }

  /* ADIM 2: Soruları / İçeriği Yaz */
  function step2Icerik() {
    const d = mk('div', { className: 'tp' });
    const isNotes = doc.kind === 'Ders Notu';

    let barKids = [];
    if (isNotes) {
      barKids = [
        mk('button', { className: 'btn primary small qadd-btn', textContent: '+ Konu Notu', onclick: () => addItem(newNote('info')) }),
        mk('button', { className: 'btn small', textContent: '⚠️ Dikkat Kutusu', onclick: () => addItem(newNote('warn')) }),
        mk('button', { className: 'btn small', textContent: '📖 Tanım', onclick: () => addItem(newNote('def')) }),
        mk('button', { className: 'btn small', textContent: '💡 Çözümlü Örnek', onclick: () => addItem(newNote('example')) }),
        mk('button', { className: 'btn small', textContent: '📐 Formül', onclick: () => addItem(newNote('formula')) }),
        mk('button', { className: 'btn small', textContent: '+ Soru Ekle', onclick: () => addItem(newQuestion()) }),
      ];
    } else {
      barKids = [
        mk('button', { className: 'btn primary small qadd-btn', textContent: '+ Yeni Soru Ekle', onclick: () => addItem(newQuestion()) }),
        mk('button', { className: 'btn small', textContent: '+ Bölüm Başlığı', onclick: () => addItem(newHeading()) }),
        mk('button', { className: 'btn small', textContent: '⚡ Toplu Soru Ekle', onclick: () => { $('#bulkText').value = ''; $('#dlgBulk').showModal(); } }),
      ];
    }

    const bar = mk('div', { className: 'qbar' }, barKids);
    d.append(bar);

    const list = mk('div', { className: 'qlist' });
    d.append(list);

    if (!doc.items.length) {
      list.append(mk('div', { className: 'empty', textContent: isNotes ? 'Sayfa bembeyaz bir yaprak gibi bekliyor. Yukarıdaki butonlarla ilk konu notunu ekle.' : 'Sayfa bembeyaz bir yaprak gibi bekliyor. Yukarıdaki "+ Yeni Soru Ekle" butonuna basarak ilk sorunu yaz.' }));
    }

    let qNo = 0;
    doc.items.forEach((it, idx) => {
      if (it.t === 'h') list.append(headCard(it, idx));
      else if (it.t === 'note') list.append(noteCard(it, idx));
      else list.append(qCard(it, idx, ++qNo));
    });

    return d;
  }

  function addItem(it) {
    doc.items.push(it);
    openId = it.id;
    changed(true);
    buildStep();
    setTimeout(() => {
      const e = $('.qcard.open, .notecard.open');
      if (e) e.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 60);
  }

  function moveItem(idx, dir) {
    const j = idx + dir;
    if (j < 0 || j >= doc.items.length) return;
    [doc.items[idx], doc.items[j]] = [doc.items[j], doc.items[idx]];
    changed(true);
    buildStep();
  }

  function ctrls(it, idx, extra = []) {
    return mk('div', { className: 'qctl' }, [
      ...extra,
      mk('button', { className: 'icon-btn', textContent: '↑', title: 'Yukarı Taşı', onclick: () => moveItem(idx, -1) }),
      mk('button', { className: 'icon-btn', textContent: '↓', title: 'Aşağı Taşı', onclick: () => moveItem(idx, 1) }),
      mk('button', { className: 'icon-btn', textContent: '⧉', title: 'Çoğalt', onclick: () => {
        const c = JSON.parse(JSON.stringify(it)); c.id = uid(); doc.items.splice(idx + 1, 0, c); openId = c.id; changed(true); buildStep();
      }}),
      mk('button', { className: 'icon-btn danger', textContent: '🗑', title: 'Sil', onclick: () => {
        doc.items.splice(idx, 1); changed(true); buildStep();
      }}),
    ]);
  }

  /* Soru Kartı (Nüsha İçinde - 3 Pencereli Mizanpaj) */
  function qCard(q, idx, no) {
    if (!q.opts || !Array.isArray(q.opts)) {
      q.opts = ['', '', '', '', ''];
    }
    const open = openId === q.id;
    const c = mk('div', { className: 'qcard' + (open ? ' open' : '') });

    const ansBadgeText = (q.answer || '').trim() ? `Cevap: [${q.answer.trim()}]` : 'Cevapsız';
    const hasSol = !!(q.explain || '').trim();

    const sum = mk('div', { className: 'qsum' }, [
      mk('b', { className: 'qno-badge', textContent: no + '.' }),
      mk('span', { className: 'qs', textContent: (q.text || q.stem || '').slice(0, 50) || 'Boş soru — dokunup düzenleyin' }),
      mk('span', { className: 'q-state-badge' + ((q.answer || '').trim() ? ' set' : ''), textContent: ansBadgeText }),
      mk('span', { className: 'q-sol-indicator' + (hasSol ? ' has' : ''), textContent: hasSol ? '✓ Çözüm' : 'Çözüm yok' }),
      mk('span', { className: 'qopen-indicator', textContent: open ? '▲' : '▼' })
    ]);
    sum.onclick = () => { openId = open ? null : q.id; buildStep(); };
    c.append(sum);

    if (!open) return c;

    const body = mk('div', { className: 'qbody' });

    // ==========================================
    // 1. PENCERE: SORU METNİ (PARAGRAF / ÖNCÜL)
    // ==========================================
    const w1 = mk('div', { className: 'q-window-box window-text' });
    w1.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill', textContent: '1. Pencere' }),
      mk('b', { textContent: 'Soru Metni & Paragraf' }),
      mk('span', { className: 'muted small', textContent: '(Öncül veya paragraf metni)' })
    ]));
    const taText = mk('textarea', {
      rows: 5,
      className: 'q-main-textarea',
      value: q.text || '',
      placeholder: 'Soru metnini ve paragrafını buraya yazın ya da yapıştırın…'
    });
    taText.oninput = () => {
      q.text = taText.value;
      sum.querySelector('.qs').textContent = (q.text || q.stem || '').slice(0, 50) || 'Boş soru';
      changed();
    };
    w1.append(makeTextareaWithToolbar(taText));
    body.append(w1);

    // ==========================================
    // 2. PENCERE: SORU KÖKÜ (KOYU YAZILIR)
    // ==========================================
    const w2 = mk('div', { className: 'q-window-box window-stem' });
    w2.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill accent-pill', textContent: '2. Pencere' }),
      mk('b', { textContent: '🎯 Soru Kökü (Koyu Yazılır)' }),
      mk('span', { className: 'muted small', textContent: '(Belgede kalın ve satır başı olarak vurgulanır)' })
    ]));
    const taStem = mk('textarea', {
      rows: 2,
      className: 'q-stem-textarea',
      value: q.stem || '',
      placeholder: 'Örn: Bu parçadan hareketle aşağıdaki yargılardan hangisine ulaşılamaz?'
    });
    taStem.oninput = () => {
      q.stem = taStem.value;
      sum.querySelector('.qs').textContent = (q.text || q.stem || '').slice(0, 50) || 'Boş soru';
      changed();
    };
    const curStemQ = (doc.type && doc.type.stemColor) || (doc.type && doc.type.accent) || '#6b4426';
    taStem.style.color = curStemQ;
    w2.append(taStem);
    w2.append(makeStemColorBar(curStemQ, c => {
      if (!doc.type) doc.type = {};
      doc.type.stemColor = c;
      taStem.style.color = c;
      changed(true);
    }, '🎯 Belgedeki Soru Kökü Rengi:'));
    body.append(w2);

    // ==========================================
    // 3. PENCERE: ŞIKLAR (TEK VE BOŞ ÇERÇEVE)
    // ==========================================
    const w3 = mk('div', { className: 'q-window-box window-opts' });
    w3.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill', textContent: '3. Pencere' }),
      mk('b', { textContent: '🔤 Soru Şıkları' }),
      mk('span', { className: 'muted small', textContent: '(Her satıra bir şık yazın veya yapıştırın: A) ... B) ...)' })
    ]));

    let initialOptsText = q.optsText;
    if (initialOptsText == null) {
      if (Array.isArray(q.opts) && q.opts.some(o => (o || '').trim())) {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        initialOptsText = q.opts.map((o, i) => (o || '').trim() ? `${letters[i]}) ${o.trim()}` : '').filter(Boolean).join('\n');
      } else {
        initialOptsText = '';
      }
    }

    const taOpts = mk('textarea', {
      rows: 5,
      className: 'q-opts-textarea',
      value: initialOptsText,
      placeholder: 'A) Birinci seçenek\nB) İkinci seçenek\nC) Üçüncü seçenek\nD) Dördüncü seçenek\nE) Beşinci seçenek'
    });

    function syncOptsFromText() {
      q.optsText = taOpts.value;
      const parsedOpts = ['', '', '', '', ''];
      const lines = taOpts.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let autoIdx = 0;

      lines.forEach(line => {
        const m = line.match(/^([A-Ea-e])\s*[.)]\s*(.*)$/);
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < 5) parsedOpts[idx] = m[2].trim();
        } else if (autoIdx < 5) {
          parsedOpts[autoIdx++] = line;
        }
      });
      q.opts = parsedOpts;
      if (parsedOpts[4]) {
        q.hasE = true;
      }
    }

    taOpts.oninput = () => {
      syncOptsFromText();
      refreshAnsControls();
      changed();
    };
    syncOptsFromText();

    w3.append(taOpts);
    body.append(w3);

    // ==========================================
    // SORU GÖRSELİ
    // ==========================================
    const imgInfo = mk('span', { className: 'muted small', textContent: q.image ? 'Görsel eklendi ✓' : '' });
    const rm = mk('button', { className: 'btn ghost small', textContent: 'Görseli Kaldır', hidden: !q.image, onclick: () => { q.image = null; q.w = q.h = 0; changed(true); buildStep(); } });
    body.append(mk('div', { className: 'inline', style: 'margin: 10px 0; gap: 8px;' }, [
      pickFile('📁 Cihazdan Ekle', r => { q.image = r.url; q.w = r.w; q.h = r.h; changed(true); buildStep(); }, { max: 1100 }),
      mk('button', {
        type: 'button',
        className: 'btn small ghost',
        textContent: '🌐 Açık Kaynaktan Ara',
        onclick: () => openImageSearch('Soru İçin Görsel Ara', dataUrl => { q.image = dataUrl; changed(true); buildStep(); })
      }),
      rm,
      imgInfo
    ]));

    // ==========================================
    // DOĞRU CEVAP ALANI (MOBİLDE ASLA TAŞMAYAN EŞİT DÜZEN)
    // ==========================================
    const ansWrap = mk('div', { className: 'answer-selector-container' });

    function updateBadge() {
      const badge = sum.querySelector('.q-state-badge');
      if (badge) {
        badge.textContent = q.answer ? `Cevap: [${q.answer}]` : 'Cevapsız';
        badge.classList.toggle('set', !!q.answer);
      }
    }

    function refreshAnsControls() {
      ansWrap.innerHTML = '';
      const topRow = mk('div', { className: 'ans-btn-row' });
      const lettersBar = mk('div', { className: 'seg ans-choice-seg' });

      const choices = ['A', 'B', 'C', 'D'];
      if (q.hasE !== false) choices.push('E');

      choices.forEach(L => {
        const b = mk('button', {
          type: 'button',
          textContent: L,
          className: 'ans-choice-btn' + ((q.answer || '').trim().toUpperCase() === L ? ' on' : '')
        });
        b.onclick = () => {
          q.answer = (q.answer === L ? '' : L);
          ansInput.value = q.answer;
          updateBadge();
          renderOptsInputs();
          refreshAnsControls();
          changed();
        };
        lettersBar.append(b);
      });
      topRow.append(lettersBar);

      // E Kaldır / Ekle Butonu
      if (q.hasE !== false) {
        const btnRemoveE = mk('button', {
          type: 'button',
          className: 'btn-toggle-e red-remove',
          title: 'E şıkkını kaldır (4 şıklı soru yap)',
          textContent: '✕ E Kaldır'
        });
        btnRemoveE.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          q.hasE = false;
          if (q.answer === 'E') { q.answer = ''; ansInput.value = ''; }
          updateBadge();
          renderOptsInputs();
          refreshAnsControls();
          changed(true);
        };
        topRow.append(btnRemoveE);
      } else {
        const btnAddE = mk('button', {
          type: 'button',
          className: 'btn-toggle-e green-add',
          title: 'E şıkkını geri ekle',
          textContent: '+ E Ekle'
        });
        btnAddE.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          q.hasE = true;
          updateBadge();
          renderOptsInputs();
          refreshAnsControls();
          changed(true);
        };
        topRow.append(btnAddE);
      }
      ansWrap.append(topRow);

      const ansInput = mk('input', {
        type: 'text',
        className: 'ans-custom-input-wide',
        value: q.answer || '',
        placeholder: 'Veya metin/sayı (Örn: 42, Yalnız I)…',
        maxLength: 35
      });
      ansInput.oninput = () => {
        q.answer = ansInput.value.trim();
        updateBadge();
        lettersBar.querySelectorAll('.ans-choice-btn').forEach(btn => {
          btn.classList.toggle('on', btn.textContent.trim().toUpperCase() === q.answer.toUpperCase());
        });
        renderOptsInputs();
        changed();
      };
      ansWrap.append(ansInput);
    }

    refreshAnsControls();
    body.append(row('Doğru Cevap (Tabloda Görünecek)', ansWrap));

    // ==========================================
    // SORU ÇÖZÜMÜ
    // ==========================================
    const solArea = mk('textarea', {
      rows: 3,
      value: q.explain || '',
      placeholder: 'Sorunun ayrıntılı adım adım çözümünü buraya yazın…'
    });
    solArea.oninput = () => {
      q.explain = solArea.value;
      const has = !!solArea.value.trim();
      const ind = sum.querySelector('.q-sol-indicator');
      ind.textContent = has ? '✓ Çözüm' : 'Çözüm yok';
      ind.classList.toggle('has', has);
      changed();
    };
    body.append(row('📖 Soru Çözümü ve Açıklaması', solArea));

    body.append(ctrls(q, idx, [
      mk('button', { className: 'btn small', textContent: '🔍 Tek Soru Çıktısı', onclick: () => { singleTarget = { q, no }; $('#dlgSingle').showModal(); } })
    ]));

    c.append(body);
    return c;
  }

  function noteCard(n, idx) {
    const open = openId === n.id;
    const c = mk('div', { className: 'qcard notecard ' + (n.style || 'info') + (open ? ' open' : '') });
    const sum = mk('div', { className: 'qsum' }, [
      mk('b', { textContent: (n.title || 'Ders Notu').slice(0, 32) }),
      mk('span', { className: 'qs', textContent: (n.text || '').slice(0, 48) || 'İçerik yazın…' }),
      mk('span', { className: 'qopen-indicator', textContent: open ? '▲' : '▼' })
    ]);
    sum.onclick = () => { openId = open ? null : n.id; buildStep(); };
    c.append(sum);
    if (!open) return c;

    const body = mk('div', { className: 'qbody' });
    const styleSeg = seg('Kutu Türü', '', [
      ['info', '📌 Konu Notu'],
      ['warn', '⚠️ Dikkat'],
      ['def', '📖 Tanım'],
      ['example', '💡 Örnek'],
      ['formula', '📐 Formül']
    ]);
    [...styleSeg.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('on', b.textContent.includes(n.style));
      b.onclick = () => {
        const map = { 'Konu Notu': 'info', 'Dikkat': 'warn', 'Tanım': 'def', 'Örnek': 'example', 'Formül': 'formula' };
        for (const [k, v] of Object.entries(map)) { if (b.textContent.includes(k)) n.style = v; }
        changed(true); buildStep();
      };
    });
    body.append(styleSeg);

    const titleInp = mk('input', { value: n.title || '', placeholder: 'Kutu Başlığı (İsteğe bağlı)' });
    titleInp.oninput = () => { n.title = titleInp.value; changed(); };
    body.append(row('Başlık', titleInp));

    const ta = mk('textarea', { rows: 5, value: n.text || '', placeholder: 'Not, kural veya açıklamanızı buraya yazın…' });
    ta.oninput = () => { n.text = ta.value; changed(); };
    body.append(row('İçerik Metni', ta));

    body.append(ctrls(n, idx));
    c.append(body);
    return c;
  }

  function headCard(h, idx) {
    const c = mk('div', { className: 'qcard headcard' });
    const i = mk('input', { value: h.text || '', placeholder: 'Bölüm Başlığı (örn. 1. ÜNİTE: SÖZCÜKTE ANLAM)' });
    i.oninput = () => { h.text = i.value; changed(); };
    c.append(mk('div', { className: 'qsum headsum' }, [mk('b', { textContent: 'Bölüm' }), i, ctrls(h, idx)]));
    return c;
  }

  /* ADIM 3: Mizanpaj ve Yazı Ayarları */
  function step3Duzen() {
    const d = mk('div', { className: 'tp' });

    const pageBox = mk('div', { className: 'setting-card' });
    pageBox.append(mk('h4', { className: 'setting-head', textContent: 'Sayfa ve Sütun Düzeni' }));
    pageBox.append(seg('Sütun Sayısı', 'layout.columns', [
      [1, '1 Sütun (Ferah / Not Düzeni)'],
      [2, '2 Sütun (Klasik Soru Bankası)']
    ], buildStep));
    pageBox.append(sw('Sütunlar Arasında Dikey Ayırıcı Çizgi Olsun', 'layout.rule', buildStep));
    if (doc.layout.rule) {
      pageBox.append(col('Ayırıcı Çizgi Rengi', 'layout.ruleColor'));
      pageBox.append(sel('Ayırıcı Çizgi Deseni / Şekli', 'layout.ruleStyle', [
        ['double', '✦ Zarif Çift Çizgi (Klasik)'],
        ['solid', 'İnce Sade Çizgi'],
        ['dashed', 'Kesikli Çizgi'],
        ['dotted', 'Noktalı Çizgi'],
        ['selcuk', '✦ Selçuklu Geometrik Geçmesi'],
        ['chain', '⛓️ Altın Zencerek / Zincir'],
        ['wave', '〰️ Akarsu / Su Yolu Dalgalı']
      ]));
    }
    pageBox.append(seg('Sayfa Kenar Boşluğu', 'layout.margin', [
      [10, 'Dar (10mm)'],
      [14, 'Dengeli (14mm)'],
      [18, 'Geniş (18mm)']
    ], buildStep));
    pageBox.append(seg('Kağıt Boyutu', 'layout.page', [
      ['A4', 'A4 (210×297 mm)'],
      ['B5', 'B5 (176×250 mm)'],
      ['A5', 'A5 (148×210 mm)']
    ], buildStep));
    pageBox.append(txt('Sayfa Üst Bilgisi', 'layout.headerText', { ph: 'Örn. Bölüm 1 — Temel Kavramlar' }));
    pageBox.append(txt('Sayfa Alt Bilgisi', 'layout.footerText', { ph: 'Örn. Pıtrak Nüsha · Her hakkı saklıdır' }));
    pageBox.append(seg('Sayfa Numarası Konumu', 'layout.pageNum', [
      ['none', 'Gizle'],
      ['left', 'Solda'],
      ['center', 'Ortada'],
      ['right', 'Sağda']
    ], buildStep));
    d.append(pageBox);

    const typeBox = mk('div', { className: 'setting-card' });
    typeBox.append(mk('h4', { className: 'setting-head', textContent: 'Yazı Tipi ve Boyutları' }));
    typeBox.append(sel('Yazı Tipi', 'type.font', FONTS.map(f => [f.id, f.name])));
    typeBox.append(rng('Metin Boyutu', 'type.size', 8.5, 14, 0.5, 'pt'));
    typeBox.append(rng('Satır Yüksekliği', 'type.leading', 1.25, 2.0, 0.05, ''));
    typeBox.append(rng('Sorular Arası Boşluk', 'type.qGap', 2, 16, 1, 'mm'));
    typeBox.append(row('Yazı Renkleri', mk('div', { className: 'inline' }, [
      col('Gövde Metni', 'type.color'),
      col('Vurgu / Başlıklar', 'type.accent')
    ])));
    const curStem3 = (doc.type && doc.type.stemColor) || (doc.type && doc.type.accent) || '#6b4426';
    typeBox.append(makeStemColorBar(curStem3, c => {
      if (!doc.type) doc.type = {};
      doc.type.stemColor = c;
      changed(true);
    }, '🎯 Soru Kökü Vurgu Rengi:'));
    d.append(typeBox);

    const wmBox = mk('div', { className: 'setting-card' });
    wmBox.append(mk('h4', { className: 'setting-head', textContent: 'Filigran (Su İzi & Logo)' }));
    wmBox.append(sw('Arka Plana Filigran / Logo Eklensin', 'watermark.enabled', buildStep));
    if (doc.watermark.enabled) {
      wmBox.append(seg('Filigran Türü', 'watermark.kind', [
        ['text', 'Metin Filigranı'],
        ['image', 'Özel Logo / Görsel']
      ], buildStep));

      if (doc.watermark.kind === 'image') {
        const imgControls = mk('div', { className: 'wm-img-controls', style: 'margin-top:8px; display:flex; flex-direction:column; gap:8px;' });
        const picker = pickFile('Kendi Logonuzu / Görselinizi Yükleyin', dataUrl => {
          doc.watermark.image = dataUrl;
          changed(true);
          buildStep();
        }, { max: 1200, png: true });
        imgControls.append(row('Filigran Görseli', picker));

        if (doc.watermark.image) {
          const thumbWrap = mk('div', { style: 'display:flex; align-items:center; gap:12px; margin: 6px 0;' });
          const thumb = mk('img', { src: doc.watermark.image, style: 'height:50px; max-width:120px; object-fit:contain; border:1px solid var(--line); border-radius:6px; background:#fff;' });
          const btnRm = mk('button', { type: 'button', className: 'btn danger small', textContent: 'Görseli Kaldır' });
          btnRm.onclick = () => {
            doc.watermark.image = null;
            changed(true);
            buildStep();
          };
          thumbWrap.append(thumb, btnRm);
          imgControls.append(thumbWrap);
        }
        wmBox.append(imgControls);
        wmBox.append(rng('Görsel Boyutu', 'watermark.imageWidth', 10, 80, 5, '%'));
      } else {
        wmBox.append(txt('Filigran Metni', 'watermark.text', { ph: 'Örn. PITRAK NÜSHA' }));
        wmBox.append(rng('Metin Boyutu', 'watermark.size', 12, 60, 2, 'pt'));
        wmBox.append(col('Filigran Rengi', 'watermark.color'));
      }

      wmBox.append(rng('Saydamlık (Opaklık)', 'watermark.opacity', 5, 50, 1, '%'));
      wmBox.append(rng('Dönme Açısı', 'watermark.angle', -90, 90, 5, '°'));
    }
    d.append(wmBox);

    return d;
  }

  /* ADIM 4: Cevap Anahtarı Tablosu ve Çözümler */
  function step4Cevap() {
    const d = mk('div', { className: 'tp' });

    const keyBox = mk('div', { className: 'setting-card' });
    keyBox.append(mk('h4', { className: 'setting-head', textContent: 'Cevap Anahtarı Tablosu' }));
    keyBox.append(sw('Belgenin Sonuna Cevap Anahtarı Tablosu Eklensin', 'layout.showAnswerKey', buildStep));

    if (doc.layout.showAnswerKey !== false) {
      keyBox.append(seg('Tablo Konumu', 'layout.answerKeyNewPage', [
        [false, 'Sayfa Sonuna Ekle (Aynı Sayfada)'],
        [true, 'Yeni Sayfada Başlat']
      ], buildStep));
      keyBox.append(seg('Tablo Sütun Düzeni', 'layout.answerKeyCols', [
        [5, '5 Soru / Satır (Ferah ve Şık)'],
        [10, '10 Soru / Satır (Kompakt)']
      ], buildStep));
      keyBox.append(seg('Tablo Yazı Boyutu', 'layout.answerKeyFontSize', [
        [8, 'Küçük (8pt)'],
        [9.5, 'Normal (9.5pt)'],
        [11, 'Büyük (11pt)']
      ], buildStep));
    }
    d.append(keyBox);

    const solBox = mk('div', { className: 'setting-card' });
    solBox.append(mk('h4', { className: 'setting-head', textContent: 'Ayrıntılı Çözümler Bölümü' }));
    solBox.append(sw('Çözümü Olan Sorular İçin "Ayrıntılı Çözümler" Bölümü Eklensin', 'layout.showSolutions', buildStep));

    if (doc.layout.showSolutions !== false) {
      solBox.append(seg('Çözümler Konumu', 'layout.solutionsNewPage', [
        [false, 'Cevap Tablosunun Hemen Ardından'],
        [true, 'Yeni Sayfadan Başlasın']
      ], buildStep));
      solBox.append(seg('Çözüm Yazı Boyutu', 'layout.solutionsFontSize', [
        [9, 'Küçük (9pt)'],
        [10, 'Normal (10pt)'],
        [11.5, 'Ferah (11.5pt)']
      ], buildStep));
      solBox.append(seg('Çözüm Satır Aralığı', 'layout.solutionsLineHeight', [
        [1.35, 'Sıkı (1.35)'],
        [1.5, 'Normal (1.5)'],
        [1.7, 'Ferah (1.7)']
      ], buildStep));
    }
    d.append(solBox);

    const checkCard = mk('div', { className: 'setting-card' });
    checkCard.append(mk('h4', { className: 'setting-head', textContent: 'Soru ve Çözüm Hızlı Kontrol Listesi' }));
    checkCard.append(mk('p', { className: 'muted small', textContent: 'Soruların doğru cevaplarını ve çözümlerini buradan da tek bakışta görebilir ve hızlıca düzenleyebilirsiniz:' }));

    const qs = [];
    let n2 = 0;
    doc.items.forEach(i => { if (i.t === 'q' && !isBlank(i)) qs.push({ q: i, no: ++n2 }); });

    if (!qs.length) {
      checkCard.append(mk('div', { className: 'empty small', textContent: 'Henüz soru eklenmedi. 2. Adıma giderek soru ekleyebilirsiniz.' }));
    } else {
      const qTable = mk('div', { className: 'quick-review-list' });
      qs.forEach(({ q, no }) => {
        const rowDiv = mk('div', { className: 'quick-review-row' });
        const noLbl = mk('b', { className: 'qr-no', textContent: no + '.' });
        const textSnippet = mk('span', { className: 'qr-text', textContent: (q.text || '').slice(0, 45) || 'Boş soru metni' });
        
        const ansInp = mk('input', {
          className: 'qr-ans-input',
          value: q.answer || '',
          placeholder: 'Cevap',
          maxLength: 10
        });
        ansInp.oninput = () => { q.answer = ansInp.value.trim(); changed(); };

        const has = !!(q.explain || '').trim();
        const solBtn = mk('button', {
          className: 'btn tiny ' + (has ? 'primary' : 'ghost'),
          textContent: has ? '✓ Çözüm Var' : '+ Çözüm Ekle',
          onclick: () => {
            openId = q.id;
            goToStep(2);
          }
        });

        rowDiv.append(noLbl, textSnippet, ansInp, solBtn);
        qTable.append(rowDiv);
      });
      checkCard.append(qTable);
    }
    d.append(checkCard);

    return d;
  }

  /* ADIM 5: Belgeyi Tamamla ve İndir */
  function step5Indir() {
    const d = mk('div', { className: 'tp' });

    const totalQ = doc.items.filter(i => i.t === 'q' && !isBlank(i)).length;
    const totalNotes = doc.items.filter(i => i.t === 'note' && !isBlank(i)).length;
    const qsWithSol = doc.items.filter(i => i.t === 'q' && (i.explain || '').trim().length > 0).length;

    const readyCard = mk('div', { className: 'ready-hero-card' });
    readyCard.append(mk('div', { className: 'ready-badge', textContent: '✦ NÜSHANIZ BASKIYA HAZIR ✦' }));
    readyCard.append(mk('h3', { className: 'ready-title', textContent: doc.title || 'Adsız Nüsha' }));
    readyCard.append(mk('p', { className: 'muted', textContent: `${doc.kind} · ${totalQ} Soru ${totalNotes ? `· ${totalNotes} Not Kutusu` : ''} · ${qsWithSol} Çözüm` }));

    const dlGrid = mk('div', { className: 'step5-dl-grid' });

    const btnPdf = mk('button', {
      className: 'btn primary big selcuk-btn dl-action-btn',
      innerHTML: `<svg class="selcuk-star" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2 15 7 20 4 17 10 22 12 17 14 20 20 15 17 12 22 9 17 4 20 7 14 2 12 7 10 4 4 9 7" fill="rgba(255,225,175,0.25)"/><rect x="8.5" y="8.5" width="7" height="7" transform="rotate(45 12 12)" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><span>PDF Olarak İndir (Baskı Kalitesi)</span>`
    });
    btnPdf.onclick = () => runExportAction(Exp.pdf);

    const btnDocx = mk('button', {
      className: 'btn big dl-action-btn',
      textContent: '📝 Word (.docx) Olarak İndir (Tablolu)'
    });
    btnDocx.onclick = () => runExportAction(Exp.docx);

    const btnBackup = mk('button', {
      className: 'btn ghost dl-action-btn',
      textContent: '💾 Yedek Dosyası Al (.pitrak)'
    });
    btnBackup.onclick = () => runExportAction(Exp.pitrak);

    const btnShelf = mk('button', {
      className: 'btn ghost dl-action-btn',
      textContent: '🏠 Rafa Kaydet ve Ana Sayfaya Dön'
    });
    btnShelf.onclick = async () => { await flush(); doc = null; show('home'); drawShelf(); };

    dlGrid.append(btnPdf, btnDocx, btnBackup, btnShelf);
    readyCard.append(dlGrid);

    const progDiv = mk('div', { id: 'step5Progress', className: 'dl-progress-msg muted small' });
    readyCard.append(progDiv);

    d.append(readyCard);
    return d;
  }

  async function runExportAction(fn) {
    const prog = $('#step5Progress');
    if (prog) prog.textContent = 'Hazırlanıyor…';
    try {
      await fn(doc, msg => { if (prog) prog.textContent = msg; });
      if (prog) prog.textContent = 'Tamamlandı! İndirmeniz başladı.';
    } catch (e) {
      console.error(e);
      if (prog) prog.textContent = 'Aksilik: ' + (e.message || e);
    }
  }

  /* ============================================================ */
  /* TEK SEFERLİK GÖRSEL ÇIKTI STÜDYOSU (SINGLE STUDIO)           */
  /* ============================================================ */
  let singleSaveT = null;

  /* ============================================================ */
  /* TEK SEFERLİK GÖRSEL ÇIKTI (5 ADIMLI KADEMELİ SİHİRBAZ)      */
  /* ============================================================ */
  let activeSingleStep = 1;

  const SINGLE_STEP_DEFS = [
    { num: 1, title: 'Soru Metni ve Soru Kökü', short: 'Soru' },
    { num: 2, title: 'En-Boy Oranı ve Çerçeve', short: 'Oran & Çerçeve' },
    { num: 3, title: 'Arka Plan Teması ve Şeffaflık', short: 'Arka Plan' },
    { num: 4, title: 'Tipografi ve Renk Ayarları', short: 'Tipografi' },
    { num: 5, title: 'Dışa Aktar ve Soru Öbekleri', short: 'İndir & Öbek' }
  ];

  function openSingleStudio(sDoc) {
    singleDoc = sDoc || newSingleDoc();
    $('#singleDocTitle').value = singleDoc.title || 'Görsel Soru';
    const _s2 = $('#singleSaveState'); if (_s2) _s2.textContent = '✓ Kaydedildi';

    // Stepper butonlarını hazırla
    document.querySelectorAll('#singleStepper .step-btn').forEach(btn => {
      btn.onclick = () => {
        const s = Number(btn.dataset.sstep);
        if (s && s >= 1 && s <= 5) goToSingleStep(s);
      };
    });

    goToSingleStep(1);
    show('singleStudio');
  }

  function goToSingleStep(s) {
    if (s < 1) s = 1;
    if (s > 5) s = 5;
    activeSingleStep = s;
    buildSingleStep();
  }

  function changedSingle() {
    const _s2 = $('#singleSaveState'); if (_s2) _s2.textContent = '● Kaydedilmemiş…';
    if (singleDoc) singleDoc.updated = Date.now();
    renderSingleStudioPreview();
    if (window._saveSingleDebounce) clearTimeout(window._saveSingleDebounce);
    window._saveSingleDebounce = setTimeout(flushSingle, 800);
  }

  async function flushSingle() {
    if (!singleDoc) return;
    try {
      await DB.put(singleDoc);
      const _s2 = $('#singleSaveState'); if (_s2) _s2.textContent = '✓ Kaydedildi';
    } catch (e) {
      console.warn('Tek soru kaydedilemedi', e);
    }
  }

  function renderSingleStudioPreview() {
    if (!singleDoc) return;
    const wrap = $('#singleCanvasWrap');
    if (!wrap) return;
    renderSingleCard(singleDoc, wrap);
  }

    function buildSingleStep() {
    if (!singleDoc) return;
    updateModeButtonsUI();

    // ÜSTAT MODU (5 Büyük Aşama)
    if (appCreationMode === 'pro') {
      $('#singleStepper').hidden = false;
      buildProSingleStep();
      return;
    }

    // YARDIMLI MOD (7 Adım Adım Mikro Aşama)
    $('#singleStepper').hidden = true;
    buildGuidedSingleStep();
  }

  function buildProSingleStep() {
    const body = $('#singleStepBody');
    if (!body) return;
    body.innerHTML = '';

    // Stepper güncelle
    document.querySelectorAll('#singleStepper .step-btn').forEach(btn => {
      const s = Number(btn.dataset.sstep);
      btn.classList.toggle('active', s === activeSingleStep);
      btn.classList.toggle('done', s < activeSingleStep);
    });

    const curDef = SINGLE_STEP_DEFS[activeSingleStep - 1];
    $('#singleStepBadge').textContent = `Adım ${activeSingleStep} / 5`;
    $('#singleStepTitle').textContent = curDef.title;

    // Adım içeriği
    const renderers = [
      singleStep1Soru,
      singleStep2Oran,
      singleStep3ArkaPlan,
      singleStep4Tipografi,
      singleStep5Indir
    ];
    body.appendChild(renderers[activeSingleStep - 1]());

    // Alt navigasyon butonları
    const btnPrev = $('#btnSinglePrev');
    const btnNext = $('#btnSingleNext');

    if (activeSingleStep === 1) {
      btnPrev.disabled = true;
      btnPrev.textContent = '← İlk Adım';
    } else {
      btnPrev.disabled = false;
      const prevDef = SINGLE_STEP_DEFS[activeSingleStep - 2];
      btnPrev.textContent = `← ${prevDef.short}`;
      btnPrev.onclick = () => goToSingleStep(activeSingleStep - 1);
    }

    if (activeSingleStep === 5) {
      btnNext.textContent = '✓ Rafa Kaydet & Bitir';
      btnNext.onclick = async () => {
        await flushSingle();
        singleDoc = null;
        show('home');
        drawShelf();
      };
    } else {
      const nextDef = SINGLE_STEP_DEFS[activeSingleStep];
      btnNext.textContent = `${nextDef.short} →`;
      btnNext.onclick = () => goToSingleStep(activeSingleStep + 1);
    }

    renderSingleStudioPreview();
  }

  
  /* ---------- YARDIMLI MOD: Tek Soruluk Görsel Çıktı (8 Mikro Aşama) ---------- */
  const GUIDED_SINGLE_DEFS = [
    { num: 1, short: 'Metin', title: '1. Soru Metni & Paragraf', desc: 'Sorunun öncül metnini veya paragrafını girin. "Altını Çiz" butonuyla önemli yerleri vurgulayın.' },
    { num: 2, short: 'Kök', title: '2. 🎯 Soru Kökü (Koyu Renkli)', desc: 'Kartta kalın ve renkli yazılacak soru kökü cümlesini belirleyin.' },
    { num: 3, short: 'Şıklar', title: '3. 🔤 Seçenekler (A, B, C, D, E)', desc: 'Şıkları tek bir kutuda alt alta yazın ve doğru cevabı seçin.' },
    { num: 4, short: 'Görsel', title: '4. 🖼️ Soru Görseli (İsteğe Bağlı)', desc: 'Soru için cihazınızdan veya açık kaynaklardan bir görsel ekleyin.' },
    { num: 5, short: 'Format', title: '5. 📐 Görsel Formatı (En-Boy Oranı)', desc: 'Görselinizi nerede paylaşacaksınız? 9:16 Hikaye, 1:1 Kare veya 4:5 Portre seçin.' },
    { num: 6, short: 'Çerçeve', title: '6. 🏛️ Türk Kültürü Çerçeve Motifi', desc: 'Kartınız için 20 geleneksel motif arasından bir çerçeve seçin.' },
    { num: 7, short: 'Arka Plan', title: '7. 🎨 Sanatsal Arka Plan Teması', desc: '20 gerçek sanatsal arka plan görselinden birine dokunun.' },
    { num: 8, short: 'İndir', title: '8. 📥 Tebrikler! Kartınız Hazır', desc: 'Görsel soru kartınız hazırlandı. Hemen indirebilirsiniz.' }
  ];

  function buildGuidedSingleStep() {
    const body = $('#singleStepBody');
    if (!body) return;
    body.innerHTML = '';

    const proFooter = $('#singleStepNavFooter');
    if (proFooter) proFooter.hidden = true;

    const totalSteps = GUIDED_SINGLE_DEFS.length;
    if (guidedSingleStep > totalSteps) guidedSingleStep = totalSteps;
    const curDef = GUIDED_SINGLE_DEFS[guidedSingleStep - 1];

    $('#singleStepBadge').textContent = `Adım ${guidedSingleStep} / ${totalSteps} (Yardımlı Mod)`;
    $('#singleStepTitle').textContent = curDef.title;

    // Guided Stepper Navigation Bar
    const track = mk('div', { className: 'guided-track' });
    GUIDED_SINGLE_DEFS.forEach(d => {
      const isLocked = d.num > guidedSingleMaxUnlocked;
      const isDone = d.num < guidedSingleStep;
      const isActive = d.num === guidedSingleStep;
      const node = mk('button', {
        type: 'button',
        className: 'guided-step-node' + (isActive ? ' active' : '') + (isDone ? ' done' : '') + (isLocked ? ' locked' : ''),
        title: d.title,
        textContent: (isDone ? '✓ ' : '') + d.num + '. ' + d.short
      });
      if (!isLocked) {
        node.onclick = () => {
          guidedSingleStep = d.num;
          buildSingleStep();
        };
      }
      track.appendChild(node);
    });
    body.appendChild(track);

    const card = mk('div', { className: 'guided-card' });
    card.append(mk('div', { className: 'guided-card-head' }, [
      mk('span', { className: 'guided-badge', textContent: `Adım ${guidedSingleStep} / ${totalSteps}` }),
      mk('h3', { className: 'guided-title', textContent: curDef.title }),
      mk('p', { className: 'guided-desc', textContent: curDef.desc })
    ]));

    const cardBody = mk('div', { className: 'guided-body' });

    // MİKRO ADIM İÇERİKLERİ
    if (guidedSingleStep === 1) {
      const taText = mk('textarea', {
        rows: 6,
        className: 'single-main-textarea',
        value: singleDoc.questionText || '',
        placeholder: 'Paragraf veya soru metnini yazın. Vurgulamak istediğiniz sözcüğü seçip yukarıdaki "Altını Çiz" butonuna basabilirsiniz…'
      });
      taText.oninput = () => { singleDoc.questionText = taText.value; changedSingle(); };
      cardBody.append(makeTextareaWithToolbar(taText));
    } else if (guidedSingleStep === 2) {
      const curStemSingle = singleDoc.stemColor || '#a8e6cf';
      const taStem = mk('textarea', {
        rows: 3,
        className: 'q-stem-textarea',
        value: singleDoc.questionStem || '',
        placeholder: 'Örn: Bu parçadan hareketle aşağıdaki yargılardan hangisine ulaşılamaz?'
      });
      taStem.style.color = curStemSingle;
      taStem.oninput = () => { singleDoc.questionStem = taStem.value; changedSingle(); };
      cardBody.append(taStem);
      cardBody.append(makeStemColorBar(curStemSingle, col => {
        singleDoc.stemColor = col;
        taStem.style.color = col;
        changedSingle();
      }, '🎯 Soru Kökü Vurgu Rengi:'));
    } else if (guidedSingleStep === 3) {
      const taOpts = mk('textarea', {
        rows: 6,
        className: 'q-opts-textarea single-opts-textarea',
        value: singleDoc.optsText || (singleDoc.opts || []).map((o, i) => o ? `${['A','B','C','D','E'][i]}) ${o}` : '').filter(Boolean).join('\n'),
        placeholder: 'A) Birinci seçenek\nB) İkinci seçenek\nC) Üçüncü seçenek\nD) Dördüncü seçenek\nE) Beşinci seçenek'
      });
      taOpts.oninput = () => {
        singleDoc.optsText = taOpts.value;
        const parsedOpts = ['', '', '', '', ''];
        const lines = taOpts.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        let autoIdx = 0;
        lines.forEach(line => {
          const m = line.match(/^([A-Ea-e])\s*[.)]\s*(.*)$/);
          if (m) {
            const idx = m[1].toUpperCase().charCodeAt(0) - 65;
            if (idx >= 0 && idx < 5) parsedOpts[idx] = m[2].trim();
          } else if (autoIdx < 5) {
            parsedOpts[autoIdx++] = line;
          }
        });
        singleDoc.opts = parsedOpts;
        if (parsedOpts[4]) singleDoc.hasE = true;
        changedSingle();
      };
      cardBody.append(taOpts);

      // Doğru Cevap Seçici
      const ansWrap = mk('div', { style: 'margin-top:12px; display:flex; align-items:center; gap:8px;' });
      ansWrap.append(mk('span', { style: 'font-weight:700; font-size:13px;', textContent: 'Doğru Cevap:' }));
      ['A', 'B', 'C', 'D', 'E'].forEach(letter => {
        const btnAns = mk('button', {
          type: 'button',
          className: 'btn small' + (singleDoc.correctAnswer === letter ? ' primary' : ' ghost'),
          style: 'min-width:34px;',
          textContent: letter
        });
        btnAns.onclick = () => {
          singleDoc.correctAnswer = singleDoc.correctAnswer === letter ? '' : letter;
          changedSingle();
          buildSingleStep();
        };
        ansWrap.append(btnAns);
      });
      cardBody.append(ansWrap);
    } else if (guidedSingleStep === 4) {
      // Soru Görseli
      const picker = pickFile('📁 Cihazdan Soru Görseli Seç', dataUrl => {
        singleDoc.image = dataUrl;
        changedSingle();
        buildSingleStep();
      }, { max: 1400 });
      const btnOpenSearch = mk('button', {
        type: 'button',
        className: 'btn small ghost',
        style: 'margin-left:8px;',
        textContent: '🌐 Açık Kaynaktan Görsel Ara',
        onclick: () => openImageSearch('Soru İçin Görsel Ara', dataUrl => {
          singleDoc.image = dataUrl;
          changedSingle();
          buildSingleStep();
        })
      });
      cardBody.append(row('Soru Görseli (İsteğe Bağlı)', mk('div', { className: 'inline' }, [picker, btnOpenSearch])));

      if (singleDoc.image) {
        const thumbWrap = mk('div', { style: 'margin-top:10px; display:flex; align-items:center; gap:12px;' });
        const thumb = mk('img', { src: singleDoc.image, style: 'height:65px; border-radius:6px; border:1px solid var(--line);' });
        const btnRm = mk('button', {
          type: 'button',
          className: 'btn small danger',
          textContent: 'Görseli Kaldır',
          onclick: () => { singleDoc.image = null; changedSingle(); buildSingleStep(); }
        });
        thumbWrap.append(thumb, btnRm);
        cardBody.append(thumbWrap);
      }
    } else if (guidedSingleStep === 5) {
      // Format seçimi
      const ratios = [
        ['9:16', '📱 9:16 (Dikey Hikaye & Reel)'],
        ['1:1', '🟦 1:1 (Kare / Gönderi)'],
        ['4:5', '🖼️ 4:5 (Portre Akış)'],
        ['16:9', '🖥️ 16:9 (Yatay / Akıllı Tahta)'],
        ['3:4', '📄 3:4 (Belge Düzeni)']
      ];
      const grid = mk('div', { style: 'display:grid; grid-template-columns:1fr; gap:8px;' });
      ratios.forEach(([rKey, rLabel]) => {
        const btn = mk('button', {
          type: 'button',
          className: 'frame-select-btn' + (singleDoc.aspectRatio === rKey ? ' active' : ''),
          textContent: rLabel
        });
        btn.onclick = () => {
          singleDoc.aspectRatio = rKey;
          changedSingle();
          buildSingleStep();
        };
        grid.appendChild(btn);
      });
      cardBody.append(grid);
    } else if (guidedSingleStep === 6) {
      cardBody.append(singleStep2Oran());
    } else if (guidedSingleStep === 7) {
      cardBody.append(singleStep3ArkaPlan());
    } else if (guidedSingleStep === 8) {
      cardBody.append(singleStep5Indir());
    }

    card.append(cardBody);

    // İleri / Geri Navigasyon
    const nav = mk('div', { className: 'guided-footer-nav' });
    const btnPrev = mk('button', {
      type: 'button',
      className: 'btn ghost',
      textContent: '← Önceki Adım',
      disabled: guidedSingleStep === 1,
      onclick: () => {
        if (guidedSingleStep > 1) {
          guidedSingleStep--;
          buildSingleStep();
        }
      }
    });

    const isLast = guidedSingleStep === totalSteps;
    const btnNext = mk('button', {
      type: 'button',
      className: 'btn primary',
      style: 'font-weight:700;',
      textContent: isLast ? '✓ Rafa Kaydet & Bitir' : `Sonraki Adım (${guidedSingleStep + 1}/${totalSteps}) ➔`,
      onclick: async () => {
        if (isLast) {
          await flushSingle();
          singleDoc = null;
          show('home');
          drawShelf();
          toast('Görsel soru kartı kaydedildi!');
          return;
        }

        // Doğrulama: Soru metni boş olamaz
        if (guidedSingleStep === 1 && !singleDoc.questionText.trim()) {
          toast('Lütfen devam etmeden önce soru metnini girin.');
          const tArea = $('textarea.single-main-textarea');
          if (tArea) tArea.focus();
          return;
        }

        guidedSingleStep++;
        guidedSingleMaxUnlocked = Math.max(guidedSingleMaxUnlocked, guidedSingleStep);
        buildSingleStep();
      }
    });

    nav.append(btnPrev, btnNext);
    card.append(nav);
    body.appendChild(card);

    renderSingleStudioPreview();
  }
  
  /* ADIM 1: Soru Metni, Soru Kökü ve Şıklar (3 Pencereli Mizanpaj) */
  function singleStep1Soru() {
    if (!singleDoc.opts || !Array.isArray(singleDoc.opts)) {
      singleDoc.opts = ['', '', '', '', ''];
    }
    const d = mk('div', { className: 'tp' });

    // Üst Başlık / Ders Etiketi
    const tagCard = mk('div', { className: 'setting-card', style: 'margin-bottom:12px;' });
    tagCard.append(mk('h4', { className: 'setting-head', textContent: 'Üst Başlık / Ders Etiketi (İsteğe Bağlı)' }));
    const tagInp = mk('input', {
      type: 'text',
      value: singleDoc.headerTag || '',
      placeholder: 'Örn. TÜRK EDEBİYATI, FİZİK, GENEL KÜLTÜR…'
    });
    tagInp.oninput = () => { singleDoc.headerTag = tagInp.value; changedSingle(); };
    tagCard.append(row('', tagInp));
    d.append(tagCard);

    // ==========================================
    // 1. PENCERE: SORU METNİ & PARAGRAF
    // ==========================================
    const w1 = mk('div', { className: 'q-window-box window-text' });
    w1.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill', textContent: '1. Çerçeve' }),
      mk('b', { textContent: 'Soru Metni & Paragraf' }),
      mk('span', { className: 'muted small', textContent: '(Öncül veya soru gövdesi)' })
    ]));
    const taText = mk('textarea', {
      rows: 5,
      className: 'single-main-textarea',
      value: singleDoc.questionText || '',
      placeholder: 'Paragraf veya soru metnini yazın. Vurgulamak istediğiniz sözcüğü seçip yukarıdaki "Altını Çiz" butonuna basabilirsiniz…'
    });
    taText.oninput = () => { singleDoc.questionText = taText.value; changedSingle(); };
    w1.append(makeTextareaWithToolbar(taText));
    d.append(w1);

    // ==========================================
    // 2. PENCERE: SORU KÖKÜ (KOYU YAZILIR)
    // ==========================================
    const w2 = mk('div', { className: 'q-window-box window-stem' });
    w2.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill accent-pill', textContent: '2. Çerçeve' }),
      mk('b', { textContent: '🎯 Soru Kökü (Koyu Renkli Yazılır)' }),
      mk('span', { className: 'muted small', textContent: '(Görsel kartta kalın ve satır başı olarak vurgulanır)' })
    ]));
    const curStemS1 = singleDoc.stemColor || '#a8e6cf';
    const taStem = mk('textarea', {
      rows: 2,
      className: 'q-stem-textarea',
      value: singleDoc.questionStem || '',
      placeholder: 'Örn: Bu parçadan hareketle aşağıdaki yargılardan hangisine ulaşılamaz?'
    });
    taStem.style.color = curStemS1;
    taStem.oninput = () => { singleDoc.questionStem = taStem.value; changedSingle(); };
    w2.append(taStem);
    w2.append(makeStemColorBar(curStemS1, col => {
      singleDoc.stemColor = col;
      taStem.style.color = col;
      changedSingle();
    }, '🎯 Soru Kökü Vurgu Rengi:'));
    d.append(w2);

    // ==========================================
    // 3. PENCERE: SORU ŞIKLARI (TEK VE BOŞ ÇERÇEVE)
    // ==========================================
    const w3 = mk('div', { className: 'q-window-box window-opts' });
    w3.append(mk('div', { className: 'q-window-head' }, [
      mk('span', { className: 'q-window-pill', textContent: '3. Çerçeve' }),
      mk('b', { textContent: '🔤 Soru Şıkları (Boş Çerçeve)' }),
      mk('span', { className: 'muted small', textContent: '(İsteğe bağlı - her satıra bir şık yazın: A) ... B) ...)' })
    ]));

    let initialSingleOptsText = singleDoc.optsText;
    if (initialSingleOptsText == null) {
      if (Array.isArray(singleDoc.opts) && singleDoc.opts.some(o => (o || '').trim())) {
        const letters = ['A', 'B', 'C', 'D', 'E'];
        initialSingleOptsText = singleDoc.opts.map((o, i) => (o || '').trim() ? `${letters[i]}) ${o.trim()}` : '').filter(Boolean).join('\n');
      } else {
        initialSingleOptsText = '';
      }
    }

    const taSingleOpts = mk('textarea', {
      rows: 5,
      className: 'q-opts-textarea single-opts-textarea',
      value: initialSingleOptsText,
      placeholder: 'A) Birinci seçenek\nB) İkinci seçenek\nC) Üçüncü seçenek\nD) Dördüncü seçenek\nE) Beşinci seçenek'
    });

    function syncSingleOptsFromText() {
      singleDoc.optsText = taSingleOpts.value;
      const parsedOpts = ['', '', '', '', ''];
      const lines = taSingleOpts.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let autoIdx = 0;

      lines.forEach(line => {
        const m = line.match(/^([A-Ea-e])\s*[.)]\s*(.*)$/);
        if (m) {
          const idx = m[1].toUpperCase().charCodeAt(0) - 65;
          if (idx >= 0 && idx < 5) parsedOpts[idx] = m[2].trim();
        } else if (autoIdx < 5) {
          parsedOpts[autoIdx++] = line;
        }
      });
      singleDoc.opts = parsedOpts;
      if (parsedOpts[4]) {
        singleDoc.hasE = true;
      }
    }

    taSingleOpts.oninput = () => {
      syncSingleOptsFromText();
      changedSingle();
    };
    syncSingleOptsFromText();

    w3.append(taSingleOpts);
    d.append(w3);

    // ==========================================
    // SORU GÖRSELİ (İSTEĞE BAĞLI)
    // ==========================================
    const imgBox = mk('div', { className: 'setting-card', style: 'margin-top:12px;' });
    imgBox.append(mk('h4', { className: 'setting-head', textContent: 'Soru Görseli (İsteğe Bağlı)' }));
    const picker = pickFile('📁 Cihazdan Ekle', dataUrl => {
      singleDoc.image = dataUrl;
      changedSingle();
      buildSingleStep();
    }, { max: 1400 });
    const btnOpenSearchSingle = mk('button', {
      type: 'button',
      className: 'btn small ghost',
      style: 'margin-left: 8px;',
      textContent: '🌐 Açık Kaynaktan Ara',
      onclick: () => openImageSearch('Soru İçin Görsel Ara', dataUrl => {
        singleDoc.image = dataUrl;
        changedSingle();
        buildSingleStep();
      })
    });
    imgBox.append(row('', mk('div', { className: 'inline' }, [picker, btnOpenSearchSingle])));

    if (singleDoc.image) {
      const imgThumbWrap = mk('div', { style: 'display:flex; align-items:center; gap:12px; margin-top:8px;' });
      const imgThumb = mk('img', { src: singleDoc.image, style: 'height:60px; max-width:120px; object-fit:contain; border:1px solid var(--line); border-radius:6px;' });
      const btnRmImg = mk('button', { type: 'button', className: 'btn danger small', textContent: 'Görseli Kaldır' });
      btnRmImg.onclick = () => {
        singleDoc.image = null;
        changedSingle();
        buildSingleStep();
      };
      imgThumbWrap.append(imgThumb, btnRmImg);
      imgBox.append(imgThumbWrap);
    }
    d.append(imgBox);

    return d;
  }

  /* ADIM 2: En-Boy Oranı ve Çerçeve */
  function singleStep2Oran() {
    const d = mk('div', { className: 'tp' });

    // En-Boy Oranı
    const ratioBox = mk('div', { className: 'setting-card' });
    ratioBox.append(mk('h4', { className: 'setting-head', textContent: 'Görsel En-Boy Oranı (5 Çeşit Seçenek)' }));
    
    const ratioSeg = mk('div', { className: 'seg ratio-selector-seg', style: 'display:grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap:6px;' });
    const ratios = [
      ['9:16', '9:16\nHikaye & Dikey'],
      ['1:1', '1:1\nKare & Gönderi'],
      ['4:5', '4:5\nPortre Akış'],
      ['16:9', '16:9\nYatay & Sunum'],
      ['3:4', '3:4\nBelge & Baskı']
    ];
    ratios.forEach(([rKey, rLabel]) => {
      const b = mk('button', {
        type: 'button',
        className: (singleDoc.aspectRatio || '9:16') === rKey ? 'on' : '',
        style: 'white-space:pre-line; padding:8px 4px; text-align:center; font-size:12px; line-height:1.25;'
      });
      b.textContent = rLabel;
      b.onclick = () => {
        singleDoc.aspectRatio = rKey;
        [...ratioSeg.children].forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        changedSingle();
      };
      ratioSeg.appendChild(b);
    });
    ratioBox.append(ratioSeg);

    // Otomatik Sığdırma Butonu
    const fitWrap = mk('div', { style: 'margin-top:10px; padding-top:8px; border-top:1px dashed var(--line);' });
    const swFit = mk('input', { type: 'checkbox', checked: singleDoc.autoFit !== false });
    swFit.onchange = () => {
      singleDoc.autoFit = swFit.checked;
      changedSingle();
    };
    fitWrap.append(mk('label', { className: 'check' }, [swFit, ' ⚡ Metinleri Kutuya Otomatik Sığdır (Taşmayı Önle)']));
    ratioBox.append(fitWrap);
    d.append(ratioBox);

    // 20 Türk Kültürü & Halı Çerçevesi
    const frameBox = mk('div', { className: 'setting-card' });
    frameBox.append(mk('h4', { className: 'setting-head', textContent: 'Türk Kültürü ve Halı Çerçeveleri (20 Çeşit)' }));
    frameBox.append(mk('p', { className: 'muted small', style: 'margin: -4px 0 10px;', textContent: 'Selçuklu yıldızları, Anadolu kilim motifleri ve saray tezhipleri:' }));

    // Gruplara göre çerçeveleri diz
    const groups = ['Selçuklu & Kadim', 'Halı & Kilim', 'Osmanlı & Saray', 'Kadim Türk', 'Geleneksel Zanaat', 'Klasik Hat', 'Sade & Modern'];
    const activeFrame = singleDoc.frameStyle || 'selcuk-star';

    groups.forEach(grp => {
      const framesInGrp = FRAME_CATALOG.filter(f => f.group === grp);
      if (!framesInGrp.length) return;

      const title = mk('div', { className: 'frames-group-title', textContent: grp });
      frameBox.append(title);

      const grid = mk('div', { className: 'frames-selector-grid' });
      framesInGrp.forEach(f => {
        const miniSvg = window.buildFrameMiniThumb ? window.buildFrameMiniThumb(f.id, singleDoc.frameColor || '#b98a4a') : '';
        const thumbSpan = mk('span', { className: 'frame-mini-thumb' });
        thumbSpan.innerHTML = miniSvg;
        const nameSpan = mk('span', { className: 'frame-btn-name', textContent: f.name });

        const btn = mk('button', {
          type: 'button',
          className: 'frame-select-btn' + (activeFrame === f.id ? ' active' : '')
        }, [thumbSpan, nameSpan]);

        btn.onclick = () => {
          singleDoc.frameStyle = f.id;
          document.querySelectorAll('.frame-select-btn').forEach(x => x.classList.remove('active'));
          btn.classList.add('active');
          changedSingle();
        };
        grid.appendChild(btn);
      });
      frameBox.append(grid);
    });

    // Çerçeve Rengi & Kalınlığı
    const colWrap = mk('div', { className: 'inline', style: 'display:flex; align-items:center; gap:16px; margin-top:12px; padding-top:10px; border-top:1px dashed var(--line);' });
    const colInp = mk('input', { type: 'color', value: singleDoc.frameColor || '#b98a4a' });
    colInp.oninput = () => {
      singleDoc.frameColor = colInp.value;
      changedSingle();
      // Mini önizlemelerdeki SVG renklerini canlı güncelle
      frameBox.querySelectorAll('.frame-mini-thumb svg').forEach(svg => {
        svg.querySelectorAll('[stroke]').forEach(el => {
          if (el.getAttribute('stroke') !== 'none') el.setAttribute('stroke', colInp.value);
        });
        svg.querySelectorAll('[fill]').forEach(el => {
          if (el.getAttribute('fill') !== 'none' && el.getAttribute('fill') !== 'transparent') el.setAttribute('fill', colInp.value);
        });
      });
    };
    colWrap.append(mk('label', { className: 'colr' }, [colInp, mk('span', { textContent: 'Çerçeve Rengi' })]));

    const wRng = mk('input', { type: 'range', min: 1, max: 8, step: 1, value: singleDoc.frameWidth || 2 });
    const wVal = mk('span', { className: 'rv', textContent: (singleDoc.frameWidth || 2) + ' px' });
    wRng.oninput = () => { singleDoc.frameWidth = Number(wRng.value); wVal.textContent = wRng.value + ' px'; changedSingle(); };
    colWrap.append(mk('div', { className: 'rng', style: 'flex:1;' }, [wRng, wVal]));

    frameBox.append(colWrap);
    d.append(frameBox);

    return d;
  }

  function singleStep3ArkaPlan() {
    const d = mk('div', { className: 'tp' });

    // 11 Hazır Tema Izgarası
    const themeBox = mk('div', { className: 'setting-card' });
    themeBox.append(mk('h4', { className: 'setting-head', textContent: 'Zengin Sanatsal Arka Plan Temaları (11 Çeşit)' }));

    const grid = mk('div', { className: 'bg-presets-grid' });
    BG_PRESETS.forEach(p => {
      const btn = mk('button', {
        type: 'button',
        className: 'bg-preset-btn' + (singleDoc.bgPreset === p.id && singleDoc.bgType !== 'custom' ? ' active' : '')
      });
      const thumb = mk('div', { className: 'bg-preset-thumb' });
      thumb.style.backgroundImage = `url("${p.dataUri || p.file}")`;
      const name = mk('span', { className: 'bg-preset-name', textContent: p.name });
      btn.append(thumb, name);
      btn.onclick = () => {
        singleDoc.bgType = 'preset';
        singleDoc.bgPreset = p.id;
        if (p.defaultStem) singleDoc.stemColor = p.defaultStem;
        if (p.defaultBorder) singleDoc.frameColor = p.defaultBorder;
        [...grid.children].forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        changedSingle();
      };
      grid.appendChild(btn);
    });
    themeBox.append(grid);
    d.append(themeBox);

    // Özel Arka Plan Görseli Yükle
    const customBox = mk('div', { className: 'setting-card' });
    customBox.append(mk('h4', { className: 'setting-head', textContent: 'Kendi Arka Plan Görselini Yükle' }));
    
    const bgPicker = pickFile('📁 Cihazdan Yükle', dataUrl => {
      singleDoc.bgType = 'custom';
      singleDoc.customBgImage = dataUrl;
      [...grid.children].forEach(x => x.classList.remove('active'));
      changedSingle();
      buildSingleStep();
    }, { max: 1920 });
    const btnOpenSearchBg = mk('button', {
      type: 'button',
      className: 'btn small ghost',
      style: 'margin-left: 8px;',
      textContent: '🌐 Açık Kaynaktan Arka Plan Ara',
      onclick: () => openImageSearch('Arka Plan İçin Görsel Ara', dataUrl => {
        singleDoc.bgType = 'custom';
        singleDoc.customBgImage = dataUrl;
        [...grid.children].forEach(x => x.classList.remove('active'));
        changedSingle();
        buildSingleStep();
      })
    });
    customBox.append(row('', mk('div', { className: 'inline' }, [bgPicker, btnOpenSearchBg])));

    if (singleDoc.bgType === 'custom' && singleDoc.customBgImage) {
      const customWrap = mk('div', { style: 'display:flex; align-items:center; gap:12px; margin-top:8px;' });
      const customThumb = mk('img', { src: singleDoc.customBgImage, style: 'height:60px; max-width:100px; object-fit:cover; border:1px solid var(--line); border-radius:6px;' });
      const btnRmCustom = mk('button', { type: 'button', className: 'btn danger small', textContent: 'Özel Görseli Kaldır' });
      btnRmCustom.onclick = () => {
        singleDoc.bgType = 'preset';
        singleDoc.customBgImage = null;
        changedSingle();
        buildSingleStep();
      };
      customWrap.append(customThumb, btnRmCustom);
      customBox.append(customWrap);
    }
    d.append(customBox);

    // Şeffaflık ve Karartma Ayarları
    const opBox = mk('div', { className: 'setting-card' });
    opBox.append(mk('h4', { className: 'setting-head', textContent: 'Görsel Şeffaflığı ve Karartma Örtüsü' }));

    // Arka plan doku şeffaflığı
    const bgOpRng = mk('input', { type: 'range', min: 10, max: 100, step: 5, value: singleDoc.bgOpacity != null ? singleDoc.bgOpacity : 100 });
    const bgOpVal = mk('span', { className: 'rv', textContent: '%' + (singleDoc.bgOpacity != null ? singleDoc.bgOpacity : 100) });
    bgOpRng.oninput = () => {
      singleDoc.bgOpacity = Number(bgOpRng.value);
      bgOpVal.textContent = '%' + bgOpRng.value;
      changedSingle();
    };
    opBox.append(row('Arka Plan Doku Şeffaflığı', mk('div', { className: 'rng' }, [bgOpRng, bgOpVal])));

    // Karartma / Işıltı Örtüsü
    const ovRng = mk('input', { type: 'range', min: 0, max: 80, step: 5, value: singleDoc.bgOverlayOpacity || 0 });
    const ovVal = mk('span', { className: 'rv', textContent: '%' + (singleDoc.bgOverlayOpacity || 0) });
    ovRng.oninput = () => {
      singleDoc.bgOverlayOpacity = Number(ovRng.value);
      ovVal.textContent = '%' + ovRng.value;
      changedSingle();
    };
    opBox.append(row('Karartma / Kontrast Örtüsü', mk('div', { className: 'rng' }, [ovRng, ovVal])));
    d.append(opBox);

    return d;
  }

  /* ADIM 4: Tipografi ve Renk Ayarları */
  function singleStep4Tipografi() {
    const d = mk('div', { className: 'tp' });

    const fontBox = mk('div', { className: 'setting-card' });
    fontBox.append(mk('h4', { className: 'setting-head', textContent: 'Yazı Tipi ve Boyutu' }));
    
    const swAutoFitTypo = mk('input', { type: 'checkbox', checked: singleDoc.autoFit !== false });
    swAutoFitTypo.onchange = () => {
      singleDoc.autoFit = swAutoFitTypo.checked;
      changedSingle();
    };
    fontBox.append(mk('label', { className: 'check', style: 'margin-bottom:8px; display:inline-block;' }, [swAutoFitTypo, ' ⚡ Metni Kutuya Otomatik Sığdır (Tavsiye Edilir)']));

    // Yazı Tipi
    const fontSelect = mk('select');
    FONTS.forEach(f => {
      fontSelect.append(mk('option', { value: f.id, textContent: f.name, selected: (singleDoc.font || 'lora') === f.id }));
    });
    fontSelect.onchange = () => { singleDoc.font = fontSelect.value; changedSingle(); };
    fontBox.append(row('Yazı Karakteri', fontSelect));

    // Yazı Boyutu
    const szRng = mk('input', { type: 'range', min: 14, max: 32, step: 1, value: singleDoc.fontSize || 20 });
    const szVal = mk('span', { className: 'rv', textContent: (singleDoc.fontSize || 20) + ' px' });
    szRng.oninput = () => { singleDoc.fontSize = Number(szRng.value); szVal.textContent = szRng.value + ' px'; changedSingle(); };
    fontBox.append(row('Metin Boyutu', mk('div', { className: 'rng' }, [szRng, szVal])));

    // Satır Aralığı
    const lhRng = mk('input', { type: 'range', min: 1.25, max: 2.0, step: 0.05, value: singleDoc.lineHeight || 1.55 });
    const lhVal = mk('span', { className: 'rv', textContent: String(singleDoc.lineHeight || 1.55) });
    lhRng.oninput = () => { singleDoc.lineHeight = Number(lhRng.value); lhVal.textContent = lhRng.value; changedSingle(); };
    fontBox.append(row('Satır Aralığı (Ferahlık)', mk('div', { className: 'rng' }, [lhRng, lhVal])));
    d.append(fontBox);

    // Renkler ve Hizalama
    const styleBox = mk('div', { className: 'setting-card' });
    styleBox.append(mk('h4', { className: 'setting-head', textContent: 'Vurgu Rengi ve Metin Hizalama' }));

    // Soru Kökü Rengi
    styleBox.append(makeStemColorBar(singleDoc.stemColor || '#a8e6cf', col => {
      singleDoc.stemColor = col;
      changedSingle();
    }, '🎯 Soru Kökü [[ ]] Vurgu Rengi:'));

    // Metin Hizalama
    const alignSeg = mk('div', { className: 'seg' });
    const aligns = [['left', 'Sola Hizala'], ['center', 'Ortala']];
    aligns.forEach(([aKey, aLabel]) => {
      const b = mk('button', {
        type: 'button',
        textContent: aLabel,
        className: (singleDoc.textAlign || 'left') === aKey ? 'on' : ''
      });
      b.onclick = () => {
        singleDoc.textAlign = aKey;
        [...alignSeg.children].forEach(x => x.classList.remove('on'));
        b.classList.add('on');
        changedSingle();
      };
      alignSeg.appendChild(b);
    });
    styleBox.append(row('Metin Hizalama', alignSeg));
    d.append(styleBox);

    return d;
  }

  /* ADIM 5: Dışa Aktar ve Soru Öbekleri */
  function singleStep5Indir() {
    const d = mk('div', { className: 'tp' });

    const dlBox = mk('div', { className: 'setting-card' });
    dlBox.append(mk('h4', { className: 'setting-head', textContent: 'Görsel Soruyu İndir' }));

    const btnPng = mk('button', {
      type: 'button',
      className: 'btn primary',
      style: 'width:100%; padding:14px; margin-bottom:10px; font-size:15px; font-weight:700;',
      textContent: '📥 Yüksek Kalite Görsel Olarak İndir (Net Çıktı)'
    });
    btnPng.onclick = async () => {
      await Exp.singleVisualPng(singleDoc, $('#singleCanvasWrap .single-visual-card'));
      toast('Görsel başarıyla indirildi!');
    };
    dlBox.append(btnPng);

    const btnPdf = mk('button', {
      type: 'button',
      className: 'btn',
      style: 'width:100%; padding:12px; margin-bottom:10px; font-size:14px;',
      textContent: '📄 Tek Sayfalık PDF Belgesi Olarak İndir'
    });
    btnPdf.onclick = async () => {
      await Exp.singleVisualPdf(singleDoc, $('#singleCanvasWrap .single-visual-card'));
      toast('PDF belgesi başarıyla indirildi!');
    };
    dlBox.append(btnPdf);
    d.append(dlBox);

    // Soru Öbeğine Ekleme
    const packBox = mk('div', { className: 'setting-card' });
    packBox.append(mk('h4', { className: 'setting-head', textContent: 'Soru Öbekleri (Koleksiyon & Albüm)' }));
    packBox.append(mk('p', { className: 'muted small', textContent: 'Bu görsel soruyu bir öbeğe (fasikül/albüm) ekleyerek daha sonra toplu PDF olarak indirebilirsiniz.' }));

    const curPack = mk('div', { style: 'margin:8px 0 12px; font-weight:600; color:var(--brown); font-size:13.5px;' });
    curPack.textContent = 'Mevcut Öbek: ' + (singleDoc.packName || 'Genel Soru Öbeği');
    packBox.append(curPack);

    const btnAddToPack = mk('button', {
      type: 'button',
      className: 'btn ghost',
      style: 'width:100%; padding:11px; margin-bottom:8px;',
      textContent: '📦 Bu Soruyu Başka Öbeğe Ekle / Değiştir'
    });
    btnAddToPack.onclick = async () => {
      const all = await DB.all();
      const packNames = new Set(['Genel Soru Öbeği', 'Edebiyat Soruları', 'Deneme Soruları']);
      all.forEach(d => { if (d.packName) packNames.add(d.packName); });
      const sel = $('#packSelect');
      sel.innerHTML = '';
      packNames.forEach(pn => {
        sel.append(mk('option', { value: pn, textContent: pn, selected: pn === (singleDoc.packName || '') }));
      });
      $('#newPackNameInput').value = '';
      $('#dlgAddToPack').showModal();
    };
    packBox.append(btnAddToPack);
    d.append(packBox);

    return d;
  }

  // Üst Başlık & Hızlı İndir Listeners
  $('#singleDocTitle').oninput = e => {
    if (singleDoc) {
      singleDoc.title = e.target.value;
      changedSingle();
    }
  };

  $('#btnSingleBack').onclick = async () => {
    await flushSingle();
    singleDoc = null;
    show('home');
    drawShelf();
  };

  const dlQuickBtn = $('#btnSingleDlQuick');
  if (dlQuickBtn) {
    dlQuickBtn.onclick = async () => {
      if (singleDoc) {
        await Exp.singleVisualPng(singleDoc, $('#singleCanvasWrap .single-visual-card'));
        toast('Görsel indirildi!');
      }
    };
  }

  const dlPreviewBtn = $('#btnSingleDlPreview');
  if (dlPreviewBtn) {
    dlPreviewBtn.onclick = async () => {
      if (singleDoc) {
        await Exp.singleVisualPng(singleDoc, $('#singleCanvasWrap .single-visual-card'));
        toast('Görsel indirildi!');
      }
    };
  }

  $('#packCancel').onclick = () => $('#dlgAddToPack').close();
  $('#packConfirm').onclick = async () => {
    const selVal = $('#packSelect').value;
    const inpVal = $('#newPackNameInput').value.trim();
    const targetPack = inpVal || selVal || 'Genel Soru Öbeği';
    singleDoc.packName = targetPack;
    await flushSingle();
    $('#dlgAddToPack').close();
    toast(`Soru "${targetPack}" öbeğine eklendi!`);
    buildSingleStep();
  };

      /* ---------- Gelişmiş Toplu Soru Ayrıştırıcı (Bulk Parser) ---------- */
  function parseBulk(text) {
    const questions = [];
    // Soruları "Soru 1:", "Soru 1.", "1.", "1:" veya çift satır boşluğuna göre ayır
    const rawBlocks = text.split(/\n\s*(?=(?:soru\s*\d+\s*[:.]|\d+[.)]\s+))/i);

    rawBlocks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;

      const q = newQuestion();
      q.opts = ['', '', '', '', ''];

      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let inOpts = false;
      let inExplain = false;
      const textLines = [];

      lines.forEach((line, lIdx) => {
        let cleanLine = line;

        // İlk satırdan "Soru 1:" veya "1." gibi numaraları temizle
        if (lIdx === 0) {
          const numM = cleanLine.match(/^(?:soru\s*\d+\s*[:.]|\d+[.)])\s*(.*)$/i);
          if (numM) cleanLine = numM[1].trim();
        }

        // 1. Soru Kökü Kontrolü ("Soru Kökü:" veya "Soru koku:")
        const stemM = cleanLine.match(/^(?:soru\s*kökü|soru\s*koku|kök)\s*[:\-]\s*(.*)$/i);
        if (stemM) {
          q.stem = stemM[1].trim();
          inOpts = false;
          inExplain = false;
          return;
        }

        // 2. Doğru Cevap Kontrolü ("Cevap: A", "Doğru Cevap: B")
        const ansM = cleanLine.match(/^(?:cevap|yanıt|yanit|doğru\s*cevap)\s*[:\-]\s*([A-Ea-e])/i);
        if (ansM) {
          q.answer = ansM[1].toUpperCase();
          inOpts = false;
          inExplain = false;
          return;
        }

        // 3. Açıklama / Çözüm Kontrolü ("Açıklama:", "Çözüm:")
        const solM = cleanLine.match(/^(?:açıklama|aciklama|çözüm|cozum|izahat)\s*[:\-]\s*(.*)$/i);
        if (solM) {
          inExplain = true;
          inOpts = false;
          q.explain = solM[1].trim();
          return;
        }

        // 4. Şık Kontrolü (A), B), C), D), E))
        const optM = cleanLine.match(/^([A-Ea-e])\s*[.)]\s*(.*)$/);
        if (optM) {
          inOpts = true;
          inExplain = false;
          const letter = optM[1].toUpperCase();
          const optIdx = letter.charCodeAt(0) - 65;
          if (optIdx >= 0 && optIdx < 5) {
            q.opts[optIdx] = optM[2].trim();
          }
          return;
        }

        // 5. Açıklamanın devam satırları
        if (inExplain) {
          q.explain += (q.explain ? ' ' : '') + cleanLine;
          return;
        }

        // 6. [[ Soru Kökü ]]
        const bracketM = cleanLine.match(/\[\[(.*?)\]\]/);
        if (bracketM) {
          q.stem = bracketM[1].trim();
          cleanLine = cleanLine.replace(/\[\[.*?\]\]/, '').trim();
          if (cleanLine) textLines.push(cleanLine);
          return;
        }

        // 7. Normal soru metni / öncül satırı
        if (!inOpts && !inExplain) {
          if (cleanLine) textLines.push(cleanLine);
        }
      });

      // Eğer açıkça "Soru Kökü:" belirtilmemişse:
      // Son satır soru işaretiyle bitiyorsa soru kökü yap
      if (!q.stem && textLines.length > 1) {
        const lastLine = textLines[textLines.length - 1];
        if (lastLine.endsWith('?') || /hangisidir|söylenemez|ulaşılamaz|çıkarılabilir|değinilmemiştir|yanlıştır|doğrudur|vurgulanmıştır/i.test(lastLine)) {
          q.stem = textLines.pop();
        }
      } else if (!q.stem && textLines.length === 1 && textLines[0].endsWith('?')) {
        q.stem = textLines.pop();
      }

      q.text = textLines.join('\n');
      q.hasE = !!q.opts[4];
      q.optsText = q.opts.map((o, i) => o ? `${['A','B','C','D','E'][i]}) ${o}` : '').filter(Boolean).join('\n');

      if (q.text.trim() || q.stem.trim() || q.opts.some(o => o.trim())) {
        questions.push(q);
      }
    });

    return questions;
  }

  let parsedBulkQuestions = [];

  
  // AI İstemi, Şablon Kopyalama ve Örnekle Doldur Olayları
  const AI_BULK_PROMPT = `Lütfen aşağıdaki soruları "Pıtrak Nüsha" soru bankası formatına dönüştür. Her soruyu tam olarak aşağıdaki şablona göre, aralarında bir boş satır bırakarak yaz.

ŞABLON:
Soru 1: [Soru metni veya öncül buraya gelecek]
Soru Kökü: [Kalın renkli yazılacak soru kökü cümlesi?]
A) [Şık 1]
B) [Şık 2]
C) [Şık 3]
D) [Şık 4]
E) [Şık 5]
Cevap: [A, B, C, D veya E]
Açıklama: [İstediğin uzunlukta açıklama yazabilirsin]

Soru 2: [İkinci sorunun öncül metni buraya gelecek]
Soru Kökü: [İkinci sorunun soru kökü?]
A) [Şık 1]
B) [Şık 2]
C) [Şık 3]
D) [Şık 4]
E) [Şık 5]
Cevap: [Doğru cevap harfi]
Açıklama: [Açıklama ve çözüm metni]

DÖNÜŞTÜRÜLECEK SORULAR:
[Buraya sorularınızı veya testinizi yapıştırın]`;

  const SAMPLE_TEMPLATE_TEXT = `Soru 1: Soru metni / öncül buraya gelecek.
Soru Kökü: Soru kökü buraya gelecek?
A) Şık 1
B) Şık 2
C) Şık 3
D) Şık 4
E) Şık 5
Cevap: A
Açıklama: İstediğin uzunlukta açıklama yazabilirsin.

Soru 2: İkinci sorunun öncül metni buraya yazılacak. Bir paragraf veya edebi metin olabilir.
Soru Kökü: Bu parçaya göre aşağıdakilerden hangisi söylenemez?
A) Seçenek A
B) Seçenek B
C) Seçenek C
D) Seçenek D
E) Seçenek E
Cevap: C
Açıklama: Açıklama ve çözüm metni buraya gelecektir.`;

  const btnCopyAi = $('#btnCopyAiPrompt');
  if (btnCopyAi) {
    btnCopyAi.onclick = async () => {
      try {
        await navigator.clipboard.writeText(AI_BULK_PROMPT);
        toast('✦ Yapay zeka istemi kopyalandı! ChatGPT veya Gemini\'ye yapıştırabilirsiniz.');
      } catch (err) {
        prompt('Yapay zeka istemini kopyalamak için Ctrl+C tuşlarına basın:', AI_BULK_PROMPT);
      }
    };
  }

  const btnCopyTpl = $('#btnCopyTemplate');
  if (btnCopyTpl) {
    btnCopyTpl.onclick = async () => {
      try {
        await navigator.clipboard.writeText(SAMPLE_TEMPLATE_TEXT);
        toast('📄 Örnek şablon kopyalandı!');
      } catch (err) {
        prompt('Şablonu kopyalamak için Ctrl+C tuşlarına basın:', SAMPLE_TEMPLATE_TEXT);
      }
    };
  }

  const btnFillTpl = $('#btnFillExampleTemplate');
  if (btnFillTpl) {
    btnFillTpl.onclick = () => {
      $('#bulkText').value = SAMPLE_TEMPLATE_TEXT;
      toast('✨ Örnek sorular metin kutusuna yüklendi! "Ayrıştır" butonuna basarak deneyebilirsiniz.');
    };
  }

  $('#bulkCancel').onclick = () => {
    $('#dlgBulk').close();
    parsedBulkQuestions = [];
    resetBulkModal();
  };

  const closeBtn = $('#bulkCloseBtn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      $('#dlgBulk').close();
      parsedBulkQuestions = [];
      resetBulkModal();
    };
  }

  function resetBulkModal() {
    $('#bulkStage1').hidden = false;
    $('#bulkStage2').hidden = true;
    $('#bulkItemsPreviewList').innerHTML = '';
  }

  // Aşama 1 -> Aşama 2: Ayrıştır & Soru Köklerini İncele
  $('#bulkNext').onclick = () => {
    const raw = $('#bulkText').value.trim();
    if (!raw) { toast('Lütfen soruları yapıştırın.'); return; }
    parsedBulkQuestions = parseBulk(raw);
    if (!parsedBulkQuestions.length) { toast('Soru bulunamadı. Biçimi kontrol edin.'); return; }

    $('#bulkStage1').hidden = true;
    $('#bulkStage2').hidden = false;
    $('#bulkParsedCount').textContent = `${parsedBulkQuestions.length} Soru Ayrıştırıldı`;
    renderBulkStage2();
  };

  // Aşama 2 -> Aşama 1: Geri Dön
  $('#bulkBackTo1').onclick = () => {
    $('#bulkStage1').hidden = false;
    $('#bulkStage2').hidden = true;
  };

  // Aşama 2: Soru Kökü Seçici Kartlarını Listele
  function renderBulkStage2() {
    const list = $('#bulkItemsPreviewList');
    list.innerHTML = '';

    parsedBulkQuestions.forEach((q, qIdx) => {
      const card = mk('div', { className: 'bulk-item-card' });
      
      const head = mk('div', { className: 'bulk-item-head' });
      head.append(mk('b', { textContent: `Soru ${qIdx + 1}` }));
      if (q.answer) head.append(mk('span', { className: 'q-state-badge set', textContent: `Cevap: [${q.answer}]` }));
      card.append(head);

      // Soru Metni Penceresi
      const tInp = mk('textarea', {
        rows: 3,
        className: 'bulk-text-edit',
        value: q.text || '',
        placeholder: 'Soru metni / paragraf…'
      });
      tInp.oninput = () => { q.text = tInp.value; };
      card.append(mk('div', { className: 'bulk-field-row' }, [
        mk('span', { className: 'bulk-field-label', textContent: '1. Soru Metni:' }),
        tInp
      ]));

      // Soru Kökü Penceresi (Koyu)
      const sInp = mk('input', {
        type: 'text',
        className: 'bulk-stem-edit',
        value: q.stem || '',
        placeholder: '🎯 Soru Kökü (Koyu Yazılır)'
      });
      sInp.oninput = () => { q.stem = sInp.value; };

      // Metinden Cümle Seçerek Kök Yapma Butonları
      const sentences = (q.text || '').split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 5);
      const pickerWrap = mk('div', { className: 'stem-sentence-picker' });
      if (sentences.length) {
        pickerWrap.append(mk('span', { className: 'muted small', textContent: 'Metinden kök seç:' }));
        sentences.forEach(sent => {
          const btnSent = mk('button', {
            type: 'button',
            className: 'btn ghost small sent-pill',
            textContent: sent.length > 40 ? sent.slice(0, 38) + '…' : sent
          });
          btnSent.onclick = () => {
            q.stem = sent;
            sInp.value = sent;
            // Cümleyi metinden çıkar
            q.text = q.text.replace(sent, '').trim();
            tInp.value = q.text;
            toast('Soru kökü seçildi!');
          };
          pickerWrap.append(btnSent);
        });
      }

      card.append(mk('div', { className: 'bulk-field-row' }, [
        mk('span', { className: 'bulk-field-label', textContent: '2. 🎯 Soru Kökü (Koyu):' }),
        sInp,
        pickerWrap
      ]));

      // Şıklar Özeti
      const optsRow = mk('div', { className: 'bulk-opts-summary' });
      ['A', 'B', 'C', 'D', 'E'].forEach((L, i) => {
        if (q.opts[i] && q.opts[i].trim()) {
          optsRow.append(mk('span', { className: 'bulk-opt-pill', textContent: `${L}) ${q.opts[i].slice(0, 22)}` }));
        }
      });
      card.append(mk('div', { className: 'bulk-field-row' }, [
        mk('span', { className: 'bulk-field-label', textContent: '3. Şıklar:' }),
        optsRow
      ]));

      list.append(card);
    });
  }

  // Aşama 2 -> Nüshaya Ekle ve Bitir
  $('#bulkConfirm').onclick = () => {
    if (!parsedBulkQuestions.length) return;
    doc.items.push(...parsedBulkQuestions);
    $('#dlgBulk').close();
    changed(true);
    buildStep();
    toast(`${parsedBulkQuestions.length} soru soru bankasına eklendi!`);
    parsedBulkQuestions = [];
    resetBulkModal();
  };


  /* ============================================================ */
  /* ANA EKRAN, RAF VE NÜSHA YÖNETİMİ                             */
  /* ============================================================ */

  async function drawShelf() {
    const all = (await DB.all()).sort((a, b) => (b.updated || 0) - (a.updated || 0));
    
    // 1. Nüshalarım Listesi (Soru Bankası & Ders Notu)
    const nushaDocs = all.filter(d => d.kind !== 'Tek Soru');
    const nushaBox = $('#shelfList');
    if (nushaBox) {
      nushaBox.innerHTML = '';
      if (!nushaDocs.length) {
        nushaBox.append(mk('div', { className: 'empty', textContent: 'Rafın henüz bomboş. Yukarıdan yeni bir soru bankası veya ders notu başlatabilirsin.' }));
      } else {
        nushaDocs.forEach(d => {
          const thumb = mk('img', { src: d.cover && d.cover.mode === 'image' && d.cover.image ? d.cover.image : 'assets/pitrak.jpg', alt: '' });
          thumb.onerror = () => { if (!thumb.dataset.fb) { thumb.dataset.fb = '1'; thumb.src = 'pitrak.jpg'; } };
          const countLabel = d.kind === 'Ders Notu' ? qCount(d) + ' Not' : qCount(d) + ' Soru';
          
          const c = mk('div', { className: 'shelf-item' }, [
            thumb,
            mk('div', { className: 'meta' }, [
              mk('b', { textContent: d.title || 'Adsız Nüsha' }),
              mk('span', { className: 'muted small', textContent: (d.kind || 'Özel') + ' · ' + countLabel + ' · ' + fmtDate(d.updated || Date.now()) })
            ]),
            mk('div', { className: 'actions' }, [
              mk('button', { className: 'btn small primary', textContent: 'Aç', onclick: () => openDoc(d) }),
              mk('button', { className: 'icon-btn', textContent: '✏️', title: 'Adı Değiştir', onclick: () => openRenameModal(d) }),
              mk('button', { className: 'icon-btn danger', textContent: '🗑', title: 'Sil', onclick: async () => { if (confirm('Bu nüsha raftan silinsin mi?')) { await DB.del(d.id); drawShelf(); } } })
            ])
          ]);
          nushaBox.appendChild(c);
        });
      }
    }

    // 2. Soru Öbeklerim Listesi (Tekli Görsel Koleksiyonlar)
    const singleDocs = all.filter(d => d.kind === 'Tek Soru');
    const packBox = $('#packList');
    if (packBox) {
      packBox.innerHTML = '';

      const packsMap = new Map();
      singleDocs.forEach(sd => {
        const pName = (sd.packName && sd.packName.trim()) || 'Genel Soru Öbeği';
        if (!packsMap.has(pName)) packsMap.set(pName, []);
        packsMap.get(pName).push(sd);
      });

      if (!packsMap.size) {
        packBox.append(mk('div', { className: 'empty', textContent: 'Henüz kayıtlı soru öbeğiniz yok. "Tek Seferlik Görsel Çıktı" ile sorular oluşturup öbeklere ekleyebilirsiniz.' }));
      } else {
        packsMap.forEach((questions, pName) => {
          const pCard = mk('div', { className: 'pack-card' }, [
            mk('div', { className: 'pack-info' }, [
              mk('h3', { className: 'pack-title', textContent: pName }),
              mk('span', { className: 'pack-meta', textContent: `${questions.length} Görsel Soru · Son güncelleme: ${fmtDate(questions[0].updated || Date.now())}` })
            ]),
            mk('div', { className: 'pack-actions' }, [
              mk('button', { className: 'btn small', textContent: '👁 Soruları Gör', onclick: () => openPackViewer(pName, questions) }),
              mk('button', { className: 'btn small primary', textContent: '📚 Tümünü PDF İndir', onclick: () => exportPackAction(pName, questions) }),
              mk('button', { className: 'icon-btn danger', textContent: '🗑', title: 'Öbeği Sil', onclick: async () => {
                if (confirm(`"${pName}" öbeğindeki tüm (${questions.length}) soru silinsin mi?`)) {
                  for (const q of questions) await DB.del(q.id);
                  drawShelf();
                  toast('Öbek silindi.');
                }
              }})
            ])
          ]);
          packBox.appendChild(pCard);
        });
      }
    }
  }

  /* Raf Yeniden Adlandırma */
  function openRenameModal(d) {
    renamingDocId = d.id;
    const inp = $('#renameInput');
    if (inp) inp.value = d.title || '';
    const dlg = $('#dlgRename');
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }
  const btnRenameCancel = $('#renameCancel');
  if (btnRenameCancel) btnRenameCancel.onclick = () => $('#dlgRename').close();
  const btnRenameConfirm = $('#renameConfirm');
  if (btnRenameConfirm) {
    btnRenameConfirm.onclick = async () => {
      const inp = $('#renameInput');
      const val = inp ? inp.value.trim() : '';
      if (!val || !renamingDocId) return;
      const docItem = await DB.get(renamingDocId);
      if (docItem) {
        docItem.title = val;
        docItem.updated = Date.now();
        await DB.put(docItem);
        drawShelf();
        toast('Nüsha adı güncellendi.');
      }
      $('#dlgRename').close();
    };
  }

  /* Soru Öbeği İnceleme Penceresi */
  let activeViewerQuestions = [];
  let activeViewerPackName = '';

  function openPackViewer(pName, questions) {
    activeViewerPackName = pName;
    activeViewerQuestions = questions;
    const titleEl = $('#packViewerTitle');
    if (titleEl) titleEl.textContent = pName + ` (${questions.length} Soru)`;
    const progEl = $('#packViewerProgress');
    if (progEl) progEl.textContent = '';

    const grid = $('#packViewerGrid');
    if (grid) {
      grid.innerHTML = '';
      questions.forEach(q => {
        const item = mk('div', { className: 'pack-thumb-item' });
        const prevBox = mk('div', { className: 'pack-thumb-preview-box', textContent: q.aspectRatio || '9:16' });
        const title = mk('span', { className: 'pack-thumb-title', textContent: q.title || 'Görsel Soru' });
        const qSnippet = mk('span', { className: 'muted small', style: 'font-size:.7rem', textContent: (q.questionStem || q.questionText || '').slice(0, 25) + '…' });
        item.append(prevBox, title, qSnippet);
        item.onclick = () => {
          $('#dlgPackViewer').close();
          openSingleStudio(q);
        };
        grid.appendChild(item);
      });
    }

    const dlg = $('#dlgPackViewer');
    if (dlg && typeof dlg.showModal === 'function') dlg.showModal();
  }

  const btnPackClose = $('#packViewerClose');
  if (btnPackClose) btnPackClose.onclick = () => $('#dlgPackViewer').close();
  const btnPackExpPdf = $('#btnPackExportPdf');
  if (btnPackExpPdf) btnPackExpPdf.onclick = () => exportPackAction(activeViewerPackName, activeViewerQuestions);

  async function exportPackAction(pName, questions) {
    const prog = $('#packViewerProgress');
    if (prog) prog.textContent = 'Öbek albümü PDF formatında hazırlanıyor…';
    try {
      await Exp.packPdf(pName, questions, msg => { if (prog) prog.textContent = msg; });
      if (prog) prog.textContent = 'PDF başarıyla indirildi!';
      toast('Öbek albümü indirildi!');
    } catch (err) {
      console.error(err);
      if (prog) prog.textContent = 'Aksilik: ' + (err.message || err);
    }
  }

  /* Raf Sekmeleri (Nüshalarım / Soru Öbeklerim) */
  document.querySelectorAll('#shelfTabs button').forEach(b => {
    b.onclick = () => {
      activeShelfTab = b.dataset.tab;
      document.querySelectorAll('#shelfTabs button').forEach(x => x.classList.toggle('active', x === b));
      const sList = $('#shelfList'); if (sList) sList.hidden = activeShelfTab !== 'nushalar';
      const pList = $('#packList'); if (pList) pList.hidden = activeShelfTab !== 'obekler';
    };
  });

  function show(view) {
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    const targetView = $('#' + view);
    if (targetView) targetView.hidden = false;
  }

  function openDoc(d) {
    doc = d;
    const def = newDoc(d.kind);
    ['cover', 'preface', 'layout', 'type', 'watermark'].forEach(k => doc[k] = Object.assign({}, def[k], doc[k]));
    openId = null;
    activeStep = 1;
    guidedNushaStep = 1;
    guidedNushaMaxUnlocked = 1;
    zoom = 0;
    const titleEl = $('#docTitle');
    if (titleEl) titleEl.value = doc.title;
    const saveStateEl = $('#saveState');
    if (saveStateEl) saveStateEl.textContent = 'Rafa kaldırıldı ✓';
    updateModeButtonsUI();
    show('editor');
    buildStep();
    renderPreview();
  }

  async function startNew(kind) {
    if (kind === 'Tek Soru') {
      openSingleStudio(newSingleDoc());
      return;
    }
    const d = newDoc(kind);
    d.cover.subtitle = kind || '';
    if (kind === 'Ders Notu') {
      const n = newNote('info');
      n.title = 'İlk Ders Özeti';
      d.items.push(n);
    } else {
      const q = newQuestion();
      d.items.push(q);
    }
    await DB.put(d);
    openDoc(d);
    openId = d.items[0].id;
    buildStep();
  }

  /* ---------- Ana Ekran & Nüsha Olay Dinleyicileri ---------- */
  const btnNewEl = $('#btnNew');
  if (btnNewEl) btnNewEl.onclick = () => startNew('Soru Bankası');

  document.querySelectorAll('.kinds .kind').forEach(b => {
    b.onclick = () => startNew(b.dataset.kind);
  });

  const btnBackEl = $('#btnBack');
  if (btnBackEl) {
    btnBackEl.onclick = async () => {
      await flush();
      doc = null;
      show('home');
      drawShelf();
    };
  }

  const docTitleEl = $('#docTitle');
  if (docTitleEl) {
    docTitleEl.oninput = e => {
      if (doc) {
        doc.title = e.target.value || 'Adsız Nüsha';
        changed();
      }
    };
  }

  document.querySelectorAll('.step-btn').forEach(b => {
    b.onclick = () => goToStep(parseInt(b.dataset.step));
  });

  const quickDl = $('#btnQuickDl');
  if (quickDl) quickDl.onclick = () => goToStep(5);

  const zIn = $('#zoomIn');
  if (zIn) zIn.onclick = () => { zoom = Math.min(2, (zoom || fitScale()) + 0.1); applyZoom(); };
  const zOut = $('#zoomOut');
  if (zOut) zOut.onclick = () => { zoom = Math.max(0.2, (zoom || fitScale()) - 0.1); applyZoom(); };
  const zFit = $('#zoomFit');
  if (zFit) zFit.onclick = () => { zoom = 0; applyZoom(); };

  window.addEventListener('resize', () => { if (doc) applyZoom(); });
  window.addEventListener('pagehide', () => { if (doc) flush(); });


  /* Eski Tek Soru Çıktı Penceresi */
  async function runSingle(kind) {
    $('#dlgSingle').close();
    if (!singleTarget) return;
    try {
      await Exp.single(doc, singleTarget.q, singleTarget.no, $('#optSingleAns') ? $('#optSingleAns').checked : true, kind);
    } catch (e) {
      toast('Çıktı alınamadı.');
    }
  }
  $('#sPng').onclick = () => runSingle('png');
  $('#sPdf').onclick = () => runSingle('pdf');
  $('#sClose').onclick = () => $('#dlgSingle').close();
  $('#sStudio').onclick = () => {
    $('#dlgSingle').close();
    if (!singleTarget) return;
    const sDoc = newSingleDoc();
    sDoc.title = (doc.title || 'Nüsha') + ' — Soru ' + singleTarget.no;
    sDoc.questionText = singleTarget.q.text || '';
    sDoc.questionStem = singleTarget.q.stem || '';
    sDoc.correctAnswer = singleTarget.q.answer || '';
    sDoc.solutionText = singleTarget.q.explain || '';
    sDoc.image = singleTarget.q.image || null;
    openSingleStudio(sDoc);
  };

  // Yedek İçe Aktar
  $('#btnImport').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d.id || !d.title) throw new Error('Geçersiz dosya');
      d.id = uid(); d.updated = Date.now();
      await DB.put(d); await drawShelf(); toast('Yedek başarıyla açıldı.');
    } catch (err) { toast('Dosya okunamadı: ' + err.message); }
    e.target.value = '';
  };

  /* PWA Kurulum Yönetimi */
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    $('#btnInstall').hidden = false;
    const isMobileOrTablet = /Android|iPhone|iPad|iPod|Tablet/i.test(navigator.userAgent) || window.innerWidth <= 860;
    const alreadyPrompted = localStorage.getItem('pitrak_pwa_prompted');
    if (isMobileOrTablet && !alreadyPrompted) {
      setTimeout(() => {
        const dlg = $('#dlgPwaInstall');
        if (dlg && typeof dlg.showModal === 'function') {
          dlg.showModal();
          localStorage.setItem('pitrak_pwa_prompted', '1');
        }
      }, 1500);
    }
  });

  const pwaConfirm = $('#pwaInstallConfirm');
  if (pwaConfirm) {
    pwaConfirm.onclick = async () => {
      $('#dlgPwaInstall').close();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') toast('Pıtrak Nüsha ana ekranınıza eklendi!');
        deferredPrompt = null;
      }
    };
  }
  const pwaDismiss = $('#pwaInstallDismiss');
  if (pwaDismiss) pwaDismiss.onclick = () => $('#dlgPwaInstall').close();

  $('#btnInstall').onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') $('#btnInstall').hidden = true;
      deferredPrompt = null;
    }
  };

  const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone === true;
  if (isIos && !isStandalone && !localStorage.getItem('pitrak_ios_banner_closed')) {
    const banner = $('#iosPwaBanner');
    if (banner) {
      banner.hidden = false;
      $('#iosPwaClose').onclick = () => {
        banner.hidden = true;
        localStorage.setItem('pitrak_ios_banner_closed', '1');
      };
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  // İlk yükleme
  drawShelf();
  show('home');

  /* ============================================================ */
  /* AÇIK KAYNAK GÖRSEL ARAMA MOTORU (WIKIMEDIA COMMONS)          */
  /* ============================================================ */
  let activeImageSearchCallback = null;

  function openImageSearch(title, onSelectCallback) {
    activeImageSearchCallback = onSelectCallback;
    const dlg = $('#dlgImageSearch');
    if (!dlg) {
      alert('Görsel arama penceresi yüklenemedi. Lütfen sayfayı yenileyin.');
      return;
    }
    $('#imageSearchModalTitle').textContent = title || 'Açık Kaynak Görsel Ara & Ekle';
    $('#imageSearchInput').value = '';
    const grid = $('#imageSearchResultsGrid');
    if (grid) grid.innerHTML = '';
    const status = $('#imageSearchStatus');
    if (status) {
      status.hidden = false;
      status.innerHTML = '🔍 Aramak istediğiniz konuyu yukarıya yazıp <b>Ara</b> butonuna basın veya aşağıdaki hazır konulardan birine dokunun.';
    }
    dlg.showModal();
    setTimeout(() => {
      const inp = $('#imageSearchInput');
      if (inp) inp.focus();
    }, 60);
  }
  window.openImageSearch = openImageSearch;

  const btnImgClose = $('#imageSearchCloseBtn');
  if (btnImgClose) {
    btnImgClose.onclick = () => {
      $('#dlgImageSearch').close();
      activeImageSearchCallback = null;
    };
  }

  const btnImgExec = $('#btnExecuteImageSearch');
  if (btnImgExec) {
    btnImgExec.onclick = () => {
      const q = $('#imageSearchInput').value.trim();
      if (q) {
        executeImageSearch(q);
      } else {
        toast('Lütfen aramak istediğiniz bir konu veya kelime girin.');
      }
    };
  }

  const inpImgSearch = $('#imageSearchInput');
  if (inpImgSearch) {
    inpImgSearch.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = inpImgSearch.value.trim();
        if (q) {
          executeImageSearch(q);
        } else {
          toast('Lütfen aramak istediğiniz bir konu veya kelime girin.');
        }
      }
    };
  }

  // Hazır konu etiketleri
  document.querySelectorAll('.search-topic-tag').forEach(btn => {
    btn.onclick = () => {
      const q = btn.dataset.q;
      if (inpImgSearch) inpImgSearch.value = btn.textContent.trim().replace(/^[^a-zA-Z0-9çÇğĞıİöÖşŞüÜ]+/, '');
      executeImageSearch(q);
    };
  });

  async function executeImageSearch(query) {
    const grid = $('#imageSearchResultsGrid');
    const status = $('#imageSearchStatus');
    if (!grid) return;
    if (status) {
      status.hidden = false;
      status.innerHTML = '<span class="loading-spinner">✦</span> Açık kaynak arşivlerde aranıyor: <b>' + query + '</b>…';
    }
    grid.innerHTML = '';

    try {
      const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=' + encodeURIComponent(query) + '&gsrlimit=24&prop=imageinfo&iiprop=url|size|mime&format=json&origin=*';
      const resp = await fetch(url);
      const data = await resp.json();

      const pages = data.query && data.query.pages ? Object.values(data.query.pages) : [];
      if (!pages.length) {
        if (status) status.innerHTML = '⚠️ "<b>' + query + '</b>" için görsel bulunamadı. Lütfen farklı bir anahtar kelime deneyin (Örn: Seljuk, nebula, Ottoman, cell, math, landscape).';
        grid.innerHTML = '';
        return;
      }

      if (status) status.innerHTML = `✓ <b>${pages.length}</b> açık kaynak görsel bulundu (Eklemek istediğiniz görsele tıklayın):`;

      pages.forEach(pg => {
        const info = pg.imageinfo && pg.imageinfo[0];
        if (!info || !info.url) return;
        const mime = info.mime || '';
        if (mime.includes('svg') || mime.includes('pdf') || mime.includes('tiff') || mime.includes('webm')) return;

        let thumbUrl = info.url;
        if (thumbUrl.includes('/commons/')) {
          const parts = thumbUrl.split('/commons/');
          thumbUrl = parts[0] + '/commons/thumb/' + parts[1] + '/500px-' + parts[1].split('/').pop();
        }

        const cleanTitle = (pg.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, '').slice(0, 38);
        grid.appendChild(createImageSearchCard(cleanTitle, thumbUrl, info.url));
      });
    } catch (err) {
      if (status) status.innerHTML = '⚠️ İnternet araması gerçekleştirilemedi. Lütfen bağlantınızı kontrol edin.';
      grid.innerHTML = '';
    }
  }

  function createImageSearchCard(title, thumbUrl, fullUrl) {
    const item = mk('div', { className: 'image-search-item' });
    const img = mk('img', {
      loading: 'lazy',
      src: thumbUrl,
      alt: title
    });
    img.onerror = () => { img.src = fullUrl; };

    const overlay = mk('div', { className: 'search-item-overlay' });
    const pill = mk('span', { className: 'select-pill', textContent: '+ Seç ve Ekle' });
    overlay.appendChild(pill);

    const titleSpan = mk('span', { className: 'search-item-title', textContent: title });

    item.append(img, overlay, titleSpan);

    item.onclick = async () => {
      overlay.innerHTML = '<span class="select-pill loading">İndiriliyor…</span>';
      try {
        const dataUrl = await fetchAndConvertToDataUrl(fullUrl);
        if (activeImageSearchCallback) activeImageSearchCallback(dataUrl);
        $('#dlgImageSearch').close();
        toast('Görsel başarıyla eklendi! ✨');
      } catch (e) {
        if (activeImageSearchCallback) activeImageSearchCallback(fullUrl);
        $('#dlgImageSearch').close();
        toast('Görsel eklendi! ✨');
      }
    };

    return item;
  }

  function fetchAndConvertToDataUrl(imgUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 1400;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) { h = Math.round(h * (maxDim / w)); w = maxDim; }
            else { w = Math.round(w * (maxDim / h)); h = maxDim; }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.88));
        } catch (e) {
          resolve(imgUrl);
        }
      };
      img.onerror = () => resolve(imgUrl);
      img.src = imgUrl;
    });
  }

  // Mobil İndirme Penceresi dışına tıklandığında kapatma
  const mobileDlModal = $('#dlgMobileDl');
  if (mobileDlModal) {
    mobileDlModal.addEventListener('click', e => {
      if (e.target === mobileDlModal) mobileDlModal.close();
    });
  }

  })();