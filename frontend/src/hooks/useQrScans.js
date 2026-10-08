import { useEffect, useState } from 'react';
import { qrApi } from '../services/api/qrApi';

export default function useQrScans() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    qrApi.getScans()
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
  }, [version]);

  return { report, loading, error, refresh: () => setVersion((value) => value + 1) };
}