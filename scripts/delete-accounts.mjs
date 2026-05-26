import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://caoynokephxfyqofpufv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhb3lub2tlcGh4Znlxb2ZwdWZ2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzQxOTg1NSwiZXhwIjoyMDcyOTk1ODU1fQ.-U2i3-PrRzC_-cRs8wrriAFGyEGHGtYN5Ykr7h2rY4M'
);

const ALL_EMAILS = [
  'yousaf.zhd4@gmail.com',
  'southernstarcapital@gmail.com',
  'southerninvestmentco@gmail.com',
];
const FULL_DELETE_EMAILS = [
  'southernstarcapital@gmail.com',
  'southerninvestmentco@gmail.com',
];

async function run() {
  // ── 1. Look up seller records ─────────────────────────────────────────────
  const { data: sellers, error: sellerErr } = await supabase
    .from('seller_applications')
    .select('id, email, user_id, business_name')
    .in('email', ALL_EMAILS);

  if (sellerErr) { console.error('Failed to fetch sellers:', sellerErr.message); process.exit(1); }
  console.log('\n=== Found seller records ===');
  sellers.forEach(s => console.log(` • ${s.email} | seller_id=${s.id} | user_id=${s.user_id} | biz=${s.business_name}`));

  const sellerIds = sellers.map(s => s.id).filter(Boolean);
  const userIds   = sellers.map(s => s.user_id).filter(Boolean);

  if (!sellerIds.length) { console.log('No matching sellers found — nothing to delete.'); return; }

  // ── 2. Delete listing_addons ──────────────────────────────────────────────
  const { error: addonErr, count: addonCount } = await supabase
    .from('listing_addons')
    .delete({ count: 'exact' })
    .in('seller_id', sellerIds);
  console.log(`\n[addons] deleted: ${addonCount ?? 0}`, addonErr ? `ERROR: ${addonErr.message}` : '✓');

  // ── 3. Delete promo_code_usages linked to their payments ─────────────────
  if (userIds.length) {
    const { data: paymentRows } = await supabase
      .from('payments')
      .select('stripe_payment_intent_id')
      .in('user_id', userIds);
    const intentIds = (paymentRows || []).map(p => p.stripe_payment_intent_id).filter(Boolean);
    if (intentIds.length) {
      const { error: promoErr, count: promoCount } = await supabase
        .from('promo_code_usages')
        .delete({ count: 'exact' })
        .in('stripe_payment_intent_id', intentIds);
      console.log(`[promo_code_usages] deleted: ${promoCount ?? 0}`, promoErr ? `ERROR: ${promoErr.message}` : '✓');
    } else {
      console.log('[promo_code_usages] none found ✓');
    }
  }

  // ── 4. Delete payments ────────────────────────────────────────────────────
  if (userIds.length) {
    const { error: payErr, count: payCount } = await supabase
      .from('payments')
      .delete({ count: 'exact' })
      .in('user_id', userIds);
    console.log(`[payments] deleted: ${payCount ?? 0}`, payErr ? `ERROR: ${payErr.message}` : '✓');
  }

  // ── 5. Delete seller_plans for yousaf only (keep his account) ────────────
  const yousaf = sellers.find(s => s.email === 'yousaf.zhd4@gmail.com');
  if (yousaf) {
    const { error: planErr, count: planCount } = await supabase
      .from('seller_plans')
      .delete({ count: 'exact' })
      .eq('seller_id', yousaf.id);
    console.log(`[seller_plans] yousaf.zhd4 deleted: ${planCount ?? 0}`, planErr ? `ERROR: ${planErr.message}` : '✓');
  }

  // ── 6. Delete full seller_applications for Joe's two accounts ────────────
  //     (seller_plans cascade delete automatically)
  const { error: appErr, count: appCount } = await supabase
    .from('seller_applications')
    .delete({ count: 'exact' })
    .in('email', FULL_DELETE_EMAILS);
  console.log(`[seller_applications] deleted: ${appCount ?? 0}`, appErr ? `ERROR: ${appErr.message}` : '✓');

  // ── 7. Delete auth users for Joe's two accounts ───────────────────────────
  const fullDeleteSellers = sellers.filter(s => FULL_DELETE_EMAILS.includes(s.email));
  for (const seller of fullDeleteSellers) {
    if (!seller.user_id) { console.log(`[auth.users] ${seller.email}: no user_id, skipping`); continue; }
    const { error: authErr } = await supabase.auth.admin.deleteUser(seller.user_id);
    console.log(`[auth.users] ${seller.email}:`, authErr ? `ERROR: ${authErr.message}` : 'deleted ✓');
  }

  console.log('\n=== Done ===');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
