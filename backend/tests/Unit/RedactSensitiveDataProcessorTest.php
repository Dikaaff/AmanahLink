<?php

namespace Tests\Unit;

use App\Logging\RedactSensitiveDataProcessor;
use DateTimeImmutable;
use Monolog\Level;
use Monolog\LogRecord;
use PHPUnit\Framework\TestCase;

final class RedactSensitiveDataProcessorTest extends TestCase
{
    public function test_sensitive_context_extra_and_message_values_are_redacted(): void
    {
        $record = new LogRecord(
            new DateTimeImmutable,
            'testing',
            Level::Info,
            'Authorization: Bearer top-secret token=abc123',
            [
                'authorization' => 'Bearer top-secret',
                'nested' => ['password' => 'secret-password', 'safe' => 'visible'],
            ],
            ['access_token' => 'token-value', 'trace_id' => '01TEST'],
        );

        $redacted = (new RedactSensitiveDataProcessor)($record);

        $this->assertSame('[REDACTED]', $redacted->context['authorization']);
        $this->assertSame('[REDACTED]', $redacted->context['nested']['password']);
        $this->assertSame('visible', $redacted->context['nested']['safe']);
        $this->assertSame('[REDACTED]', $redacted->extra['access_token']);
        $this->assertSame('01TEST', $redacted->extra['trace_id']);
        $this->assertSame('Authorization: Bearer [REDACTED] token=[REDACTED]', $redacted->message);
    }
}
