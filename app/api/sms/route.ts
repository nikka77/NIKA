import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const body = formData.get('Body') as string;
  const from = formData.get('From') as string;

  if (!body || !from) {
    return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find pro by phone
  const { data: pro } = await supabase
    .from('pros')
    .select('*')
    .eq('phone', from)
    .single();

  if (!pro) {
    await sendSMS(from, "Numéro non reconnu. Inscris-toi sur nika.fr/pro pour gérer ton profil par SMS.");
    return new NextResponse('<?xml version="1.0"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  }

  // Parse with Claude
  const prompt = SMS_PARSE_PROMPT.replace('{{MESSAGE}}', body);
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    await sendSMS(from, "Commande non comprise. Exemples : 'fermé ce soir', '3 burgers restants', 'promo pizza 8€ 2h'");
    return new NextResponse('<?xml version="1.0"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  }

  const parsed = JSON.parse(jsonMatch[0]);
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
          pro_id: pro.id,
          title: parsed.flash.title,
          discount_type: parsed.flash.discount_type,
          discount_value: parsed.flash.discount_value,
          expires_at: expiresAt,
          active: true,
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
  return new NextResponse('<?xml version="1.0"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
}
