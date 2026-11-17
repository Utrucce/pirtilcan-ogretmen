/* Pıtrak Nüsha — Dışa Aktarım (PDF, Word, Tek Soru Görsel, Soru Öbeği Albümü) */
window.Exp = (() => {
  const root = () => document.getElementById('exportRoot');
  const safe = s => (s || 'nusha').replace(/[\\/:*?"<>|]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'nusha';

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function getMimeType(name, blob) {
    if (blob && blob.type) return blob.type;
    const ext = (name.split('.').pop() || '').toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'pitrak': return 'application/json';
      default: return 'application/octet-stream';
    }
  }

  function fallbackDownload(blob, name) {
    if (window.AndroidBridge && typeof window.AndroidBridge.shareFileBase64 === 'function') {
      try {
        const reader = new FileReader();
        reader.onloadend = function() {
          const mime = getMimeType(name, blob);
          window.AndroidBridge.shareFileBase64(reader.result, name, mime);
        };
        reader.readAsDataURL(blob);
        return;
      } catch (e) {
        console.warn('AndroidBridge error:', e);
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 15000);
  }

  let activeBlobUrl = null;

  function showMobileDlModal(blob, name) {
    const dlg = document.getElementById('dlgMobileDl');
    if (!dlg || typeof dlg.showModal !== 'function') {
      fallbackDownload(blob, name);
      return;
    }

    if (activeBlobUrl) {
      try { URL.revokeObjectURL(activeBlobUrl); } catch (e) {}
      activeBlobUrl = null;
    }

    const mime = getMimeType(name, blob);
    const ext = (name.split('.').pop() || '').toLowerCase();
    const isImage = mime.startsWith('image/') || ext === 'png' || ext === 'jpg' || ext === 'jpeg';
    const isPdf = mime === 'application/pdf' || ext === 'pdf';

    activeBlobUrl = URL.createObjectURL(blob);

    // Başlık ve Rozet İkonu
    const badge = document.getElementById('mobileDlIconBadge');
    if (badge) {
      if (isPdf) badge.textContent = '📄';
      else if (isImage) badge.textContent = '🖼️';
      else if (ext === 'docx') badge.textContent = '📘';
      else if (ext === 'pitrak') badge.textContent = '📦';
      else badge.textContent = '📁';
    }

    const nameEl = document.getElementById('mobileDlFileName');
    if (nameEl) nameEl.textContent = name;

    const sizeEl = document.getElementById('mobileDlFileSize');
    if (sizeEl) sizeEl.textContent = formatBytes(blob.size || 0) + (isImage ? ' · Net Görsel' : isPdf ? ' · PDF Belgesi' : '');

    // Görsel Önizleme
    const imgWrap = document.getElementById('mobileDlImgWrap');
    const imgEl = document.getElementById('mobileDlImg');
    if (isImage && imgWrap && imgEl) {
      imgEl.src = activeBlobUrl;
      imgWrap.hidden = false;
    } else if (imgWrap) {
      imgWrap.hidden = true;
      if (imgEl) imgEl.src = '';
    }

    // PDF Yeni Sekmede Aç Butonu
    const btnViewPdf = document.getElementById('mobileDlViewPdfBtn');
    if (btnViewPdf) {
      if (isPdf) {
        btnViewPdf.hidden = false;
        btnViewPdf.onclick = () => {
          window.open(activeBlobUrl, '_blank');
        };
      } else {
        btnViewPdf.hidden = true;
      }
    }

    // Telefona Kaydet / Paylaş Butonu
    const btnShare = document.getElementById('mobileDlShareBtn');
    const shareText = document.getElementById('mobileDlShareBtnText');
    if (btnShare) {
      let fileObj = null;
      try {
        fileObj = new File([blob], name, { type: mime });
      } catch (e) {
        fileObj = null;
      }

      const canShare = !!(navigator.canShare && fileObj && navigator.canShare({ files: [fileObj] }));

      if (canShare || window.AndroidBridge) {
        if (shareText) shareText.textContent = isImage ? '📲 Fotoğraflara Kaydet / Paylaş' : '📲 Telefona Kaydet / Paylaş';
      } else {
        if (shareText) shareText.textContent = '⬇️ Dosyayı İndir';
      }

      btnShare.onclick = async () => {
        if (canShare) {
          try {
            await navigator.share({
              files: [fileObj],
              title: name,
              text: name
            });
            if (window.toast) toast('Başarıyla kaydedildi / paylaşıldı!');
            return;
          } catch (err) {
            if (err.name === 'AbortError') return; // Kullanıcı pencereyi kapattı
            console.warn('Paylaşım penceresi hatası, doğrudan indirmeye geçiliyor:', err);
          }
        }
        fallbackDownload(blob, name);
        if (window.toast) toast('İndirmeniz başlatıldı!');
      };
    }

    // Doğrudan İndir Butonu
    const btnDirect = document.getElementById('mobileDlDirectBtn');
    if (btnDirect) {
      btnDirect.onclick = () => {
        fallbackDownload(blob, name);
        if (window.toast) toast('İndirme başlatıldı!');
      };
    }

    // Kapat Butonu
    const btnClose = document.getElementById('mobileDlCloseBtn');
    if (btnClose) {
      btnClose.onclick = () => {
        dlg.close();
      };
    }

    dlg.showModal();
  }

  function save(blob, name) {
    const isMobileDevice = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || 
                           (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024) ||
                           (typeof window.orientation !== 'undefined');

    if (isMobileDevice) {
      showMobileDlModal(blob, name);
    } else {
      fallbackDownload(blob, name);
      if (window.toast) toast('İndirmeniz başladı: ' + name);
    }
  }

  async function ready(doc) {
    try {
      const fName = fontCss(doc).split(',')[0].replace(/['"]/g, '');
      const sz = (doc.type && doc.type.size) || doc.fontSize || 12;
      await document.fonts.load(`${sz}pt "${fName}"`);
      await document.fonts.load(`bold ${sz}pt "${fName}"`);
      await document.fonts.ready;
    } catch (e) {}
  }

  const shot = (node, scale = 2) => html2canvas(node, { scale, backgroundColor: null, useCORS: true, logging: false });

  /* ---------- Çok Sayfalı Nüsha PDF ---------- */
  async function pdf(doc, progress) {
    await ready(doc);
    const r = root(); const pages = buildDoc(doc, r);
    const [w, h] = PAGES[doc.layout.page] || PAGES.A4;
    const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation: 'portrait', compress: true });
    P.setProperties({ title: doc.title, creator: 'Pıtrak Nüsha' });

    for (let i = 0; i < pages.length; i++) {
      if (progress) progress(`Sayfa ${i + 1} / ${pages.length} resmediliyor…`);
      const c = await shot(pages[i], 2);
      if (i > 0) P.addPage([w, h], 'portrait');
      P.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    r.innerHTML = '';
    save(P.output('blob'), safe(doc.title) + '.pdf');
  }

  /* ---------- Word (.docx) Çıktısı ---------- */
  async function docx(doc, progress) {
    if (progress) progress('Word belgesi hazırlanıyor…');
    const D = window.docx;
    const L = doc.layout, T = doc.type;
    const tw = v => Math.round(v * 56.7);
    const [pageW, pageH] = PAGES[L.page] || PAGES.A4;
    const margin = tw(L.margin);
    const colW = (tw(pageW) - margin * 2 - (L.columns === 2 ? 400 : 0)) / (L.columns || 1);
    const wordFont = (FONTS.find(f => f.id === T.font) || FONTS[0]).name.split(' ')[0];
    const hex = c => (c || '#000000').replace('#', '');
    const size = Math.round(T.size * 2);
    const line = Math.round(T.leading * 240);

    const run = (text, o = {}) => {
      const parts = String(text || '').split('\n');
      const out = [];
      parts.forEach((p, idx) => {
        if (idx > 0) out.push(new D.Break());
        out.push(new D.TextRun(Object.assign({ text: p, font: wordFont, size, color: hex(T.color) }, o)));
      });
      return out;
    };

    const sections = [];

    // Kapak
    if (doc.cover && doc.cover.enabled) {
      const c = doc.cover;
      const cKids = [
        new D.Paragraph({ spacing: { before: 2400 }, alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: (c.subtitle || doc.kind || '').toUpperCase(), font: wordFont, size: 24, letterSpacing: 120, color: '888888' })] }),
        new D.Paragraph({ spacing: { before: 400, after: 600 }, alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: c.title || doc.title, bold: true, font: wordFont, size: 48, color: hex(c.mode === 'color' ? c.fg : T.accent) })] }),
        new D.Paragraph({ spacing: { before: 1800 }, alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: c.author || '', font: wordFont, size: 22, color: '666666' })] }),
      ];
      sections.push({
        properties: { page: { size: { width: tw(pageW), height: tw(pageH) }, margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        children: cKids
      });
    }

    // İçerik
    const ch = [];
    let no = 0;
    doc.items.forEach(it => {
      if (it.t === 'h') {
        ch.push(new D.Paragraph({ heading: D.HeadingLevel.HEADING_2, keepNext: true, spacing: { before: 280, after: 120 }, border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: hex(T.accent), space: 2 } }, children: [new D.TextRun({ text: it.text || 'Bölüm', bold: true, font: wordFont, size: size + 2, color: hex(T.accent) })] }));
        return;
      }
      if (it.t === 'note') {
        const titleText = it.title ? it.title : 'Not';
        ch.push(new D.Paragraph({ keepNext: true, spacing: { before: 200, after: 60 }, children: [new D.TextRun({ text: '📌 ' + titleText, bold: true, font: wordFont, size: size + 1, color: hex(T.accent) })] }));
        (it.text || '').split('\n').filter(s => s.trim()).forEach(para => {
          ch.push(new D.Paragraph({ spacing: { after: 60, line }, indent: { left: 240 }, children: run(para.trim()) }));
        });
        return;
      }
      if (isBlank(it)) return;
      no++;
      const num = L.numStyle === 'Soru 1.' ? `Soru ${no}.` : L.numStyle === '1)' ? `${no})` : `${no}.`;
      ch.push(new D.Paragraph({ keepNext: true, keepLines: true, spacing: { line, after: 40 }, children: [new D.TextRun({ text: num + ' ', bold: true, font: wordFont, size, color: hex(T.accent) }), ...run(it.text)] }));

      if (it.stem && it.stem.trim()) {
        const stemHex = (T.stemColor || T.accent || '#6b4426').replace('#', '');
        ch.push(new D.Paragraph({
          keepNext: true,
          keepLines: true,
          spacing: { line, before: 60, after: 40 },
          indent: { left: 160 },
          children: [new D.TextRun({ text: it.stem.trim(), bold: true, font: wordFont, size: size + 0.5, color: hex(stemHex) })]
        }));
      }

      if (it.opts && it.opts.some(o => (o || '').trim())) {
        for (let i = 0; i < (L.optCount || 5); i++) {
          if (!it.opts[i] && i >= 2) continue;
          const lab = LETTERS[i] + ') ';
          ch.push(new D.Paragraph({ keepLines: true, indent: { left: 240 }, spacing: { line, after: 20 }, children: [new D.TextRun({ text: lab, bold: true, font: wordFont, size, color: hex(T.color) }), ...run(it.opts[i] || '')] }));
        }
      }
    });

    const qs = []; let n2 = 0; doc.items.forEach(i => { if (i.t === 'q' && !isBlank(i)) qs.push({ q: i, no: ++n2 }); });
    const tail = [];
    if (qs.length && (L.showAnswerKey !== false)) {
      tail.push(new D.Paragraph({
        pageBreakBefore: !!L.answerKeyNewPage,
        keepNext: true,
        spacing: { before: 240, after: 120 },
        border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: hex(T.accent), space: 3 } },
        children: [new D.TextRun({ text: 'CEVAP ANAHTARI', bold: true, size: size + 4, font: wordFont, color: hex(T.accent) })]
      }));

      const groupSize = L.answerKeyCols || 5;
      const totalRows = Math.ceil(qs.length / groupSize);
      const rows = [];

      const headCells = [];
      for (let g = 0; g < groupSize; g++) {
        headCells.push(new D.TableCell({
          shading: { fill: 'F3ECE2' },
          children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'Soru', bold: true, size: 18, font: wordFont, color: hex(T.accent) })] })]
        }));
        headCells.push(new D.TableCell({
          shading: { fill: 'F3ECE2' },
          children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: 'Cevap', bold: true, size: 18, font: wordFont, color: hex(T.accent) })] })]
        }));
      }
      rows.push(new D.TableRow({ children: headCells }));

      for (let r = 0; r < totalRows; r++) {
        const dataCells = [];
        for (let c = 0; c < groupSize; c++) {
          const idx = r * groupSize + c;
          if (idx < qs.length) {
            const item = qs[idx];
            dataCells.push(new D.TableCell({
              shading: { fill: 'FDFAF6' },
              children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: String(item.no), bold: true, size: 19, font: wordFont })] })]
            }));
            dataCells.push(new D.TableCell({
              children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: (item.q.answer || '').trim() || '—', bold: true, size: 20, font: wordFont, color: hex(T.accent) })] })]
            }));
          } else {
            dataCells.push(new D.TableCell({ children: [new D.Paragraph({ children: [] })] }));
            dataCells.push(new D.TableCell({ children: [new D.Paragraph({ children: [] })] }));
          }
        }
        rows.push(new D.TableRow({ children: dataCells }));
      }
      tail.push(new D.Table({
        width: { size: 100, type: D.WidthType.PERCENTAGE },
        rows
      }));
    }

    const qsWithSol = qs.filter(x => (x.q.explain || '').trim().length > 0);
    if (qsWithSol.length && (L.showSolutions !== false)) {
      tail.push(new D.Paragraph({
        pageBreakBefore: !!L.solutionsNewPage,
        keepNext: true,
        spacing: { before: 300, after: 140 },
        border: { bottom: { style: D.BorderStyle.SINGLE, size: 8, color: hex(T.accent), space: 3 } },
        children: [new D.TextRun({ text: 'AYRINTILI ÇÖZÜMLER', bold: true, size: size + 4, font: wordFont, color: hex(T.accent) })]
      }));

      qsWithSol.forEach(x => {
        const ansTag = (x.q.answer || '').trim() ? ' (Doğru Cevap: ' + x.q.answer.trim() + ')' : '';
        tail.push(new D.Paragraph({
          keepNext: true,
          spacing: { before: 140, after: 40 },
          children: [
            new D.TextRun({ text: x.no + '. Soru Çözümü' + ansTag, bold: true, font: wordFont, size: size + 2, color: hex(T.accent) })
          ]
        }));
        (x.q.explain || '').split('\n').filter(s => s.trim()).forEach(para => {
          tail.push(new D.Paragraph({
            spacing: { after: 60, line },
            indent: { left: 200 },
            children: run(para.trim())
          }));
        });
      });
    }

    sections.push({
      properties: {
        page: { size: { width: tw(pageW), height: tw(pageH) }, margin: { top: margin, bottom: margin, left: margin, right: margin } },
        column: { count: L.columns || 1, space: 400 }
      },
      children: [...ch, ...tail]
    });

    const file = new D.Document({ sections });
    const blob = await D.Packer.toBlob(file);
    save(blob, safe(doc.title) + '.docx');
  }

  /* ---------- Tek Seferlik Görsel Çıktı: PNG İndir ---------- */
  async function singleVisualPng(singleDoc, targetEl) {
    let node = targetEl;
    let created = false;
    const r = root();
    if (!node) {
      r.innerHTML = '';
      node = renderSingleCard(singleDoc, r);
      created = true;
    }
    try {
      const c = await shot(node, 2.5);
      const fileName = `${safe(singleDoc.title || 'gorsel-soru')}-${(singleDoc.aspectRatio || '9-16').replace(':', 'x')}.png`;
      await new Promise(res => {
        c.toBlob(blob => {
          save(blob, fileName);
          res();
        }, 'image/png');
      });
    } finally {
      if (created) r.innerHTML = '';
    }
  }

  /* ---------- Tek Seferlik Görsel Çıktı: PDF İndir ---------- */
  async function singleVisualPdf(singleDoc, targetEl) {
    let node = targetEl;
    let created = false;
    const r = root();
    if (!node) {
      r.innerHTML = '';
      node = renderSingleCard(singleDoc, r);
      created = true;
    }
    try {
      const c = await shot(node, 2.5);
      const ratioId = singleDoc.aspectRatio || '9:16';
      
      // Standart mm boyutları
      const dimMap = {
        '9:16': [108, 192],
        '1:1': [150, 150],
        '4:5': [120, 150],
        '16:9': [192, 108],
        '3:4': [120, 160]
      };
      const [w, h] = dimMap[ratioId] || [108, 192];
      const orientation = w > h ? 'landscape' : 'portrait';

      const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation, compress: true });
      P.setProperties({ title: singleDoc.title || 'Görsel Soru', creator: 'Pıtrak Nüsha' });
      P.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h, undefined, 'FAST');
      save(P.output('blob'), `${safe(singleDoc.title || 'gorsel-soru')}-${ratioId.replace(':', 'x')}.pdf`);
    } finally {
      if (created) r.innerHTML = '';
    }
  }

  /* ---------- Soru Öbeği Toplu PDF Çıktısı (Koleksiyon Albümü) ---------- */
  async function packPdf(packName, questionsList, progress) {
    if (!questionsList || !questionsList.length) throw new Error('Öbekte soru bulunamadı.');
    const r = root();
    r.innerHTML = '';

    // İlk sorunun en-boy oranını temel al veya 3:4/A4 kullan
    const baseRatio = questionsList[0].aspectRatio || '3:4';
    const dimMap = {
      '9:16': [108, 192],
      '1:1': [150, 150],
      '4:5': [120, 150],
      '16:9': [192, 108],
      '3:4': [120, 160]
    };
    const [w, h] = dimMap[baseRatio] || [120, 160];
    const orientation = w > h ? 'landscape' : 'portrait';

    const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation, compress: true });
    P.setProperties({ title: packName, creator: 'Pıtrak Nüsha Soru Öbeği' });

    for (let i = 0; i < questionsList.length; i++) {
      if (progress) progress(`Öbekteki soru ${i + 1} / ${questionsList.length} albüme ekleniyor…`);
      r.innerHTML = '';
      const card = renderSingleCard(questionsList[i], r);
      const c = await shot(card, 2.2);

      if (i > 0) P.addPage([w, h], orientation);
      P.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    r.innerHTML = '';
    save(P.output('blob'), safe(packName || 'soru-obegi') + '-koleksiyonu.pdf');
  }

  /* ---------- .pitrak Yedek İndir ---------- */
  async function pitrak(doc) {
    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    save(blob, safe(doc.title) + '.pitrak');
  }

  /* Eski tek soru çıktısı (Soru Bankası içinden tek soru) */
  async function single(doc, q, no, withAns, kind) {
    await ready(doc);
    const r = root(); r.innerHTML = '';
    const node = buildSingle(doc, q, no, withAns); r.appendChild(node);
    try {
      const c = await shot(node, 3), name = safe(doc.title) + '-soru-' + no;
      if (kind === 'png') {
        await new Promise(res => c.toBlob(b => { save(b, name + '.png'); res(); }, 'image/png'));
      } else {
        const w = c.width / 3 * 25.4 / 96, h = c.height / 3 * 25.4 / 96;
        const P = new window.jspdf.jsPDF({ unit: 'mm', format: [w, h], orientation: w > h ? 'l' : 'p', compress: true });
        P.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, w, h);
        save(P.output('blob'), name + '.pdf');
      }
    } finally { r.innerHTML = ''; }
  }

  return {
    pdf,
    docx,
    single,
    pitrak,
    singleVisualPng,
    singleVisualPdf,
    packPdf,
    save,
    safe,
    ready
  };
})();
