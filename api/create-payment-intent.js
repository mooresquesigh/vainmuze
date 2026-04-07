const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { items } = req.body

    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: `${item.genre} — VainMuze`,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: 1,
    }))

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/store`,
    })

    res.status(200).json({ url: session.url })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}