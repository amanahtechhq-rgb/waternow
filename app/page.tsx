'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Crown, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [hostel, setHostel] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const router = useRouter();

  // Helper to format phone numbers into fake emails for Supabase
  const formatEmail = (input: string) => {
    const cleanInput = input.trim();
    if (/^[0-9+]+$/.test(cleanInput)) {
      return `${cleanInput}@waternow.com`; // If phone number, add fake domain
    }
    return cleanInput; // If actual email, leave it
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const formattedEmail = formatEmail(emailOrPhone);

    try {
      if (isLogin) {
        // SIGN IN
        const { error: signInError, data } = await supabase.auth.signInWithPassword({ 
          email: formattedEmail, 
          password 
        });
        
        if (signInError) {
           if (signInError.message.includes('Invalid login credentials')) {
             throw new Error("Incorrect password or account doesn't exist. Try signing up.");
           }
           throw signInError;
        }
        
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
          if (profile?.role === 'driver') router.push('/driver');
          else router.push('/');
        }
      } else {
        // SIGN UP
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email: formattedEmail, 
          password 
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            throw new Error("This number/email is already registered. Please Sign In.");
          }
          throw authError;
        }

        // If Supabase returns a user but with empty identities, it means the email exists
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
          throw new Error("This account already exists. Please Sign In.");
        }

        if (authData.user) {
          const { error: profileError } = await supabase.from('profiles').insert({
            id: authData.user.id,
            role: role,
            full_name: fullName,
            phone: phone,
            hostel: hostel
          });
          
          if (profileError) throw new Error("Database Error: " + profileError.message);
          
          if (role === 'driver') router.push('/driver');
          else router.push('/');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailOrPhone) return setError('Enter your email or phone number first.');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(formatEmail(emailOrPhone));
    setLoading(false);
    if (error) setError(error.message);
    else setSuccessMsg('Password reset link sent! (Check email if you used one).');
  };

  return (
    <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-5 font-sans">
      <div className="w-full max-w-md mb-6">
        <Link href="/" className="text-slate-400 hover:text-[#FFD700] flex items-center gap-2 text-sm font-bold transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>

      <div className="bg-[#13294B] p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#0A1931] p-3 rounded-full border border-[#FFD700] mb-3">
            <Crown size={32} className="text-[#FFD700]" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-widest uppercase">Amanah Tech</h1>
          <p className="text-[10px] text-[#FFD700] tracking-widest uppercase mt-1">Amanah = Trust</p>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-6">
          {isLogin ? 'Welcome Back' : 'Create an Account'}
        </h2>

        {error && <p className="bg-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center mb-6 border border-red-500/50">{error}</p>}
        {successMsg && <p className="bg-green-500/20 text-green-400 p-3 rounded-lg text-sm text-center mb-6 border border-green-500/50">{successMsg}</p>}

        <form onSubmit={handleAuth} className="space-y-4">
          
          {!isLogin && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Full Name</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none" placeholder="e.g. Othaimeen Umar" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Phone Number</label>
                <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none" placeholder="024XXXXXXX" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Hostel / Location</label>
                <input type="text" required value={hostel} onChange={e => setHostel(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none" placeholder="e.g. Countryside" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">I am a...</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none">
                  <option value="student">Student (I want to order)</option>
                  <option value="driver">Driver (I want to deliver)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Phone Number or Email</label>
            <input type="text" required value={emailOrPhone} onChange={e => setEmailOrPhone(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none" placeholder="024XXXXXXX or email" />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white focus:border-[#1E90FF] outline-none" placeholder="••••••••" />
          </div>

          <button disabled={loading} type="submit" className="w-full py-4 mt-4 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg shadow-lg flex justify-center items-center transition-transform active:scale-95 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMsg(''); }} className="text-sm text-slate-400 hover:text-[#FFD700] transition-colors">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
          {isLogin && (
            <button type="button" onClick={handleForgotPassword} className="text-xs text-[#1E90FF] hover:underline">
              Forgot Password?
            </button>
          )}
        </div>
      </div>
    </div>
  );
}