import mitt from 'mitt';
import type { GlobalAlertDialogEvent } from './types';

const globalAlertDialogEventBus = mitt<GlobalAlertDialogEvent>();

export default globalAlertDialogEventBus;
