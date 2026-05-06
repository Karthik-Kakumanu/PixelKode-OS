export const stripeIntegration = {
  provider: "Stripe",
  webhookEvents: ["invoice.paid", "invoice.payment_failed", "customer.subscription.updated"],
  notes: "Connect via server actions or route handlers to sync payment events into invoices and notifications."
};

export const razorpayIntegration = {
  provider: "Razorpay",
  webhookEvents: ["payment.captured", "payment.failed", "invoice.paid"],
  notes: "Use for India-first payment collection and automated reminder flows."
};
