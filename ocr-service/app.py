"""AmanahLink OCR boundary (D-007).

The Laravel app only knows this contract:

    POST /extract
    body: {"image_base64": "...", "content_type": "image/jpeg"}
    200:  {"provider", "merchant_name", "amount", "date", "confidence", "raw_text"}

Providers are selected by configuration, never by the caller:

    OCR_PROVIDER=fake     deterministic, offline (tests, CI, demo)
    OCR_PROVIDER=openai   real vision adapter, needs OPENAI_API_KEY

Keeping the provider behind this file means the Laravel side can run and be
tested before any vendor credential exists.
"""

from __future__ import annotations

import base64
import binascii
import json
import os
import re
from datetime import date
from typing import Any

import requests
from flask import Flask, jsonify, request

MAX_IMAGE_BYTES = 8 * 1024 * 1024
SUPPORTED_TYPES = {"image/jpeg", "image/png"}

SYSTEM_PROMPT = (
    "You read Indonesian payment receipts. Reply with JSON only, no prose: "
    '{"merchant_name": string, "amount": "12345.00", "date": "YYYY-MM-DD", '
    '"confidence": 0.0-1.0, "raw_text": string}. '
    "amount must be a decimal string without thousand separators. "
    "confidence is your certainty that the extraction is correct."
)


class OcrError(Exception):
    def __init__(self, code: str, message: str, status: int = 502) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


def _fake_extract() -> dict[str, Any]:
    """Deterministic output so contract tests never depend on a vendor."""
    return {
        "provider": "fake",
        "merchant_name": "Apotek Sehat",
        "amount": "50000.00",
        "date": date.today().isoformat(),
        "confidence": 0.91,
        "raw_text": "APOTEK SEHAT\nTOTAL 50.000,00\nFAKE OCR",
    }


def _parse_model_json(content: str) -> dict[str, Any]:
    content = content.strip()
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise OcrError("EXTRACTION_FAILED", "Provider tidak mengembalikan JSON.") from exc

    if not isinstance(parsed, dict):
        raise OcrError("EXTRACTION_FAILED", "Provider tidak mengembalikan objek JSON.")

    return parsed


def _normalize_amount(value: Any) -> str | None:
    if value is None:
        return None

    raw = str(value).strip().replace("Rp", "").replace(" ", "")

    if "," in raw and "." not in raw:
        raw = raw.replace(".", "").replace(",", ".")

    try:
        return f"{float(raw):.2f}"
    except ValueError:
        return None


def _openai_extract(image: bytes, content_type: str) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()

    if api_key == "":
        raise OcrError(
            "OCR_NOT_CONFIGURED",
            "OPENAI_API_KEY belum diatur untuk provider openai.",
            503,
        )

    data_uri = f"data:{content_type};base64,{base64.b64encode(image).decode('ascii')}"

    try:
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": "Ekstrak nota ini."},
                            {"type": "image_url", "image_url": {"url": data_uri}},
                        ],
                    },
                ],
            },
            timeout=float(os.getenv("OCR_REQUEST_TIMEOUT", "25")),
        )
    except requests.RequestException as exc:
        raise OcrError("EXTRACTION_FAILED", "Provider vision tidak dapat dihubungi.") from exc

    if response.status_code != 200:
        raise OcrError(
            "EXTRACTION_FAILED",
            f"Provider vision mengembalikan HTTP {response.status_code}.",
        )

    body = response.json()
    content = body.get("choices", [{}])[0].get("message", {}).get("content", "")
    parsed = _parse_model_json(content)

    confidence = parsed.get("confidence", 0)
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        confidence = 0.0

    return {
        "provider": "openai",
        "merchant_name": parsed.get("merchant_name"),
        "amount": _normalize_amount(parsed.get("amount")),
        "date": parsed.get("date"),
        "confidence": confidence,
        "raw_text": parsed.get("raw_text", content),
    }


def extract(image: bytes, content_type: str) -> dict[str, Any]:
    provider = os.getenv("OCR_PROVIDER", "fake").strip().lower()

    if provider == "fake":
        return _fake_extract()

    if provider == "openai":
        return _openai_extract(image, content_type)

    raise OcrError("OCR_NOT_CONFIGURED", f"Provider OCR tidak dikenal: {provider}.", 503)


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 1024

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok"})

    @app.post("/extract")
    def extract_route():
        payload = request.get_json(silent=True)

        if not isinstance(payload, dict):
            return jsonify(
                {"error": {"code": "INVALID_REQUEST", "message": "Body harus JSON."}}
            ), 422

        content_type = str(payload.get("content_type", "image/jpeg")).lower()

        if content_type not in SUPPORTED_TYPES:
            return jsonify(
                {
                    "error": {
                        "code": "UNSUPPORTED_MEDIA_TYPE",
                        "message": "Hanya image/jpeg dan image/png yang didukung.",
                    }
                }
            ), 422

        encoded = payload.get("image_base64")

        if not isinstance(encoded, str) or encoded == "":
            return jsonify(
                {"error": {"code": "INVALID_REQUEST", "message": "image_base64 wajib diisi."}}
            ), 422

        try:
            image = base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError):
            return jsonify(
                {"error": {"code": "INVALID_REQUEST", "message": "image_base64 tidak valid."}}
            ), 422

        if len(image) == 0 or len(image) > MAX_IMAGE_BYTES:
            return jsonify(
                {"error": {"code": "INVALID_IMAGE", "message": "Ukuran gambar tidak diterima."}}
            ), 422

        try:
            result = extract(image, content_type)
        except OcrError as exc:
            return jsonify({"error": {"code": exc.code, "message": exc.message}}), exc.status

        return jsonify(result)

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5001")))
