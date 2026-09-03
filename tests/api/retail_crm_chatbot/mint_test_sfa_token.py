#!/usr/bin/env python3
"""Mint a throwaway SFA identity JWT for QA testing "Know About Product" (dev/QA only).

Signs with the private half of the SFA_JWT_PUBLIC_KEY_PATH keypair configured on the target
server. Never point this at a real SFA-issued private key — this is for self-signed dev/test
tokens only, while real SFA access is unavailable.

Usage:
  python backend/scripts/mint_test_sfa_token.py --private-key path/to/sfa_jwt_private.pem --tsm-id TSM12345

Then call the API:
  curl -X POST https://www.saucedemo.com/api/v1/product/know-about-product \
    -H "X-API-KEY: <SFA_KNOW_PRODUCT_API_KEY>" \
    -H "Authorization: Bearer <token printed below>" \
    -H "Content-Type: application/json" \
    -d '{"productCode": "950001"}'
"""
from __future__ import annotations

import argparse
import time

import jwt


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--private-key", required=True, help="Path to the SFA test private key PEM")
    parser.add_argument("--tsm-id", default="TSM00001", help="tsmId / sub claim")
    parser.add_argument("--role", default="field_sales")
    parser.add_argument("--territory", default="North")
    parser.add_argument("--product-line", default="pharma", help="Comma-separated if multiple")
    parser.add_argument("--issuer", default="sfa-platform", help="Must match SFA_JWT_ISSUER on the server")
    parser.add_argument("--audience", default="chatbot-api", help="Must match SFA_JWT_AUDIENCE on the server")
    parser.add_argument("--expires-in", type=int, default=3600, help="Seconds until expiry")
    args = parser.parse_args()

    with open(args.private_key, encoding="utf-8") as f:
        private_key = f.read()

    now = int(time.time())
    payload = {
        "iss": args.issuer,
        "aud": args.audience,
        "sub": args.tsm_id,
        "iat": now,
        "exp": now + args.expires_in,
        "tsmId": args.tsm_id,
        "role": args.role,
        "territory": args.territory,
        "productLine": args.product_line.split(","),
    }
    token = jwt.encode(payload, private_key, algorithm="RS256")
    print(token)


if __name__ == "__main__":
    main()
