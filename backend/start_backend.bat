@echo off
cd /d "%~dp0"
echo Starting Laravel backend...
php artisan serve --host=127.0.0.1 --port=8000 > backend_output.log 2> backend_error.log