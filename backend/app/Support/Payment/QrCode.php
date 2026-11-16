<?php

declare(strict_types=1);

namespace App\Support\Payment;

use InvalidArgumentException;

/**
 * Minimal QR Code encoder for the simulated QRIS instruction of the offline
 * payment driver.
 *
 * Only the subset the demo rail needs is implemented: byte payloads up to 213
 * bytes, error correction level M, versions 1-10, mask pattern 0, and SVG
 * output so rendering does not depend on the GD extension. Payloads are
 * deterministic for the same input, which keeps idempotent replays identical.
 */
final class QrCode
{
    /**
     * Error correction level M block layout per version:
     * [EC codewords per block, group 1 blocks, group 1 data codewords,
     * group 2 blocks, group 2 data codewords].
     *
     * @var array<int, array{0: int, 1: int, 2: int, 3: int, 4: int}>
     */
    private const BLOCK_LAYOUT = [
        1 => [10, 1, 16, 0, 0],
        2 => [16, 1, 28, 0, 0],
        3 => [26, 1, 44, 0, 0],
        4 => [18, 2, 32, 0, 0],
        5 => [24, 2, 43, 0, 0],
        6 => [16, 4, 27, 0, 0],
        7 => [18, 4, 31, 0, 0],
        8 => [22, 2, 38, 2, 39],
        9 => [22, 3, 36, 2, 37],
        10 => [26, 4, 43, 1, 44],
    ];

    /**
     * Alignment pattern centres per version.
     *
     * @var array<int, list<int>>
     */
    private const ALIGNMENT_CENTRES = [
        1 => [],
        2 => [6, 18],
        3 => [6, 22],
        4 => [6, 26],
        5 => [6, 30],
        6 => [6, 34],
        7 => [6, 22, 38],
        8 => [6, 24, 42],
        9 => [6, 26, 46],
        10 => [6, 28, 50],
    ];

    private const MAX_BYTES = 213;

    private const MASK_PATTERN = 0;

    private const FORMAT_GENERATOR = 0x537;

    private const FORMAT_MASK = 0x5412;

    private const VERSION_GENERATOR = 0x1F25;

    private int $version;

    private int $size;

    /**
     * Module grid. `null` marks a free module, booleans mark either a function
     * pattern module or an already mapped data module.
     *
     * @var array<int, array<int, bool|null>>
     */
    private array $modules = [];

    /**
     * @var array<int, int>
     */
    private static array $exponents = [];

    /**
     * @var array<int, int>
     */
    private static array $logarithms = [];

    public function __construct(private readonly string $data)
    {
        if ($this->data === '') {
            throw new InvalidArgumentException('QR payload tidak boleh kosong.');
        }

        /** @var list<int> $bytes */
        $bytes = array_values(unpack('C*', $this->data) ?: []);

        $this->version = self::selectVersion(count($bytes));
        $this->size = 17 + 4 * $this->version;
        $this->modules = array_fill(0, $this->size, array_fill(0, $this->size, null));

        $this->drawFunctionPatterns();
        $this->mapData(self::createCodewords($this->version, $bytes));
    }

    /**
     * Render the encoded payload as an SVG data URI, ready for an `<img src>`.
     */
    public static function svgDataUri(string $data, int $scale = 8, int $quietZone = 4): string
    {
        return 'data:image/svg+xml;base64,'.base64_encode((new self($data))->svg($scale, $quietZone));
    }

    public function svg(int $scale = 8, int $quietZone = 4): string
    {
        $scale = max(1, $scale);
        $quietZone = max(0, $quietZone);
        $dimension = ($this->size + 2 * $quietZone) * $scale;

        $path = '';

        for ($row = 0; $row < $this->size; $row++) {
            $column = 0;

            while ($column < $this->size) {
                if ($this->modules[$row][$column] !== true) {
                    $column++;

                    continue;
                }

                $start = $column;

                while ($column < $this->size && $this->modules[$row][$column] === true) {
                    $column++;
                }

                $x = ($start + $quietZone) * $scale;
                $y = ($row + $quietZone) * $scale;
                $run = ($column - $start) * $scale;

                $path .= "M{$x} {$y}h{$run}v{$scale}h-{$run}z";
            }
        }

        return '<svg xmlns="http://www.w3.org/2000/svg" width="'.$dimension.'" height="'.$dimension
            .'" viewBox="0 0 '.$dimension.' '.$dimension.'" shape-rendering="crispEdges">'
            .'<rect width="100%" height="100%" fill="#ffffff"/>'
            .'<path fill="#000000" d="'.$path.'"/></svg>';
    }

