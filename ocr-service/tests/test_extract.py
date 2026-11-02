import base64

import pytest

from app import create_app

JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"amanahlink-test-image" * 8


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("OCR_PROVIDER", "fake")
    app = create_app()
    app.config.update(TESTING=True)

    with app.test_client() as test_client:
        yield test_client


def encoded_image() -> str:
    return base64.b64encode(JPEG_BYTES).decode("ascii")


def test_healthz(client):
    response = client.get("/healthz")

    assert response.status_code == 200
    assert response.get_json() == {"status": "ok"}


def test_extract_returns_the_fixed_contract(client):
    response = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "image/jpeg"},
    )

    assert response.status_code == 200

    body = response.get_json()

    assert set(body) == {
        "provider",
        "merchant_name",
        "amount",
        "date",
        "confidence",
        "raw_text",
    }
    assert body["provider"] == "fake"
    assert body["merchant_name"] == "Apotek Sehat"
    assert body["amount"] == "50000.00"
    assert 0.0 <= body["confidence"] <= 1.0


def test_extract_is_deterministic(client):
    first = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "image/jpeg"},
    ).get_json()

    second = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "image/jpeg"},
    ).get_json()

    assert first == second


def test_missing_image_is_rejected(client):
    response = client.post("/extract", json={"content_type": "image/jpeg"})

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_invalid_base64_is_rejected(client):
    response = client.post(
        "/extract",
        json={"image_base64": "bukan-base64!", "content_type": "image/jpeg"},
    )

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "INVALID_REQUEST"


def test_unsupported_media_type_is_rejected(client):
    response = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "application/pdf"},
    )

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_unknown_provider_is_rejected(client, monkeypatch):
    monkeypatch.setenv("OCR_PROVIDER", "vendor-yang-tidak-ada")

    response = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "image/jpeg"},
    )

    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "OCR_NOT_CONFIGURED"


def test_openai_provider_without_key_fails_closed(client, monkeypatch):
    monkeypatch.setenv("OCR_PROVIDER", "openai")
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)

    response = client.post(
        "/extract",
        json={"image_base64": encoded_image(), "content_type": "image/jpeg"},
    )

    assert response.status_code == 503
    assert response.get_json()["error"]["code"] == "OCR_NOT_CONFIGURED"
