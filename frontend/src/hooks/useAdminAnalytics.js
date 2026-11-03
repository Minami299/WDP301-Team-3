import { useEffect, useState } from 'react';
import { adminApi } from '../services/api/adminApi';

export default function useAdminAnalytics({ from, to, interval }) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([from, to, interval, revision]);
  const [state, setState] = useState({ key: '', report: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    adminApi.getAnalytics({ from, to, interval }, controller.signal).then(response => {
      if (active) setState({ key, report: response.data, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ key, report: null, loading: false, error: error.message });
    });
    return () => { active = false; controller.abort(); };
  }, [from, to, interval, key]);
  return { ...(state.key === key ? state : { report: null, loading: true, error: '' }), reload: () => setRevision(value => value + 1) };
}
