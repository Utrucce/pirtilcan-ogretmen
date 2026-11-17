# 🐛 Pırtılcan Öğretmen - MEB Maarif Modeli Asistanı (Web & PWA)

Türkiye Yüzyılı Maarif Modeli ile %100 uyumlu, öğretmenlerin sınıf defteri, haftalık kazanımlar, ek ders hesabı, nöbet takibi ve sınıf içi kura çarkı ihtiyaçlarını tek bir çatı altında toplayan modern web ve mobil (PWA) asistanı.

---

## 🌟 Öne Çıkan Özellikler

### 1. 🏠 Ana Panel (İslam Vakti Tarzı Kozmik Arayüz)
- **Canlı Ders ve Zil Sayacı:** Günün ders programı, aktif ders vurgusu (`ŞU AN`), teneffüse ve zillere kalan sürenin canlı geri sayımı.
- **Hızlı Sekizgen Butonlar:**
  - 🔔 **Zil:** MEB okul zili çalma (Web Audio API ve ses dosyası desteği).
  - 🛡️ **Nöbet:** Kat ve gün nöbet bilgisi paneli.
  - ⏱️ **Sayaç:** Ders içi sessizlik ve odaklanma sayacı.
- **Kazanım Cepte:** Sağ kenarda sabit, tek tıkla haftalık kazanımlara götüren akıllı şerit.

### 2. 👥 Sınıfım (Yoklama, Defter & Kura)
- **Canlı Yoklama:** Geldi, Yok, Geç Kaldı, İzinli durumları ve anlık sınıf katılım yüzdesi.
- **Öğrenci Puanlama:** Her öğrenciye `+` ve `-` puan ekleyerek sınıf içi katılımı takip etme.
- **🎲 Kura Çarkı:** Tahtaya rastgele öğrenci kaldırmak veya soru yöneltmek için akıllı kura motoru.
- **Resmi Defter Metni:** O haftanın MEB müfredatına uygun resmi kazanım ifadesini tek tıkla panoya kopyalama.
- **Öğretmen Ders Notu:** Hızlı hatırlatıcı ve ders notu kaydetme (LocalStorage).

### 3. 📖 MEB Yıllık Planlar & Kazanımlar
- **Sınıf Seviyeleri:** 8. Sınıf, 7. Sınıf, 6. Sınıf, 5. Sınıf filtreleri.
- **Haftalık Müfredat:** 1. haftadan 36. haftaya kadar tüm tema ve öğrenme çıktıları.
- **Tek Tıkla Kopyala:** Deftere yazılacak MEB kazanım ifadesini anında kopyalama.
- **Canlı Arama:** Kazanım kodu (örn. `T.8.3.14`), tema veya konu adına göre anlık filtreleme.
- **Tamamlandı Takibi:** İşlenen haftaları işaretleyerek `+20 XP` kazanma.

### 4. 🏆 Gelişim (7 Öğretmenlik Mertebesi & Bahçe Ağacı)
- **7 Öğretmenlik Mertebesi:**
  1. Aday Öğretmen (0 - 500 XP)
  2. Muallim (500 - 1500 XP)
  3. Kıdemli Öğretmen (1500 - 3000 XP)
  4. Başöğretmen (3000 - 5000 XP)
  5. Maarif Rehberi (5000 - 8000 XP)
  6. Üstat Muallim (8000 - 12000 XP)
  7. Maarif Kutbu (12000+ XP)
- **🌱 Pırtılcan Maarif Bahçesi:** Kazanılan XP ve işlenen planlarla kademe kademe büyüyen dinamik HTML5 ağaç simülasyonu.
- **Maarif Modeli Kartları:** Sınıf yönetimi, ölçme-değerlendirme ve pedagojik pratik tavsiyeler.

### 5. 🤖 Dijital Muallim (Pırtılcan Refik)
- Orta gezinme çubuğunda öne çıkan sevimli Pırtılcan maskotu.
- Ek ders, nöbet, sınıf yönetimi ve MEB mevzuatı hakkında rehberlik eden sohbet botu.

### 6. 🧰 Öğretmen Alet Çantası (Araçlar)
- **MEB Çalışma Takvimi:** 1. Ara Tatil, Yarıyıl Tatili, 2. Ara Tatil ve LGS 2027 sınavına kalan gün sayacı.
- **MEB Ek Ders Hesaplayıcı:** Gündüz, gece/hafta sonu, nöbet (+3 saat), kulüp (+2 saat), DYK (2 kat) ve özel eğitim (%25 artırımlı) katsayılarıyla güncel net ücret hesabı.
- **Nöbet Görevi:** Gün ve nöbet yeri/kat belirleme.
- **Evrak Şablonları:** Zümre, Veli Toplantısı, ŞÖK ve Performans Değerlendirme Ölçeği şablonları.
- **MEB Portalları:** MEBBİS, EBA, e-Okul, Maarif Modeli ve ÖBA direkt bağlantıları.

### 7. 🪶 Pıtrak Nüsha (Dahili İnternetsiz Soru Atölyesi)
- Uygulama içinde gömülü, internetsiz çalışan soru yazma ve optik form oluşturma stüdyosu.

---

## 🚀 GitHub Pages'e Yükleme (1 Tıkla Dağıtım)

1. Klasörün içindeki `github-yukle.bat` dosyasını çift tıklayarak çalıştırın.
2. GitHub'da `pirtilcan-ogretmen` adıyla oluşturduğunuz yeni deponun adresini girin.
3. GitHub repo ayarlarınızdan:
   - **Settings** -> **Pages** sekmesine gidin.
   - **Source:** `Deploy from a branch`
   - **Branch:** `main` ve `/ (root)` seçip **Save** butonuna basın.
4. `https://<kullanici-adiniz>.github.io/pirtilcan-ogretmen/` adresiniz 2-3 dakika içinde hazır!

---

## 📱 Telefona / Bilgisayara Yükleme (PWA)

Bu uygulama bir **Progressive Web App (PWA)** standartındadır:
- **Android / Chrome:** Tarayıcıda açtıktan sonra üstteki *"Pırtılcan'ı Telefona Yükle"* butonuna veya tarayıcı menüsünden *"Uygulamayı Yükle / Ana Ekrana Ekle"* seçeneğine tıklayın.
- **iOS / Safari:** *"Paylaş"* butonuna basıp *"Ana Ekrana Ekle"* deyin.
- **Windows / Mac (Masaüstü):** Adres çubuğundaki yükle ikonuna basarak bağımsız bir masaüstü uygulaması gibi çalıştırabilirsiniz.
- **Çevrimdışı Çalışma:** İnternet bağlantınız kopsa bile Service Worker sayesinde tüm müfredat ve araçlar kesintisiz çalışmaya devam eder.

---

## 📜 Lisans & Yasal Beyan
Bu uygulama bağımsız olarak geliştirilmiş olup öğretmenlerin ders yönetimini kolaylaştırmak amacıyla hazırlanmıştır. Resmî MEB duyuruları ve işlemler için resmî MEB portallarını (meb.gov.tr, mebbis.meb.gov.tr) ziyaret ediniz.
