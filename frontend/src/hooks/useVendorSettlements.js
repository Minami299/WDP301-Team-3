import { useEffect, useState } from 'react';
import { vendorApi } from '../services/api/vendorApi';

export default function useVendorSettlements(params = {}) {
  const { from, to, vendor_id } = params;
  const [settlements, setSettlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    vendorApi.getSettlements({ from, to, vendor_id })
      .then((response) => {
        if (active) setSettlements(response.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [from, to, vendor_id, version]);

  return { settlements, loading, error, refresh: () => setVersion((value) => value + 1) };
}