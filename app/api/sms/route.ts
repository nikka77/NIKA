import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient } from '@/lib/supabase/admin';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SMS_PARSE_PROMPT = `Tu es l'assistant NIKA pour les professionnels. Un pro t'envoie un SMS pour gérer son profil.
Analyse ce message et réponds UNIQUEMENT en JSON valide :
{
  "action": "SET_AVAILABLE|SET_HOURS|SET_STOCK|CREATE_FLASH|UPDATE_PHONE|UNKNOWN",
  "available": boolean | null,
  "hours": { "open": "HH:MM", "close": "HH:MM" } | null,
  "stock": { "item": "string", "quantity": number } | null,
  "flash": { "title": "string", "discount_type": "percent|fixed|free_item", "discount_value": number, "duration_minutes": number } | null,
  "phone": "string" | null,
  "confidence": number
}

Examples:
- "fermé ce soir" → {"action":"SET_AVAILABLE","available":false,...}
- "ouvert de 12h à 22h" → {"action":"SET_HOURS","hours":{"open":"12:00","close":"22:00"},...}
- "3 burgers restants" → {"action":"SET_STOCK","stock":{"item":"burgers","quantity":3},...}
- "plus de burgers" → {"action":"SET_STOCK","stock":{"item":"burgers","quantity":0},...}
- "promo pizza 8€ pendant 2h" → {"action":"CREATE_FLASH","flash":{"title":"Pizza 8€","discount_type":"fixed","discount_value":8,"duration_minutes":120},...}

Message: {{MESSAGE}}`;

// Validation de la signature Twilio (HMAC-SHA1 de URL + params triés, base64).
function isValidTwilio(authToken: string, signature: string | null, url: string, params: Record<string, string>): boolean {
  if (!signature) return false;
  const data = Object.keys(params).sort().reduce((acc, k) => acc + k + params[k], url);
  const expected = crypto.createHmac('sha1', authToken).update(Buffer.from(data, 'utf-8')).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function sendSMS(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !from) return;
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });
}

const twiml = (xml = '') => new NextResponse(`<?xml version="1.0"?><Response>${xml}</Response>`, { headers: { 'Content-Type': 'text/xml' } });

export async function POST(req: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return NextResponse.json({ error: 'unconfigured' }, { status: 503 });

  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((v, k) => { params[k] = String(v); });

  // Anti-spoof : sans signature Twilio valide, on rejette (l'identité = le `From` sinon falsifiable).
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const webhookUrl = `https://${host}/api/sms`;
  if (!isValidTwilio(authToken, req.headers.get('x-twilio-signature'), webhookUrl, params)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
  }

  const body = params['Body'];
  const from = params['From'];
  if (!body || !from) return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });

  const supabase = createAdminClient();
  if (!supabase) return twiml();

  const { data: pro } = await supabase.from('pros').select('*').eq('phone', from).single();
  if (!pro) {
    await sendSMS(from, "Numéro non reconnu. Inscris-toi sur nika.fr/pro pour gérer ton profil par SMS.");
    return twiml();
  }

  const prompt = SMS_PARSE_PROMPT.replace('{{MESSAGE}}', body.slice(0, 500));
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  let parsed: { action?: string; available?: boolean; hours?: { open: string; close: string }; stock?: { item: string; quantity: number }; flash?: { title: string; discount_type: string; discount_value: number; duration_minutes: number }; phone?: string } | null = null;
  if (jsonMatch) { try { parsed = JSON.parse(jsonMatch[0]); } catch { parsed = null; } }
  if (!parsed) {
    await sendSMS(from, "Commande non comprise. Exemples : 'fermé ce soir', '3 burgers restants', 'promo pizza 8€ 2h'");
    return twiml();
  }

  let confirmMsg = '';
  switch (parsed.action) {
    case 'SET_AVAILABLE':
      await supabase.from('pros').update({ active: parsed.available }).eq('id', pro.id);
      confirmMsg = parsed.available ? '✅ Ton profil est maintenant marqué Ouvert.' : '✅ Ton profil est marqué Fermé.';
      break;
    case 'SET_STOCK':
      if (parsed.stock) {
        const { data: listing } = await supabase.from('listings').select('id').eq('pro_id', pro.id).ilike('title', `%${parsed.stock.item}%`).single();
        if (listing) {
          await supabase.from('listings').update({ stock: parsed.stock.quantity, available: parsed.stock.quantity > 0 }).eq('id', listing.id);
          confirmMsg = `✅ Stock "${parsed.stock.item}" mis à jour : ${parsed.stock.quantity} restant(s).`;
        } else {
          confirmMsg = `❌ Produit "${parsed.stock.item}" non trouvé. Vérifie le nom dans ton profil.`;
        }
      }
      break;
    case 'CREATE_FLASH':
      if (parsed.flash) {
        const expiresAt = new Date(Date.now() + parsed.flash.duration_minutes * 60000).toISOString();
        await supabase.from('flash_deals').insert({
          pro_id: pro.id, title: parsed.flash.title, discount_type: parsed.flash.discount_type,
          discount_value: parsed.flash.discount_value, expires_at: expiresAt, active: true,
        });
        confirmMsg = `⚡ Flash Deal "${parsed.flash.title}" créé pour ${parsed.flash.duration_minutes}min !`;
      }
      break;
    case 'SET_HOURS':
      if (parsed.hours) {
        await supabase.from('pros').update({ metadata: { hours: parsed.hours } } as never).eq('id', pro.id);
        confirmMsg = `✅ Horaires mis à jour : ${parsed.hours.open} – ${parsed.hours.close}`;
      }
      break;
    case 'UPDATE_PHONE':
      if (parsed.phone) {
        await supabase.from('pros').update({ phone: parsed.phone }).eq('id', pro.id);
        confirmMsg = `✅ Numéro mis à jour : ${parsed.phone}`;
      }
      break;
    default:
      confirmMsg = "Commande non reconnue. Exemples : 'fermé ce soir', '3 burgers restants', 'promo pizza 8€ 2h'";
  }

  await sendSMS(from, `NIKA · ${confirmMsg}`);
  return twiml();
}
