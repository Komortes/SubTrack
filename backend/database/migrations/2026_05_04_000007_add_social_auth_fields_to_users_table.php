<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('password')->nullable()->change();
            $table->string('name')->nullable()->after('email');
            $table->string('avatar_url')->nullable()->after('name');
            $table->string('google_id')->nullable()->unique()->after('avatar_url');
            $table->timestamp('last_synced_at')->nullable()->after('remember_token');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['name', 'avatar_url', 'google_id', 'last_synced_at']);
            $table->string('password')->nullable(false)->change();
        });
    }
};
