import jwt
import time

# ===== Apple Developer values =====
TEAM_ID = "PLT8LZN6FY"
CLIENT_ID = "com.dflorjan.outwork-service-id"   # e.g. com.mycompany.myapp.login
KEY_ID = "27X42KFD2J"
PRIVATE_KEY_PATH = "AuthKey_27X42KFD2J.p8"

# Apple allows up to 6 months expiration
EXPIRATION_TIME = 60 * 60 * 24 * 180  # 180 days

# ================================

with open(PRIVATE_KEY_PATH, "r") as f:
    private_key = f.read()

now = int(time.time())

payload = {
    "iss": TEAM_ID,
    "iat": now,
    "exp": now + EXPIRATION_TIME,
    "aud": "https://appleid.apple.com",
    "sub": CLIENT_ID,
}

headers = {
    "alg": "ES256",
    "kid": KEY_ID
}

client_secret = jwt.encode(
    payload,
    private_key,
    algorithm="ES256",
    headers=headers
)

print("\nApple Client Secret:\n")
print(client_secret)
