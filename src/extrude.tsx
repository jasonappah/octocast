import { ActionPanel, Detail, Form, Icon, showToast, SubmitFormAction, ToastStyle } from "@raycast/api";
import { useEffect, useState, useReducer } from "react";
import { octoFetch, reducer, titleCase } from "./lib";
import { ConnectionSettings, Update } from "./types";

export default function ExtruderPage() {
  const [state, dispatch] = useReducer(reducer, { files: [] });
  const [msg, setMsg] = useState("Connecting...");
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
    const interval = setInterval(() => {
      refresh();
    }, 10 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const [tools, setTools] = useState<string[]>([]);
  async function getTools() {
    const res = await octoFetch("/api/printer/tool");
    const json = await res?.json();
    const tools = Object.keys((json || {}) as unknown as Record<string, unknown>);
    setTools(tools);
  }

  if (msg) return <Detail markdown={msg} />;
  return (
    <Form
      actions={
        <ActionPanel>
          <SubmitFormAction
            title="Go"
            onSubmit={async ({ tool, dist, action }) => {
              if (!tool) {
                showToast(ToastStyle.Failure, "Please select a tool");
                return;
              }
              if (tools.length > 1) {
                await octoFetch("/api/printer/tool", {
                  method: "POST",
                  body: JSON.stringify({
                    command: "select",
                    tool,
                  }),
                });
              }
              await octoFetch("/api/printer/tool", {
                method: "POST",
                body: JSON.stringify({
                  command: "extrude",
                  amount: action === "extrude" ? Number(dist) : -Number(dist),
                }),
              });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="tool" title="Tool">
        {tools.map((tool) => (
          <Form.Dropdown.Item key={tool} value={tool} title={`${titleCase(tool.replace("tool", "Tool "))}`} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown id="action" title="Action" defaultValue="extrude">
        <Form.Dropdown.Item value="extrude" title="Extrude" icon={Icon.ChevronDown} />
        <Form.Dropdown.Item value="retract" title="Retract" icon={Icon.ChevronUp} />
      </Form.Dropdown>
      <Form.TextField id="dist" title="Distance (mm)" defaultValue="5" />
    </Form>
  );
}
