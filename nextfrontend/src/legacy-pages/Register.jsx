import { useState } from 'react';
import { useNavigate } from "@/lib/next-router";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      toast.error('Please enter your name');
      return;
    }
    if (!email) {
      setErrorMessage('Email is required.');
      toast.error('Email is required');
      return;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      toast.error('Password is required');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = res.status === 409
          ? 'This email is already registered. Please sign in or reset your password.'
          : data.message || 'Registration failed. Please check your input.';
        setErrorMessage(message);
        throw new Error(message);
      }
      await checkUserAuth();
      // Sync guest wishlist to user account
      const guestWishlist = localStorage.getItem('wishlist');
      if (guestWishlist) {
        try {
          const items = JSON.parse(guestWishlist);
          if (Array.isArray(items) && items.length > 0) {
            await fetch('/api/wishlist/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ guest_items: items }),
            });
            localStorage.removeItem('wishlist');
          }
        } catch (e) {
          console.log('Wishlist sync skipped:', e);
        }
      }
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      setErrorMessage(err.message || 'Registration error');
      toast.error(err.message || 'Registration error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-input bg-card p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground">Join Open Market BD today</p>
        </div>
        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
            {errorMessage}
          </div>
        ) : null}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Full Name</label>
            <Input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Your name"
              className="h-11"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Email</label>
            <Input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="you@example.com"
              className="h-11"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a secure password"
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Confirm Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : 'Create account'}
          </Button>
        </form>
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <button 
            onClick={() => navigate('/login')}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground text-center">
          By signing up, you agree to our Terms & Conditions and Privacy Policy
        </p>
      </div>
    </div>
  );
}
