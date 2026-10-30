import mitt from 'mitt';
import type { GlobalSuccessAlertEvent } from './types';

const globalSuccessAlertEventBus = mitt<GlobalSuccessAlertEvent>();

export default globalSuccessAlertEventBus;
