import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const maskEmail = (email) => {
  const normalized = String(email || '').trim();
  if (!normalized.includes('@')) return normalized;
  const [local, domain] = normalized.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
};

const getPostLoginPath = (role, fallbackPath = '/') => {
  if (role === 'admin') return '/admin';
  if (['staff', 'employee'].includes(role)) return '/staff';
  return fallbackPath || '/';
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  const { checkUserAuth } = useAuth();

  useEffect(() => {
    const forceTwoFA = searchParams.get('two_factor_required') === 'true' || searchParams.get('two_factor_required') === '1';
    const emailFromQuery = searchParams.get('email');

    if (forceTwoFA && emailFromQuery) {
      setEmail(emailFromQuery);
      setTwoFARequired(true);
      setErrorMessage('');
      toast.success('Verification code sent to your email');
    }
  }, [searchParams]);

  // Handle password login with 2FA
  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message = result.message || 'Login failed';
        setErrorMessage(message);
        throw new Error(message);
      }

      const data = await response.json();
      if (data.two_factor_required) {
        setErrorMessage('');
        setTwoFARequired(true);
        toast.success('Verification code sent to your email');
      } else {
        const currentUser = await checkUserAuth();
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
        toast.success('Logged in successfully');
        navigate(getPostLoginPath(currentUser?.role, redirect));
      }
    } catch (error) {
      console.error(error);
      if (error.message?.includes('Password login not configured')) {
        const message = 'This email is registered for passwordless sign-in. Use email sign-in or reset your password.';
        setErrorMessage(message);
        toast.error(message);
      } else {
        setErrorMessage(error.message || 'Unable to login');
        toast.error(error.message || 'Unable to login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle 2FA code verification
  const handleVerify2FA = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (!twoFACode.trim()) {
      const message = 'Please enter the verification code.';
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), code: twoFACode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = data.message || 'Verification failed';
        setErrorMessage(message);
        throw new Error(message);
      }

      // Successful verification - user is now authenticated
      console.log('✅ 2FA verification successful:', data);
      toast.success('Verification successful! Logging in...');
      const currentUser = await checkUserAuth();
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
      navigate(getPostLoginPath(currentUser?.role, redirect));
    } catch (error) {
      console.error('2FA verification error:', error);
      const message = error.message || 'Verification failed';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (twoFARequired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-input bg-card p-8 shadow-xl">
          <h1 className="text-3xl font-semibold mb-2">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground mb-6">
            We've sent a verification code to <strong>{maskEmail(email)}</strong>. Enter it below.
          </p>
          {/* Verification code is not displayed on the client for security. Check your email for the code. */}
          {errorMessage ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
              {errorMessage}
            </div>
          ) : null}
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted-foreground">Verification Code</label>
              <Input
                type="text"
                value={twoFACode}
                onChange={(event) => setTwoFACode(event.target.value)}
                placeholder="123456"
                maxLength="6"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </Button>
          </form>
          <button
            onClick={() => {
              setTwoFARequired(false);
              setTwoFACode('');
              setPassword('');
            }}
            className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-input bg-card p-8 shadow-xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Open Market BD</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <Button 
            onClick={() => window.location.href = '/api/auth/oauth/google'} 
            variant="outline" 
            className="w-full h-12 text-base"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
          <Button 
            onClick={() => window.location.href = '/api/auth/oauth/facebook'} 
            variant="outline" 
            className="w-full h-12 text-base"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-input"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-card text-muted-foreground">OR</span>
          </div>
        </div>

        {/* Login Form */}
        {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
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
          <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : 'Sign in'}
          </Button>
        </form>

        {/* Footer Links */}
        <div className="mt-6 flex items-center justify-between text-sm">
          <button 
            onClick={() => navigate('/forgot-password')}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
          <button 
            onClick={() => navigate('/register')} 
            className="text-primary hover:underline font-medium"
          >
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
}