    /**
     * Pick the smallest version whose data codewords hold the payload.
     */
    private static function selectVersion(int $byteCount): int
    {
        foreach (self::BLOCK_LAYOUT as $version => [$ecWords, $group1, $group1Words, $group2, $group2Words]) {
            $dataCodewords = $group1 * $group1Words + $group2 * $group2Words;
            $headerBits = 4 + ($version < 10 ? 8 : 16);
            $requiredBytes = intdiv($headerBits + $byteCount * 8 + 7, 8);

            if ($requiredBytes <= $dataCodewords) {
                return $version;
            }
        }

        throw new InvalidArgumentException('Payload QR melebihi kapasitas yang didukung.');
    }

    /**
     * @param  list<int>  $bytes
     * @return list<int>
     */
    private static function createCodewords(int $version, array $bytes): array
    {
        [$ecWords, $group1, $group1Words, $group2, $group2Words] = self::BLOCK_LAYOUT[$version];

        $dataCodewords = $group1 * $group1Words + $group2 * $group2Words;
        $capacityBits = $dataCodewords * 8;

        $bits = '0100';
        $bits .= str_pad(decbin(count($bytes)), $version < 10 ? 8 : 16, '0', STR_PAD_LEFT);

        foreach ($bytes as $byte) {
            $bits .= str_pad(decbin($byte), 8, '0', STR_PAD_LEFT);
        }

        $bits .= str_repeat('0', min(4, $capacityBits - strlen($bits)));

        if (strlen($bits) % 8 !== 0) {
            $bits .= str_repeat('0', 8 - strlen($bits) % 8);
        }

        $padding = ['11101100', '00010001'];
        $padIndex = 0;

        while (strlen($bits) < $capacityBits) {
            $bits .= $padding[$padIndex];
            $padIndex = ($padIndex + 1) % 2;
        }

        /** @var list<int> $codewords */
        $codewords = [];

        for ($offset = 0, $length = strlen($bits); $offset < $length; $offset += 8) {
            $codewords[] = (int) bindec(substr($bits, $offset, 8));
        }

        $blockSizes = array_merge(array_fill(0, $group1, $group1Words), array_fill(0, $group2, $group2Words));

        $blocks = [];
        $offset = 0;

        foreach ($blockSizes as $blockSize) {
            $blockData = array_slice($codewords, $offset, $blockSize);
            $blocks[] = [
                'data' => $blockData,
                'ecc' => self::reedSolomon($blockData, $ecWords),
            ];
            $offset += $blockSize;
        }

        $interleaved = [];

        for ($index = 0; $index < max($blockSizes); $index++) {
            foreach ($blocks as $block) {
                if (array_key_exists($index, $block['data'])) {
                    $interleaved[] = $block['data'][$index];
                }
            }
        }

        for ($index = 0; $index < $ecWords; $index++) {
            foreach ($blocks as $block) {
                $interleaved[] = $block['ecc'][$index];
            }
        }

        return $interleaved;
    }

    /**
     * @param  list<int>  $data
     * @return list<int>
     */
    private static function reedSolomon(array $data, int $errorCorrectionWords): array
    {
        self::bootGaloisField();

        $generator = [1];

        for ($degree = 0; $degree < $errorCorrectionWords; $degree++) {
            $generator = self::multiplyPolynomials($generator, [1, self::$exponents[$degree]]);
        }

        $remainder = array_merge($data, array_fill(0, $errorCorrectionWords, 0));

        for ($index = 0, $count = count($data); $index < $count; $index++) {
            $coefficient = $remainder[$index];

            if ($coefficient === 0) {
                continue;
            }

            foreach ($generator as $offset => $term) {
                $remainder[$index + $offset] ^= self::galoisMultiply($term, $coefficient);
            }
        }

        /** @var list<int> $result */
        $result = array_slice($remainder, count($data), $errorCorrectionWords);

        return $result;
    }

