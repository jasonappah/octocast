import { ActionPanel, useNavigation, Detail } from "@raycast/api";
import { useState, useEffect } from "react";

export function LatestMsg({ data }: { data?: WebSocket; }) {
  const [msg, setMsg] = useState<object>({"msg": "Waiting for connection"});
  useEffect(() => {
    const controller = new AbortController();
    data?.addEventListener("message", (e) => setMsg(e.data), { signal: controller.signal });
    return controller.abort;
  }, []);
  const { pop } = useNavigation();
  return (
    <Detail
      markdown={`# Latest Socket Message\n\`\`\`\n${JSON.stringify(msg, null, 2)}\n\`\`\``}
      actions={<ActionPanel>
        <ActionPanel.Item title="Pop" onAction={pop} />
      </ActionPanel>} />
  );
}
