@echo off
REM Backup database + foto. Sesuaikan 3 baris di bawah dengan lokasi Anda.
cd /d C:\palapa
set DATA_DIR=C:\palapa-data
"C:\Program Files\nodejs\node.exe" deploy\backup.js D:\backup\palapa
