<?php

namespace App\Traits;

use App\Models\ActivityLog;

trait LogsActivity
{
    public static function bootLogsActivity(): void
    {
        static::created(function ($model) {
            ActivityLog::log('created', $model, null, self::filterValues($model->toArray()));
        });

        static::updated(function ($model) {
            $changes = $model->getChanges();
            unset($changes['updated_at']);

            if (empty($changes)) {
                return;
            }

            $old = self::filterValues(array_intersect_key($model->getOriginal(), $changes));
            $new = self::filterValues($changes);

            ActivityLog::log('updated', $model, $old, $new);
        });

        static::deleted(function ($model) {
            ActivityLog::log('deleted', $model, self::filterValues($model->toArray()), null);
        });
    }

    private static function filterValues(array $values): array
    {
        $excluded = ['password', 'remember_token'];

        return array_diff_key($values, array_flip($excluded));
    }
}
