<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <title>Status kampanye</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1f2937; line-height: 1.6;">
    <h2 style="margin-bottom: 8px;">Status kampanye berubah</h2>

    <p>Halo,</p>

    <p>
        Kampanye <strong>{{ $campaign->title }}</strong> kini berstatus
        <strong>{{ $status->value }}</strong>.
    </p>

    @if ($reason)
        <p>Catatan dari verifikator: {{ $reason }}</p>
    @endif

    <p>
        Buka dashboard AmanahLink untuk melihat detail dan langkah berikutnya.
    </p>

    <p style="color: #6b7280; font-size: 12px;">
        Email ini dikirim otomatis oleh AmanahLink.
    </p>
</body>
</html>
