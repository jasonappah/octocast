import SockJS from "sockjs-client";

import { getPreferenceValues, showHUD, showToast, ToastStyle } from "@raycast/api";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit, Response } from "node-fetch";
import { PrintJob, FileFolder, Login, CurrentTemp, Job, MachineState, Progress, ConnectionSettings, ConnectedPayload } from "./types";
import { Action, Payloads, Update } from "./types";
// for types, see https://docs.octoprint.org/en/master/api/datamodel.html
// and https://docs.octoprint.org/en/master/api/push.html

// TODO: Handle users that only have some permissions for reading/writing data

export async function octoFetch(request: RequestInfo, init?: RequestInit | undefined): Promise<Response | undefined> {
  // TODO: Error handling with toasts n stuff
  const prefs = getPreferenceValues();
  if (!init) init = {};

  init.headers = {
    Authorization: `Bearer ${prefs["octoprint-api-key"]}`,
    "Content-Type": "application/json",
    ...init.headers,
  };
  try {
    if (typeof request === "string") {
      return await fetch(prefs["octoprint-base-url"] + request, init);
    } else {
      return await fetch(request, init);
    }
  } catch (error) {
    console.log(error);
    showToast(ToastStyle.Failure, "Error", `Error: ${error}`);
  }
}

export async function getCurrentJob() {
  const response = await octoFetch("/api/job");
  if (!response) {
    showHUD("An error occured when fetching the current job")
    return;
};
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
  async function authSock(sock: WebSocket) {
    const data = await login();
    const payload = { auth: `${data.name}:${data.session}` };
    sock.send(JSON.stringify(payload));
  }
  const sock = new SockJS(baseUrl + "/sockjs");
  sock.onopen = function () {
    authSock(sock);
  };

  sock.onmessage = function (e: { data: Payloads }) {
    const key = Object.keys(e.data)[0] as keyof Payloads;

    switch (key) {
      case "timelapse":
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
      case "history": {
        const payload = e.data[key];
        break;
      }
      case "connected": {
        const payload = e.data[key];
        dispatch({ type: Update.INSTANCE_INFO, value: payload });
        break;
      }
      default:
        console.log("Unknown message type", e.data[key]);
        break;
    }
  };

  sock.onclose = function () {
    console.log("close");
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
  connection?: ConnectionSettings
  instanceInfo?: ConnectedPayload
}