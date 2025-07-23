from flask import Flask, request, jsonify
import urllib, urllib.parse, urllib.request, json

app = Flask(__name__)

# Configuración
ENTITY_ID = '8a829418533cf31d01533d06f2ee06fa'
AUTHORIZATION = 'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA=='
BASE_URL = 'https://eu-test.oppwa.com'

# Ruta para crear checkout (POST)
@app.route('/api/checkout', methods=['POST'])
def crear_checkout():
    try:
        data = request.json
        amount = data.get('amount', '92.00')
        currency = data.get('currency', 'USD')
        
        url = f"{BASE_URL}/v1/checkouts"
        values = {
            'entityId': ENTITY_ID,
            'amount': amount,
            'currency': currency,
            'paymentType': 'DB'
        }

        post_data = urllib.parse.urlencode(values).encode()
        req = urllib.request.Request(url, data=post_data)
        req.add_header('Authorization', AUTHORIZATION)

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Ruta para consultar resultado del pago (GET)
@app.route('/api/checkout/resultado', methods=['GET'])
def consultar_resultado():
    try:
        resourcePath = request.args.get('resourcePath')
        if not resourcePath:
            return jsonify({'error': 'Falta resourcePath'}), 400

        path = f"{BASE_URL}{resourcePath}?entityId={ENTITY_ID}"
        req = urllib.request.Request(path)
        req.add_header('Authorization', AUTHORIZATION)

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
