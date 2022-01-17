import SockJS from "sockjs-client";

import { getPreferenceValues, showHUD, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit, Response } from "node-fetch";
import {
  PrintJob,
  FileFolder,
  Login,
  CurrentTemp,
  Job,
  MachineState,
  Progress,
  ConnectionSettings,
  ConnectedPayload,
} from "./types";
import { Action, Payloads, Update } from "./types";
// for types, see https://docs.octoprint.org/en/master/api/datamodel.html
// and https://docs.octoprint.org/en/master/api/push.html

export async function octoFetch(request: RequestInfo, init?: RequestInit | undefined): Promise<Response | undefined> {
  const prefs = getPreferenceValues();
  if (!init) init = {};

  init.headers = {
    Authorization: `Bearer ${prefs["octoprint-api-key"]}`,
    "Content-Type": "application/json",
    ...init.headers,
  };
  try {
    let req: Response;
    if (typeof request === "string") {
      req = await fetch(prefs["octoprint-base-url"] + request, init);
    } else {
      req = await fetch(request, init);
    }
    if (!req.ok) throw new Error(`HTTP error! status: ${req.status}`);
    return req;
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, `${error}`);
  }
}

export async function getCurrentJob() {
  const response = await octoFetch("/api/job");
  if (!response) {
    showHUD("An error occured when fetching the current job");
    return;
  }
  const json = await response.json();
  return json as PrintJob;
}
export async function getJobs() {
  const response = await octoFetch("/api/files");
  const json = await response?.json();
  return json as { files: FileFolder[] };
}

export async function login() {
  const response = await octoFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({
      passive: true,
    }),
  });
  const json = await response?.json();
  return json as Login;
}

export function initSock(dispatch: React.Dispatch<Action>, baseUrl: string) {
  const sock = new SockJS(baseUrl + "/sockjs");
  sock.onopen = async function () {
    const data = await login();
    const payload = { auth: `${data.name}:${data.session}` };
    sock.send(JSON.stringify(payload));
  };

  sock.onmessage = function (e: { data: Payloads }) {
    const key = Object.keys(e.data)[0] as keyof Payloads;

    switch (key) {
      case "timelapse":
      case "history":
      case "plugin": {
        break;
      }
      case "job": {
        const payload = e.data[key];
        dispatch({ type: Update.CURRENT_PRINT_JOB, value: payload.job });
        dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: payload.progress });
        break;
      }
      case "current": {
        const payload = e.data[key];
        dispatch({ type: Update.NEW_LOGS, value: payload.logs });
        dispatch({ type: Update.MACHINE_STATE, value: payload.state });
        dispatch({ type: Update.CURRENT_PRINT_JOB, value: payload.job });
        dispatch({ type: Update.CURRENT_TEMPERATURE, value: payload.temps[0] });
        dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: payload.progress });
        break;
      }
      case "connected": {
        const payload = e.data[key];
        dispatch({ type: Update.INSTANCE_INFO, value: payload });
        break;
      }
      default: {
        const payload = e.data[key];
        // TODO: use these payloads instead of polling OctoPrint
        switch (payload.type) {
          // { type: 'ZChange', payload: { new: 0, old: 10 } }
          // { type: 'PrinterStateChanged',  payload: { state_id: 'OPERATIONAL', state_string: 'Operational' } }
          /* same as printfailed {
            type: 'PrintCancelled',
            payload: {
              name: 'CE3_connector.gcode',
              path: 'CE3_connector.gcode',
              origin: 'local',
              size: 3069577,
              position: { f: null, y: null, z: null, x: null, t: null, e: null },
              owner: 'jasonaa',
              user: 'jasonaa',
              time: 649.910841142002
            }
          } 
          {
            type: 'PrintCancelling',
            payload: {
              name: 'CE3_connector.gcode',
              path: 'CE3_connector.gcode',
              origin: 'local',
              size: 3069577,
              owner: 'jasonaa',
              user: 'jasonaa'
            }
          }
          {
            type: 'FileSelected',
            payload: {
              name: 'CE3_connector3.gcode',
              path: 'CE3_connector3.gcode',
              origin: 'local',
              size: null,
              owner: 'jasonaa',
              user: 'jasonaa'
            }
          }
          { type: 'Connected', payload: { port: null, baudrate: 115200 } }
         */
          case "ZChange":
          case "PrinterStateChanged":
          case "PrintFailed":
          case "PrintCancelled":
          case "PrintCancelling":
          case "FileSelected":
          case "Connected":
          default:
            console.log("Unknown message type", e.data[key]);
        }
      }
    }
  };

  sock.onclose = function (e) {
    console.log(e);
    showHUD("Socket closed. " + e.reason);
  };
  return sock;
}

export const titleCase = (txt: string) => {
  return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
};

export function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case Update.CURRENT_PRINT_JOB:
      return { ...state, job: action.value };
    case Update.CURRENT_PRINT_JOB_PROGRESS:
      return { ...state, progress: action.value };
    case Update.FILE_LIST:
      return { ...state, files: action.value };
    case Update.SOCKET:
      return { ...state, socket: action.value };
    case Update.CURRENT_TEMPERATURE:
      return { ...state, currentTemp: action.value };
    case Update.MACHINE_STATE:
      return { ...state, machineState: action.value };
    case Update.NEW_LOGS:
      return { ...state, lastLogs: action.value };
    case Update.INSTANCE_INFO:
      return { ...state, instanceInfo: action.value };
    case Update.CONNECTION_SETTINGS:
      return { ...state, connection: action.value };
  }
}

export interface ReducerState {
  job?: Job;
  progress?: Progress;
  files: FileFolder[];
  socket?: WebSocket;
  currentTemp?: CurrentTemp;
  machineState?: MachineState;
  lastLogs?: string[];
  connection?: ConnectionSettings;
  instanceInfo?: ConnectedPayload;
}
