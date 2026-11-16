import type { AuthService } from '../services/authService';
import { registerAuthIpc } from './auth.ipc';

/**
 * Single place where IPC modules are wired up.
 * Phase 2+ adds menu.ipc.ts, orders.ipc.ts, ... here.
 */
export function registerIpc(auth: AuthService): void {
  registerAuthIpc(auth);
  // TODO(Phase 3): registerMenuIpc, registerOrdersIpc
  // TODO(Phase 4): registerStaffIpc
  // TODO(Phase 5): registerVehiclesIpc
  // TODO(Phase 6): registerReportsIpc, registerSettingsIpc
}
