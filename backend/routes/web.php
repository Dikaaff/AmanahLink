<?php

use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

Route::get('/healthz', [HealthController::class, 'healthz'])->name('healthz');
Route::get('/readyz', [HealthController::class, 'readyz'])->name('readyz');

Route::get('/', function () {
    return view('welcome');
});
