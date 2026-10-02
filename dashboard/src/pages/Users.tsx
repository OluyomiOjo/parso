import { useState } from 'react';

import { adminStats, FREE_LIMIT, formatDate, SOURCE_NAMES, type UserRow } from '../api';
import { useAdmin } from '../components/useAdmin';

// Everyone with an account: their activity and plan, never what they saved.
export function Users({ myId }: { myId: string }) {
  const { data, error, reload } = useAdmin<UserRow[]>({ action: 'users' });
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const act = async (user: UserRow, body: Record<string, unknown>) => {
    setBusy(user.id);
    setActionError(null);
    try {
      await adminStats({ ...body, user_id: user.id });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = (user: UserRow) => {
    const typed = window.prompt(
      `Delete ${user.email ?? 'this account'} and all ${user.saves} of their saves? This can't be undone. Type DELETE to confirm.`,
    );
    if (typed === 'DELETE') void act(user, { action: 'delete_user' });
  };

  return (
    <>
      <h1 className="title">Users</h1>
      <p className="secondary" style={{ margin: '0 4px 12px' }}>
        {data ? `${data.length} accounts. ` : ''}Saves are counted, never shown.
      </p>
      {error || actionError ? <div className="error">{error ?? actionError}</div> : null}
      {data ? (
        <div className="list-panel">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Joined</th>
                <th>Last active</th>
                <th>Saves</th>
                <th>Apps they save from</th>
                <th>Plan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((u) => (
                <tr key={u.id}>
                  <td className="row-title">{u.email ?? 'Hidden email'}</td>
                  <td className="num">{formatDate(u.created_at)}</td>
                  <td className="num">{formatDate(u.last_active ?? u.last_sign_in_at)}</td>
                  <td className="num">{u.pro ? u.saves : `${u.saves} of ${FREE_LIMIT}`}</td>
                  <td className="wrap">{u.sources.map((s) => SOURCE_NAMES[s] ?? s).join(', ') || 'None yet'}</td>
                  <td>{u.pro ? 'Pro' : 'Free'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <button
                        className="link-button"
                        disabled={busy === u.id}
                        onClick={() => act(u, { action: 'set_pro', pro: !u.pro })}
                      >
                        {u.pro ? 'Remove Pro' : 'Give Pro'}
                      </button>
                      {u.id !== myId ? (
                        <button className="link-button quiet" disabled={busy === u.id} onClick={() => remove(u)}>
                          Delete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
