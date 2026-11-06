import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, amount, phone } = body;

    // Amount must be in pesewas (GHS 1.00 = 100)
    const amountInPesewas = Math.round(amount * 100);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email || 'student@waternow.com',
        amount: amountInPesewas,
        phone: phone,
        channels: ['mobile_money', 'card'],
        callback_url: 'http://localhost:3000/', 
      }),
    });

    const data = await response.json();
    
    if (!data.status) {
      // If Paystack sends an error, return it as JSON
      return NextResponse.json({ error: data.message || 'Paystack error' }, { status: 400 });
    }

    // Return the authorization URL so the frontend can redirect
    return NextResponse.json({ authorization_url: data.data.authorization_url }); 
  } catch (error: any) {
    // Catch any crashes and return JSON instead of HTML
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}