    /**
     * Multiply two polynomials over GF(256), coefficients most-significant
     * first, which is the order the Reed-Solomon division below expects.
     *
     * @param  list<int>  $left
     * @param  list<int>  $right
     * @return list<int>
     */
    private static function multiplyPolynomials(array $left, array $right): array
    {
        $result = array_fill(0, count($left) + count($right) - 1, 0);

        foreach (array_values($left) as $leftIndex => $leftCoefficient) {
            foreach (array_values($right) as $rightIndex => $rightCoefficient) {
                $result[$leftIndex + $rightIndex] ^= self::galoisMultiply($leftCoefficient, $rightCoefficient);
            }
        }

        return $result;
    }

    private static function bootGaloisField(): void
    {
        if (self::$exponents !== []) {
            return;
        }

        $value = 1;

        for ($index = 0; $index < 255; $index++) {
            self::$exponents[$index] = $value;
            self::$logarithms[$value] = $index;
            $value <<= 1;

            if (($value & 0x100) !== 0) {
                $value ^= 0x11D;
            }
        }
    }

    private static function galoisMultiply(int $left, int $right): int
    {
        if ($left === 0 || $right === 0) {
            return 0;
        }

        return self::$exponents[(self::$logarithms[$left] + self::$logarithms[$right]) % 255];
    }

    private function drawFunctionPatterns(): void
    {
        $this->drawFinderPattern(0, 0);
        $this->drawFinderPattern($this->size - 7, 0);
        $this->drawFinderPattern(0, $this->size - 7);

        $centres = self::ALIGNMENT_CENTRES[$this->version];

        foreach ($centres as $rowCentre) {
            foreach ($centres as $columnCentre) {
                if ($this->overlapsFinderPattern($rowCentre, $columnCentre)) {
                    continue;
                }

                $this->drawAlignmentPattern($rowCentre, $columnCentre);
            }
        }

        for ($index = 0; $index < $this->size; $index++) {
            if ($this->modules[6][$index] === null) {
                $this->modules[6][$index] = $index % 2 === 0;
            }

            if ($this->modules[$index][6] === null) {
                $this->modules[$index][6] = $index % 2 === 0;
            }
        }

        $this->drawFormatInformation(self::MASK_PATTERN);

        if ($this->version >= 7) {
            $this->drawVersionInformation();
        }
    }

    /**
     * Alignment patterns are omitted only where they would collide with the
     * three finder patterns; the ones sitting on the timing lines stay.
     */
    private function overlapsFinderPattern(int $row, int $column): bool
    {
        $nearStart = $row <= 8 && $column <= 8;
        $nearTopRight = $row <= 8 && $column >= $this->size - 9;
        $nearBottomLeft = $row >= $this->size - 9 && $column <= 8;

        return $nearStart || $nearTopRight || $nearBottomLeft;
    }

    private function drawFinderPattern(int $row, int $column): void
    {
        for ($rowOffset = -1; $rowOffset <= 7; $rowOffset++) {
            for ($columnOffset = -1; $columnOffset <= 7; $columnOffset++) {
                $targetRow = $row + $rowOffset;
                $targetColumn = $column + $columnOffset;

                if ($targetRow < 0 || $targetRow >= $this->size || $targetColumn < 0 || $targetColumn >= $this->size) {
                    continue;
                }

                $isDark = ($rowOffset >= 0 && $rowOffset <= 6 && ($columnOffset === 0 || $columnOffset === 6))
                    || ($columnOffset >= 0 && $columnOffset <= 6 && ($rowOffset === 0 || $rowOffset === 6))
                    || ($rowOffset >= 2 && $rowOffset <= 4 && $columnOffset >= 2 && $columnOffset <= 4);

                $this->modules[$targetRow][$targetColumn] = $isDark;
            }
        }
    }

