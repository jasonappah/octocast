import {
  ActionPanel,
  CopyToClipboardAction,
  getPreferenceValues,
  List,
  Icon,
  Color,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  ListItem,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getCurrentJob, getJobs } from "./lib";
import type { FileFolder, PrintJob } from "./lib";
import { Duration, DateTime } from "luxon";
import {login} from "./lib"
import SockJS from "sockjs-client";

// TODO: Add a "refresh" button to the list
// TODO: Auto-refresh the list (maybe make the polling interval configurable as a preference, and use swr?)
export default function JobList() {
  const [{ current, jobs }, setState] = useState<{ current?: PrintJob; jobs: FileFolder[] }>({ jobs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const baseUrl = getPreferenceValues()["octoprint-base-url"];

  async function refresh() {
    const data = await fetchJobs();
    setState((oldState) => ({
      ...oldState,
      ...data,
    }));
    setIsLoading(false);
  }


  async function authSock(sock: WebSocket) {
    const data = await login()
    const payload = {auth:`${data.name}:${data.session}`}
    sock.send(JSON.stringify(payload))

  }

  useEffect(() => {
    const sock = new SockJS(baseUrl+"/sockjs");
    sock.onopen = function () {
      console.log("open");
      authSock(sock)
    };

    sock.onmessage = function (e) {
      console.log("message", e.data);
    };

    sock.onclose = function () {
      console.log("close");
    };

    refresh();
    return sock.close;
  }, []);

  const globalActions = (
    <ActionPanel>
      <OpenInBrowserAction url={baseUrl} />
    </ActionPanel>
  );
  return (
    <List actions={globalActions} isLoading={isLoading} searchBarPlaceholder="Search for files">
      {!isLoading && (
        <>
          <List.Section title="Current Job">
            <CurrentItem print={current} />
          </List.Section>
          <List.Section title="Printer Status">
            {/* TODO: Add list items for printer temperature, printer port / connection status */}
          </List.Section>
          <List.Section title="All Files">
            {jobs.map((job) => (
              <JobListItem key={`${job.hash}_${job.date}`} job={job} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function CurrentItem({ print }: { print?: PrintJob }) {
  const [elapsedTime, setElapsed] = useState(print?.progress.printTime || -2);
  useEffect(() => {
    if (print && elapsedTime != -2) {
      const interval = setInterval(() => {
        setElapsed((r) => r + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [print]);

  // TODO: start, pause, cancel, restart
  const actions = <ActionPanel>{/* <CopyToClipboardAction title="Copy URL" content={"job.url"} /> */}</ActionPanel>;
  return (
    <List.Item
      id="current"
      key="current"
      title={print?.job.file.name || "No active print"}
      subtitle={
        print
          ? `${Duration.fromMillis(elapsedTime * 1000).toISOTime({
              suppressMilliseconds: true,
            })} / ${Duration.fromMillis(print?.progress.printTimeLeft * 1000).toISOTime({
              suppressMilliseconds: true,
            })}`
          : undefined
      }
      accessoryTitle={print?.progress.completion.toFixed(2) + "%" || ""}
      icon={{ source: print ? Icon.Download : Icon.Circle, tintColor: print ? Color.Green : Color.PrimaryText }}
      actions={print ? actions : undefined}
    />
  );
}

function JobListItem(props: { job: FileFolder }) {
  const { job } = props;
  return (
    <List.Item
      id={`${job.hash}_${job.date}`}
      key={`${job.hash}_${job.date}`}
      title={job.name}
      subtitle={Duration.fromMillis(job.gcodeAnalysis.estimatedPrintTime * 1000).toISOTime({
        suppressMilliseconds: true,
      })}
      icon={{ source: Icon.Document, tintColor: Color.Blue }}
      accessoryTitle={`Uploaded ${DateTime.fromSeconds(job.date).toLocaleString(DateTime.DATETIME_MED)}`}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={"job.url"} title="Open OctoPrint" />
          <CopyToClipboardAction title="Copy URL" content={"job.url"} />
        </ActionPanel>
      }
    />
  );
}

async function fetchJobs(): Promise<{ jobs?: FileFolder[]; current?: PrintJob }> {
  try {
    const [current, all] = await Promise.all([getCurrentJob(), getJobs()]);
    return { jobs: all.files, current };
  } catch (error) {
    console.error(error);
    showToast(ToastStyle.Failure, "Could not load OctoPrint status");
    return Promise.resolve({});
  }
}
