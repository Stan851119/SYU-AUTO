import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const respond = (status: number, message: string) =>
  Response.json({ message }, { status, headers: cors });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return respond(405, "Method not allowed");

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("NOTIFICATION_FROM_EMAIL");
  if (!url || !anonKey || !serviceKey || !resendKey || !from) {
    return respond(503, "Email notifications are not configured");
  }

  const token = request.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return respond(401, "Sign in required");

  const buyer = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: identity, error: authError } = await buyer.auth.getUser(token);
  if (authError || !identity.user || !identity.user.email_confirmed_at) {
    return respond(401, "Verified account required");
  }

  let inquiryId: unknown;
  try {
    ({ inquiryId } = await request.json());
  } catch {
    return respond(400, "Invalid request");
  }
  if (typeof inquiryId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(inquiryId)) {
    return respond(400, "Invalid inquiry");
  }

  const { data: inquiry, error: inquiryError } = await buyer.from("listing_inquiries")
    .select("id,listing_id,buyer_id,contact_email,message,created_at")
    .eq("id", inquiryId).eq("buyer_id", identity.user.id).maybeSingle();
  if (inquiryError || !inquiry || inquiry.contact_email !== identity.user.email) {
    return respond(404, "Inquiry not found");
  }
  const age = Date.now() - Date.parse(inquiry.created_at);
  if (!Number.isFinite(age) || age < -60_000 || age > 10 * 60_000) {
    return respond(409, "Inquiry is too old for notification");
  }

  const { data: listing, error: listingError } = await buyer.from("car_listings")
    .select("seller_id,make,model").eq("id", inquiry.listing_id).maybeSingle();
  if (listingError || !listing || listing.seller_id === identity.user.id) {
    return respond(404, "Listing not found");
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: seller, error: sellerError } = await admin.auth.admin.getUserById(listing.seller_id);
  if (sellerError || !seller.user?.email) return respond(503, "Seller email unavailable");

  const title = `${listing.make} ${listing.model}`.replace(/[\r\n]/g, " ").slice(0, 120);
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `listing-inquiry/${inquiry.id}`,
    },
    body: JSON.stringify({
      from,
      to: [seller.user.email],
      reply_to: inquiry.contact_email,
      subject: `Ново запитване за ${title} · MMC Auto`,
      text: `Получихте ново запитване за ${title}.\n\n${inquiry.message}\n\nОтговорете на купувача: ${inquiry.contact_email}\n\nВижте запитването в „Публикувай обява“ на https://syu-auto.vercel.app/`,
    }),
  });
  if (!result.ok) {
    console.error("Email provider rejected notification", result.status);
    return respond(502, "Email notification failed");
  }
  return respond(200, "Notification sent");
});