    private function drawAlignmentPattern(int $row, int $column): void
    {
        for ($rowOffset = -2; $rowOffset <= 2; $rowOffset++) {
            for ($columnOffset = -2; $columnOffset <= 2; $columnOffset++) {
                $this->modules[$row + $rowOffset][$column + $columnOffset] =
                    max(abs($rowOffset), abs($columnOffset)) !== 1;
            }
        }
    }

    private function drawFormatInformation(int $maskPattern): void
    {
        $bits = self::formatBits($maskPattern);

        for ($index = 0; $index < 15; $index++) {
            $isDark = (($bits >> $index) & 1) === 1;

            if ($index < 6) {
                $this->modules[$index][8] = $isDark;
            } elseif ($index < 8) {
                $this->modules[$index + 1][8] = $isDark;
            } else {
                $this->modules[$this->size - 15 + $index][8] = $isDark;
            }

            if ($index < 8) {
                $this->modules[8][$this->size - $index - 1] = $isDark;
            } elseif ($index < 9) {
                $this->modules[8][15 - $index] = $isDark;
            } else {
                $this->modules[8][15 - $index - 1] = $isDark;
            }
        }

        $this->modules[$this->size - 8][8] = true;
    }

    private static function formatBits(int $maskPattern): int
    {
        // Bits 4-3 carry the error correction level (M = 0b00), bits 2-0 the mask.
        $data = $maskPattern;

        $remainder = $data << 10;

        while (self::bitLength($remainder) - self::bitLength(self::FORMAT_GENERATOR) >= 0) {
            $remainder ^= self::FORMAT_GENERATOR << (self::bitLength($remainder) - self::bitLength(self::FORMAT_GENERATOR));
        }

        return (($data << 10) | $remainder) ^ self::FORMAT_MASK;
    }

    private function drawVersionInformation(): void
    {
        $remainder = $this->version << 12;

        while (self::bitLength($remainder) - self::bitLength(self::VERSION_GENERATOR) >= 0) {
            $remainder ^= self::VERSION_GENERATOR << (self::bitLength($remainder) - self::bitLength(self::VERSION_GENERATOR));
        }

        $bits = ($this->version << 12) | $remainder;

        for ($index = 0; $index < 18; $index++) {
            $isDark = (($bits >> $index) & 1) === 1;
            $row = intdiv($index, 3);
            $column = $index % 3 + $this->size - 11;

            $this->modules[$row][$column] = $isDark;
            $this->modules[$column][$row] = $isDark;
        }
    }

    private static function bitLength(int $value): int
    {
        $length = 0;

        while ($value !== 0) {
            $length++;
            $value >>= 1;
        }

        return $length;
    }

    /**
     * @param  list<int>  $codewords
     */
    private function mapData(array $codewords): void
    {
        $direction = -1;
        $row = $this->size - 1;
        $bitIndex = 7;
        $byteIndex = 0;

        for ($column = $this->size - 1; $column > 0; $column -= 2) {
            if ($column === 6) {
                $column--;
            }

            while (true) {
                for ($pair = 0; $pair < 2; $pair++) {
                    $targetColumn = $column - $pair;

                    if ($this->modules[$row][$targetColumn] !== null) {
                        continue;
                    }

                    $isDark = false;

                    if ($byteIndex < count($codewords)) {
                        $isDark = (($codewords[$byteIndex] >> $bitIndex) & 1) === 1;
                    }

                    if ($this->isMasked($row, $targetColumn)) {
                        $isDark = ! $isDark;
                    }

                    $this->modules[$row][$targetColumn] = $isDark;
                    $bitIndex--;

                    if ($bitIndex === -1) {
                        $byteIndex++;
                        $bitIndex = 7;
                    }
                }

                $row += $direction;

                if ($row < 0 || $row >= $this->size) {
                    $row -= $direction;
                    $direction = -$direction;

                    break;
                }
            }
        }
    }

    private function isMasked(int $row, int $column): bool
    {
        return ($row + $column) % 2 === 0;
    }
}
