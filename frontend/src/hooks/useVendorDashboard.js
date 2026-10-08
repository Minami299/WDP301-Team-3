import { useEffect, useState } from 'react';
import { vendorApi } from '../services/api/vendorApi';

export default function useVendorDashboard(params = {}) {
  const { from, to, vendor_id } = params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    vendorApi.getDashboard({ from, to, vendor_id })
      .then((response) => {
        if (active) setReport(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [from, to, vendor_id]);

  return { report, loading, error };
}