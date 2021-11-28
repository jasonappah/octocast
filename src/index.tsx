import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  List,
  Icon,
  OpenInBrowserAction,
  showToast,
  PushAction,
  ToastStyle,
  ListItem,
} from "@raycast/api";
import { useState, useEffect, useReducer } from "react";
import { getCurrentJob, getJobs } from "./lib";
import {
  PluginPayload,
  TimelapsePayload,
  FileFolder,
  PrintJob,
  Progress,
  MachineState,
  CurrentPayload,
  HistoryPayload,
  PrintJobPayload,
  ConnectedPayload,
  Job,
  CurrentTemp,
} from "./types";
import { login } from "./lib";
import SockJS from "sockjs-client";
import { LatestMsg } from "./components/LatestMsg";
import { CurrentItem as CurrentStatus } from "./components/CurrentItem";
import { JobListItem } from "./components/JobListItem";
import { Temp } from "./components/Temp";

// TODO: Add a "refresh jobs" button to the list

enum Update {
  CURRENT_PRINT_JOB,
  CURRENT_PRINT_JOB_PROGRESS,
  FILE_LIST,
  SOCKET,
  CURRENT_TEMPERATURE,
  MACHINE_STATE,
}

type Action =
  | { type: Update.CURRENT_PRINT_JOB; value: Job }
  | { type: Update.CURRENT_PRINT_JOB_PROGRESS; value: Progress }
  | { type: Update.FILE_LIST; value: FileFolder[] }
  | { type: Update.SOCKET; value: WebSocket }
  | { type: Update.CURRENT_TEMPERATURE; value: CurrentTemp }
  | { type: Update.MACHINE_STATE; value: MachineState };

function reducer(state: ReducerState, action: Action): ReducerState {
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
  }
}

interface ReducerState {
  job?: Job;
  progress?: Progress;
  files: FileFolder[];
  socket?: WebSocket;
  currentTemp?: CurrentTemp;
  machineState?: MachineState;
}

export default function JobList() {
  const [state, dispatch] = useReducer(reducer, { files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = getPreferenceValues()["octoprint-base-url"];
  async function refresh(init = false) {
    const data = await fetchJobs(init);
    if (data.jobs) dispatch({ type: Update.FILE_LIST, value: data.jobs });
    if (data.current) {
      dispatch({ type: Update.CURRENT_PRINT_JOB, value: data.current?.job });
      dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: data.current?.progress });
    }
    if (init) setIsLoading(false);
  }

  useEffect(() => {
    const sock = initSock(dispatch, baseUrl);
    dispatch({ type: Update.SOCKET, value: sock });
    refresh(true);
    const interval = setInterval(refresh, 30000);
    return () => {
      sock.close();
      clearInterval(interval);
    };
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search for files">
      {!isLoading && (
        <>
          <List.Section title="Printer Status">
            {/* TODO: Add list items for printer port / connection status */}
            <CurrentStatus state={state.machineState} job={state.job} progress={state.progress} />
            <Temp temp={state.currentTemp} />
            <ListItem icon={Icon.ArrowRight} title="View Server Details" />
          </List.Section>
          <List.Section title="All Files">
            {state.files.map((job) => (
              <JobListItem key={`${job.hash}_${job.date}`} job={job} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

async function fetchJobs(init: boolean): Promise<{ jobs?: FileFolder[]; current?: PrintJob }> {
  try {
    const [current, all] = await Promise.all([init ? getCurrentJob() : null, getJobs()]);
    return { jobs: all.files, current: current ?? undefined };
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load OctoPrint status");
    return Promise.resolve({});
  }
}

type Payloads = {
  job: PrintJobPayload;
  current: CurrentPayload;
  history: HistoryPayload;
  plugin: PluginPayload;
  timelapse: TimelapsePayload;
  connected: ConnectedPayload;
};

function initSock(dispatch: React.Dispatch<Action>, baseUrl: string) {
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
      case "job": {
        const payload = e.data[key];
        dispatch({ type: Update.CURRENT_PRINT_JOB, value: payload.job });
        dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: payload.progress });
        break;
      }
      case "current": {
        const payload = e.data[key];
        dispatch({ type: Update.MACHINE_STATE, value: payload.state });
        dispatch({ type: Update.CURRENT_PRINT_JOB, value: payload.job });
        dispatch({ type: Update.CURRENT_TEMPERATURE, value: payload.temps[0] });
        dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: payload.progress });
        break;
      }
      case "history": {
        const payload = e.data[key];
        console.log(payload.temps.length);
        break;
      }
      case "plugin": {
        const payload = e.data[key];
        break;
      }
      case "connected": {
        const payload = e.data[key];
        break;
      }
      default:
        console.log("Unknown message type", key);
        break;
    }
  };

  sock.onclose = function () {
    console.log("close");
  };
  return sock;
}

export const titleCase = (txt: string) => {

    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();

}