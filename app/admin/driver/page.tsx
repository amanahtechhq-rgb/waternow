'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Truck, CheckCircle, Loader2, LogOut, Star, MessageSquare } from 'lucide-react';

export default function DriverPortal() {
  const [orders, setOrders] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return router.push('/login');

    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    
    // Security: Kick out students
    if (profileData?.role !== 'driver') return router.push('/'); 

    setProfile(profileData);
    fetchOrders(session.user.id);
    fetchReviews(session.user.id);
  }

  async function fetchOrders(driverId: string) {
    // Only fetch orders that are PAID and not yet delivered
    const { data } = await supabase
      .from('orders')
      .select('*, hostels(name)')
      .eq('status', 'paid')
      .order('created_at');
    
    if (data) setOrders(data);
    setLoading(false);
  }

  async function fetchReviews(driverId: string) {
    const { data } = await supabase.from('reviews').select('*, profiles(full_name)').eq('driver_id', driverId);
    if (data) setReviews(data);
  }

  async function markDelivered(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered', driver_id: profile.id })
      .eq('id', orderId);
      
    if (!error) {
      setOrders(orders.filter(o => o.id !== orderId));
      alert("Order marked as delivered! Your earnings have been updated.");
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
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#FFD700] uppercase tracking-widest">Driver Portal</h1>
            <p className="text-slate-400 text-sm">Welcome, {profile?.full_name}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30">
            <LogOut size={18} />
          </button>
        </div>

        {/* Driver Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-[#13294B] p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 font-bold uppercase">My Rank</p>
            <p className="text-lg font-black text-[#FFD700]">Newcomer</p>
          </div>
          <div className="bg-[#13294B] p-4 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 font-bold uppercase">Rating</p>
            <div className="flex items-center gap-1">
              <p className="text-lg font-black text-white">{reviews.length > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1) : '5.0'}</p>
              <Star size={14} className="text-[#FFD700] fill-[#FFD700]" />
            </div>
          </div>
        </div>

        {/* Active Orders */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck className="text-[#1E90FF]" /> Ready for Delivery</h2>
        
        {orders.length === 0 ? <p className="text-slate-400 text-center py-10 bg-[#13294B] rounded-xl border border-slate-700">No paid orders right now. Wait for the next one!</p> : (
          <div className="space-y-4 mb-8">
            {orders.map(order => (
              <div key={order.id} className="bg-[#13294B] p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-lg text-white">{order.hostels?.name}</h3>
                   <span className="bg-[#1E90FF]/20 text-[#1E90FF] px-2 py-1 rounded text-xs font-bold">{order.drums} Drums</span>
                </div>
                <p className="text-sm text-slate-300 mb-4">Student Phone: <span className="font-mono text-white">{order.phone}</span></p>
                
                <button onClick={() => markDelivered(order.id)} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                  <CheckCircle size={18} /> Mark Delivered
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reviews Section */}
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 mt-8"><MessageSquare className="text-[#FFD700]" /> Student Reviews</h2>
        <div className="space-y-3">
          {reviews.length === 0 ? (
             <p className="text-slate-500 text-sm text-center">No reviews yet. Deliver water to get rated!</p>
          ) : (
            reviews.map(review => (
              <div key={review.id} className="bg-[#13294B] p-4 rounded-xl border border-slate-700">
                <div className="flex justify-between items-center mb-1">
                  <p className="font-bold text-sm text-white">{review.profiles?.full_name || 'Student'}</p>
                  <div className="flex text-[#FFD700]">
                    {[...Array(review.rating)].map((_, i) => <Star key={i} size={12} fill="#FFD700" />)}
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic">"{review.comment}"</p>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}