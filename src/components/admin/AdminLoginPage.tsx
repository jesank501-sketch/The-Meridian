import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  LogIn,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { BOOTSTRAP_SUPER_ADMIN_EMAIL, usePortal } from '../../context/PortalContext';
import { Link, useRouter } from '../../lib/router';

export function AdminLoginPage() {
  const {
    authReady,
    isSyncingProfile,
    authError,
    firebaseUser,
    currentUser,
    isEditorialStaff,
    loginWithGoogle,
    switchGoogleAccount,
    retryProfileSync,
    logout,
    websiteSettings,
  } = usePortal();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const inIframe = typeof window !== 'undefined' && window.self !== window.top;
  const displayError = localError || authError || '';

  useEffect(() => {
    if (authReady && !isSyncingProfile && currentUser && isEditorialStaff) {
      navigate('/admin');
    }
  }, [authReady, isSyncingProfile, currentUser, isEditorialStaff, navigate]);

  const handleSignIn = async () => {
    setLocalError('');
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'Unable to complete Google sign-in. Please allow popups and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    setLocalError('');
    setLoading(true);
    try {
      await switchGoogleAccount();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Unable to switch Google account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-950 flex flex-col justify-center items-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 mb-4"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to {websiteSettings.siteName}
          </Link>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-amber-800 dark:text-amber-500" />
            <h1 className="font-editorial-heading text-2xl font-bold text-stone-900 dark:text-stone-50">
              Newsroom Control Desk
            </h1>
          </div>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            Sign in with your verified editorial Google account to manage articles, media, visual design, and analytics.
          </p>
        </div>

        {!authReady || isSyncingProfile ? (
          <div className="py-8 text-center text-sm text-stone-500">
            {isSyncingProfile
              ? 'Verifying Google session & syncing newsroom profile...'
              : 'Checking session...'}
          </div>
        ) : firebaseUser && !currentUser ? (
          <div className="space-y-4">
            <div className="p-4 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 rounded text-sm text-red-800 dark:text-red-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-semibold">Profile Sync Failed</p>
                <p className="mt-1 text-xs leading-relaxed break-words">
                  Google account <strong>{firebaseUser.email || firebaseUser.uid}</strong> is signed in,
                  but the admin profile could not be loaded or created.
                </p>
                {displayError && (
                  <p className="mt-2 text-xs font-mono bg-red-100/70 dark:bg-red-900/40 p-2 rounded break-words">
                    {displayError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => retryProfileSync()}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 text-sm font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90"
              >
                <RefreshCw className="w-4 h-4" /> Retry Sync
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="py-2.5 px-4 text-sm font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : currentUser && !isEditorialStaff ? (
          <div className="space-y-4">
            <div className="p-4 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 rounded text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Editorial Authorization Required</p>
                <p className="mt-1 text-xs leading-relaxed">
                  Signed in as <strong>{currentUser.email}</strong> (Role:{' '}
                  <strong>{currentUser.role}</strong>). Only editorial staff or the Super Admin (
                  <strong>{BOOTSTRAP_SUPER_ADMIN_EMAIL}</strong>) can open the Admin Panel.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed opacity-90">
                  Switch to <strong>{BOOTSTRAP_SUPER_ADMIN_EMAIL}</strong> or ask an Administrator to promote this account in User Management.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={loading}
                onClick={handleSwitchAccount}
                className="py-2.5 px-4 text-sm font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 disabled:opacity-60"
              >
                Switch Google Account
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="py-2.5 px-4 text-sm font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {displayError && (
              <div className="p-3 border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 rounded text-xs text-red-700 dark:text-red-300 leading-relaxed break-words">
                {displayError}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={handleSignIn}
              className="w-full inline-flex items-center justify-center gap-2.5 py-3 px-4 text-sm font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <LogIn className="w-4 h-4" />
              <span>{loading ? 'Signing In...' : 'Sign In with Google'}</span>
            </button>

            {(inIframe || Boolean(displayError)) && (
              <a
                href="/admin/login"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-medium border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Admin Login in New Tab (If Popup Blocked)</span>
              </a>
            )}

            <p className="text-xs text-stone-500 dark:text-stone-400 text-center pt-2 leading-relaxed">
              Sign in with Super Admin Google account (<strong>{BOOTSTRAP_SUPER_ADMIN_EMAIL}</strong>) or an authorized staff account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
