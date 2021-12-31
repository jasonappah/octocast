import { List, Icon, Color, ActionPanel, confirmAlert } from "@raycast/api";
import { Progress, Job, MachineState } from "../types";
import { Duration } from "luxon";
import { useEffect, useState } from "react";
import { octoFetch } from "../lib";

export function CurrentItem({ state, job, progress }: { state?: MachineState; job?: Job; progress?: Progress }) {
  const [title, setTitle] = useState<string>("");
  useEffect(() => {
    let t = "";
    if (state) {
      t += state.text;
    }
    if (job?.file.display) {
      if (t.length > 0) {
        t += ": ";
      }
      t += job.file.display;
    }

    if (t.length == 0) {
      t = "Unknown";
    }

    setTitle(t);
  }, [state, job]);
  return (
    <List.Item
      id="current"
      key="current"
      title={title}
      actions={
        <ActionPanel>
          {(state?.flags.printing || state?.flags.paused) && (
            <>
              <ActionPanel.Item
                icon={Icon.Circle}
                title="Pause Print"
                onAction={async () => {
                  await octoFetch("/api/job", {
                    method: "POST",
                    body: JSON.stringify({
                      command: "pause",
                      action: "pause",
                    }),
                  });
                }}
              />
              <ActionPanel.Item
                icon={Icon.XmarkCircle}
                title="Cancel Print"
                onAction={async () => {
                  if (await confirmAlert({ title: "Are you sure?" })) {
                    await octoFetch("/api/job", {
                      method: "POST",
                      body: JSON.stringify({
                        command: "cancel",
                      }),
                    });
                  }
                }}
              />
            </>
          )}
          {state?.flags.paused && (
            <>
              <ActionPanel.Item
                icon={Icon.ArrowRight}
                title="Resume Print"
                onAction={async () => {
                  await octoFetch("/api/job", {
                    method: "POST",
                    body: JSON.stringify({
                      command: "pause",
                      action: "resume",
                    }),
                  });
                }}
              />
              <ActionPanel.Item
                icon={Icon.ArrowClockwise}
                title="Restart Print"
                onAction={async () => {
                  await octoFetch("/api/job", {
                    method: "POST",
                    body: JSON.stringify({
                      command: "restart",
                    }),
                  });
                }}
              />
            </>
          )}
          {!state?.flags.printing && state?.flags.ready && (
            <ActionPanel.Item icon={Icon.Checkmark} title="Start Print" />
          )}
        </ActionPanel>
      }
      subtitle={
        progress?.completion
          ? `${Duration.fromMillis(progress?.printTime * 1000).toISOTime({
              suppressMilliseconds: true,
            })} / ${Duration.fromMillis(progress?.printTimeLeft * 1000).toISOTime({
              suppressMilliseconds: true,
            })}`
          : undefined
      }
      accessoryTitle={progress?.completion && job ? progress?.completion?.toFixed(2) + "%" : ""}
      icon={{
        source: progress && job ? Icon.Download : Icon.Circle,
        tintColor: progress && job ? Color.Green : Color.PrimaryText,
      }}
    />
  );
}
