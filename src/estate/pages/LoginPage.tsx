import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Logo } from '@/estate/components/Logo';

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/estate/dashboard');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-md">
        <div className="rounded-xl bg-white p-8 shadow-lg ring-1 ring-border">
          <div className="mb-8 flex justify-center">
            <Logo />
          </div>
          <h1 className="text-center text-2xl font-semibold text-navy">Sign in to your workspace</h1>
          <p className="mt-2 text-center text-sm text-slate-label">Enter your credentials to access EstateCFO</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy">Email</label>
              <input
                type="email"
                required
                placeholder="you@company.com"
                className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-navy outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 pr-11 text-navy outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-label transition hover:text-navy"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <a href="#" className="text-sm text-slate-label transition hover:text-navy">Forgot password?</a>
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold py-3 font-medium text-white transition hover:bg-goldLight"
            >
              Sign In <ArrowRight size={18} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-label">
            Don't have an account?{' '}
            <Link to="/estate" className="font-medium text-navy transition hover:text-gold">
              Book a demo →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
