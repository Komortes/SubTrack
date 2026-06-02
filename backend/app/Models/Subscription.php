<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Subscription extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = [
        'id',
        'user_id',
        'name',
        'amount',
        'currency',
        'billing_period',
        'custom_period_days',
        'renewal_date',
        'category',
        'icon_slug',
        'color',
        'notes',
        'is_active',
        'is_trial',
        'is_archived',
        'cancel_reminder_days',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'renewal_date' => 'date',
        'is_active' => 'boolean',
        'is_trial' => 'boolean',
        'is_archived' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function notificationLogs(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    public function paymentRecords(): HasMany
    {
        return $this->hasMany(PaymentRecord::class)->latest('paid_at');
    }
}
