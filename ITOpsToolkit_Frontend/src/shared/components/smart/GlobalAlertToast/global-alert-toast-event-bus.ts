import mitt from 'mitt';
import type { GlobalAlertToastEvent } from './types';

const globalAlertToastEventBus = mitt<GlobalAlertToastEvent>();

export default globalAlertToastEventBus;
