const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  const session = stripeEvent.data.object;

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const userId = session.metadata?.userId;
      if (!userId) break;
      await supabase.from('profiles').update({
        is_premium: true,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_status: 'active',
      }).eq('id', userId);
      break;
    }

    case 'customer.subscription.trial_will_end': {
      // Trial ending soon — Stripe sends reminder email automatically
      console.log('Trial ending soon for:', session.customer);
      break;
    }

    case 'customer.subscription.updated': {
      const userId = session.metadata?.userId;
      if (!userId) break;
      const isActive = ['active', 'trialing'].includes(session.status);
      await supabase.from('profiles').update({
        is_premium: isActive,
        subscription_status: session.status,
        trial_ends_at: session.trial_end
          ? new Date(session.trial_end * 1000).toISOString()
          : null,
      }).eq('stripe_subscription_id', session.id);
      break;
    }

    case 'customer.subscription.deleted': {
      await supabase.from('profiles').update({
        is_premium: false,
        subscription_status: 'cancelled',
      }).eq('stripe_customer_id', session.customer);
      break;
    }

    default:
      console.log('Unhandled event type:', stripeEvent.type);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
