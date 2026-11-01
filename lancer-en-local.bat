@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Collecte des actus...
python scripts\fetch_news.py
echo.
echo L'application tourne sur http://localhost:8000
echo Sur ton telephone (meme Wi-Fi), ouvre http://ADRESSE-IP-DU-PC:8000
echo Adresse IP de ce PC :
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do echo    %%a
echo.
echo Ferme cette fenetre pour arreter.
start "" http://localhost:8000
python -m http.server 8000 --directory docs
