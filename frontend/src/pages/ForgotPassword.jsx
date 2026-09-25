import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Mail, ArrowLeft } from 'lucide-react';

const maskEmail = (email) => {
  const normalized = String(email || '').trim();
  if (!normalized.includes('@')) return normalized;
  const [local, domain] = normalized.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
};

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: reset password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email) {
      const message = 'Please enter your email address';
      setErrorMessage(message);
      return toast.error(message);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send verification code');
      }
      toast.success('Verification code sent to your email');
      setStep(2);
    } catch (err) {
      const message = err.message || 'Error sending verification code';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!code.trim()) {
      const message = 'Please enter the verification code';
      setErrorMessage(message);
      return toast.error(message);
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-reset-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.message || 'Invalid verification code';
        setErrorMessage(message);
        throw new Error(message);
      }
      toast.success('Code verified! Now set your new password');
      setStep(3);
    } catch (err) {
      const message = err.message || 'Verification failed';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!newPassword) {
      const message = 'Please enter a new password';
      setErrorMessage(message);
      return toast.error(message);
    }
    if (newPassword.length < 6) {
      const message = 'Password must be at least 6 characters';
      setErrorMessage(message);
      return toast.error(message);
    }
    if (newPassword !== confirmPassword) {
      const message = 'Passwords do not match';
      setErrorMessage(message);
      return toast.error(message);
    }

    setLoading(true);
    try {
      // Note: This assumes the user is authenticated via 2FA verification above
      // In a real app, you'd have a specific reset password endpoint
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password: newPassword, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.message || 'Failed to reset password';
        setErrorMessage(message);
        throw new Error(message);
      }
      toast.success('Password reset successfully! Logging in...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      toast.error(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-input bg-card p-8 shadow-xl">
        {step > 1 && (
          <button
            onClick={() => {
              setStep(step - 1);
              if (step === 2) {
                setCode('');
              }
            }}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Forgot Password?</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email and we'll send you a code to reset your password.
              </p>
            </div>
            {errorMessage ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
            {errorMessage}
          </div>
        ) : null}
        <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </Button>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Verify Your Email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit code to <strong className="text-foreground">{maskEmail(email)}</strong>
              </p>
            </div>
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive mb-4">
                {errorMessage}
              </div>
            ) : null}
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Verification Code</label>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  className="h-11 text-center text-xl tracking-widest"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Didn't receive the code? Check your spam folder.
            </p>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Reset Password</h1>
              <p className="text-sm text-muted-foreground">
                Create a new password for your account
              </p>
            </div>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">New Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Choose a new secure password"
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
                    placeholder="Confirm your new password"
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
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? 'Resetting password...' : 'Reset Password'}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Remember your password? </span>
          <button
            onClick={() => navigate('/login')}
            className="text-primary hover:underline font-medium"
          >
            Sign in here
          </button>
        </div>
      </div>
    </div>
  );
}
