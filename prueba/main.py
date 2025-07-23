from fastapi import FastAPI, Request, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import urllib.parse
import urllib.request
import json

app = FastAPI()

# Habilitar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración
ENTITY_ID = '8a829418533cf31d01533d06f2ee06fa'
AUTHORIZATION = 'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
BASE_URL = 'https://eu-test.oppwa.com'

@app.post("/api/checkout")
async def crear_checkout(body: dict):
    try:
        amount = body.get("amount", "92.00")
        currency = body.get("currency", "USD")

        url = f"{BASE_URL}/v1/checkouts"
        values = {
            "entityId": ENTITY_ID,
            "amount": amount,
            "currency": currency,
            "paymentType": "DB"
        }

        data = urllib.parse.urlencode(values).encode()
        req = urllib.request.Request(url, data=data)
        req.add_header("Authorization", AUTHORIZATION)

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/checkout/resultado")
async def consultar_resultado(resourcePath: str = Query(..., description="Ruta devuelta por Datafast")):
    try:
        full_url = f"{BASE_URL}{resourcePath}?entityId={ENTITY_ID}"
        req = urllib.request.Request(full_url)
        req.add_header("Authorization", AUTHORIZATION)

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
