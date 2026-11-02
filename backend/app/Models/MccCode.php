<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'title', 'category', 'is_blocked', 'is_active'])]
class MccCode extends Model
{
    use HasFactory;

    protected $primaryKey = 'code';

    public $incrementing = false;

    protected $keyType = 'string';

    protected function casts(): array
    {
        return [
            'is_blocked' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function merchants(): HasMany
    {
        return $this->hasMany(Merchant::class, 'mcc', 'code');
    }
}
