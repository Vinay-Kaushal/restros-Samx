import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID ?? "",
  key_secret: process.env.RAZORPAY_KEY_SECRET ?? ""
});

// Verifies the webhook came from Razorpay, not someone spoofing a
// "payment succeeded" request at your endpoint. This signature check is
// what makes the webhook trustworthy as the source of truth (plan Section 8) -
// never trust an unsigned request claiming a payment succeeded.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}
