<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use LogsActivity;

    protected $fillable = ['key', 'value'];
}
