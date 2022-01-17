import { ActionPanel, Detail, Form, getPreferenceValues, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { useEffect, useState, useReducer } from "react";
import { initSock, octoFetch, reducer, titleCase } from "./lib";
import { ConnectionSettings, Update } from "./types";

export default function TempPage() {
  const [state, dispatch] = useReducer(reducer, { files: [] });
  const [msg, setMsg] = useState("Connecting...");
  const baseUrl = getPreferenceValues()["octoprint-base-url"];

  const refresh = async () => {
    const connection = (await (await octoFetch("/api/connection"))?.json()) as unknown as ConnectionSettings;
    dispatch({ type: Update.CONNECTION_SETTINGS, value: connection });
  };

  useEffect(() => {
    if (!state.connection?.current.state) return;
    if (state.connection?.current.state === "Closed") {
      setMsg("Currently disconnected from printer.");
    } else if (state.connection?.current.state === "Printing") {
      setMsg("Currently running a print job.");
    } else {
      setMsg("");
      getTools();
    }
  }, [state.connection]);

  useEffect(() => {
    refresh();
    const sock = initSock(dispatch, baseUrl);
    dispatch({ type: Update.SOCKET, value: sock });
    const interval = setInterval(() => {
      refresh();
    }, 10 * 1000);
    return () => {
      sock.close();
      clearInterval(interval);
    };
  }, []);

  const [tools, setTools] = useState({});
  async function getTools() {
    const res = await octoFetch("/api/printer/tool");
    const json = (await res?.json()) as unknown as Record<string, unknown>;
    setTools(json);
  }

  if (msg) return <Detail markdown={msg} />;
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Go"
            onSubmit={async ({ tool, temp }) => {
              if (!tool) {
                showToast(ToastStyle.Failure, "Please select a tool");
                return;
              }

              await octoFetch("/api/printer/tool", {
                method: "POST",
                body: JSON.stringify({
                  command: "target",
                  targets: {
                    [tool]: Number(temp),
                  },
                }),
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="tool" title="Tool">
        {Object.keys(tools).map((tool) => (
          <Form.Dropdown.Item
            key={tool}
            value={tool}
            title={`${titleCase(tool.replace("tool", "Tool "))}: ${tools[tool].actual}ºC/${tools[tool].target}ºC`}
          />
        ))}
      </Form.Dropdown>

      <Form.TextField id="temp" title="Temperature (ºC)" defaultValue={"200"} />
    </Form>
  );
}
