'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Enter both email and password');
      return;
    }

    setLoading(true);
    const { error } = await login(email.trim(), password);
    setLoading(false);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Logged in successfully.');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-lg">
        <h1 className="text-3xl font-bold mb-3">Admin login</h1>
        <p className="text-sm text-muted-foreground mb-6">Use your predefined admin email and password to access the admin dashboard.</p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" className="rounded-2xl" />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="rounded-2xl" />
          </div>

          <Button onClick={handleLogin} disabled={loading} className="w-full rounded-2xl">
            {loading ? 'Logging in...' : 'Log in'}
          </Button>
        </div>
      </div>
    </div>
  );
}
