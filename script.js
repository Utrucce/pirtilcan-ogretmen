/**
 * Pırtılcan Öğretmen - Yeni Nesil Maarif Asistanı Web & PWA Motoru
 * Orijinal Android Jetpack Compose 1-e-1 Birebir Sürümü
 */

// ========================================================
// 1. STATE & STORAGE
// ========================================================
const PirtilState = {
  xp: parseInt(localStorage.getItem('pirtil_xp') || '255', 10),
  activeTab: 'ana',
  activeGradeId: 'grade_8',
  activeClassroomId: 'class_8a',
  dutyDay: localStorage.getItem('pirtil_duty_day') || 'Çarşamba',
  dutyLocation: localStorage.getItem('pirtil_duty_loc') || '2. Kat Koridor & Merdivenler',
  
  meta: { grades: [], subjects: [] },
  annualPlans: [],
  documentTemplates: [],
  maarifCards: [],
  quotes: [],
  mebCalendar: [],
  classrooms: [],

  addXp(amount) {
    this.xp += amount;
    localStorage.setItem('pirtil_xp', this.xp.toString());
    updateXpDisplays();
    showToast(`+${amount} XP Kazanıldı! (Toplam: ${this.xp} XP)`);
  }
};

// ========================================================
// 2. AUDIO & HAPTICS
// ========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    const AudioClass = window.AudioContext || window.webkitAudioContext;
    if (AudioClass) audioCtx = new AudioClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
document.addEventListener('click', initAudio, { once: true });

function playSchoolBell() {
  initAudio();
  const audio = new Audio('./assets/audio/school_bell.wav');
  audio.play().catch(() => synthesizeSchoolBell());
  triggerHaptic(80);
}

function playDingSound() {
  initAudio();
  const audio = new Audio('./assets/audio/ding.wav');
  audio.play().catch(() => synthesizeDing());
  triggerHaptic(40);
}

function synthesizeSchoolBell() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.50];
  freqs.forEach((f, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, now + i * 0.25);
    gain.gain.setValueAtTime(0.3, now + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 1.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now + i * 0.25);
    osc.stop(now + i * 0.25 + 1.2);
  });
}

function synthesizeDing() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(880, now);
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.6);
}

function triggerHaptic(duration = 40) {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(duration); } catch (_) {}
  }
}

// ========================================================
// 3. TOAST & CLIPBOARD
// ========================================================
function showToast(message) {
  const toast = document.getElementById('toastNotice');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function copyToClipboard(text, successMsg = 'Panoya kopyalandı!') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
      playDingSound();
    }).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
    playDingSound();
  } catch (e) {
    showToast('Kopyalama başarısız oldu.');
  }
  document.body.removeChild(ta);
}

function copyCurrentDefterPhrase() {
  const el = document.getElementById('currentDefterPhraseText');
  if (el) {
    copyToClipboard(el.innerText.trim(), '📋 Sınıf defteri metni kopyalandı!');
  }
}

// ========================================================
// 4. DATA LOADER
// ========================================================
async function loadAllData() {
  try {
    if (window.__PIRTIL_INITIAL_DATA__) {
      PirtilState.meta = window.__PIRTIL_INITIAL_DATA__.meta;
      PirtilState.annualPlans = window.__PIRTIL_INITIAL_DATA__.annualPlans;
      PirtilState.documentTemplates = window.__PIRTIL_INITIAL_DATA__.documentTemplates;
      PirtilState.maarifCards = window.__PIRTIL_INITIAL_DATA__.maarifCards;
      PirtilState.quotes = window.__PIRTIL_INITIAL_DATA__.quotes;
      PirtilState.mebCalendar = window.__PIRTIL_INITIAL_DATA__.mebCalendar;
    } else {
      const [metaRes, plansRes, docsRes, cardsRes, quotesRes, calRes] = await Promise.all([
        fetch('./assets/curriculum_meta.json').then(r => r.json()),
        fetch('./assets/annual_plans.json').then(r => r.json()),
        fetch('./assets/document_templates.json').then(r => r.json()),
        fetch('./assets/maarif_cards.json').then(r => r.json()),
        fetch('./assets/maarif_quotes.json').then(r => r.json()),
        fetch('./assets/meb_calendar.json').then(r => r.json())
      ]);
      PirtilState.meta = metaRes;
      PirtilState.annualPlans = plansRes;
      PirtilState.documentTemplates = docsRes;
      PirtilState.maarifCards = cardsRes;
      PirtilState.quotes = quotesRes;
      PirtilState.mebCalendar = calRes;
    }
  } catch (err) {
    console.warn('Data fetch fallback:', err);
  }

  loadDefaultClassrooms();
  renderAllViews();
}

