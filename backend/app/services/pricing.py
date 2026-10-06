"""Price breakdown for a stay — the single source of truth for both quotes and bookings."""

from dataclasses import dataclass
from datetime import date

SERVICE_FEE_RATE = 0.14  # Airbnb's guest service fee is typically ~14% of the booking subtotal
TAX_RATE = 0.12  # flat GST approximation applied to subtotal + cleaning fee


@dataclass(frozen=True)
class PriceQuote:
    nightly_price: int
    nights: int
    subtotal: int
    cleaning_fee: int
    service_fee: int
    taxes: int
    total: int


def quote_stay(nightly_price: int, cleaning_fee: int, check_in: date, check_out: date) -> PriceQuote:
    nights = (check_out - check_in).days
    subtotal = nightly_price * nights
    service_fee = round(subtotal * SERVICE_FEE_RATE)
    taxes = round((subtotal + cleaning_fee) * TAX_RATE)
    return PriceQuote(
        nightly_price=nightly_price,
        nights=nights,
        subtotal=subtotal,
        cleaning_fee=cleaning_fee,
        service_fee=service_fee,
        taxes=taxes,
        total=subtotal + cleaning_fee + service_fee + taxes,
    )
