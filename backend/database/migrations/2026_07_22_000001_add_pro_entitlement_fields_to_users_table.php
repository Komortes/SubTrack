<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('revenuecat_app_user_id')->nullable()->unique()->after('google_id');
            $table->boolean('is_pro')->default(false)->after('revenuecat_app_user_id');
            $table->timestamp('pro_expires_at')->nullable()->after('is_pro');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['revenuecat_app_user_id', 'is_pro', 'pro_expires_at']);
        });
    }
};
