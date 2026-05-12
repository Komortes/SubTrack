<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('subscription_id')->constrained()->cascadeOnDelete();
            $table->timestamp('paid_at');
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3);
            $table->timestamps();

            $table->index(['subscription_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_records');
    }
};
