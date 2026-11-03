<?php

declare(strict_types=1);

namespace App\Logging;

use Monolog\LogRecord;

final class RedactSensitiveDataProcessor
{
    /**
     * @var list<string>
     */
    private const SENSITIVE_KEYS = [
        'api_key',
        'authorization',
        'cookie',
        'image_base64',
        'password',
        'password_confirmation',
        'refresh_token',
        'secret',
        'signature',
        'token',
        'access_token',
    ];

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(
            context: $this->redact($record->context),
            extra: $this->redact($record->extra),
            message: $this->redactMessage($record->message),
        );
    }

    private function redact(mixed $value, ?string $key = null): mixed
    {
        if ($key !== null && $this->isSensitiveKey($key)) {
            return '[REDACTED]';
        }

        if (! is_array($value)) {
            return $value;
        }

        $redacted = [];

        foreach ($value as $childKey => $childValue) {
            $redacted[$childKey] = $this->redact(
                $childValue,
                is_string($childKey) ? $childKey : null,
            );
        }

        return $redacted;
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower(str_replace(['-', ' '], '_', $key));

        return in_array($normalized, self::SENSITIVE_KEYS, true)
            || str_ends_with($normalized, '_token')
            || str_ends_with($normalized, '_secret');
    }

    private function redactMessage(string $message): string
    {
        return (string) preg_replace(
            '/(Bearer\s+|password\s*[=:]\s*|token\s*[=:]\s*)[^\s,;]+/i',
            '$1[REDACTED]',
            $message,
        );
    }
}
