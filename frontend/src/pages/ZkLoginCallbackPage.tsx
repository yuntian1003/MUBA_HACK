// src/pages/ZkLoginCallbackPage.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useZkLogin } from '../hooks/useZkLogin';
import { upsertUser } from '../api';

export function ZkLoginCallbackPage() {
  const navigate = useNavigate();
  const { completeZkLogin } = useZkLogin();
  const [status, setStatus] = useState<string>('Verifying Google sign-in…');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    async function handleAuthCallback() {
      try {
        // Extract id_token from URL hash: #id_token=xxx&token_type=Bearer...
        const hash = window.location.hash;
        if (!hash) {
          throw new Error('No authentication token returned from Google.');
        }

        const params = new URLSearchParams(hash.substring(1));
        const idToken = params.get('id_token');

        if (!idToken) {
          throw new Error('Google OAuth did not return an id_token.');
        }

        setStatus('Deriving your zkLogin Sui address…');
        const zkAcc = await completeZkLogin(idToken);

        if (!zkAcc) {
          throw new Error('Failed to generate zkLogin account.');
        }

        setStatus('Registering zkLogin profile…');
        // Automatically save user profile in backend database
        try {
          await upsertUser(
            zkAcc.address,
            zkAcc.name || 'Google User',
            '#9F9DF3',
            zkAcc.email
          );
          if (zkAcc.email) {
            localStorage.setItem(`email-${zkAcc.address}`, zkAcc.email);
          }
          if (zkAcc.name) {
            localStorage.setItem(`nickname-${zkAcc.address}`, zkAcc.name);
          }
        } catch (dbErr) {
          console.warn('Could not auto-register profile in database:', dbErr);
        }

        setStatus('Success! Redirecting to SmartSplit…');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 800);
      } catch (err: any) {
        console.error('zkLogin callback error:', err);
        setErrorMsg(err.message || 'Authentication failed');
      }
    }

    handleAuthCallback();
  }, []);

  return (
    <main
      className="page"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="clay-card"
        style={{ padding: '36px 28px', maxWidth: 420, width: '100%' }}
      >
        {!errorMsg ? (
          <>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--lavender)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="spinner" style={{ borderTopColor: 'var(--deep)' }} />
            </div>
            <h3 style={{ marginBottom: 8 }}>zkLogin Authentication</h3>
            <p className="color-text3 text-sm">{status}</p>
          </>
        ) : (
          <>
            <h3 style={{ color: '#c0446b', marginBottom: 12 }}>Sign-in Failed</h3>
            <p className="color-text3 text-sm mb-20">{errorMsg}</p>
            <button className="btn btn-primary w-full" onClick={() => navigate('/')}>
              Return to Home
            </button>
          </>
        )}
      </motion.div>
    </main>
  );
}
