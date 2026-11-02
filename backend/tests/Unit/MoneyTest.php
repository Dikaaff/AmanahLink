<?php

namespace Tests\Unit;

use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_it_normalizes_integers_and_strings_to_two_decimals(): void
    {
        $this->assertSame('100000.00', Money::of(100000)->toDecimalString());
        $this->assertSame('100000.50', Money::of('100000.5')->toDecimalString());
        $this->assertSame('0.00', Money::zero()->toDecimalString());
    }

    public function test_it_rejects_float_input(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of(100.0);
    }

    public function test_it_rejects_more_than_two_decimals(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of('1.005');
    }

    public function test_it_rejects_non_numeric_strings(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::of('seratus ribu');
    }

    public function test_addition_has_no_float_drift(): void
    {
        $total = Money::of('0.10')->plus(Money::of('0.20'));

        $this->assertSame('0.30', $total->toDecimalString());
    }

    public function test_subtraction_is_exact(): void
    {
        $result = Money::of('1000000.00')->minus(Money::of('0.01'));

        $this->assertSame('999999.99', $result->toDecimalString());
    }

    public function test_sum_of_many_amounts(): void
    {
        $total = Money::sum(
            Money::of('50000'),
            Money::of('25000.50'),
            Money::of('0.50'),
        );

        $this->assertSame('75001.00', $total->toDecimalString());
    }

    public function test_multiplication_rounds_half_up(): void
    {
        $this->assertSame('15.02', Money::of('10.01')->multipliedBy('1.5')->toDecimalString());
    }

    public function test_percentage_of_amount(): void
    {
        $this->assertSame('2000.00', Money::of('100000')->percentOf('2')->toDecimalString());
    }

    public function test_percentage_rounds_half_up(): void
    {
        $this->assertSame('19.98', Money::of('999')->percentOf('2')->toDecimalString());
        $this->assertSame('0.02', Money::of('1')->percentOf('2')->toDecimalString());
    }

    public function test_comparisons(): void
    {
        $small = Money::of('1000');
        $large = Money::of('2000');

        $this->assertTrue($large->isGreaterThan($small));
        $this->assertTrue($small->isLessThan($large));
        $this->assertSame(0, $small->compareTo(Money::of('1000.00')));
        $this->assertTrue($small->equals(Money::of('1000.00')));
        $this->assertFalse($small->isZero());
        $this->assertTrue(Money::zero()->isZero());
    }

    public function test_it_converts_to_and_from_minor_units_exactly(): void
    {
        $this->assertSame(123456, Money::of('1234.56')->toMinorUnits());
        $this->assertSame(7, Money::of('0.07')->toMinorUnits());
        $this->assertSame('1234.56', Money::fromMinorUnits(123456)->toDecimalString());
        $this->assertSame('0.07', Money::fromMinorUnits(7)->toDecimalString());
        $this->assertSame('-1.05', Money::fromMinorUnits(-105)->toDecimalString());
    }

    public function test_it_formats_indonesian_rupiah(): void
    {
        $this->assertSame('Rp 1.000.000,00', Money::of('1000000')->format());
        $this->assertSame('Rp 999,50', Money::of('999.5')->format());
        $this->assertSame('Rp 0,00', Money::zero()->format());
    }

    public function test_it_formats_negative_amounts(): void
    {
        $this->assertSame('-Rp 1.000,00', Money::of('-1000')->format());
    }
}
