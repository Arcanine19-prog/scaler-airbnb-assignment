from datetime import timedelta

from app.services.clock import today
from tests.conftest import GUEST, HOST, OTHER_GUEST

LISTING_ID = 2  # owned by HOST


def _free_window(client, listing_id, nights=3):
    """First window in the future that the seeded data hasn't booked."""
    booked = client.get(f"/api/listings/{listing_id}/unavailable").json()
    start = today() + timedelta(days=100)  # seeded future bookings stop at +75 days
    assert all(r["check_out"] <= start.isoformat() for r in booked)
    return start, start + timedelta(days=nights)


def _book(client, headers, check_in, check_out, guests=2, listing_id=LISTING_ID):
    return client.post(
        "/api/bookings",
        headers=headers,
        json={"listing_id": listing_id, "check_in": check_in.isoformat(),
              "check_out": check_out.isoformat(), "guests": guests},
    )


def test_booking_blocks_dates_and_rejects_overlap(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    created = _book(client, GUEST, check_in, check_out)
    assert created.status_code == 201
    body = created.json()
    assert body["nights"] == 3 and body["trip_status"] == "upcoming"

    blocked = client.get(f"/api/listings/{LISTING_ID}/unavailable").json()
    assert {"check_in": check_in.isoformat(), "check_out": check_out.isoformat()} in blocked

    overlapping = _book(client, OTHER_GUEST, check_in + timedelta(days=1), check_out + timedelta(days=1))
    assert overlapping.status_code == 409


def test_back_to_back_stays_are_allowed(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    assert _book(client, GUEST, check_in, check_out).status_code == 201
    # Checking in on the day the previous guest checks out is fine (half-open ranges).
    assert _book(client, OTHER_GUEST, check_out, check_out + timedelta(days=2)).status_code == 201


def test_cancelling_frees_the_dates(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    booking = _book(client, GUEST, check_in, check_out).json()
    assert client.post(f"/api/bookings/{booking['id']}/cancel", headers=GUEST).status_code == 200
    assert _book(client, OTHER_GUEST, check_in, check_out).status_code == 201


def test_booking_validation(client):
    start = today() + timedelta(days=100)
    assert _book(client, GUEST, start, start).status_code == 422  # zero nights
    assert _book(client, GUEST, today() - timedelta(days=2), today()).status_code == 422  # past
    assert _book(client, GUEST, start, start + timedelta(days=2), guests=99).status_code == 422
    assert _book(client, HOST, start, start + timedelta(days=2)).status_code == 400  # own listing
    assert _book(client, {}, start, start + timedelta(days=2)).status_code == 401


def test_search_excludes_listings_booked_in_window(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    params = {"check_in": check_in.isoformat(), "check_out": check_out.isoformat(), "page_size": 50}
    before = {l["id"] for l in client.get("/api/listings", params=params).json()["items"]}
    assert LISTING_ID in before
    _book(client, GUEST, check_in, check_out)
    after = {l["id"] for l in client.get("/api/listings", params=params).json()["items"]}
    assert LISTING_ID not in after


def test_search_filters(client):
    res = client.get("/api/listings", params={"location": "goa", "property_type": "villa"}).json()
    assert res["total"] > 0
    assert all(l["state"] == "Goa" and l["property_type"] == "villa" for l in res["items"])

    res = client.get("/api/listings", params={"min_price": 10000, "max_price": 15000}).json()
    assert all(10000 <= l["price_per_night"] <= 15000 for l in res["items"])

    page1 = client.get("/api/listings", params={"page_size": 10}).json()
    page2 = client.get("/api/listings", params={"page_size": 10, "page": 2}).json()
    assert page1["has_more"] and not {l["id"] for l in page1["items"]} & {l["id"] for l in page2["items"]}


def test_quote_matches_booking_total(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    q = client.get(f"/api/listings/{LISTING_ID}/quote",
                   params={"check_in": check_in.isoformat(), "check_out": check_out.isoformat()}).json()
    booking = _book(client, GUEST, check_in, check_out).json()
    assert q["available"] and q["total"] == booking["total_price"]
    assert q["total"] == q["subtotal"] + q["cleaning_fee"] + q["service_fee"] + q["taxes"]


LISTING_BODY = {
    "title": "Test treehouse in Wayanad",
    "description": "A lovely test listing with plenty of description text.",
    "property_type": "cabin",
    "category_id": 4,
    "city": "Wayanad", "state": "Kerala", "country": "India",
    "latitude": 11.6, "longitude": 76.1,
    "price_per_night": 4000, "cleaning_fee": 500,
    "max_guests": 2, "bedrooms": 1, "beds": 1, "bathrooms": 1,
    "amenity_ids": [1, 2],
    "photo_urls": ["https://example.com/a.jpg", "https://example.com/b.jpg"],
}


def test_host_crud(client):
    created = client.post("/api/listings", headers=GUEST, json=LISTING_BODY)
    assert created.status_code == 201
    listing_id = created.json()["id"]
    assert client.get("/api/users/me", headers=GUEST).json()["is_host"] is True

    updated = client.put(f"/api/listings/{listing_id}", headers=GUEST,
                         json={**LISTING_BODY, "price_per_night": 4500, "photo_urls": ["https://example.com/c.jpg"]})
    assert updated.status_code == 200
    assert updated.json()["price_per_night"] == 4500 and len(updated.json()["photos"]) == 1

    assert client.put(f"/api/listings/{listing_id}", headers=OTHER_GUEST, json=LISTING_BODY).status_code == 403
    assert any(h["listing"]["id"] == listing_id for h in client.get("/api/host/listings", headers=GUEST).json())

    assert client.delete(f"/api/listings/{listing_id}", headers=GUEST).status_code == 204
    assert client.get(f"/api/listings/{listing_id}").status_code == 404


def test_cannot_delete_listing_with_upcoming_reservations(client):
    check_in, check_out = _free_window(client, LISTING_ID)
    _book(client, GUEST, check_in, check_out)
    assert client.delete(f"/api/listings/{LISTING_ID}", headers=HOST).status_code == 409


def test_review_only_after_completed_stay(client):
    trips = client.get("/api/bookings/me", headers=GUEST).json()
    reviewable = next(t for t in trips if t["can_review"])
    upcoming = next(t for t in trips if t["trip_status"] == "upcoming")
    review = {"rating": 5, "cleanliness": 5, "accuracy": 5, "check_in": 5, "communication": 5,
              "location": 4, "value": 4, "comment": "Wonderful place, would stay again!"}

    assert client.post("/api/reviews", headers=GUEST, json={**review, "booking_id": upcoming["id"]}).status_code == 400
    assert client.post("/api/reviews", headers=GUEST, json={**review, "booking_id": reviewable["id"]}).status_code == 201
    assert client.post("/api/reviews", headers=GUEST, json={**review, "booking_id": reviewable["id"]}).status_code == 409


def test_wishlist_is_idempotent(client):
    assert client.put("/api/wishlist/3", headers=GUEST).status_code == 204
    assert client.put("/api/wishlist/3", headers=GUEST).status_code == 204
    assert client.get("/api/wishlist/ids", headers=GUEST).json()["listing_ids"] == [3]
    assert client.delete("/api/wishlist/3", headers=GUEST).status_code == 204
    assert client.get("/api/wishlist", headers=GUEST).json() == []
