import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Mail, CheckCircle } from 'lucide-react';
import { authApi } from '../api/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: authApi.requestMagicLink,
    onSuccess: () => setSent(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      mutation.mutate(email);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Check your email
          </h1>
          <p className="text-gray-600 mb-6">
            We sent a login link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            Click the link in the email to sign in. The link will expire in 15
            minutes.
          </p>
          <button
            onClick={() => setSent(false)}
            className="mt-6 text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">🏠</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Chore Manager</h1>
          <p className="text-gray-600 mt-1">Sign in to manage your chores</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            required
          />

          {mutation.isError && (
            <p className="text-sm text-red-600">
              Something went wrong. Please try again.
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            isLoading={mutation.isPending}
          >
            <Mail className="w-5 h-5 mr-2" />
            Send Login Link
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          We'll email you a magic link for a password-free sign in.
        </p>
      </div>
    </div>
  );
}
