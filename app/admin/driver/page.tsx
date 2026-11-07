'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Truck, CheckCircle, Loader2, LogOut } from 'lucide-react';
import Link from 'next/link';

export default function DriverPortal() {
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    
    // If not logged in, send them to the login page
    if (!session) {
      return router.push('/login');
    }

    // Fetch their profile to ensure they are a driver
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    
    // If they are a student, kick them out
    if (profileData?.role !== 'driver') {
      alert("You are not registered as a driver.");
      return router.push('/'); 
    }

    setProfile(profileData);
    fetchOrders(session.user.id);
  }

  async function fetchOrders(driverId: string) {
    setLoading(true);
    // Fetch ONLY orders assigned to THIS driver and that are PAID
    const { data } = await supabase
      .from('orders')
      .select('*, hostels(name)')
      .eq('driver_id', driverId) 
      .eq('status', 'paid')
      .order('created_at');
    
    if (data) setOrders(data);
    setLoading(false);
  }

  async function markDelivered(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivering' }) // Wait for student to confirm
      .eq('id', orderId);
      
    if (!error) {
      setOrders(orders.filter(o => o.id !== orderId));
      alert("Marked as delivered! Waiting for student to confirm and release funds.");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="min-h-screen bg-[#0A1931] flex justify-center items-center"><Loader2 className="animate-spin text-[#1E90FF]" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0A1931] text-white p-5 pb-20 font-sans">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#FFD700] uppercase tracking-widest">Driver Portal</h1>
            <p className="text-slate-400 text-sm">Welcome, {profile?.full_name}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
            <LogOut size={18} />
          </button>
        </div>

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck className="text-[#1E90FF]" /> My Deliveries</h2>
        
        {orders.length === 0 ? (
          <div className="text-center py-10 bg-[#13294B] rounded-xl border border-slate-700">
            <p className="text-slate-400">No active orders assigned to you.</p>
            <p className="text-xs text-slate-500 mt-2">Wait for a student to order water.</p>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            {orders.map(order => (
              <div key={order.id} className="bg-[#13294B] p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-lg text-white">{order.hostels?.name}</h3>
                   <span className="bg-[#1E90FF]/20 text-[#1E90FF] px-2 py-1 rounded text-xs font-bold">{order.drums} Drums</span>
                </div>
                <p className="text-sm text-slate-300 mb-4">Student Phone: <span className="font-mono text-white">{order.phone}</span></p>
                
                <button onClick={() => markDelivered(order.id)} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                  <CheckCircle size={18} /> Mark as Delivered
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}