@echo off
chcp 65001 > nul
title Pırtılcan Öğretmen - GitHub Pages Yükleme Aracı
color 0B

echo ======================================================================
echo          PIRTILCAN ÖĞRETMEN - GİTHUB PAGES YÜKLEME ARACI
echo ======================================================================
echo.
echo Bu araç, Pırtılcan Öğretmen web uygulamanızı doğrudan GitHub Pages'e
echo yüklemenizi sağlar.
echo.

:: Git kontrolü
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [HATA] Bilgisayarınızda Git yüklü görünmüyor!
    echo Lütfen Git indirip kurduktan sonra tekrar deneyin: https://git-scm.com/
    pause
    exit /b
)

:: Git repository kontrolü
if not exist ".git" (
    echo [1/4] Git deposu başlatılıyor...
    git init
    git branch -M main
) else (
    echo [1/4] Mevcut Git deposu bulundu.
)

echo [2/4] Tüm dosyalar ekleniyor...
git add .

echo [3/4] Değişiklikler paketleniyor (commit)...
git commit -m "Pırtılcan Öğretmen MEB Maarif Web ve PWA Sürümü"

echo.
echo [4/4] GitHub Bağlantısı Kontrolü...
git remote -v >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ------------------------------------------------------------------
    echo Henüz GitHub uzak depo (remote) adresiniz bağlı değil!
    echo.
    echo 1. GitHub hesabınızda "pirtilcan-ogretmen" adında yeni bir depo açın.
    echo 2. Aşağıdaki satıra deponuzun adresini yapıştırıp Enter'a basın:
    echo    (Örnek: https://github.com/KULLANICI_ADINIZ/pirtilcan-ogretmen.git)
    echo ------------------------------------------------------------------
    set /p repo_url="GitHub Repo URL: "
    if not "%repo_url%"=="" (
        git remote add origin %repo_url%
        echo Depo adresi eklendi: %repo_url%
        echo.
        echo GitHub'a yükleniyor (Push)...
        git push -u origin main
    )
) else (
    echo GitHub'a yükleniyor (Push)...
    git push origin main
)

echo.
echo ======================================================================
echo                   TEBRİKLER! İŞLEM TAMAMLANDI!
echo ======================================================================
echo.
echo GitHub Pages'i aktif etmek için:
echo 1. GitHub'da deponuza gidin (Settings -> Pages).
echo 2. 'Source' kısmında "Deploy from a branch" seçin.
echo 3. 'Branch' olarak "main" ve "/ (root)" seçip "Save" butonuna tıklayın.
echo 4. Birkaç dakika sonra siteniz yayında olacaktır!
echo.
pause
