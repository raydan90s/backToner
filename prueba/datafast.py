# datafast.py
import requests

ENTITY_ID = '8a829418533cf31d01533d06f2ee06fa'
AUTH_TOKEN = 'OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
HEADERS = {
    'Authorization': f'Bearer {AUTH_TOKEN}'
}
BASE_URL = 'https://eu-test.oppwa.com'

def crear_checkout(amount='92.00', currency='USD', payment_type='DB'):
    url = f'{BASE_URL}/v1/checkouts'
    data = {
        'entityId': ENTITY_ID,
        'amount': amount,
        'currency': currency,
        'paymentType': payment_type
    }
    response = requests.post(url, data=data, headers=HEADERS)
    return response.json()

def consultar_pago(checkout_id):
    url = f'{BASE_URL}/v1/checkouts/{checkout_id}/payment?entityId={ENTITY_ID}'
    response = requests.get(url, headers=HEADERS)
    return response.json()
