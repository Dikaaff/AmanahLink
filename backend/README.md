# AmanahLink — Backend API

Laravel 13 API untuk platform donasi purpose-bound. Dokumentasi lengkap
(arsitektur, setup, endpoint, konfigurasi, testing, dan batasan) ada di
[`README.md` utama](../README.md).

## Menjalankan cepat

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
php artisan queue:work   # terminal terpisah untuk job OCR
```

Test (butuh MySQL `amanahlink_test`):

```bash
php artisan test
```

Status eksekusi per story: [`docs/progress.md`](../docs/progress.md).
Keputusan arsitektur: [`DECISIONS.md`](../DECISIONS.md).
