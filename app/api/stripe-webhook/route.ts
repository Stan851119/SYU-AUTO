import {NextResponse} from 'next/server';
import Stripe from 'stripe';
import {createClient} from '@supabase/supabase-js';

const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);
const supabase=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req:Request){
 const body=await req.text();
 const sig=req.headers.get('stripe-signature');
 if(!sig) return new NextResponse('Missing signature',{status:400});
 let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(body,sig,process.env.STRIPE_WEBHOOK_SECRET!)}
 catch{return new NextResponse('Invalid signature',{status:400})}
 if(event.type==='checkout.session.completed'){
   const s=event.data.object as Stripe.Checkout.Session;
   const {listingId,plan}=s.metadata||{};
   if(listingId && plan){
     const expires=new Date(Date.now()+30*24*60*60*1000).toISOString();
     await supabase.from('listings').update({promotion:plan,promotion_expires_at:expires}).eq('id',listingId);
     await supabase.from('payments').update({status:'paid'}).eq('provider_payment_id',s.id);
   }
 }
 return NextResponse.json({received:true});
}