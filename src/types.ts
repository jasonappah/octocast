interface Filament {
  length: number;
  volume: number;
}

export interface Job {
  averagePrintTime: number | null;
  estimatedPrintTime: number;
  filament: {
    [tool: Tool]: Filament;
  };
  file: AbridgedFileFolder;
  lastPrintTime: number | null;
  user: string;
}

export interface PrintJob {
  job: Job;
  progress: Progress;
  state: string;
}

export interface Progress {
  completion: number;
  filepos: number;
  printTime: number;
  printTimeLeft: number;
  printTimeLeftOrigin: string;
}

export interface MachineState {
  text: string;
  flags: {
    operational: boolean;
    paused: boolean;
    printing: boolean;
    pausing: boolean;
    cancelling: boolean;
    sdReady: boolean;
    error: boolean;
    ready: boolean;
    closedOrError: boolean;
  };
}

export interface FileFolder extends AbridgedFileFolder {
  refs: [
    {
      resource: string;
      download: string;
      model: string;
    }
  ];
  type: "model" | "machinecode" | "folder";
  typePath: string;
  hash: string;
  // TODO: better type for gcode analysis
  gcodeAnalysis: Record<string, any>;
  prints: PrintHistory[];
  statistics: { averagePrintTime: ProfileTime; lastPrintTime: ProfileTime };
}

export interface AbridgedFileFolder {
  size: number;
  name: string;
  date: number;
  display: string;
  path: string;
  origin: "local" | "sdcard";
}

interface ProfileTime {
  [profile: string]: number;
}

interface PrintHistory {
  success: number;
  failure: number;
  last: {
    success: boolean;
    date: number;
    printTime: number;
  };
}

interface UserRecord {
  name: string;
  active: boolean;
  user: boolean;
  admin: boolean;
  apikey: string;
  settings: object;
  groups: string[];
  needs: Needs;
  permissions: Permission[];
}

interface Permission {
  key: string;
  name: string;
  dangerous: boolean;
  default_groups: string[];
  description: string;
  needs: Needs;
}

interface Needs {
  role: string[];
  group: string[];
}

export interface Login extends UserRecord {
  session: string;
  _is_external_client: boolean;
}

interface Temperature {
  actual: number;
  target: number;
  offset?: number;
}

export interface TemperatureOffset {
  bed: number;
  [key: Tool]: number;
}

export interface Resends {
  count: number;
  transmitted: number;
  ratio: number;
}

export type Tool = `tool${number}`;

export interface SocketPayloadBase {
  state: MachineState;
  job: Job;
  progress: Progress;
  currentZ: number;
  offsets: TemperatureOffset;
  serverTime: number;
  resends: Resends;
  logs: string[];
  messages: string[];
}

export type TimelapsePayload = null;

export interface CurrentPayload extends SocketPayloadBase {
  plugins: object;
  busyFiles: unknown[];
  temps: [CurrentTemp];
}


export interface CurrentTemp { bed: Temperature; chamber: Temperature; [key: Tool]: Temperature }
export interface HistoricalTemps extends CurrentTemp { time: number; }

export type HistoryPayload = CurrentPayload & {
  temps: HistoricalTemps[]
}

export interface PluginPayload {
  plugin: object;
  data: object;
}

export interface ConnectedPayload {
  version: string;
  display_version: string;
  branch: string;
  python_version: string;
  plugin_hash: string;
  config_hash: string;
  debug: boolean;
  safe_mode: boolean;
  online: boolean;
  permissions: Permission[];
}

export type PrintJobPayload = PrintJob;

export type UnknownPayload = unknown;
