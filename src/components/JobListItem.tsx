import { List, Icon, Color, ActionPanel, confirmAlert } from "@raycast/api";
import { FileFolder } from "../types";
import { Duration, DateTime } from "luxon";
import { octoFetch } from "../lib";

export function JobListItem({ job }: { job: FileFolder }) {
  const url = `/api/files/${job.origin}/${job.path}`;

  return (
    <List.Item
      actions={
        <ActionPanel>
          <ActionPanel.Item
            title="Print Job"
            icon={Icon.Hammer}
            onAction={async () => {
              await octoFetch(url, {
                method: "POST",
                body: JSON.stringify({
                  command: "select",
                  print: true,
                }),
              });
            }}
          />
          <ActionPanel.Item
            title="Delete Job"
            icon={Icon.XmarkCircle}
            onAction={async () => {
              if (await confirmAlert({ title: "Are you sure?" })) {
                await octoFetch(url, {
                  method: "DELETE",
                });
              }
            }}
          />
        </ActionPanel>
      }
      id={`${job.hash}_${job.date}`}
      key={`${job.hash}_${job.date}`}
      title={job.display}
      subtitle={Duration.fromMillis(job.gcodeAnalysis.estimatedPrintTime * 1000).toISOTime({
        suppressMilliseconds: true,
      })}
      icon={{ source: Icon.Document, tintColor: Color.Blue }}
      accessoryTitle={`Added ${DateTime.fromSeconds(job.date).toLocaleString(DateTime.DATETIME_MED)}`}
    />
  );
}
