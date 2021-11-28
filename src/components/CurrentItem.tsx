import {
 List,
  Icon,
  Color
} from "@raycast/api";
import { Progress, Job, MachineState } from "../types";
import { Duration } from "luxon";
import { useEffect, useState } from "react";

export function CurrentItem({ state, job, progress }: { state?: MachineState, job?: Job; progress?: Progress; }) {
  // TODO: add actions for start, pause, cancel, restart
  const [title, setTitle] = useState<string>("");
  useEffect(() => {
    let t = "";
    if (state) {
      t += state.text;
    }
    if (job) {
      if (t.length > 0) {
        t += ": "
      }
      t += job.file.display
    }

    if (t.length==0) {
      t = "Unknown"
    }


    setTitle(t);
  }, [state, job]);
  return (
    <List.Item
      id="current"
      key="current"
      title={title}
      subtitle={progress && job
        ? `${Duration.fromMillis(progress?.printTime * 1000).toISOTime({
          suppressMilliseconds: true,
        })} / ${Duration.fromMillis(progress?.printTimeLeft * 1000).toISOTime({
          suppressMilliseconds: true,
        })}`
        : undefined}
      accessoryTitle={progress && job ? progress?.completion?.toFixed(2) + "%" : ""}
      icon={{
        source: progress && job ? Icon.Download : Icon.Circle,
        tintColor: progress && job ? Color.Green : Color.PrimaryText,
      }}/>
  );
}
