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
  Detail,
  Color,
} from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import { initSock, octoFetch, reducer } from "./lib";
import { ConnectionSettings, Update } from "./types";

export default function LogsPage() {
  const [state, dispatch] = useReducer(reducer, { files: [], lastLogs: ["Waiting for logs..."] });
  const baseUrl = getPreferenceValues()["octoprint-base-url"];
  const [logs, setLogs] = useState<string[]>([]);
  const [displayAllLogs, setDisplayAllLogs] = useState(false);

  const refresh = async () => {
    const connection = (await (await octoFetch("/api/connection"))?.json()) as unknown as ConnectionSettings;
      dispatch({ type: Update.CONNECTION_SETTINGS, value: connection });
  }

  useEffect(() => {
    (async () => {
      const sock = initSock(dispatch, baseUrl);
      dispatch({ type: Update.SOCKET, value: sock });
      await refresh()
      return () => {
        sock.close();
      };
    })();
  }, []);

  useEffect(() => {
    if (state.connection?.current.state === "Closed") {
      setLogs(() => ["Currently disconnected from printer."]);
    }
  }, [state.connection]);

  useEffect(() => {
    refresh();
  }, [state.machineState]);

  useEffect(() => {
    setLogs((prev) => {
      if (state.lastLogs) {
        if (logs.length === 1 && prev[0] === "Waiting for logs..." || prev[0] === "Currently disconnected from printer.") return state.lastLogs;
        if (!displayAllLogs) return [...prev, ...state.lastLogs].slice(-23);
        return [...prev, ...state.lastLogs];
      } else {
        return prev;
      }
    });
  }, [state.lastLogs]);

  return (
    <Detail
      isLoading={logs.length === 1}
      markdown={`\`\`\`\n${logs.join("\n")}\n\`\`\``}
      actions={
        <ActionPanel title="Control Display">
          <ActionPanel.Item
            icon={Icon.Terminal}
            title={displayAllLogs ? "Keep Recent Logs Only" : "Keep All Logs"}
            onAction={() => {
              setDisplayAllLogs((prev) => !prev);
            }}
          ></ActionPanel.Item>
        </ActionPanel>
      }
    />
  );
}
