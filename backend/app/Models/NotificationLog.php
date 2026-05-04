<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NotificationLog extends Model
{
    use HasFactory;
    use HasUuids;

    protected $fillable = ['user_id', 'subscription_id', 'scheduled_for', 'offset_days', 'sent_at'];

    protected $casts = [
        'scheduled_for' => 'date',
        'sent_at' => 'datetime',
    ];
}

