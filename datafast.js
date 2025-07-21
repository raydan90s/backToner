const axios = require("axios");

const crearCheckout = async (req, res) => {
    const { amount } = req.body;

    try {
        const response = await axios.post(
            "https://test.oppwa.com/v1/checkouts",
            new URLSearchParams({
                entityId: "8a829418533cf31d01533d06f2ee06fa",
                amount: amount || "92.00",
                currency: "USD",
                paymentType: "DB",
            }),
            {
                headers: {
                    Authorization: "Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA==",
                    "Content-Type": "application/x-www-form-urlencoded",
                },

            }
        );

        const checkoutId = response.data.id;
        res.status(200).json({ checkoutId });
    } catch (err) {
        console.error("Error al generar checkoutId:", err.response?.data || err.message);
        res.status(500).json({ error: "Error al generar checkoutId" });
    }
};

const consultarPago = async (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: "Falta el parámetro 'id'" });
    }

    try {
        const response = await axios.get(
            `https://eu-test.oppwa.com/v1/checkouts/${id}/payment`,
            {
                headers: {
                    Authorization: 'Bearer OGE4Mjk0MTg1MzNjZjMxZDAxNTMzZDA2ZmQwNDA3NDh8WHQ3RjIyUUVOWA==',
                },
                params: {
                    entityId: '8a829418533cf31d01533d06f2ee06fa',
                },
            }
        );

        console.log("✅ Consultando checkoutId:", id);
        res.json(response.data);

    } catch (err) {
        console.error("❌ Error al consultar pago:", err.response?.data || err.message);
        res.status(500).json({ error: "Error al consultar estado de pago" });
    }
};

module.exports = {
    crearCheckout,
    consultarPago,
};
