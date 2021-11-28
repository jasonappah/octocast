import {
 List,
  Icon,
  Color
} from "@raycast/api";
import { FileFolder } from "../types";
import { Duration, DateTime } from "luxon";

export function JobListItem(props: { job: FileFolder; }) {
  const { job } = props;
  return (
    <List.Item
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
