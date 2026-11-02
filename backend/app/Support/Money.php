<?php

declare(strict_types=1);

namespace App\Support;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use InvalidArgumentException;

/**
 * Immutable money value object for IDR amounts.
 *
 * Amounts are never represented as float. Input is accepted as a numeric
 * string or an integer; results are always rounded to 2 decimal places
 * with HALF_UP only for derived values (multiplication / percentage).
 */
final class Money
{
    public const SCALE = 2;

    public const CURRENCY = 'IDR';

    private function __construct(private readonly BigDecimal $amount) {}

    public static function of(mixed $value): self
    {
        if ($value instanceof self) {
            return $value;
        }

        if (! is_string($value) && ! is_int($value)) {
            throw new InvalidArgumentException(
                'Money must be created from a numeric string or an integer; floats are not allowed.'
            );
        }

        $raw = is_int($value) ? (string) $value : $value;

        if (preg_match('/^-?\d+(\.\d{1,2})?$/', $raw) !== 1) {
            throw new InvalidArgumentException(
                "Invalid money value [{$raw}]. Expected a numeric string with at most 2 decimals."
            );
        }

        return new self(BigDecimal::of($raw)->toScale(self::SCALE));
    }

    public static function zero(): self
    {
        return self::of(0);
    }

    public static function fromMinorUnits(int $minorUnits): self
    {
        $absolute = abs($minorUnits);
        $value = intdiv($absolute, 100).'.'.str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);

        return self::of(($minorUnits < 0 ? '-' : '').$value);
    }

    public static function sum(self ...$values): self
    {
        $total = BigDecimal::zero();

        foreach ($values as $value) {
            $total = $total->plus($value->amount);
        }

        return new self($total->toScale(self::SCALE));
    }

    public function plus(self ...$others): self
    {
        $total = $this->amount;

        foreach ($others as $other) {
            $total = $total->plus($other->amount);
        }

        return new self($total->toScale(self::SCALE));
    }

    public function minus(self $other): self
    {
        return new self($this->amount->minus($other->amount)->toScale(self::SCALE));
    }

    public function multipliedBy(string|int $factor): self
    {
        $raw = (string) $factor;

        if (preg_match('/^-?\d+(\.\d+)?$/', $raw) !== 1) {
            throw new InvalidArgumentException("Invalid multiplier [{$raw}].");
        }

        return new self(
            $this->amount
                ->multipliedBy(BigDecimal::of($raw))
                ->toScale(self::SCALE, RoundingMode::HalfUp)
        );
    }

    public function percentOf(string|int $percent): self
    {
        $raw = (string) $percent;

        if (preg_match('/^\d+(\.\d+)?$/', $raw) !== 1) {
            throw new InvalidArgumentException("Invalid percentage [{$raw}].");
        }

        $rate = BigDecimal::of($raw)->dividedBy(100, 10, RoundingMode::HalfUp);

        return new self(
            $this->amount->multipliedBy($rate)->toScale(self::SCALE, RoundingMode::HalfUp)
        );
    }

    /**
     * Display-only ratio (e.g. progress bar). Never used for money arithmetic.
     */
    public function percentageOf(self $whole): string
    {
        if ($whole->isZero()) {
            return '0.00';
        }

        return (string) $this->amount
            ->multipliedBy(100)
            ->dividedBy($whole->amount, 2, RoundingMode::HalfUp);
    }

    public function compareTo(self $other): int
    {
        return $this->amount->compareTo($other->amount);
    }

    public function equals(self $other): bool
    {
        return $this->compareTo($other) === 0;
    }

    public function isZero(): bool
    {
        return $this->amount->isZero();
    }

    public function isPositive(): bool
    {
        return $this->amount->isPositive();
    }

    public function isNegative(): bool
    {
        return $this->amount->isNegative();
    }

    public function isGreaterThan(self $other): bool
    {
        return $this->compareTo($other) > 0;
    }

    public function isLessThan(self $other): bool
    {
        return $this->compareTo($other) < 0;
    }

    public function toDecimalString(): string
    {
        return (string) $this->amount;
    }

    /**
     * Exact integer representation in cents (1/100 of the currency unit).
     */
    public function toMinorUnits(): int
    {
        return $this->amount->getUnscaledValue()->toInt();
    }

    public function format(string $symbol = 'Rp'): string
    {
        [$whole, $fraction] = explode('.', $this->toDecimalString());

        $negative = str_starts_with($whole, '-');
        $whole = ltrim($whole, '-');
        $grouped = strrev(implode('.', str_split(strrev($whole), 3)));

        return ($negative ? "-{$symbol}" : $symbol)." {$grouped},{$fraction}";
    }

    public function __toString(): string
    {
        return $this->toDecimalString();
    }
}
