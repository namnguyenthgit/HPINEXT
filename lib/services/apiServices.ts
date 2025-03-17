import { appConfig } from '../appconfig';
import { lsApiDocReturn } from '@/types';

export async function fetchLsDocuments(type: string, params: string): Promise<lsApiDocReturn> {
    const baseurl = appConfig.baseurl.replace(/\/$/, '');
    const endpoint = `${baseurl}/api/lsretail/getdata/${type}?value=${encodeURIComponent(params)}`;

    const response = await fetch(endpoint, { method: 'GET' });

    if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    const data: lsApiDocReturn = await response.json();

    if (!data.success) {
        throw new Error(data.message || 'Failed to fetch data');
    }

    return data;
}