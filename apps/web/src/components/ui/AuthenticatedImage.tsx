import { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

interface AuthenticatedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function AuthenticatedImage({
  src,
  alt,
  className,
  fallback,
}: AuthenticatedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let objectUrl: string | null = null;

    async function fetchImage() {
      try {
        setLoading(true);
        setError(false);
        const response = await apiClient.get(src, {
          responseType: 'blob',
        });
        if (mounted) {
          objectUrl = URL.createObjectURL(response.data);
          setBlobUrl(objectUrl);
        }
      } catch {
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchImage();

    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (loading) {
    return (
      <div className={`bg-gray-200 animate-pulse ${className}`} />
    );
  }

  if (error || !blobUrl) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
    />
  );
}