function loadDefaultClassrooms() {
  const saved = localStorage.getItem('pirtil_classrooms');
  if (saved) {
    try {
      PirtilState.classrooms = JSON.parse(saved);
      return;
    } catch (_) {}
  }

  PirtilState.classrooms = [
    {
      id: 'class_8a',
      name: '8/A Sınıfı',
      students: [
        { id: 1, no: '104', name: 'Ahmet Faruk Yılmaz', plus: 4, minus: 0, status: 'geldi' },
        { id: 2, no: '215', name: 'Ayşe Zeynep Demir', plus: 6, minus: 1, status: 'geldi' },
        { id: 3, no: '328', name: 'Bilal Eren Şahin', plus: 3, minus: 0, status: 'geldi' },
        { id: 4, no: '412', name: 'Ceren Karaca', plus: 5, minus: 0, status: 'geldi' },
        { id: 5, no: '530', name: 'Emir Kaan Yıldız', plus: 2, minus: 2, status: 'gec' },
        { id: 6, no: '645', name: 'Fatma Zehra Öztürk', plus: 7, minus: 0, status: 'geldi' },
        { id: 7, no: '718', name: 'Mehmet Akif Aydın', plus: 4, minus: 1, status: 'izinli' },
        { id: 8, no: '822', name: 'Selin Su Çelik', plus: 5, minus: 0, status: 'geldi' }
      ]
    }
  ];
  saveClassrooms();
}

function saveClassrooms() {
  localStorage.setItem('pirtil_classrooms', JSON.stringify(PirtilState.classrooms));
}

// ========================================================
// 5. NAVIGATION & TAB SWITCHER
// ========================================================
function switchTab(tabId) {
  PirtilState.activeTab = tabId;

  // Panels
  document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`panel-${tabId}`);
  if (target) target.classList.add('active');

  // Bottom Nav Buttons
  document.querySelectorAll('.nav-item-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`nav-btn-${tabId}`);
  if (activeBtn) activeBtn.classList.add('active');

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tabId === 'bahcem') {
    renderGardenTree();
  }
}

function switchSinifSubtab(subId) {
  const tabs = ['yoklama', 'defter', 'ses'];
  tabs.forEach(t => {
    const pane = document.getElementById(`subpanel-sinif-${t}`);
    const btn = document.getElementById(`btn-sinif-sub-${t}`);
    if (pane) pane.style.display = (t === subId) ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', t === subId);
  });
}

function switchToolboxPane(index) {
  const panes = [
    'toolbox-pane-portallar',
    'toolbox-pane-evrak',
    'toolbox-pane-zaman',
    'toolbox-pane-ekders'
  ];
  panes.forEach((p, idx) => {
    const el = document.getElementById(p);
    if (el) el.style.display = (idx === index) ? 'block' : 'none';
  });
  document.querySelectorAll('.toolbox-subtab').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === index);
  });
}

// ========================================================
// 6. RENDER ALL VIEWS
// ========================================================
function renderAllViews() {
  updateXpDisplays();
  renderCalendarMatrix();
  renderStudentsList();
  renderKazanimlarView();
  initHomeTickingTimer();
  initCircularTimer();
  renderGardenTree();
  initKuraWheel();
}

