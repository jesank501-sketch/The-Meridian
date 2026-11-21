import React, { useState } from 'react';
import { Trash2, UserPlus } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import {
  inviteStaffMember,
  removeStaffInvite,
  updateOwnProfile,
  updateUserRole,
} from '../../lib/firestoreService';
import { formatFirestoreDate } from '../../lib/sanitize';
import type { UserRole } from '../../types/portal';

export function UsersAndAnalyticsManager({
  mode,
}: {
  mode: 'users' | 'analytics' | 'profile';
}) {
  const {
    users,
    staffInvites,
    articles,
    categories,
    analyticsEvents,
    activityLogs,
    currentUser,
    isAdmin,
    isSuperAdmin,
  } = usePortal();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Administrator' | 'Editor' | 'Reporter' | 'Author'>('Editor');
  const [profileName, setProfileName] = useState(currentUser?.displayName || '');
  const [profileTitle, setProfileTitle] = useState(currentUser?.title || '');
  const [profileBio, setProfileBio] = useState(currentUser?.bio || '');
  const [profilePhoto, setProfilePhoto] = useState(currentUser?.photoURL || '');
  const [msg, setMsg] = useState('');

  if (mode === 'profile') {
    const handleSaveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!currentUser) return;
      await updateOwnProfile(currentUser.uid, {
        displayName: profileName,
        title: profileTitle,
        bio: profileBio,
        photoURL: profilePhoto,
      });
      setMsg('Profile updated.');
    };

    return (
      <div className="max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Profile Settings</h1>
          <p className="text-xs text-stone-500 mt-1">
            Role: <strong>{currentUser?.role}</strong> · {currentUser?.email}
          </p>
        </div>
        {msg && <p className="text-xs text-emerald-600">{msg}</p>}
        <form
          onSubmit={handleSaveProfile}
          className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg space-y-4 text-xs"
        >
          <div>
            <label className="block font-medium mb-1">Display Name</label>
            <input
              type="text"
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Editorial Title</label>
            <input
              type="text"
              value={profileTitle}
              onChange={(e) => setProfileTitle(e.target.value)}
              placeholder="e.g. Senior Foreign Correspondent"
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Avatar URL</label>
            <input
              type="url"
              value={profilePhoto}
              onChange={(e) => setProfilePhoto(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <div>
            <label className="block font-medium mb-1">Bio</label>
            <textarea
              rows={3}
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
          >
            Save Profile
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'analytics') {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    const weekAgoKey = new Date(now.getTime() - 7 * 86400_000).toISOString().slice(0, 10);
    const monthAgoKey = new Date(now.getTime() - 30 * 86400_000).toISOString().slice(0, 10);

    const dailyVisitors = new Set(
      analyticsEvents.filter((e) => e.dateKey === todayKey).map((e) => e.visitorId)
    ).size;
    const weeklyVisitors = new Set(
      analyticsEvents.filter((e) => e.dateKey >= weekAgoKey).map((e) => e.visitorId)
    ).size;
    const monthlyVisitors = new Set(
      analyticsEvents.filter((e) => e.dateKey >= monthAgoKey).map((e) => e.visitorId)
    ).size;

    const totalPublished = articles.filter((a) => a.status === 'published').length;
    const totalDrafts = articles.filter((a) => a.status === 'draft').length;
    const totalPageViews =
      analyticsEvents.length + articles.reduce((sum, a) => sum + (a.viewsCount || 0), 0);

    const topArticles = [...articles]
      .sort((a, b) => (b.viewsCount || 0) - (a.viewsCount || 0))
      .slice(0, 8);

    // Group real page view events by dateKey (last 7 dates present)
    const dateCounts = new Map<string, number>();
    for (const ev of analyticsEvents) {
      dateCounts.set(ev.dateKey, (dateCounts.get(ev.dateKey) || 0) + 1);
    }
    const dailySeries = Array.from(dateCounts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Real-Time Newsroom Analytics</h1>
          <p className="text-xs text-stone-500 mt-1">
            Computed exclusively from recorded Firestore visitor events and article read counters.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            ['Published Articles', totalPublished],
            ['Draft Articles', totalDrafts],
            ['Total Categories', categories.length],
            ['Registered Users', users.length || 1],
            ['Total Page Views', totalPageViews],
            ['Daily Visitors', dailyVisitors],
            ['Weekly Visitors', weeklyVisitors],
            ['Monthly Visitors', monthlyVisitors],
          ].map(([label, val]) => (
            <div
              key={String(label)}
              className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg"
            >
              <p className="text-xs text-stone-500">{label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{Number(val).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
            <h2 className="text-sm font-bold mb-4">Most Popular Articles</h2>
            <div className="divide-y divide-stone-200 dark:divide-stone-800">
              {topArticles.map((art) => (
                <div key={art.id} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                  <span className="font-medium truncate">{art.title}</span>
                  <span className="font-mono tabular-nums text-stone-500 shrink-0">
                    {(art.viewsCount || 0).toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-5">
            <h2 className="text-sm font-bold mb-4">Recorded Daily Traffic</h2>
            {dailySeries.length === 0 ? (
              <p className="text-xs text-stone-500">
                Page view events will populate here as readers browse articles.
              </p>
            ) : (
              <div className="space-y-2.5">
                {dailySeries.map(([dateKey, count]) => (
                  <div key={dateKey} className="flex items-center gap-3 text-xs">
                    <span className="font-mono tabular-nums w-24 text-stone-500">{dateKey}</span>
                    <div className="flex-1 h-2.5 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-stone-900 dark:bg-stone-100"
                        style={{ width: `${Math.min(100, count * 10)}%` }}
                      />
                    </div>
                    <span className="font-mono tabular-nums w-10 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}

            <h3 className="text-sm font-bold mt-6 mb-3">Recent Publishing Activity</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activityLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="text-xs border-b border-stone-100 dark:border-stone-800 pb-1.5">
                  <p className="font-medium">{log.details}</p>
                  <p className="text-[11px] text-stone-500">
                    {log.userName} · {formatFirestoreDate(log.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // User Management
  if (!isAdmin) {
    return (
      <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm">
        Administrator or Super Admin permissions are required to manage user roles.
      </div>
    );
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !inviteEmail.includes('@')) return;
    await inviteStaffMember(inviteEmail, inviteRole, currentUser);
    setInviteEmail('');
    setMsg('Staff invitation logged.');
  };

  const assignableRoles: UserRole[] = isSuperAdmin
    ? ['Super Admin', 'Administrator', 'Editor', 'Reporter', 'Author', 'Subscriber']
    : ['Administrator', 'Editor', 'Reporter', 'Author', 'Subscriber'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management & RBAC</h1>
        <p className="text-xs text-stone-500 mt-1">
          Manage editorial roles (Super Admin, Administrator, Editor, Reporter, Author) enforced by Firestore rules.
        </p>
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      <form
        onSubmit={handleInvite}
        className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg flex flex-wrap items-end gap-3 text-xs"
      >
        <div className="flex-1 min-w-[200px]">
          <label className="block font-medium mb-1">Invite Team Member (Email)</label>
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="reporter@meridiandispatch.org"
            className="w-full px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Target Role</label>
          <select
            value={inviteRole}
            onChange={(e) =>
              setInviteRole(
                e.target.value as 'Administrator' | 'Editor' | 'Reporter' | 'Author'
              )
            }
            className="px-3 py-2 border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950"
          >
            <option value="Administrator">Administrator</option>
            <option value="Editor">Editor</option>
            <option value="Reporter">Reporter</option>
            <option value="Author">Author</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 rounded"
        >
          <UserPlus className="w-4 h-4" /> Record Invite
        </button>
      </form>

      {staffInvites.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
            Pending Staff Invitations (Assign role below after they sign in with Google)
          </h2>
          <div className="divide-y divide-stone-200 dark:divide-stone-800 text-xs">
            {staffInvites.map((inv) => (
              <div key={inv.id} className="py-2 flex items-center justify-between">
                <span>
                  <strong>{inv.email}</strong> · Invited as {inv.role}
                </span>
                <button
                  type="button"
                  onClick={() => currentUser && removeStaffInvite(inv.id, currentUser)}
                  className="text-red-600"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800 text-xs text-stone-500">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Account Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {users.map((u) => {
              const lockedSuperAdmin = u.role === 'Super Admin' && !isSuperAdmin;
              return (
                <tr key={u.id}>
                  <td className="py-3 px-4 font-medium">{u.displayName}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">{u.email}</td>
                  <td className="py-3 px-4">
                    <select
                      disabled={lockedSuperAdmin || u.uid === currentUser?.uid}
                      value={u.role}
                      onChange={(e) =>
                        currentUser &&
                        updateUserRole(u.uid, e.target.value as UserRole, u.isActive, currentUser)
                      }
                      className="px-2.5 py-1 text-xs border border-stone-300 dark:border-stone-700 rounded bg-white dark:bg-stone-950 disabled:opacity-60"
                    >
                      {assignableRoles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      disabled={lockedSuperAdmin || u.uid === currentUser?.uid}
                      onClick={() =>
                        currentUser && updateUserRole(u.uid, u.role, !u.isActive, currentUser)
                      }
                      className={`text-xs font-semibold disabled:opacity-50 ${
                        u.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'
                      }`}
                    >
                      {u.isActive ? 'Active' : 'Suspended'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
