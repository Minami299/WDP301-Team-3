import { useCallback, useEffect, useState } from 'react';
import { vendorApi } from '../services/api/vendorApi';

export default function useAttractions() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => {
    setLoading(true); setError('');
    setRevision((value) => value + 1);
  }, []);
  useEffect(() => {
    let active = true;
    vendorApi.getAttractions()
      .then((res) => { if (active) setFacilities(res.data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return { facilities, loading, error, reload };
}
