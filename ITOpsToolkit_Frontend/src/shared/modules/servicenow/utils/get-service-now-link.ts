import { appConfig } from '@/config/app-config';
import type { SnowTableName } from '../types/ticket';
import { getSnowTableNameByTicketType } from './get-snow-table-by-ticket-type';

const getServiceNowLink = ({ sysId, type }: { sysId: string; type: SnowTableName }) => {
    const tableName = getSnowTableNameByTicketType(type);

    return `${appConfig.serviceNow.api.baseUrl}/nav_to.do?uri=${tableName}.do?sys_id=${sysId}`;
};

export default getServiceNowLink;
