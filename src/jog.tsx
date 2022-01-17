import { ActionPanel, Detail, List } from "@raycast/api";
import { useEffect, useReducer, useState } from "react";
import { octoFetch, reducer } from "./lib";
import { ConnectionSettings, Update } from "./types";

export default function JogPage() {
  const [state, dispatch] = useReducer(reducer, { files: [] });
  const [msg, setMsg] = useState("Connecting...");
  const refresh = async () => {
    const connection = (await (await octoFetch("/api/connection"))?.json()) as unknown as ConnectionSettings;
    dispatch({ type: Update.CONNECTION_SETTINGS, value: connection });
  };

  useEffect(() => {
    if (state.connection?.current.state === "Closed") {
      setMsg("Currently disconnected from printer.");
    } else if (state.connection?.current.state === "Printing") {
      setMsg("Currently running a print job.");
    } else {
      setMsg("");
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

  // TODO: add nice icons
  const opts = [0.1, 1, 10, 100];
  const [current, setCurrent] = useState(10);
  // TODO: make this less hacky, im p sure theres an actual way to have a global action panel
  const submenu = (
    <>
      <ActionPanel.Submenu title="Set Increment">
        {opts
          .filter((o) => o !== current)
          .map((o) => (
            <ActionPanel.Item
              key={o}
              title={`${o}mm`}
              onAction={() => {
                setCurrent(o);
              }}
            />
          ))}
      </ActionPanel.Submenu>
      <ActionPanel.Submenu title="Home">
        <ActionPanel.Item
          title="Home All Axes"
          onAction={() => {
            home(["x", "y", "z"]);
          }}
        />
        <ActionPanel.Item
          title="Home X"
          onAction={() => {
            home(["x"]);
          }}
        />
        <ActionPanel.Item
          title="Home Y"
          onAction={() => {
            home(["y"]);
          }}
        />
        <ActionPanel.Item
          title="Home Z"
          onAction={() => {
            home(["z"]);
          }}
        />
      </ActionPanel.Submenu>
    </>
  );
  if (msg) return <Detail markdown={msg} />;
  return (
    <List isLoading={msg === "Connecting..."}>
      <List.Section title="X">
        <List.Item
          title={`Increase by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("x", current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
        <List.Item
          title={`Decrease by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("x", -1 * current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Y">
        <List.Item
          title={`Increase by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("y", current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
        <List.Item
          title={`Decrease by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("y", -1 * current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Z">
        <List.Item
          title={`Increase by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("z", current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
        <List.Item
          title={`Decrease by ${current}mm`}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Jog"
                onAction={() => {
                  jog("z", -1 * current);
                }}
              />
              {submenu}
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

type TAxis = "x" | "y" | "z";

export async function jog(axis: TAxis, amount: number) {
  await octoFetch(`/api/printer/printhead`, {
    method: "POST",
    body: JSON.stringify({
      command: "jog",
      [axis]: amount,
    }),
  });
}

export async function home(axes: [TAxis?, TAxis?, TAxis?]) {
  await octoFetch(`/api/printer/printhead`, {
    method: "POST",
    body: JSON.stringify({
      command: "home",
      axes,
    }),
  });
}
