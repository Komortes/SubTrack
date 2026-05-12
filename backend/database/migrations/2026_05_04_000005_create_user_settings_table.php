<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->boolean('notify_three_days')->default(true);
            $table->boolean('notify_one_day')->default(true);
            $table->boolean('notify_same_day')->default(true);
            $table->time('notification_time')->default('09:00');
            $table->string('primary_currency', 3)->default('CZK');
            $table->string('date_format')->default('DD.MM.YYYY');
            $table->string('theme')->default('system');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_settings');
    }
};
