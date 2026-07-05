**PricingCard** — one plan tier. Mark the middle tier `featured` for the gold border and "MOST POPULAR" chip. Composes `Button` for the CTA.

```jsx
<PricingCard
  name="Pro"
  price="79"
  period="per month, billed monthly"
  featured
  features={["Unlimited shortened links", "Full analytics", "Sell on EchoForge"]}
  cta="Subscribe Now"
/>
```
