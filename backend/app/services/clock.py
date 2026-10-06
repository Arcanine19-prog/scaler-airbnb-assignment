from datetime import date, datetime
from zoneinfo import ZoneInfo

# All listings are in India, so "today" is evaluated in IST regardless of the server's timezone.
LISTING_TZ = ZoneInfo("Asia/Kolkata")


def today() -> date:
    return datetime.now(LISTING_TZ).date()
