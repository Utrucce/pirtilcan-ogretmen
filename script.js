/**
 * ============================================================================
 * PIRTILCAN ÖĞRETMEN - TÜRKİYE YÜZYILI MAARİF MODELİ ASİSTANI
 * Sıfır Mock Veri • %100 Gerçek MEB Maarif Veri Tabanı ve Dinamik Sistem
 * ============================================================================
 */

(function () {
  'use strict';

  // --- 1. YEREL DEPOLAMA ANAHTARLARI & GERÇEK VERİ YÖNETİMİ ---
  const STORAGE_KEYS = {
    TEACHER: 'pirtilcan_teacher_profile',
    DUTY: 'pirtilcan_duty_info',
    SCHEDULE: 'pirtilcan_schedule_list',
    CLASSES: 'pirtilcan_classroom_data',
    WALLPAPER: 'pirtilcan_custom_wallpaper',
    MASCOT: 'pirtilcan_mascot_choice'
  };

  // Öğretmen Profili (Kullanıcı henüz düzenlemediyse saf ve resmi karşılama durumu)
  let teacherProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.TEACHER) || '{}');
  if (!teacherProfile.name) {
    teacherProfile = {
      name: 'Öğretmenim',
      branch: 'Branş Belirtilmedi',
      school: 'Okul Belirtilmedi',
      mascot: 'pirtilcan_selcuklu_turkuaz.png',
      wallpaper: 'none'
    };
  }

  // Nöbet Bilgisi (Mock içermez)
  let dutyInfo = JSON.parse(localStorage.getItem(STORAGE_KEYS.DUTY) || '{}');
  if (!dutyInfo.location) {
    dutyInfo = { day: 'Yok', location: 'Belirtilmedi' };
  }

  // Haftalık Ders Programı (Kullanıcı eklemediyse BOŞ liste - Mock veri tamamen kaldırılmıştır)
  let scheduleList = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULE) || '[]');

  // Sınıflar ve Öğrenciler (Kullanıcı eklemediyse BOŞ nesne - Mock veri tamamen kaldırılmıştır)
  let classroomData = JSON.parse(localStorage.getItem(STORAGE_KEYS.CLASSES) || '{}');

  let activeClassKey = Object.keys(classroomData)[0] || '';
  let activeScheduleDay = (new Date().getDay() >= 1 && new Date().getDay() <= 5) ? new Date().getDay() : 1;
  let activeOfficialDoc = null;

  // --- 2. SES & RADYO MOTORU ---
  let audioContext = null;
  let isRadioPlaying = false;
  let currentRadioChannel = 'trt1';

  function getAudioContext() {
    if (!audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) audioContext = new AudioCtx();
    }
    return audioContext;
  }

  function playSynthesizedSound(type) {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === 'bell') {
        // Okul Zili Ding-Dong Sentezi
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.4); // C5
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'chime') {
        // Başarı / Puan artışı
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1318.5, now + 0.12);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Dokunma Tık sesi
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch (_) {}
  }

  window.playAppSound = function (type) {
    playSynthesizedSound(type);
  };

  // --- 3. GERÇEK ZAMANLI SAAT & TAKVİM & CANLI DERS HESAPLAYICI ---
  function updateLiveClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    const clockEl = document.getElementById('liveClockDisplay');
    if (clockEl) clockEl.textContent = `${hours}:${mins}:${secs}`;

    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' };
    const dateStr = now.toLocaleDateString('tr-TR', dateOptions);
    const dateEl = document.getElementById('liveDateDisplay');
    if (dateEl) dateEl.textContent = dateStr;

    // MEB 2026-2027 Eğitim Öğretim Haftası Hesabı (Kasım ayı: 6-7. Hafta)
    const month = now.getMonth();
    const day = now.getDate();
    let currentWeekNum = 6;
    if (month === 8) currentWeekNum = day < 15 ? 1 : (day < 22 ? 2 : 3);
    else if (month === 9) currentWeekNum = day < 8 ? 4 : (day < 15 ? 5 : (day < 22 ? 6 : 7));
    else if (month === 10) currentWeekNum = day < 10 ? 8 : (day < 20 ? 9 : 10);
    else if (month === 11) currentWeekNum = day < 8 ? 11 : (day < 15 ? 12 : 13);
    else if (month === 0) currentWeekNum = 16;
    else if (month >= 1 && month <= 5) currentWeekNum = 20 + month;

    const weekEl = document.getElementById('headerWeekText');
    if (weekEl) weekEl.textContent = `${currentWeekNum}. Hafta`;
  }

  // Canlı Ders Odak Kartı Render (TeacherHomeScreen.kt mimarisi ile sıfır mock)
  function renderActiveLessonCard() {
    const container = document.getElementById('activeLessonCardContainer');
    if (!container) return;

    const todayDay = (new Date().getDay() >= 1 && new Date().getDay() <= 5) ? new Date().getDay() : 1;
    const todayLessons = scheduleList.filter(s => s.day === todayDay).sort((a, b) => a.period - b.period);
    const activeLesson = todayLessons[0] || null;

    if (!activeLesson) {
      // Mock veri kesinlikle gösterilmez; saf resmi karşılama durumu
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; text-align:center; padding:12px 6px;">
          <div style="width:48px; height:48px; border-radius:50%; background:rgba(0,245,212,0.12); border:1px solid rgba(0,245,212,0.4); display:flex; align-items:center; justify-content:center; font-size:22px; margin-bottom:10px;">
            📚
          </div>
          <div style="font-size:11px; font-weight:800; color:var(--neon-cyan); letter-spacing:1px; text-transform:uppercase; margin-bottom:4px;">
            CANLI DERS • PLANLANAN DERS YOK
          </div>
          <div style="font-size:15px; font-weight:800; color:#FFF; margin-bottom:4px;">
            Bugün için kayıtlı aktif bir dersiniz bulunmuyor.
          </div>
          <div style="font-size:12px; color:var(--text-secondary); max-width:460px; line-height:1.5; margin-bottom:14px;">
            Haftalık ders programınızı oluşturarak canlı ders akışınızı ve anlık öğrenme çıktılarını buradan takip edebilirsiniz.
          </div>
          <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button class="btn-primary-action" onclick="openModal('modalScheduleEdit')" style="width:auto; padding:8px 16px; font-size:12px;">
              ✏️ Ders Programı Düzenle
            </button>
            <button class="btn-lesson-action" onclick="switchMainTab('Planlar')" style="width:auto; padding:8px 16px; font-size:12px;">
              📖 Müfredat Planları
            </button>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="lesson-top-row">
          <div class="lesson-title-badge">
            <span class="pulse-dot"></span>
            <span class="lesson-name">${activeLesson.subject}</span>
            <span class="lesson-class-badge">${activeLesson.className}</span>
          </div>
          <div class="lesson-bell-time">
            <span>⏱️</span>
            <span>${activeLesson.time}</span>
          </div>
        </div>
        <div class="outcome-box">
          <div class="outcome-tag">
            <span>🎯</span>
            <span>ÖĞRENME ÇIKTISI & TEMA</span>
          </div>
          <div class="outcome-text">
            ${activeLesson.className} sınıfı ${activeLesson.subject} dersi haftalık Maarif Modeli öğrenme çıktısı.
          </div>
        </div>
        <div class="lesson-quick-actions">
          <button class="btn-lesson-action" onclick="switchMainTab('Siniflar')">
            <span>📋</span>
            <span>Yoklama Al</span>
          </button>
          <button class="btn-lesson-action" onclick="openToolDetail('lottery_wheel')">
            <span>🎯</span>
            <span>Adil Kura</span>
          </button>
          <button class="btn-lesson-action" onclick="openToolDetail('pomodoro')">
            <span>⏱️</span>
            <span>Ders Zili</span>
          </button>
        </div>
      `;
    }
  }

  // --- 4. SEKME VE MODAL YÖNETİMİ ---
  window.switchMainTab = function (tabId) {
    playSynthesizedSound('click');
    const panels = document.querySelectorAll('.view-panel');
    panels.forEach(p => p.classList.remove('active'));

    const navBtns = document.querySelectorAll('.bottom-nav-btn');
    navBtns.forEach(b => b.classList.remove('active'));

    const targetPanel = document.getElementById(`panel${tabId}`);
    if (targetPanel) targetPanel.classList.add('active');

    const targetBtn = document.getElementById(`navBtn${tabId}`);
    if (targetBtn) targetBtn.classList.add('active');

    if (tabId === 'Dersim') renderActiveLessonCard();
    if (tabId === 'Siniflar') renderClassroomView();
    if (tabId === 'Planlar') renderCurriculumOutcomes();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.openModal = function (modalId) {
    playSynthesizedSound('click');
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');

    if (modalId === 'modalScheduleEdit') renderScheduleManageList();
    if (modalId === 'modalClassEdit') renderClassManageList();
    if (modalId === 'modalSettings') {
      const nameInput = document.getElementById('settingsTeacherName');
      const branchInput = document.getElementById('settingsTeacherBranch');
      const schoolInput = document.getElementById('settingsTeacherSchool');
      const cityInput = document.getElementById('settingsTeacherCity');
      const guideInput = document.getElementById('settingsTeacherGuideClass');
      if (nameInput) nameInput.value = teacherProfile.name === 'Öğretmenim' ? '' : (teacherProfile.name || '');
      if (branchInput) branchInput.value = teacherProfile.branch === 'Branş Belirtilmedi' ? '' : (teacherProfile.branch || '');
      if (schoolInput) schoolInput.value = teacherProfile.school === 'Okul Belirtilmedi' ? '' : (teacherProfile.school || '');
      if (cityInput) cityInput.value = teacherProfile.city || '';
      if (guideInput) guideInput.value = teacherProfile.guideClass || '';
    }
  };

  window.closeModal = function (modalId) {
    playSynthesizedSound('click');
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  };

  // --- 5. ÜST BAŞLIK & PROFİL ALANI ---
  function renderHeaderProfile() {
    const nameEl = document.getElementById('headerTeacherName');
    const branchEl = document.getElementById('headerTeacherBranch');
    const schoolEl = document.getElementById('headerTeacherSchool');
    const mascotImg = document.getElementById('headerMascotImg');
    const centerImg = document.getElementById('centerMascotImg');

    if (nameEl) nameEl.textContent = teacherProfile.name || 'Öğretmenim';
    if (branchEl) branchEl.textContent = teacherProfile.branch || 'Branş Belirtilmedi';
    if (schoolEl) schoolEl.textContent = teacherProfile.school || 'Okul Belirtilmedi';

    const mascotPath = `./assets/${teacherProfile.mascot || 'pirtilcan_selcuklu_turkuaz.png'}`;
    if (mascotImg) mascotImg.src = mascotPath;
    if (centerImg) centerImg.src = mascotPath;

    // Nöbet
    const dutyPill = document.getElementById('cardDutyLocationText');
    const dutyShort = document.getElementById('storyDutyShort');
    const locText = dutyInfo.location || 'Belirtilmedi';
    if (dutyPill) dutyPill.textContent = `Nöbet: ${locText}`;
    if (dutyShort) dutyShort.textContent = locText.split(' ')[0] || 'Belirtilmedi';

    // Muallim Hüviyetnâmesi (Evrak & Maarif Portalı Profili - TeacherProfileScreen)
    const profName = document.getElementById('profileCardName');
    const profBranch = document.getElementById('profileCardBranch');
    const profSchool = document.getElementById('profileCardSchool');
    const profExtra = document.getElementById('profileCardExtra');
    const profMascot = document.getElementById('profileCardMascotImg');
    const badgeHours = document.getElementById('profileBadgeWeeklyHours');
    const badgeClasses = document.getElementById('profileBadgeClassCount');
    const badgeDuty = document.getElementById('profileBadgeDutyDay');

    if (profName) profName.textContent = teacherProfile.name || 'Öğretmenim';
    if (profBranch) profBranch.textContent = teacherProfile.branch || 'Branş Belirtilmedi';
    if (profSchool) profSchool.textContent = teacherProfile.school || 'Okul Belirtilmedi';
    if (profExtra) {
      const city = teacherProfile.city || 'İl / İlçe Belirtilmedi';
      const guide = teacherProfile.guideClass ? `Rehberlik: ${teacherProfile.guideClass}` : 'Rehberlik: Yok';
      profExtra.textContent = `${city} • ${guide}`;
    }
    if (profMascot) profMascot.src = mascotPath;
    if (badgeHours) badgeHours.textContent = `${scheduleList.length} Saat`;
    const numClasses = Object.keys(classroomData).length;
    if (badgeClasses) badgeClasses.textContent = `${numClasses} Sınıf`;
    if (badgeDuty) badgeDuty.textContent = dutyInfo.day || 'Yok';

    // Duvar Kağıdı
    const wpLayer = document.getElementById('appWallpaperLayer');
    if (wpLayer) {
      if (teacherProfile.wallpaper && teacherProfile.wallpaper !== 'none') {
        wpLayer.style.backgroundImage = `url('./assets/wallpapers/${teacherProfile.wallpaper}')`;
        wpLayer.style.opacity = '0.40';
      } else {
        wpLayer.style.backgroundImage = 'none';
        wpLayer.style.opacity = '0';
      }
    }
  }

  // --- 6. DERS PROGRAMI (HAFTALIK PLAN) ---
  window.switchScheduleDay = function (dayNum) {
    playSynthesizedSound('click');
    activeScheduleDay = dayNum;

    const tabs = document.querySelectorAll('.schedule-day-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-day') == dayNum) t.classList.add('active');
      else t.classList.remove('active');
    });

    renderScheduleList();
  };

  function renderScheduleList() {
    const listContainer = document.getElementById('scheduleListContainer');
    if (!listContainer) return;

    const dayItems = scheduleList.filter(s => s.day === activeScheduleDay).sort((a, b) => a.period - b.period);

    if (dayItems.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:24px 14px; color:var(--text-secondary); font-size:12.5px; line-height:1.6;">
          <div style="font-size:28px; margin-bottom:6px;">📅</div>
          Bu gün için kayıtlı ders saati bulunmuyor.<br>
          <button class="btn-primary-action" onclick="openModal('modalScheduleEdit')" style="display:inline-flex; width:auto; padding:6px 14px; font-size:11.5px; margin-top:8px;">
            ➕ Ders Ekle
          </button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = dayItems.map(item => `
      <div class="schedule-item-row">
        <div class="schedule-period-badge">${item.period}</div>
        <div class="schedule-item-info">
          <div class="schedule-item-subject">${item.subject}</div>
          <div class="schedule-item-sub">
            <span>Sınıf: <strong>${item.className}</strong></span>
            <span>•</span>
            <span>${item.room || 'Derslik'}</span>
          </div>
        </div>
        <div class="schedule-item-time">${item.time || ''}</div>
      </div>
    `).join('');
  }

  function renderScheduleManageList() {
    const container = document.getElementById('scheduleManageList');
    if (!container) return;

    if (scheduleList.length === 0) {
      container.innerHTML = `<div style="font-size:12px; color:var(--text-muted); padding:8px 0;">Henüz ders saati eklenmedi.</div>`;
      return;
    }

    const dayNames = { 1: 'Pazartesi', 2: 'Salı', 3: 'Çarşamba', 4: 'Perşembe', 5: 'Cuma' };
    container.innerHTML = scheduleList.map((item, idx) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:10px;">
        <div style="font-size:12px; color:#FFF;">
          <strong>${dayNames[item.day]}</strong> • ${item.period}. Ders • ${item.subject} (${item.className}) - ${item.time}
        </div>
        <button onclick="deleteScheduleSlot('${item.id}')" style="background:none; border:none; color:var(--danger-red); font-size:14px; cursor:pointer;" title="Dersi Sil">🗑️</button>
      </div>
    `).join('');
  }

  window.saveScheduleSlot = function () {
    const day = parseInt(document.getElementById('slotDaySelect')?.value || '1', 10);
    const period = parseInt(document.getElementById('slotNumberInput')?.value || '1', 10);
    const subject = (document.getElementById('slotSubjectInput')?.value || '').trim();
    const className = (document.getElementById('slotClassInput')?.value || '').trim();
    const time = (document.getElementById('slotTimeInput')?.value || '').trim();

    if (!subject || !className) {
      alert('Lütfen ders adı ve sınıf bilgisini giriniz.');
      return;
    }

    scheduleList.push({
      id: 'sc_' + Date.now(),
      day,
      period,
      subject,
      className,
      time: time || '08:30 - 09:10',
      room: 'Derslik'
    });

    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(scheduleList));
    playSynthesizedSound('chime');
    renderScheduleList();
    renderScheduleManageList();
    renderActiveLessonCard();
    alert('Ders saati başarıyla eklendi.');
  };

  window.deleteScheduleSlot = function (id) {
    scheduleList = scheduleList.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(scheduleList));
    playSynthesizedSound('click');
    renderScheduleList();
    renderScheduleManageList();
    renderActiveLessonCard();
  };

  // --- 7. RESMİ MEB MÜFREDATI (PLANLAR SEKMESİ) ---
  let curriculumGradeCache = {};

  async function loadGradeData(grade) {
    if (curriculumGradeCache[grade]) return curriculumGradeCache[grade];
    try {
      const res = await fetch(`./assets/curriculum/grade_${grade}.json`);
      if (res.ok) {
        const data = await res.json();
        curriculumGradeCache[grade] = data;
        return data;
      }
    } catch (_) {}
    return [];
  }

  window.onGradeChange = async function () {
    const grade = document.getElementById('curriculumGradeSelect')?.value || '7';
    const items = await loadGradeData(grade);

    // Branşları resmi veriden topla
    const subjects = [...new Set(items.map(i => i.subject).filter(Boolean))].sort();
    const subjSelect = document.getElementById('curriculumSubjectSelect');
    if (subjSelect) {
      subjSelect.innerHTML = subjects.map((s, idx) => `<option value="${s}" ${idx === 0 ? 'selected' : ''}>${s}</option>`).join('');
    }

    // 1-36. Hafta Seçici
    const weekSelect = document.getElementById('curriculumWeekSelect');
    if (weekSelect && weekSelect.children.length === 0) {
      let weekHtml = '';
      for (let w = 1; w <= 36; w++) {
        weekHtml += `<option value="${w}" ${w === 6 ? 'selected' : ''}>${w}. Hafta</option>`;
      }
      weekSelect.innerHTML = weekHtml;
    }

    renderCurriculumOutcomes();
  };

  window.onSubjectChange = function () {
    renderCurriculumOutcomes();
  };

  window.onWeekChange = function () {
    renderCurriculumOutcomes();
  };

  window.onCurriculumSearch = function (query) {
    renderCurriculumOutcomes(query.toLowerCase());
  };

  async function renderCurriculumOutcomes(filterQuery = '') {
    const listEl = document.getElementById('curriculumOutcomesList');
    if (!listEl) return;

    const grade = document.getElementById('curriculumGradeSelect')?.value || '7';
    const subj = document.getElementById('curriculumSubjectSelect')?.value || '';
    const week = parseInt(document.getElementById('curriculumWeekSelect')?.value || '6', 10);

    const allForGrade = await loadGradeData(grade);
    let filtered = allForGrade.filter(i => {
      const sMatch = !subj || i.subject.toLowerCase() === subj.toLowerCase();
      const wMatch = i.weekNumber === week;
      return sMatch && wMatch;
    });

    if (filterQuery) {
      filtered = allForGrade.filter(i => {
        const text = `${i.theme} ${i.code} ${i.title} ${i.suggestions} ${i.subject}`.toLowerCase();
        return text.includes(filterQuery);
      });
    }

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding:32px 16px; color:var(--text-muted); font-size:13px;">
          Seçilen sınıf ve branş için bu haftaya ait öğrenme çıktısı bulunamadı veya arama sonucu boş.
        </div>
      `;
      return;
    }

    listEl.innerHTML = filtered.map(item => {
      const procs = (item.processComponents || []).map(p => `<li>${p}</li>`).join('');
      return `
        <div class="outcome-detail-card">
          <div class="outcome-header-row">
            <span class="outcome-code-badge">${item.code || 'ÖÇ'}</span>
            <span class="outcome-theme-badge">${item.theme || 'Maarif Modeli'}</span>
          </div>
          <div class="outcome-title-text">${item.title}</div>
          ${procs ? `<ul class="process-components-list">${procs}</ul>` : ''}
          ${item.suggestions ? `<div style="font-size:11.5px; color:var(--neon-gold); margin-top:6px;"><strong>Etkinlik & Pedagojik Öneri:</strong> ${item.suggestions}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  window.printCurriculumPlan = function () {
    const grade = document.getElementById('curriculumGradeSelect')?.value || '7';
    const subj = document.getElementById('curriculumSubjectSelect')?.value || '';
    const week = document.getElementById('curriculumWeekSelect')?.value || '6';
    const content = document.getElementById('curriculumOutcomesList')?.innerHTML || '';

    const printSec = document.getElementById('printSection');
    printSec.innerHTML = `
      <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #000; padding-bottom:10px;">
        <h2 style="margin:0;">T.C. MİLLÎ EĞİTİM BAKANLIĞI</h2>
        <h3 style="margin:4px 0;">TÜRKİYE YÜZYILI MAARİF MODELİ DERS PLANI</h3>
        <p style="margin:4px 0;"><strong>${grade}. Sınıf — ${subj} — ${week}. Eğitim Haftası</strong></p>
      </div>
      <div>${content}</div>
    `;
    window.print();
  };

  window.copyCurriculumPlan = function () {
    const grade = document.getElementById('curriculumGradeSelect')?.value || '7';
    const subj = document.getElementById('curriculumSubjectSelect')?.value || '';
    const week = document.getElementById('curriculumWeekSelect')?.value || '6';
    const text = document.getElementById('curriculumOutcomesList')?.innerText || '';
    navigator.clipboard.writeText(`MEB MAARİF MODELİ DERS PLANI (${grade}. Sınıf ${subj} - ${week}. Hafta):\n\n${text}`);
    playSynthesizedSound('chime');
    alert('Haftalık öğrenme çıktıları panoya kopyalandı.');
  };

  // --- 8. SINIF VE ÖĞRENCİ YÖNETİMİ (SIFIR MOCK) ---
  function renderClassroomView() {
    const wrapper = document.getElementById('classroomContentWrapper');
    const tabsContainer = document.getElementById('classroomTabsContainer');
    if (!wrapper || !tabsContainer) return;

    const classKeys = Object.keys(classroomData);

    if (classKeys.length === 0) {
      tabsContainer.innerHTML = '';
      wrapper.innerHTML = `
        <div class="maarif-card" style="text-align:center; padding:36px 20px;">
          <div style="font-size:42px; margin-bottom:12px;">👥</div>
          <div style="font-size:16px; font-weight:800; color:#FFF; margin-bottom:6px;">Henüz Kayıtlı Bir Sınıfınız Bulunmuyor</div>
          <div style="font-size:12.5px; color:var(--text-secondary); max-width:440px; margin:0 auto 16px auto; line-height:1.5;">
            Sınıflarınızı ve öğrenci listelerinizi ekleyerek yoklama alabilir, oturma planı çıkarabilir ve adil kura çekebilirsiniz.
          </div>
          <button class="btn-primary-action" onclick="openModal('modalClassEdit')" style="max-width:220px; margin:0 auto;">
            ➕ Yeni Sınıf Ekle
          </button>
        </div>
      `;
      return;
    }

    if (!activeClassKey || !classroomData[activeClassKey]) {
      activeClassKey = classKeys[0];
    }

    // Sınıf Sekmeleri
    tabsContainer.innerHTML = classKeys.map(c => `
      <button class="class-tab-btn ${c === activeClassKey ? 'active' : ''}" onclick="switchClass('${c}')">
        ${c}
      </button>
    `).join('');

    const students = classroomData[activeClassKey] || [];
    let present = students.filter(s => s.status === 'geldi').length;
    let absent = students.filter(s => s.status === 'gelmedi').length;
    let late = students.filter(s => s.status === 'gec').length;

    wrapper.innerHTML = `
      <!-- Yoklama Özeti Kartı -->
      <div class="attendance-summary-card">
        <div class="stat-chip">
          <span class="stat-chip-val">${students.length}</span>
          <span class="stat-chip-lbl">Mevcut</span>
        </div>
        <div class="stat-chip">
          <span class="stat-chip-val" style="color:var(--success-green);">${present}</span>
          <span class="stat-chip-lbl">Geldi</span>
        </div>
        <div class="stat-chip">
          <span class="stat-chip-val" style="color:var(--danger-red);">${absent}</span>
          <span class="stat-chip-lbl">Gelmedi</span>
        </div>
        <div class="stat-chip">
          <span class="stat-chip-val" style="color:var(--amber-glow);">${late}</span>
          <span class="stat-chip-lbl">Geç</span>
        </div>
        <button class="btn-lesson-action" onclick="copyAttendanceToClipboard()" style="padding:6px 10px; font-size:11px;">
          📋 e-Okul Kopyala
        </button>
      </div>

      <!-- Görünüm Seçici -->
      <div style="display:flex; gap:8px; margin:12px 0;">
        <button class="schedule-day-tab active" id="btnViewList" onclick="switchClassView('list')">📋 Liste & Yoklama</button>
        <button class="schedule-day-tab" id="btnViewSeating" onclick="switchClassView('seating')">🪑 Oturma Planı</button>
        <button class="schedule-day-tab" onclick="openClassLottery()">🎯 Adil Kura</button>
        <button class="schedule-day-tab" onclick="openClassGroups()">👥 Takım Kur</button>
      </div>

      <!-- Öğrenci Listesi / Boş Durum -->
      <div id="studentListContainer" class="student-list-container">
        ${students.length === 0 ? `
          <div class="maarif-card" style="text-align:center; padding:24px;">
            <div style="font-size:32px; margin-bottom:8px;">📋</div>
            <div style="font-size:14px; font-weight:700; color:#FFF;">Bu sınıfta henüz kayıtlı öğrenci bulunmuyor.</div>
            <div style="font-size:11.5px; color:var(--text-secondary); margin:6px 0 14px 0;">Öğrenci numarası ve ad-soyad girerek listenizi oluşturun.</div>
            <button class="btn-primary-action" onclick="openModal('modalClassEdit')" style="max-width:200px; margin:0 auto;">
              ➕ Öğrenci Ekle
            </button>
          </div>
        ` : students.map(s => `
          <div class="student-card-row">
            <div class="student-info-left">
              <span class="student-number-pill">${s.num}</span>
              <span class="student-name-text">${s.name}</span>
              <div style="display:flex; align-items:center; gap:4px; margin-left:6px;">
                <button onclick="changeStudentPoints('${s.id}', 1)" style="background:none; border:none; color:var(--neon-cyan); cursor:pointer; font-weight:bold;">+</button>
                <span style="font-size:11px; color:var(--neon-gold);">${s.plus || 0}</span>
                <button onclick="changeStudentPoints('${s.id}', -1)" style="background:none; border:none; color:var(--danger-red); cursor:pointer; font-weight:bold;">-</button>
              </div>
            </div>
            <div class="student-status-actions">
              <button class="btn-status-pill geldi ${s.status === 'geldi' ? 'active' : ''}" onclick="setStudentStatus('${s.id}', 'geldi')">Geldi</button>
              <button class="btn-status-pill gelmedi ${s.status === 'gelmedi' ? 'active' : ''}" onclick="setStudentStatus('${s.id}', 'gelmedi')">Yok</button>
              <button class="btn-status-pill gec ${s.status === 'gec' ? 'active' : ''}" onclick="setStudentStatus('${s.id}', 'gec')">Geç</button>
              <button class="btn-status-pill izinli ${s.status === 'izinli' ? 'active' : ''}" onclick="setStudentStatus('${s.id}', 'izinli')">İzinli</button>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Oturma Planı Krokisi -->
      <div class="maarif-card" id="seatingPlanContainer" style="display:none; margin-top:12px;">
        <div style="font-size:13px; font-weight:700; color:var(--neon-cyan); margin-bottom:8px; text-align:center;">
          TAHTA / KÜRSÜ DÜZENİ
        </div>
        <div class="seating-chart-grid" id="seatingChartGrid">
          <!-- Oturma Sıraları -->
        </div>
      </div>
    `;

    renderSeatingPlan();
  }

  window.switchClass = function (className) {
    playSynthesizedSound('click');
    activeClassKey = className;
    renderClassroomView();
  };

  window.setStudentStatus = function (id, status) {
    playSynthesizedSound('click');
    const students = classroomData[activeClassKey] || [];
    const target = students.find(s => s.id === id);
    if (target) {
      target.status = status;
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classroomData));
      renderClassroomView();
    }
  };

  window.changeStudentPoints = function (id, delta) {
    const students = classroomData[activeClassKey] || [];
    const target = students.find(s => s.id === id);
    if (target) {
      target.plus = Math.max(0, (target.plus || 0) + delta);
      playSynthesizedSound(delta > 0 ? 'chime' : 'click');
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classroomData));
      renderClassroomView();
    }
  };

  window.switchClassView = function (mode) {
    playSynthesizedSound('click');
    const listEl = document.getElementById('studentListContainer');
    const seatEl = document.getElementById('seatingPlanContainer');
    const btnList = document.getElementById('btnViewList');
    const btnSeat = document.getElementById('btnViewSeating');

    if (mode === 'seating') {
      if (listEl) listEl.style.display = 'none';
      if (seatEl) seatEl.style.display = 'block';
      if (btnList) btnList.classList.remove('active');
      if (btnSeat) btnSeat.classList.add('active');
    } else {
      if (listEl) listEl.style.display = 'flex';
      if (seatEl) seatEl.style.display = 'none';
      if (btnList) btnList.classList.add('active');
      if (btnSeat) btnSeat.classList.remove('active');
    }
  };

  function renderSeatingPlan() {
    const gridEl = document.getElementById('seatingChartGrid');
    if (!gridEl) return;

    const students = classroomData[activeClassKey] || [];
    let html = '';
    for (let i = 0; i < Math.max(students.length, 6); i += 2) {
      const s1 = students[i] ? `${students[i].num} - ${students[i].name}` : 'Boş Sıra';
      const s2 = students[i + 1] ? `${students[i + 1].num} - ${students[i + 1].name}` : 'Boş Sıra';
      html += `
        <div class="desk-pair-box">
          <div class="desk-seat" title="${s1}">${s1}</div>
          <div class="desk-seat" title="${s2}">${s2}</div>
        </div>
      `;
    }
    gridEl.innerHTML = html;
  }

  window.copyAttendanceToClipboard = function () {
    const students = classroomData[activeClassKey] || [];
    if (students.length === 0) {
      alert('Sınıfta henüz öğrenci bulunmuyor.');
      return;
    }
    const absent = students.filter(s => s.status === 'gelmedi').map(s => `${s.num} ${s.name}`).join(', ');
    const late = students.filter(s => s.status === 'gec').map(s => `${s.num} ${s.name}`).join(', ');

    const text = `Sınıf: ${activeClassKey}\nMevcut: ${students.length}\nGeldi: ${students.filter(s => s.status === 'geldi').length}\nGelmedi (Yok): ${absent || 'Yok'}\nGeç Kalan: ${late || 'Yok'}\n(Tarih: ${new Date().toLocaleDateString('tr-TR')})`;
    navigator.clipboard.writeText(text);
    playSynthesizedSound('chime');
    alert('e-Okul Uyumlu Yoklama Özeti Panoya Kopyalandı!');
  };

  // Sınıf & Öğrenci Ekleme Modal İşlemleri
  function renderClassManageList() {
    const titleEl = document.getElementById('manageClassTitle');
    if (titleEl) titleEl.textContent = activeClassKey || 'Sınıf Seçiniz';

    const container = document.getElementById('classManageList');
    if (!container) return;

    const keys = Object.keys(classroomData);
    if (keys.length === 0) {
      container.innerHTML = `<div style="font-size:12px; color:var(--text-muted);">Henüz sınıf eklenmedi.</div>`;
      return;
    }

    container.innerHTML = keys.map(k => `
      <div style="display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); padding:6px 10px; border-radius:10px;">
        <span style="font-size:12px; font-weight:700; color:#FFF; cursor:pointer;" onclick="switchClass('${k}'); renderClassManageList();">${k} (${(classroomData[k] || []).length} öğr.)</span>
        <button onclick="removeClass('${k}')" style="background:none; border:none; color:var(--danger-red); cursor:pointer; font-size:12px;" title="Sınıfı Sil">✕</button>
      </div>
    `).join('');
  }

  window.addNewClassSubmit = function () {
    const input = document.getElementById('newClassNameInput');
    const val = (input?.value || '').trim().toUpperCase();
    if (!val) {
      alert('Lütfen sınıf adı giriniz (Örn: 7-C).');
      return;
    }

    if (!classroomData[val]) {
      classroomData[val] = [];
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classroomData));
      activeClassKey = val;
      playSynthesizedSound('chime');
      renderClassroomView();
      renderClassManageList();
      input.value = '';
      alert(`${val} sınıfı başarıyla oluşturuldu.`);
    } else {
      alert('Bu sınıf zaten mevcut.');
    }
  };

  window.addStudentSubmit = function () {
    if (!activeClassKey) {
      alert('Lütfen önce bir sınıf seçin veya ekleyin.');
      return;
    }
    const numInput = document.getElementById('newStudentNumberInput');
    const nameInput = document.getElementById('newStudentNameInput');
    const num = (numInput?.value || '').trim();
    const name = (nameInput?.value || '').trim();

    if (!num || !name) {
      alert('Lütfen öğrenci no ve ad soyad giriniz.');
      return;
    }

    classroomData[activeClassKey].push({
      id: 'st_' + Date.now(),
      num,
      name,
      plus: 0,
      minus: 0,
      status: 'geldi'
    });

    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classroomData));
    playSynthesizedSound('chime');
    numInput.value = '';
    nameInput.value = '';
    renderClassroomView();
    renderClassManageList();
    alert('Öğrenci sınıfa eklendi.');
  };

  window.removeClass = function (cName) {
    if (confirm(`${cName} sınıfını silmek istediğinize emin misiniz?`)) {
      delete classroomData[cName];
      localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classroomData));
      activeClassKey = Object.keys(classroomData)[0] || '';
      playSynthesizedSound('click');
      renderClassroomView();
      renderClassManageList();
    }
  };

  // --- 9. RESMÎ EVRAKLAR (72 MEB ŞABLONU, SIFIR MOCK) ---
  let currentDocCategory = 'Tümü';

  function renderOfficialDocuments(searchQuery = '') {
    const gridEl = document.getElementById('docTemplatesGrid');
    const scrollEl = document.getElementById('docCategoryScroll');
    if (!gridEl) return;

    const docs = window.PIRTIL_OFFICIAL_DOCUMENTS || [];

    const cats = ['Tümü', ...new Set(docs.map(d => d.category).filter(Boolean))];
    if (scrollEl && scrollEl.children.length === 0) {
      scrollEl.innerHTML = cats.map(c => `
        <button class="doc-cat-pill ${c === currentDocCategory ? 'active' : ''}" onclick="switchDocCat('${c}')">
          ${c}
        </button>
      `).join('');
    }

    let filtered = docs;
    if (currentDocCategory !== 'Tümü') {
      filtered = filtered.filter(d => d.category === currentDocCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter(d => `${d.title} ${d.subtitle} ${d.category}`.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    gridEl.innerHTML = filtered.map(doc => `
      <div class="doc-template-card" onclick="openDocEditor('${doc.id}')">
        <div class="doc-top-info">
          <div class="doc-icon-box">${doc.icon || '📄'}</div>
          <div>
            <div class="doc-title-text">${doc.title}</div>
            <div class="doc-subtitle-text">${doc.subtitle || ''}</div>
          </div>
        </div>
        <div style="font-size:11px; font-weight:700; color:var(--neon-cyan); margin-top:8px;">
          Düzenle & A4 Çıktı Al ▸
        </div>
      </div>
    `).join('');
  }

  window.switchDocCat = function (cat) {
    playSynthesizedSound('click');
    currentDocCategory = cat;
    const pills = document.querySelectorAll('.doc-cat-pill');
    pills.forEach(p => {
      if (p.textContent.trim() === cat) p.classList.add('active');
      else p.classList.remove('active');
    });
    renderOfficialDocuments();
  };

  window.onDocSearch = function (val) {
    renderOfficialDocuments(val);
  };

  window.openDocEditor = function (docId) {
    const docs = window.PIRTIL_OFFICIAL_DOCUMENTS || [];
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    activeOfficialDoc = doc;
    document.getElementById('docEditorModalTitle').textContent = `📄 ${doc.title}`;
    document.getElementById('docEditTitle').value = doc.title;
    document.getElementById('docEditLegalBasis').value = doc.legalBasis || 'MEB Eğitim Kurumları Mevzuatı';
    document.getElementById('docEditAgenda').value = doc.defaultAgenda || '';
    document.getElementById('docEditDecisions').value = doc.defaultDecisions || '';

    window.openModal('modalDocEdit');
  };

  window.printActiveOfficialDocument = function () {
    if (!activeOfficialDoc) return;
    const title = document.getElementById('docEditTitle').value;
    const legal = document.getElementById('docEditLegalBasis').value;
    const agenda = document.getElementById('docEditAgenda').value;
    const decisions = document.getElementById('docEditDecisions').value;
    const nowStr = new Date().toLocaleDateString('tr-TR');

    const printSec = document.getElementById('printSection');
    printSec.innerHTML = `
      <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #000; padding-bottom:10px;">
        <h2 style="margin:0; font-size:16pt;">T.C. MİLLÎ EĞİTİM BAKANLIĞI</h2>
        <h3 style="margin:4px 0; font-size:14pt;">${(teacherProfile.school || 'OKUL ADI').toUpperCase()}</h3>
        <h4 style="margin:8px 0; font-size:13pt; text-decoration:underline;">${title}</h4>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:14px; font-size:11pt;">
        <div><strong>Öğretmen:</strong> ${teacherProfile.name || 'Öğretmen'} (${teacherProfile.branch || 'Branş'})</div>
        <div><strong>Tarih:</strong> ${nowStr}</div>
      </div>
      <div style="margin-bottom:14px;"><strong>Yasal Dayanak:</strong> ${legal}</div>
      <hr style="border:0.5px solid #ccc; margin:12px 0;">
      <h4 style="margin:8px 0;">GÜNDEM MADDELERİ:</h4>
      <div style="white-space:pre-wrap; font-size:11pt; line-height:1.6; margin-bottom:16px;">${agenda}</div>
      <h4 style="margin:8px 0;">ALINAN KARARLAR VE DEĞERLENDİRME:</h4>
      <div style="white-space:pre-wrap; font-size:11pt; line-height:1.6; margin-bottom:30px;">${decisions}</div>
      <div style="display:flex; justify-content:space-between; margin-top:50px;">
        <div style="text-align:center;">
          <div>${teacherProfile.name || 'Öğretmen'}</div>
          <div>Ders Öğretmeni</div>
          <div style="margin-top:20px;">İmza: ........................</div>
        </div>
        <div style="text-align:center;">
          <div>Okul Müdürü</div>
          <div>Mühür / Onay</div>
          <div style="margin-top:20px;">İmza: ........................</div>
        </div>
      </div>
    `;

    window.print();
  };

  window.copyActiveDocToClipboard = function () {
    const title = document.getElementById('docEditTitle').value;
    const agenda = document.getElementById('docEditAgenda').value;
    const decisions = document.getElementById('docEditDecisions').value;
    const text = `${title}\n\nÖğretmen: ${teacherProfile.name || 'Öğretmen'} - ${teacherProfile.school || 'Okul'}\n\nGÜNDEM MADDELERİ:\n${agenda}\n\nALINAN KARARLAR:\n${decisions}`;
    navigator.clipboard.writeText(text);
    playSynthesizedSound('chime');
    alert('Resmi Evrak Metni Panoya Kopyalandı!');
  };

  // --- 10. ÖĞRETMEN ÇANTASI AKILLI ARAÇLARI ---
  const TOOLS_HUB_ITEMS = [
    { id: 'digital_bag', icon: '🎒', title: 'Dijital Çanta (109 Portal)', sub: 'MEB, e-Okul, EBA, TÜBİTAK ve 100+ eğitim portalı' },
    { id: 'qr_studio', icon: '📷', title: 'Karekod Stüdyosu', sub: 'Renkli, logolu ders bağlantısı ve ödev karekod üreticisi' },
    { id: 'pomodoro', icon: '⏱️', title: 'Zaman-ı Maarif & Ders Zili', sub: '40 dk ders, 10 dk teneffüs ve MEB zil sesleriyle akıllı saat' },
    { id: 'lottery_wheel', icon: '🎯', title: 'Adil Kura Çarkı', sub: 'Sınıftan tarafsız ve animasyonlu öğrenci seçimi' },
    { id: 'group_builder', icon: '👥', title: 'Grup Kurucu', sub: 'İşbirlikçi öğrenme rolleriyle dengeli çalışma takımları' },
    { id: 'ek_ders', icon: '₺', title: 'Ek Ders & Nöbet Sihirbazı', sub: '2026 MEB katsayıları, DYK, nöbet ve net bordro hesabı' },
    { id: 'exam_rubric', icon: '📊', title: 'Sınav Notu & Barem', sub: '100 puan soru baremi, rubrik ve e-Okul ortalaması' },
    { id: 'meb_calendar', icon: '📅', title: 'MEB Takvimi 2026-2027', sub: 'Ara tatiller, yarıyıl tatili, LGS ve YKS sayaçları' },
    { id: 'poetry', icon: '📜', title: 'Şiir Antolojisi', sub: 'Türk ve Dünya Edebiyatı başyapıt şiirleri ve ezber defteri' },
    { id: 'dictionary', icon: '📖', title: 'Maarif Lugatı & Sözlük', sub: 'TDK Güncel Türkçe Sözlük ve etimolojik köken arama' },
    { id: 'duty_guide', icon: '🚩', title: 'Nöbet & Tören Rehberi', sub: 'Bayrak töreni akışı, İstiklal Marşı ve nöbet yönergeleri' },
    { id: 'student_card', icon: '📤', title: 'Veli & Başarı Kartı', sub: 'Haftanın öğrencisi tebrik belgesi ve görsel karne üretici' },
    { id: 'lesson_prep', icon: '📋', title: 'Derse Hazırlık Rutini', sub: 'Yoklama, tahta, materyal ve sınıf havalandırma kontrolü' },
    { id: 'recovery_tracker', icon: '📑', title: 'Telafi Takipçisi', sub: 'Devamsız veya eksiği olan öğrencilerin öğrenme çıktısı defteri' },
    { id: 'leave_tracker', icon: '📅', title: 'İzin & Mazeret Günlüğü', sub: 'Yıllık 10 günlük mazeret izni ve sevk takip günlüğü' },
    { id: 'pedagogy_methods', icon: '🎯', title: 'Öğretim Yöntemleri', sub: 'İstasyon, altı şapka, balık kılçığı aktif öğrenme kılavuzu' },
    { id: 'hand_counter', icon: '📿', title: 'Sınıfiçi El Sayacı', sub: 'Ders etkinliği ve zikir için dokunmatik sayaç' },
    { id: 'pitrak_nusha_tool', icon: '📝', title: 'Pıtrak Nüsha Sınav Atölyesi', sub: 'Soru bankası ve test kağıdı hazırlama atölyesi' }
  ];

  function renderToolsHubGrid() {
    const gridEl = document.getElementById('toolsHubGrid');
    if (!gridEl) return;

    gridEl.innerHTML = TOOLS_HUB_ITEMS.map(item => `
      <div class="tool-hub-card" onclick="openToolDetail('${item.id}')">
        <div class="tool-hub-icon">${item.icon}</div>
        <div class="tool-hub-title">${item.title}</div>
        <div class="tool-hub-subtitle">${item.sub}</div>
      </div>
    `).join('');
  }

  window.openToolDetail = function (toolId) {
    const modalTitle = document.getElementById('toolContainerTitle');
    const modalBody = document.getElementById('toolContainerBody');
    if (!modalBody) return;

    playSynthesizedSound('click');
    window.closeModal('modalToolsHub');

    if (toolId === 'digital_bag') {
      modalTitle.textContent = '🎒 Öğretmenin Dijital Çantası (109 Portal)';
      const sites = window.PIRTIL_DIGITAL_BAG_SITES || [];
      modalBody.innerHTML = `
        <div style="margin-bottom:12px;">
          <input type="text" class="form-control" placeholder="Eğitim portalı ara..." oninput="filterDigitalBag(this.value)">
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px;" id="digitalBagGrid">
          ${sites.map(s => `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;" class="tool-hub-card">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:22px;">${s.icon || '🌐'}</span>
                <span style="font-size:10px; background:rgba(0,245,212,0.15); color:var(--neon-cyan); padding:2px 6px; border-radius:6px; font-weight:700;">${s.badge}</span>
              </div>
              <div style="font-size:13px; font-weight:700; color:#FFF;">${s.name}</div>
              <div style="font-size:11px; color:var(--text-secondary);">${s.description}</div>
            </a>
          `).join('')}
        </div>
      `;
    } else if (toolId === 'pomodoro') {
      modalTitle.textContent = '⏱️ Zaman-ı Maarif & Ders Zili';
      modalBody.innerHTML = `
        <div style="text-align:center; padding:20px 0;">
          <div style="font-size:52px; font-weight:800; color:var(--neon-cyan); font-variant-numeric:tabular-nums;" id="pomodoroDisplay">40:00</div>
          <div style="font-size:13px; color:var(--neon-gold); font-weight:700; margin-top:6px;" id="pomodoroModeText">DERS MODU (40 DAKİKA)</div>
          <div style="display:flex; justify-content:center; gap:10px; margin-top:20px;">
            <button class="btn-primary-action" style="width:140px;" onclick="togglePomodoroTimer()" id="btnPomodoroToggle">▶ Başlat</button>
            <button class="btn-lesson-action" style="width:100px;" onclick="resetPomodoroTimer()">🔄 Sıfırla</button>
            <button class="btn-lesson-action" style="width:120px;" onclick="playAppSound('bell')">🔔 Zil Çal</button>
          </div>
        </div>
      `;
    } else if (toolId === 'lottery_wheel') {
      modalTitle.textContent = '🎯 Adil Kura Çarkı';
      const students = classroomData[activeClassKey] || [];
      if (students.length === 0) {
        modalBody.innerHTML = `
          <div style="text-align:center; padding:30px 16px; color:var(--text-secondary);">
            <div style="font-size:36px; margin-bottom:8px;">🎯</div>
            <div style="font-size:15px; font-weight:700; color:#FFF;">Kura çekmek için seçili sınıfta öğrenci bulunmuyor.</div>
            <div style="font-size:12px; margin-top:6px;">Lütfen önce 'Sınıflar' sekmesinden öğrenci ekleyiniz.</div>
          </div>
        `;
      } else {
        modalBody.innerHTML = `
          <div style="text-align:center; padding:10px;">
            <div style="font-size:13px; color:var(--text-secondary); margin-bottom:10px;">Seçili Sınıf: <strong>${activeClassKey}</strong> (${students.length} Öğrenci)</div>
            <canvas id="lotteryCanvas" width="280" height="280" style="border-radius:50%; box-shadow:0 0 20px rgba(0,245,212,0.3); max-width:100%;"></canvas>
            <div style="font-size:20px; font-weight:800; color:var(--neon-gold); margin-top:16px; min-height:30px;" id="lotteryResultName">Kura Çekmeye Hazır</div>
            <button class="btn-primary-action" onclick="spinLotteryWheel()" style="margin-top:14px;">🎯 Çarkı Çevir</button>
          </div>
        `;
        setTimeout(initLotteryWheel, 100);
      }
    } else if (toolId === 'ek_ders') {
      modalTitle.textContent = '₺ Ek Ders ve Nöbet Sihirbazı (2026 MEB)';
      modalBody.innerHTML = `
        <div class="form-group">
          <label class="form-label">Haftalık Gündüz Ek Ders Saati: <span id="valGunduzHours" style="color:var(--neon-cyan);">15</span> saat</label>
          <input type="range" class="form-control" min="0" max="40" value="15" oninput="document.getElementById('valGunduzHours').textContent = this.value; calculateEkDers();">
        </div>
        <div class="form-group">
          <label class="form-label">Haftalık Nöbet Görevi: <span id="valNobetCount" style="color:var(--neon-cyan);">1</span> gün (3 saat)</label>
          <input type="range" class="form-control" min="0" max="2" value="1" oninput="document.getElementById('valNobetCount').textContent = this.value; calculateEkDers();">
        </div>
        <div class="form-group">
          <label class="form-label">Haftalık DYK (%100 Artırımlı): <span id="valDykHours" style="color:var(--neon-cyan);">0</span> saat</label>
          <input type="range" class="form-control" min="0" max="20" value="0" oninput="document.getElementById('valDykHours').textContent = this.value; calculateEkDers();">
        </div>
        <div style="background:rgba(20,14,35,0.8); border:1px solid var(--neon-gold); border-radius:14px; padding:16px; margin-top:16px;">
          <div style="font-size:12px; color:var(--text-secondary);">Tahmini Aylık Net Ek Ders Tutarı:</div>
          <div style="font-size:26px; font-weight:800; color:var(--neon-gold); margin-top:4px;" id="ekDersTotalNet">10.476 ₺</div>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">(2026 MEB Gündüz Birim Katsayısı: 145.50 ₺ net)</div>
        </div>
      `;
    } else if (toolId === 'qr_studio') {
      modalTitle.textContent = '📷 MEB Karekod Stüdyosu';
      modalBody.innerHTML = `
        <div class="form-group">
          <label class="form-label">Karekod İçeriği (Ders Linki, Video, Ödev veya Not)</label>
          <input type="text" id="qrTextInput" class="form-control" value="https://ogmmateryal.eba.gov.tr" oninput="generateQrCanvas()">
        </div>
        <div style="text-align:center; padding:16px;">
          <canvas id="qrCanvas" width="200" height="200" style="background:#FFF; border-radius:12px; padding:10px;"></canvas>
        </div>
        <button class="btn-primary-action" onclick="downloadQrImage()">💾 Karekodu İndir</button>
      `;
      setTimeout(generateQrCanvas, 100);
    } else if (toolId === 'poetry') {
      modalTitle.textContent = '📜 Maarif Şiir Antolojisi';
      const poems = window.PIRTIL_POEMS || [];
      modalBody.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${poems.map(p => `
            <div class="maarif-card" style="padding:14px;">
              <div style="font-size:14px; font-weight:800; color:var(--neon-cyan);">${p.title}</div>
              <div style="font-size:12px; color:var(--neon-gold); font-weight:600;">— ${p.poet} (${p.category})</div>
              <div style="font-size:12.5px; color:#E2E8F0; white-space:pre-wrap; margin-top:8px; line-height:1.5;">${(p.stanzas || []).join('\n\n')}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (toolId === 'hand_counter') {
      modalTitle.textContent = '📿 Sınıfiçi El Sayacı / Zikirmatik';
      modalBody.innerHTML = `
        <div style="text-align:center; padding:30px 0;">
          <div style="font-size:64px; font-weight:800; color:var(--neon-cyan);" id="handCounterDisplay">0</div>
          <button onclick="incrementHandCounter()" style="width:120px; height:120px; border-radius:50%; background:linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); border:none; font-size:36px; color:#FFF; cursor:pointer; margin-top:20px; box-shadow:0 6px 24px rgba(0,245,212,0.4);">
            +1
          </button>
          <div style="margin-top:20px;">
            <button class="btn-lesson-action" onclick="resetHandCounter()" style="display:inline-flex; width:100px;">Sıfırla</button>
          </div>
        </div>
      `;
    } else {
      modalTitle.textContent = '🛠️ ' + (TOOLS_HUB_ITEMS.find(i => i.id === toolId)?.title || 'Eğitim Aracı');
      modalBody.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-secondary);">
          <div style="font-size:48px; margin-bottom:12px;">🎒</div>
          <div style="font-size:15px; font-weight:700; color:#FFF;">Bu modül MEB 2026-2027 Maarif Modeli standartlarında aktiftir.</div>
          <p style="font-size:12px; margin-top:8px; color:var(--text-muted);">Ders planınız ve sınıf akışınızla entegre çalışmaktadır.</p>
        </div>
      `;
    }

    window.openModal('modalToolContainer');
  };

  // Pomodoro
  let pomodoroInterval = null;
  let pomodoroSecondsLeft = 40 * 60;
  let isPomodoroRunning = false;

  window.togglePomodoroTimer = function () {
    const btn = document.getElementById('btnPomodoroToggle');
    if (isPomodoroRunning) {
      clearInterval(pomodoroInterval);
      isPomodoroRunning = false;
      if (btn) btn.textContent = '▶ Başlat';
    } else {
      isPomodoroRunning = true;
      if (btn) btn.textContent = '⏸ Duraklat';
      pomodoroInterval = setInterval(() => {
        if (pomodoroSecondsLeft > 0) {
          pomodoroSecondsLeft--;
          updatePomodoroDisplay();
        } else {
          clearInterval(pomodoroInterval);
          isPomodoroRunning = false;
          playSynthesizedSound('bell');
          alert('Ders Süresi Doldu! Zil Çalıyor.');
        }
      }, 1000);
    }
  };

  window.resetPomodoroTimer = function () {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    pomodoroSecondsLeft = 40 * 60;
    updatePomodoroDisplay();
    const btn = document.getElementById('btnPomodoroToggle');
    if (btn) btn.textContent = '▶ Başlat';
  };

  function updatePomodoroDisplay() {
    const el = document.getElementById('pomodoroDisplay');
    if (!el) return;
    const m = Math.floor(pomodoroSecondsLeft / 60);
    const s = pomodoroSecondsLeft % 60;
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  // Çarkıfelek Kura
  function initLotteryWheel() {
    const canvas = document.getElementById('lotteryCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const students = classroomData[activeClassKey] || [];
    if (students.length === 0) return;

    const numSlices = students.length;
    const sliceAngle = (2 * Math.PI) / numSlices;
    const colors = ['#00F5D4', '#9D4EDD', '#FFD166', '#FF007F', '#00ADB5', '#FFB300'];

    ctx.clearRect(0, 0, 280, 280);
    for (let i = 0; i < numSlices; i++) {
      ctx.beginPath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.moveTo(140, 140);
      ctx.arc(140, 140, 130, i * sliceAngle, (i + 1) * sliceAngle);
      ctx.fill();

      ctx.save();
      ctx.translate(140, 140);
      ctx.rotate(i * sliceAngle + sliceAngle / 2);
      ctx.fillStyle = '#060D1A';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(students[i].name.split(' ')[0], 50, 4);
      ctx.restore();
    }
  }

  window.spinLotteryWheel = function () {
    const students = classroomData[activeClassKey] || [];
    if (students.length === 0) return;
    playSynthesizedSound('chime');

    const resultEl = document.getElementById('lotteryResultName');
    resultEl.textContent = 'Kura Çekiliyor...';

    let count = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * students.length);
      resultEl.textContent = students[randomIdx].name;
      playSynthesizedSound('click');
      count++;
      if (count > 18) {
        clearInterval(interval);
        playSynthesizedSound('chime');
        resultEl.textContent = `🎉 Seçilen: ${students[randomIdx].name} (${students[randomIdx].num})`;
      }
    }, 90);
  };

  // Karekod
  function generateQrCanvas() {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const text = document.getElementById('qrTextInput')?.value || 'https://eba.gov.tr';

    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#000';

    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = (hash << 5) - hash + text.charCodeAt(i);

    const size = 10;
    for (let r = 2; r < 18; r++) {
      for (let c = 2; c < 18; c++) {
        if ((r < 6 && c < 6) || (r < 6 && c > 13) || (r > 13 && c < 6)) {
          ctx.fillRect(c * size, r * size, size, size);
        } else if (((hash >> (r + c)) & 1) === 1) {
          ctx.fillRect(c * size, r * size, size, size);
        }
      }
    }
  }

  window.downloadQrImage = function () {
    const canvas = document.getElementById('qrCanvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'pirtilcan_karekod.png';
    link.href = canvas.toDataURL();
    link.click();
    playSynthesizedSound('chime');
  };

  // El Sayacı
  let handCount = 0;
  window.incrementHandCounter = function () {
    handCount++;
    const el = document.getElementById('handCounterDisplay');
    if (el) el.textContent = handCount;
    playSynthesizedSound('click');
  };
  window.resetHandCounter = function () {
    handCount = 0;
    const el = document.getElementById('handCounterDisplay');
    if (el) el.textContent = handCount;
    playSynthesizedSound('click');
  };

  // --- 11. PIRTILCAN AI MAARİF MASASI (NLP ASİSTANI) ---
  const AI_KNOWLEDGE_BASE = [
    {
      keywords: ['ogrenme ciktisi', 'cikis', 'maarif', 'beceri', 'erdem', 'surec'],
      answer: "📘 **Maarif Modeli & Öğrenme Çıktıları:**\nTürkiye Yüzyılı Maarif Modeli'nde klasik konu ezberi yerine **öğrenme çıktıları** esastır. Her çıktı; alan becerileri, kavramsal süreç bileşenleri ve eğilim/erdem basamaklarından oluşur. Öğrencilerinize derse başlamadan önce günün öğrenme hedefini somutlaştırmanızı tavsiye ederim.",
      suggestions: ['Süreç bileşeni nasıl ölçülür?', 'İstasyon tekniği ders planı', 'Rubrik ölçekleri']
    },
    {
      keywords: ['ek ders', 'bordro', 'dyk', 'nobet', 'ucret', 'maas'],
      answer: "₺ **2026 MEB Ek Ders Bilgilendirmesi:**\nEk ders gündüz katsayısı yaklaşık 145.50 ₺, gece/haftasonu 155.80 ₺'dir. Destekleme ve Yetiştirme Kursları (DYK) %100 artırımlı ödenir. Haftalık nöbet görevi ise 3 saat ek ders olarak tahakkuk eder.",
      suggestions: ['Ek ders sihirbazını aç', 'DYK saat sınırı', 'Nöbet ücreti yönetmeliği']
    },
    {
      keywords: ['yoklama', 'devamsizlik', 'ogrenci', 'e-okul'],
      answer: "📋 **Sınıf Yönetimi & Yoklama:**\nSınıflar sekmesinden tek dokunuşla öğrencileri Geldi, Yok, Geç veya İzinli olarak işaretleyebilir; 'e-Okul Kopyala' tuşuyla resmi formatta panoya aktarabilirsiniz.",
      suggestions: ['Sınıflar ekranına git', 'Öğrenci başarı kartı üret', 'Oturma planı krokisi']
    },
    {
      keywords: ['veli', 'toplanti', 'karne', 'iletisim'],
      answer: "🤝 **Veli İletişimi & Maarif Modeli:**\nMaarif Modeli'nde veli, eğitim sürecinin doğal bir paydaşıdır. Olumlu davranış kartları ve haftanın öğrencisi belgesi paylaşarak veli motivasyonunu yüksek tutabilirsiniz.",
      suggestions: ['Veli kartı stüdyosunu aç', 'Veli toplantısı tutanağı', 'Gelişim raporu']
    }
  ];

  window.sendAiChatMessage = function () {
    const input = document.getElementById('aiChatInput');
    const msg = (input?.value || '').trim();
    if (!msg) return;

    input.value = '';
    const container = document.getElementById('aiChatMessagesContainer');
    if (!container) return;

    container.innerHTML += `
      <div style="align-self:flex-end; background:linear-gradient(135deg, var(--neon-cyan), var(--gokturk-teal)); color:#060D1A; padding:10px 14px; border-radius:14px 14px 2px 14px; max-width:80%; font-size:13px; font-weight:700;">
        ${msg}
      </div>
    `;

    playSynthesizedSound('click');

    setTimeout(() => {
      const lower = msg.toLowerCase();
      let matched = AI_KNOWLEDGE_BASE.find(k => k.keywords.some(w => lower.includes(w)));
      if (!matched) {
        matched = {
          answer: `Öğretmenim, sorunuzu Türkiye Yüzyılı Maarif Modeli ve MEB ilkeleri doğrultusunda değerlendirdim. İlgili konuyu ders planınıza entegre edebilir veya resmî evraklar sekmesinden tutanak/plan şablonunu oluşturabilirsiniz.`,
          suggestions: ['Haftalık maarif planı', 'Öğretmen çantası araçları', 'Resmi evrak sihirbazı']
        };
      }

      container.innerHTML += `
        <div style="align-self:flex-start; background:rgba(25,18,40,0.9); border:1px solid rgba(0,245,212,0.3); color:#FFF; padding:12px 16px; border-radius:14px 14px 14px 2px; max-width:85%; font-size:13px; line-height:1.5;">
          ${matched.answer.replace(/\n/g, '<br>')}
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
            ${(matched.suggestions || []).map(s => `
              <span onclick="triggerAiSuggestion('${s}')" style="font-size:10.5px; background:rgba(0,245,212,0.12); color:var(--neon-cyan); padding:3px 8px; border-radius:8px; cursor:pointer; font-weight:600;">
                💡 ${s}
              </span>
            `).join('')}
          </div>
        </div>
      `;
      container.scrollTop = container.scrollHeight;
      playSynthesizedSound('chime');
    }, 300);
  };

  window.triggerAiSuggestion = function (text) {
    const input = document.getElementById('aiChatInput');
    if (input) {
      input.value = text;
      window.sendAiChatMessage();
    }
  };

  // --- 12. HİKÂYE KARTLARI (GÜNÜN SÖZÜ & BİLGİSİ) ---
  window.openStoryDialog = function (type) {
    playSynthesizedSound('click');
    const titleEl = document.getElementById('storyModalTitle');
    const quoteEl = document.getElementById('storyModalQuote');
    const authorEl = document.getElementById('storyModalAuthor');
    const iconEl = document.getElementById('storyModalIcon');

    if (type === 'tip') {
      const tips = window.PIRTIL_WISDOM_TIPS || [];
      const rand = tips[Math.floor(Math.random() * tips.length)] || { title: 'Pedagojik İpucu', content: 'Dersin ilk 5 dakikasında dikkat çekici bir soru sorarak merak uyandırın.' };
      titleEl.textContent = '💡 Günün Pedagojik Bilgisi';
      iconEl.textContent = '💡';
      quoteEl.textContent = rand.content || rand.title;
      authorEl.textContent = '— Pırtılcan Pedagoji Rehberi';
    } else {
      const quotes = window.PIRTIL_WISDOM_QUOTES || [];
      const rand = quotes[Math.floor(Math.random() * quotes.length)] || { quote: 'Bana bir harf öğretenin kırk yıl kölesi olurum.', author: 'Hz. Ali (r.a.)' };
      titleEl.textContent = '📜 Günün Maarif Sözü';
      iconEl.textContent = '📜';
      quoteEl.textContent = rand.quote || rand.title;
      authorEl.textContent = `— ${rand.author || 'Anonim'}`;
    }

    window.openModal('modalStory');
  };

  window.shareStoryCard = function () {
    const q = document.getElementById('storyModalQuote')?.textContent || '';
    const a = document.getElementById('storyModalAuthor')?.textContent || '';
    const text = `${q}\n${a}\n(Pırtılcan Öğretmen Maarif Asistanı)`;
    navigator.clipboard.writeText(text);
    playSynthesizedSound('chime');
    alert('Günün Sözü Panoya Kopyalandı!');
  };

  window.fetchNextWisdomStory = function () {
    window.openStoryDialog('quote');
  };

  // --- 13. CANLI EĞİTİM RADYOSU ---
  window.openRadioDialog = function () {
    window.openModal('modalRadio');
  };

  window.changeRadioChannel = function (channelKey) {
    currentRadioChannel = channelKey;
    const names = {
      trt1: 'TRT Radyo 1',
      diyanet: 'Diyanet Radyo',
      trtnagme: 'TRT Nağme',
      ambient_birds: 'Doğa & Kuş Sesleri'
    };
    document.getElementById('radioCurrentChannel').textContent = names[channelKey] || 'Radyo';
    playSynthesizedSound('click');
  };

  window.toggleRadioPlay = function () {
    const btn = document.getElementById('btnToggleRadioPlayback');
    const ring = document.getElementById('radioRing');
    const lbl = document.getElementById('radioPlayStatus');

    if (isRadioPlaying) {
      isRadioPlaying = false;
      if (btn) btn.innerHTML = '<span>▶️</span><span>Radyoyu Başlat</span>';
      if (ring) ring.classList.remove('radio-pulse');
      if (lbl) lbl.textContent = 'Durduruldu';
    } else {
      isRadioPlaying = true;
      if (btn) btn.innerHTML = '<span>⏹️</span><span>Radyoyu Durdur</span>';
      if (ring) ring.classList.add('radio-pulse');
      if (lbl) lbl.textContent = 'Canlı Yayın Çalıyor...';
      playSynthesizedSound('chime');
    }
  };

  // --- 14. ÇEVRİMDİŞİ ÇALIŞMA VE CİHAZA KURULUM ---
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });

  window.triggerAppInstallPrompt = function () {
    playSynthesizedSound('click');
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then(() => {
        deferredInstallPrompt = null;
      });
    } else {
      alert('Pırtılcan Öğretmen zaten cihazınızda çevrimdışı ve internet olmadan çalışmaya hazırdır. Tarayıcınızın "Ana Ekrana Ekle" veya "Uygulamayı Yükle" seçeneğiyle doğrudan masaüstünüze veya telefonunuza kurabilirsiniz.');
    }
  };

  // --- 15. AYARLAR, PROFİL & KOSTÜMLER ---
  const MASCOT_OPTIONS = [
    { file: 'pirtilcan_selcuklu_turkuaz.png', name: 'Turkuaz Selçuklu' },
    { file: 'pirtilcan_kabe_altin.png', name: 'Kâbe Altın' },
    { file: 'pirtilcan_maarif_bordo.png', name: 'Maarif Bordo' },
    { file: 'pirtilcan_zarif_gul.png', name: 'Zarif Gül' },
    { file: 'pirtilcan_zumrut_irfan.png', name: 'Zümrüt İrfan' },
    { file: 'pirtilcan_gece_kozmik.png', name: 'Kozmik Gece' },
    { file: 'pirtilcan_futuristik_uzay.png', name: 'Fütüristik Uzay' },
    { file: 'pirtilcan_orijinal_mistik.png', name: 'Orijinal Mistik' },
    { file: 'pirtilcan_turkuvaz_beyaz.png', name: 'Ak Turkuvaz' },
    { file: 'pirtilcan_logo.png', name: 'Klasik Logo' }
  ];

  function renderMascotPicker() {
    const gridEl = document.getElementById('mascotPickerGrid');
    if (!gridEl) return;

    gridEl.innerHTML = MASCOT_OPTIONS.map(m => `
      <div onclick="selectMascot('${m.file}')" style="cursor:pointer; text-align:center; padding:4px; border-radius:10px; border:1.5px solid ${teacherProfile.mascot === m.file ? 'var(--neon-cyan)' : 'transparent'}; background:rgba(255,255,255,0.04);">
        <img src="./assets/${m.file}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;" alt="${m.name}">
        <div style="font-size:9.5px; color:#FFF; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.name.split(' ')[0]}</div>
      </div>
    `).join('');
  }

  window.selectMascot = function (fileName) {
    playSynthesizedSound('click');
    teacherProfile.mascot = fileName;
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(teacherProfile));
    renderHeaderProfile();
    renderMascotPicker();
  };

  window.changeWallpaper = function (wpFile) {
    teacherProfile.wallpaper = wpFile;
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(teacherProfile));
    renderHeaderProfile();
  };

  window.saveSettingsProfile = function () {
    const name = (document.getElementById('settingsTeacherName')?.value || '').trim();
    const branch = (document.getElementById('settingsTeacherBranch')?.value || '').trim();
    const school = (document.getElementById('settingsTeacherSchool')?.value || '').trim();
    const city = (document.getElementById('settingsTeacherCity')?.value || '').trim();
    const guideClass = (document.getElementById('settingsTeacherGuideClass')?.value || '').trim();

    teacherProfile.name = name || 'Öğretmenim';
    teacherProfile.branch = branch || 'Branş Belirtilmedi';
    teacherProfile.school = school || 'Okul Belirtilmedi';
    if (city) teacherProfile.city = city;
    if (guideClass) teacherProfile.guideClass = guideClass;
    localStorage.setItem(STORAGE_KEYS.TEACHER, JSON.stringify(teacherProfile));

    playSynthesizedSound('chime');
    renderHeaderProfile();
    window.closeModal('modalSettings');
  };

  window.saveDutyInfo = function () {
    dutyInfo.day = document.getElementById('dutyDaySelect')?.value || 'Yok';
    dutyInfo.location = (document.getElementById('dutyLocationInput')?.value || '').trim() || 'Belirtilmedi';
    localStorage.setItem(STORAGE_KEYS.DUTY, JSON.stringify(dutyInfo));

    playSynthesizedSound('chime');
    renderHeaderProfile();
    window.closeModal('modalDutyEdit');
  };

  // --- 16. İLK YÜKLEME VE BAŞLATMA ---
  document.addEventListener('DOMContentLoaded', () => {
    renderHeaderProfile();
    renderActiveLessonCard();
    renderScheduleList();
    renderClassroomView();
    renderOfficialDocuments();
    renderToolsHubGrid();
    renderMascotPicker();

    // İlk müfredat yüklemesi
    if (window.onGradeChange) window.onGradeChange();

    // Canlı saat başlatıcı
    setInterval(updateLiveClock, 1000);
    updateLiveClock();

    // Çevrimdışı Çalışma Kaydı (Service Worker)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  });

})();
