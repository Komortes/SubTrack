<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('is_trial')->default(false)->after('is_active');
            $table->boolean('is_archived')->default(false)->after('is_trial');
            $table->unsignedTinyInteger('cancel_reminder_days')->nullable()->after('is_archived');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['is_trial', 'is_archived', 'cancel_reminder_days']);
        });
    }
};
