// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Crown, Loader2, ShieldAlert, Home, Truck, User, LogOut } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window { PaystackPop: any; }
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Setup State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('student');
  
  // App Data
  const [hostels, setHostels] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  
  // Order Form
  const [hostelId, setHostelId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [drums, setDrums] = useState(1);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState('');

  const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  useEffect(() => {
    const saved = localStorage.getItem('wn_user');
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      loadData(u);
    }
    setLoading(false);
  }, []);

  async function loadData(u: any) {
    const { data: h } = await supabase.from('hostels').select('id, name');
    if (h) setHostels(h);
    
    const { data: d } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver');
    if (d) setDrivers(d);

    let q = supabase.from('orders').select('*, hostels(name), profiles!driver_id(full_name)').order('created_at', { ascending: false });
    if (u.role === 'student') q = q.eq('phone', u.phone);
    else q = q.eq('driver_id', u.id);
    
    const { data: o } = await q;
    if (o) setMyOrders(o);
  }

  async function handleSetup(e: any) {
    e.preventDefault();
    setLoading(true);
    const { data: existing } = await supabase.from('profiles').select('*').eq('phone', phone).single();
    
    let u;
    if (existing) {
      u = { id: existing.id, name: existing.full_name, role: existing.role, phone: existing.phone };
    } else {
      const { data: newP } = await supabase.from('profiles').insert({ full_name: name, phone: phone, role: role }).select().single();
      u = { id: newP.id, name: newP.full_name, role: newP.role, phone: newP.phone };
    }
    localStorage.setItem('wn_user', JSON.stringify(u));
    setUser(u);
    loadData(u);
    setLoading(false);
  }

  async function handleOrder() {
    setMsg('');
    if (!hostelId || !driverId) return setMsg('Select hostel and driver');
    setPaying(true);
    
    const total = drums * 3.0;
    await supabase.from('orders').insert({
      hostel_id: hostelId, driver_id: driverId, drums, phone: user.phone, total_price: total, status: 'pending_payment'
    });

    if (typeof window !== 'undefined' && window.PaystackPop) {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_KEY,
        email: 'test@test.com',
        amount: total * 100,
        currency: 'GHS',
        callback: function(response: any) {
          setMsg('✅ Payment Successful!');
          setPaying(false);
          loadData(user);
        },
        onClose: function() { setPaying(false); setMsg('❌ Payment Closed'); }
      });
      handler.openIframe();
    }
  }

  async function markDelivered(id: string) {
    await supabase.from('orders').update({ status: 'delivered' }).eq('id', id);
    loadData(user);
  }

  function logout() {
    localStorage.removeItem('wn_user');
    setUser(null);
  }

  if (loading) return <div className="min-h-screen bg-[#0A1931]"></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex items-center justify-center p-5">
        <div className="bg-[#13294B] p-8 rounded-2xl w-full max-w-md border border-slate-700">
          <Crown size={40} className="text-[#FFD700] mx-auto mb-4" />
          <h1 className="text-white text-center font-bold text-2xl mb-6">Welcome to Amanah Tech</h1>
          <form onSubmit={handleSetup} className="space-y-4">
            <input type="text" placeholder="Full Name" required value={name} onChange={e=>setName(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] text-white border border-slate-700" />
            <input type="tel" placeholder="Phone Number" required value={phone} onChange={e=>setPhone(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] text-white border border-slate-700" />
            <select value={role} onChange={e=>setRole(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] text-white border border-slate-700">
              <option value="student">Student</option>
              <option value="driver">Driver</option>
            </select>
            <button className="w-full bg-[#1E90FF] text-white p-4 rounded-xl font-bold">Continue</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans pb-20">
      <Script src="https://js.paystack.co/v1/inline.js" />
      
      {/* Header */}
      <div className="bg-[#0A1931] p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Crown className="text-[#FFD700]" />
          <span className="font-bold">Amanah Tech</span>
        </div>
        <button onClick={logout} className="text-red-400"><LogOut size={20}/></button>
      </div>

      <div className="max-w-md mx-auto p-5">
        {/* STUDENT VIEW */}
        {user.role === 'student' && (
          <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200 mb-6">
            <h2 className="font-bold mb-4 flex items-center gap-2"><Home size={18}/> Order Water</h2>
            
            <select value={hostelId} onChange={e=>setHostelId(e.target.value)} className="w-full p-3 mb-3 bg-slate-50 border rounded-xl">
              <option value="">Select Hostel</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <select value={driverId} onChange={e=>setDriverId(e.target.value)} className="w-full p-3 mb-3 bg-slate-50 border rounded-xl">
              <option value="">Select Driver</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>

            <input type="range" min="1" max="10" value={drums} onChange={e=>setDrums(Number(e.target.value))} className="w-full mb-3" />
            <p className="font-bold text-center mb-3">Total: GHS {(drums*3).toFixed(2)}</p>

            <button onClick={handleOrder} disabled={paying} className="w-full bg-[#1E90FF] text-white p-4 rounded-xl font-bold">
              {paying ? <Loader2 className="animate-spin mx-auto"/> : 'Pay & Order'}
            </button>
            {msg && <p className="text-center mt-3 text-sm font-bold text-blue-600">{msg}</p>}
          </div>
        )}

        {/* ORDERS LIST */}
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-slate-200">
          <h2 className="font-bold mb-4 flex items-center gap-2"><User size={18}/> My Orders</h2>
          {myOrders.length === 0 && <p className="text-sm text-slate-500 text-center">No orders yet.</p>}
          {myOrders.map(o => (
            <div key={o.id} className="p-3 bg-slate-50 rounded-xl mb-2 border">
              <p className="font-bold">{o.hostels?.name} ({o.drums} Drums)</p>
              <p className="text-xs text-slate-500 mb-2">Status: {o.status}</p>
              {user.role === 'driver' && o.status === 'pending_payment' && (
                <button onClick={()=>markDelivered(o.id)} className="w-full bg-green-500 text-white p-2 rounded-lg font-bold">Mark Delivered</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}