function updateXpDisplays() {
  const xpEl = document.getElementById('topHeaderXpText');
  if (xpEl) xpEl.textContent = `Öğretmen (${PirtilState.xp} XP)`;
}

// --------------------------------------------------------
// LIVE TIMERS
// --------------------------------------------------------
function initHomeTickingTimer() {
  let secondsLeft = 18 * 60 + 45; // 18 dk 45 sn
  const totalSeconds = 40 * 60; // 40 dk

  setInterval(() => {
    if (secondsLeft > 0) secondsLeft--;
    const m = Math.floor(secondsLeft / 60);
    const s = secondsLeft % 60;
    const digitsEl = document.getElementById('homeTickingTimerDigits');
    if (digitsEl) digitsEl.textContent = `${m} Dakika ${s.toString().padStart(2, '0')} Saniye`;

    const percent = Math.min(100, Math.round(((totalSeconds - secondsLeft) / totalSeconds) * 100));
    const percentEl = document.getElementById('homeTimerPercentText');
    const barEl = document.getElementById('homeTimerProgressBar');
    if (percentEl) percentEl.textContent = `%${percent} Tamamlandı`;
    if (barEl) barEl.style.width = `${percent}%`;
  }, 1000);
}

function initCircularTimer() {
  let circularSeconds = 26 * 60 + 40;
  setInterval(() => {
    if (circularSeconds > 0) circularSeconds--;
    const m = Math.floor(circularSeconds / 60);
    const s = circularSeconds % 60;
    const el = document.getElementById('circularTimerDisplay');
    if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

// --------------------------------------------------------
// TAB 2: KAZANIMLAR VIEW
// --------------------------------------------------------
function renderKazanimlarView() {
  const container = document.getElementById('plansListContainer');
  if (!container) return;

  const searchVal = (document.getElementById('kazanimSearchInput')?.value || '').toLowerCase().trim();
  let plans = PirtilState.annualPlans.filter(p => p.gradeId === PirtilState.activeGradeId);

  if (plans.length === 0) {
    plans = PirtilState.annualPlans;
  }

  if (searchVal) {
    plans = plans.filter(p =>
      (p.tema && p.tema.toLowerCase().includes(searchVal)) ||
      (p.kazanimKodu && p.kazanimKodu.toLowerCase().includes(searchVal)) ||
      (p.kazanimAciklama && p.kazanimAciklama.toLowerCase().includes(searchVal)) ||
      (p.defterMetni && p.defterMetni.toLowerCase().includes(searchVal))
    );
  }

  container.innerHTML = plans.map(p => `
    <div class="plan-item-card">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="plan-item-week-badge">${p.hafta}. Hafta • ${p.tarihAraligi || 'Ders Planı'}</span>
        <button style="background:transparent; border:none; color:#00E5FF; font-size:11px; font-weight:700; cursor:pointer;" onclick="copyToClipboard('${(p.defterMetni || '').replace(/'/g, "\\'")}', 'Defter metni kopyalandı!')">📋 Kopyala</button>
      </div>

      <div class="plan-item-tema">${p.tema}</div>
      <div class="plan-item-desc">
        <strong>Öğrenme Çıktısı:</strong> ${p.kazanimAciklama || ''}
      </div>

      <div style="background:#07101E; padding:8px 10px; border-radius:10px; border-left:3px solid #00E5FF; margin-bottom:10px;">
        <div style="font-size:10px; color:#94A3B8;">DEFTERE YAZILACAK İFADE:</div>
        <div style="font-size:11.5px; color:#FFF; font-weight:500;">${p.defterMetni || ''}</div>
      </div>

      <button class="btn-print-plan" onclick="showToast('${p.hafta}. Hafta planı hazırlandı!'); playDingSound();">
        🖨️ Haftalık Planı Hazırla & Yazdır
      </button>
    </div>
  `).join('');
}

// --------------------------------------------------------
// TAB 3: BAHÇEM (GÖREVLER & TREE CANVAS)
// --------------------------------------------------------
function toggleTask(cardEl, xpReward) {
  const isCompleted = cardEl.classList.toggle('completed');
  const circle = cardEl.querySelector('.task-checkbox-circle');
  if (isCompleted) {
    if (circle) circle.textContent = '✓';
    PirtilState.addXp(xpReward);
    playDingSound();
  } else {
    if (circle) circle.textContent = '';
  }
}

function renderGardenTree() {
  const canvas = document.getElementById('gardenTreeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth - 24;
  const h = canvas.height = 160;

  ctx.clearRect(0, 0, w, h);

  // Night gradient
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#040C1A');
  grad.addColorStop(1, '#091B33');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Hill / Soil
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 20, w * 0.7, 50, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#064E3B';
  ctx.fill();

  // Tree trunk
  ctx.beginPath();
  ctx.moveTo(w / 2 - 10, h - 20);
  ctx.lineTo(w / 2 - 6, h - 80);
  ctx.lineTo(w / 2 + 6, h - 80);
  ctx.lineTo(w / 2 + 10, h - 20);
  ctx.fillStyle = '#78350F';
  ctx.fill();

  // Foliage with radiant glow
  const foliageRadius = 38;
  const cx = w / 2;
  const cy = h - 90;

  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, foliageRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#10B981';
  ctx.fill();
  ctx.shadowBlur = 0;

  // Fruit or Maarif Light Sparkles
  const fruits = [
    {x: cx - 14, y: cy - 10},
    {x: cx + 16, y: cy - 6},
    {x: cx - 4, y: cy + 14},
    {x: cx + 6, y: cy - 20}
  ];
  fruits.forEach(f => {
    ctx.beginPath();
    ctx.arc(f.x, f.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FBBF24';
    ctx.fill();
  });
}

// --------------------------------------------------------
// TAB 4: SINIFIM (CALENDAR MATRIX & STUDENTS)
// --------------------------------------------------------
function renderCalendarMatrix() {
  const grid = document.getElementById('calendarMatrixGrid');
  if (!grid) return;

  const cells = [];
  for (let i = 1; i <= 28; i++) {
    let colorClass = 'cal-color-1';
    if (i % 3 === 0) colorClass = 'cal-color-2';
    else if (i % 4 === 0) colorClass = 'cal-color-3';

    cells.push(`<div class="cal-day-cell ${colorClass}">${i}</div>`);
  }
  grid.innerHTML = cells.join('');
}

function renderStudentsList() {
  const container = document.getElementById('studentsListContainer');
  if (!container) return;

  const currentClass = PirtilState.classrooms[0];
  if (!currentClass) return;

  container.innerHTML = currentClass.students.map(s => `
    <div class="student-row">
      <div class="student-badge-no">${s.no}</div>
      <div class="student-info-col">
        <div class="student-name">${s.name}</div>
        <div class="student-score">Puan: +${s.plus} / -${s.minus}</div>
      </div>
      <div class="attendance-pills-group">
        <button class="att-pill ${s.status === 'geldi' ? 'active-g' : ''}" onclick="setStudentStatus(${s.id}, 'geldi')">G</button>
        <button class="att-pill ${s.status === 'yok' ? 'active-y' : ''}" onclick="setStudentStatus(${s.id}, 'yok')">Y</button>
        <button class="att-pill ${s.status === 'gec' ? 'active-gc' : ''}" onclick="setStudentStatus(${s.id}, 'gec')">GÇ</button>
        <button class="att-pill ${s.status === 'izinli' ? 'active-i' : ''}" onclick="setStudentStatus(${s.id}, 'izinli')">İ</button>
      </div>
    </div>
  `).join('');
}

function setStudentStatus(studentId, status) {
  const currentClass = PirtilState.classrooms[0];
  if (!currentClass) return;
  const s = currentClass.students.find(st => st.id === studentId);
  if (s) {
    s.status = status;
    saveClassrooms();
    renderStudentsList();
    showToast(`${s.name}: ${status.toUpperCase()} işaretlendi.`);
  }
}

// --------------------------------------------------------
// MODAL: ADİL KURA ÇARKI (PlayStore 05)
// --------------------------------------------------------
function initKuraWheel() {
  const canvas = document.getElementById('kuraWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const colors = ['#EC4899', '#10B981', '#F59E0B', '#06B6D4', '#8B5CF6', '#FBBF24'];
  const segments = 6;
  const anglePer = (Math.PI * 2) / segments;

  for (let i = 0; i < segments; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.arc(w / 2, h / 2, w / 2 - 4, i * anglePer, (i + 1) * anglePer);
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    ctx.stroke();
  }
}

let isSpinning = false;
function spinKuraWheel() {
  if (isSpinning) return;
  isSpinning = true;
  playDingSound();

  const canvas = document.getElementById('kuraWheelCanvas');
  let currentRotation = 0;
  const totalSpins = 360 * 4 + Math.floor(Math.random() * 360);
  const startTime = performance.now();
  const duration = 2200;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    currentRotation = totalSpins * easeOut;

    if (canvas) {
      canvas.style.transform = `rotate(${currentRotation}deg)`;
      canvas.style.transition = 'none';
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSpinning = false;
      const currentClass = PirtilState.classrooms[0];
      const students = currentClass ? currentClass.students : [];
      const winner = students[Math.floor(Math.random() * students.length)] || { name: 'Ahmet Faruk Yılmaz', no: '104' };

      const disp = document.getElementById('kuraSelectedStudentDisplay');
      if (disp) disp.innerHTML = `🎯 <strong>Seçilen:</strong> ${winner.name} (No: ${winner.no})`;
      playSchoolBell();
      showToast(`🎉 Kura Kazananı: ${winner.name}!`);
    }
  }
  requestAnimationFrame(animate);
}

// --------------------------------------------------------
// TAB 5: EK DERS & EVRAK
// --------------------------------------------------------
function calculateEkDers() {
  const regHours = parseFloat(document.getElementById('ekDersRegular')?.value || '18') || 0;
  const nightHours = parseFloat(document.getElementById('ekDersNight')?.value || '0') || 0;
  const duty = document.getElementById('ekDersDuty')?.checked ? 3 : 0;
  const club = document.getElementById('ekDersClub')?.checked ? 2 : 0;
  const dyk = document.getElementById('ekDersDyk')?.checked;
  const special = document.getElementById('ekDersSpecial')?.checked;

  let totalWeekly = regHours + nightHours + duty + club;
  let mult = 1.0;
  if (dyk) mult *= 2.0;
  if (special) mult *= 1.25;

  const unitRate = 145.45; // MEB 2026 tahmini ek ders saat ücreti
  const monthlyHours = totalWeekly * 4.2;
  const totalAmount = Math.round(monthlyHours * unitRate * mult);

  const totalEl = document.getElementById('ekDersTotalMoney');
  const weeklyEl = document.getElementById('ekDersWeeklyHours');
  const monthlyEl = document.getElementById('ekDersMonthlyHours');

  if (totalEl) totalEl.textContent = `₺ ${totalAmount.toLocaleString('tr-TR')}`;
  if (weeklyEl) weeklyEl.textContent = `${totalWeekly.toFixed(1)} Saat / Hafta`;
  if (monthlyEl) monthlyEl.textContent = `${monthlyHours.toFixed(1)} Saat / Ay`;
}

function downloadDocTemplate() {
  const content = `
T.C. MİLLÎ EĞİTİM BAKANLIĞI
CUMHURİYET ORTAOKULU MÜDÜRLÜĞÜ
2026-2027 Sene Başı Zümre Tutanağı

2026-2027 Eğitim Öğretim Yılı sene başı zümre toplantısı Türkiye Yüzyılı Maarif Modeli esasları doğrultusunda okul zümre odasında gerçekleştirilmiştir.
Alınan kararlar doğrultusunda öğrenme çıktıları tematik takvime bağlanmıştır.
  `.trim();

  const blob = new Blob([content], { type: 'application/msword;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '2026-2027_Sene_Basi_Zumre_Tutanagi.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('📄 Word tutanak şablonu indirildi!');
}

// --------------------------------------------------------
// MODALS LOGIC
// --------------------------------------------------------
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function handlePirtilcanChat() {
  const input = document.getElementById('pirtilChatInput');
  const box = document.getElementById('pirtilChatMessages');
  if (!input || !box) return;

  const text = input.value.trim();
  if (!text) return;

  // Add user bubble
  const userDiv = document.createElement('div');
  userDiv.style.cssText = 'background:#1E293B; color:#FFF; padding:8px 10px; border-radius:10px; font-size:11.5px; align-self:flex-end; max-width:85%;';
  userDiv.textContent = text;
  box.appendChild(userDiv);
  input.value = '';

  // Smart auto response
  setTimeout(() => {
    let reply = 'Sorunuzu Maarif Modeli ve MEB mevzuatı doğrultusunda inceliyorum...';
    const lower = text.toLowerCase();
    if (lower.includes('ek ders') || lower.includes('ücret')) {
      reply = 'Haftalık ek dersiniz ve nöbet/kulüp saatleriniz Alet Çantası sekmesinde otomatik hesaplanmaktadır.';
    } else if (lower.includes('kazanım') || lower.includes('plan')) {
      reply = 'Bu haftanın kazanımı: T.8.3.13. Cümlenin temel ögelerini belirler. Kazanımlar sekmesinden detaylı planı yazdırabilirsiniz.';
    } else if (lower.includes('nöbet')) {
      reply = 'Nöbet göreviniz: Çarşamba günü 2. Kat Koridor & Merdivenler olarak kayıtlıdır.';
    } else if (lower.includes('defter')) {
      reply = 'Defter metni: "Cümlenin ögelerine giriş yapıldı; yüklem ve özne bulma stratejileri uygulandı." tek tıkla kopyalayabilirsiniz.';
    }

    const botDiv = document.createElement('div');
    botDiv.style.cssText = 'background:#0C2033; border:1px solid #00E5FF; color:#E0F2FE; padding:8px 10px; border-radius:10px; font-size:11.5px; max-width:88%;';
    botDiv.innerHTML = `🐛 <strong>Pırtılcan:</strong> ${reply}`;
    box.appendChild(botDiv);
    box.scrollTop = box.scrollHeight;
    playDingSound();
  }, 400);
}

// --------------------------------------------------------
// STARRY BACKGROUND CANVAS
// --------------------------------------------------------
function initStarryBackground() {
  const canvas = document.getElementById('starryBackgroundCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const stars = Array.from({ length: 45 }).map(() => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 1.5 + 0.6,
    speed: Math.random() * 0.02 + 0.01
  }));

  let tick = 0;
  function draw() {
    tick += 0.02;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#060D1A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach((s, idx) => {
      const alpha = 0.3 + Math.sin(tick + idx) * 0.35;
      ctx.beginPath();
      ctx.arc(s.x * canvas.width, s.y * canvas.height, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// --------------------------------------------------------
// PWA INITIALIZATION
// --------------------------------------------------------
let deferredPrompt = null;
function initPWA() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(() => console.log('[PWA] ServiceWorker registered.'))
      .catch(err => console.warn('[PWA] SW registration failed:', err));
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.add('show');
  });

  const installBtn = document.getElementById('pwaInstallBtn');
  if (installBtn) {
    installBtn.addEventListener('click', () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
          deferredPrompt = null;
          const banner = document.getElementById('pwaInstallBanner');
          if (banner) banner.classList.remove('show');
        });
      }
    });
  }
}

// --------------------------------------------------------
// INIT ON DOM READY
// --------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initStarryBackground();
  initPWA();
  loadAllData();
  calculateEkDers();

  const searchInput = document.getElementById('kazanimSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', renderKazanimlarView);
  }

  const params = new URLSearchParams(window.location.search);
  const targetTab = params.get('tab');
  if (targetTab) switchTab(targetTab);
});
