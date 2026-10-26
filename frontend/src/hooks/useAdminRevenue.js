import { useEffect, useState } from 'react';
import { adminApi } from '../services/api/adminApi';
import { vendorApi } from '../services/api/vendorApi';

export default function useAdminRevenue(params, partner = false) {
  const { from, to, page, vendor_id } = params;
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([from, to, page, vendor_id, partner, revision]);
  const [state, setState] = useState({ key, report: null, loading: true, error: '' });
  useEffect(() => {
    let active = true;
    (partner ? vendorApi : adminApi).getRevenue({ from, to, page, vendor_id, page_size: 20 }).then(response => {
      if (active) setState({ key, report: response.data, loading: false, error: '' });
    }).catch(error => {
      if (active) setState({ key, report: null, loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [from, to, page, vendor_id, partner, key]);
  return { ...(state.key === key ? state : { report: null, loading: true, error: '' }), reload: () => setRevision(value => value + 1) };
}
