export const LAUNCH_SIX_OFFER = Object.freeze({
  code: 'LINX-FOUNDING-6',
  tier: 'Growth',
  duration_days: 60,
  max_redemptions: 6,
  redemption_deadline: '2026-09-22',
  testimonial_publication: 'separate_explicit_permission_required',
});

function clean(value, limit) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, limit) : '';
}

export function normalizeLaunchEarlyAccessApplication(input) {
  const email = clean(input?.email, 254).toLowerCase();
  const displayName = clean(input?.display_name, 120);
  const businessName = clean(input?.business_name, 160);
  const trade = clean(input?.trade, 100);
  const city = clean(input?.city, 100);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (!displayName || !businessName || !trade || !city) return { error: 'Name, business, trade, and city are required.' };
  if (input?.feedback_commitment !== true) return { error: 'Please confirm that you are willing to share candid product feedback.' };
  return {
    email,
    display_name: displayName,
    business_name: businessName,
    trade,
    city,
    feedback_commitment: true,
    testimonial_permission: input?.testimonial_permission === true,
  };
}

export function launchOfferView() {
  return { ...LAUNCH_SIX_OFFER };
}
