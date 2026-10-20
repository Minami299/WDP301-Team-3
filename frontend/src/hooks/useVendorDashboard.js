import { useCallback, useEffect, useState } from 'react';
import { vendorApi } from '../services/api/vendorApi';

export default function useVendorDashboard(params = {}) {
  const { from, to, vendor_id } = params;
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([from, to, vendor_id, revision]);
  const [state, setState] = useState({ key, report: null, loading: true, error: '' });
  const reload = useCallback(() => setRevision(value => value + 1), []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setState({ key, report: null, loading: true, error: '' });
      return vendorApi.getDashboard({ from, to, vendor_id });
    })
      .then((response) => {
        if (active) setState({ key, report: response.data, loading: false, error: '' });
      })
      .catch((requestError) => {
        if (active) setState({ key, report: null, loading: false, error: requestError.message || 'Không tải được báo cáo.' });
      });
    return () => { active = false; };
  }, [from, to, vendor_id, key]);

  return { ...(state.key === key ? state : { report: null, loading: true, error: '' }), reload };
}
