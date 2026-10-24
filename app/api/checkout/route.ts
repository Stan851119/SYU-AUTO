import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {createClient} from '@supabase/supabase-js';

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req:Request){
  const {listingId,plan,userId}=await req.json();
  const prices:any={top:499,premium:999};
  if(!prices[plan]) return NextResponse.json({error:'Invalid plan'},{status:400});
  const session=await stripe.checkout.sessions.create({
    mode:'payment',
    line_items:[{price_data:{currency:'eur',product_data:{name:`SYU Auto ${plan.toUpperCase()} обява`},unit_amount:prices[plan]},quantity:1}],
    success_url:`${process.env.NEXT_PUBLIC_SITE_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${process.env.NEXT_PUBLIC_SITE_URL}/promote`,
    metadata:{listingId,plan,userId}
  });
  await supabase.from('payments').insert({user_id:userId,listing_id:listingId,plan,amount_eur:prices[plan]/100,status:'pending',provider:'stripe',provider_payment_id:session.id});
  return NextResponse.json({url:session.url});
}