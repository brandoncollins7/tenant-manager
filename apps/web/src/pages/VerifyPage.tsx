import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { extractErrorMessage } from '../utils/errors';

export function VerifyPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const hasAttemptedVerification = useRef(false);
  const hasCleared = useRef(false);

  const token = searchParams.get('token');

  // Clear any existing session synchronously on first render
  // This is important for impersonation where a new tab opens with an existing session
  if (!hasCleared.current) {
    hasCleared.current = true;
    localStorage.removeItem('token');
    localStorage.removeItem('selectedOccupantId');
  }

  const mutation = useMutation({
    mutationFn: authApi.verifyMagicLink,
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      toast.success('Successfully logged in!');
      navigate('/', { replace: true });
    },
    onError: (err) => {
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error(errorMessage);
    },
  });

  useEffect(() => {
    if (token && !hasAttemptedVerification.current) {
      hasAttemptedVerification.current = true;
      mutation.mutate(token);
    }
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This login link is missing or malformed.
          </p>
          <Button onClick={() => navigate('/login')}>Back to Login</Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Link Expired
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/login')}>Request New Link</Button>
        </div>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Success!</h1>
          <p className="text-gray-600">Redirecting you to the app...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary-600 animate-spin" />
        <h1 className="text-xl font-semibold text-gray-900">Signing you in...</h1>
        <p className="text-gray-600 mt-1">Please wait a moment</p>
      </div>
    </div>
  );
}
