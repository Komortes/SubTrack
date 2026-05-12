<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'notify_three_days',
        'notify_one_day',
        'notify_same_day',
        'notification_time',
        'primary_currency',
        'date_format',
        'theme',
    ];

    protected $casts = [
        'notify_three_days' => 'boolean',
        'notify_one_day' => 'boolean',
        'notify_same_day' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
