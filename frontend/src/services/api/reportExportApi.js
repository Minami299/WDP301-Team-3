import axiosClient from './axiosClient';
import { validateReportDownload } from '../../utils/reportDownload.js';

export async function exportRevenueReport(params, partner = false) {
  const response = await axiosClient.get(`/${partner ? 'vendor' : 'admin'}/revenue/export`, {
    params, responseType: 'blob', download: true,
  });
  const blob = await validateReportDownload(response.data, response.headers['content-type'], params.format);
  const filename = /filename="([^"]+)"/.exec(response.headers['content-disposition'] || '')?.[1];
  return { blob, filename: filename || `financial-revenue-${params.from}-${params.to}.${params.format}` };
}
