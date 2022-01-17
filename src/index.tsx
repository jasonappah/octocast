import {
  ActionPanel,
  getPreferenceValues,
  List,
  Icon,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Color,
  confirmAlert,
} from "@raycast/api";
import { useState, useEffect, useReducer } from "react";
import { getCurrentJob, getJobs, initSock, octoFetch, reducer } from "./lib";
import { ConnectionSettings, FileFolder, PrintJob, Update } from "./types";
import { CurrentItem } from "./components/CurrentItem";
import { JobListItem } from "./components/JobListItem";
import { Temp } from "./components/Temp";

// TODO: Add a "refresh jobs" button to the list
// TODO: Add temperature graphs to a separate command
// TODO: Support PSU Control

export default function MainPage() {
  const [state, dispatch] = useReducer(reducer, { files: [] });
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = getPreferenceValues()["octoprint-base-url"];
  async function refresh(init = false) {
    const [data, connection] = await Promise.all([
      fetchJobs(init),
      (await octoFetch("/api/connection"))?.json() as unknown as ConnectionSettings,
    ]);
    dispatch({ type: Update.CONNECTION_SETTINGS, value: connection });
    if (data.jobs) dispatch({ type: Update.FILE_LIST, value: data.jobs });
    if (data.current) {
      dispatch({ type: Update.CURRENT_PRINT_JOB, value: data.current.job });
      dispatch({ type: Update.CURRENT_PRINT_JOB_PROGRESS, value: data.current.progress });
    }
    if (init) setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [state.machineState]);

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
            {state?.job?.file.display && (
              <CurrentItem state={state.machineState} job={state.job} progress={state.progress} />
            )}

            <List.Item
              icon={{
                source: Icon.Bubble,
                tintColor:
                  state.connection?.current.state === "Operational" || state.connection?.current.state === "Printing"
                    ? Color.Green
                    : state.connection?.current.state === "Closed"
                    ? Color.Red
                    : Color.Yellow,
              }}
              title={`${
                state.connection?.options.printerProfiles.find(
                  (p) =>
                    p.id === state.connection?.current?.printerProfile ||
                    state.connection?.options.printerProfilePreference
                )?.name
              }: ${state.connection?.current.state}`}
              actions={
                <ActionPanel>
                  <ActionPanel.Item
                    icon={state.connection?.current?.state === "Operational" ? Icon.XmarkCircle : Icon.Checkmark}
                    title={
                      state.connection?.current.state !== "Closed" ? "Disconnect from Printer" : "Connect to Printer"
                    }
                    onAction={() => {
                      (async () => {
                        if (await confirmAlert({ title: "Are you sure?" })) {
                          await octoFetch("/api/connection", {
                            method: "POST",
                            body: JSON.stringify({
                              command: state?.connection?.current.state === "Operational" ? "disconnect" : "connect",
                            }),
                          });
                        }
                        refresh();
                      })();
                    }}
                  />
                  <OpenInBrowserAction title="Open OctoPrint in Browser" url={baseUrl} />
                </ActionPanel>
              }
            />
            {state.connection?.current.state === "Operational" && <Temp temp={state.currentTemp} />}
          </List.Section>
          <List.Section title="All Files">
            {state.files.map((job) => (
              <JobListItem
                printing={state.connection?.current.state === "Printing"}
                key={`${job.hash}_${job.date}`}
                job={job}
              />
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
