import { Icon, Color, ListItem } from "@raycast/api";
import { useState, useEffect } from "react";
import { Tool, CurrentTemp } from "../types";
import { titleCase } from "../index";

export function Temp({ temp }: { temp?: CurrentTemp; }) {
  const [text, setText] = useState("Waiting for temperature update...");
  const hot = true;
  useEffect(() => {
    if (temp) {
      let newStr = "";
      Object.keys(temp).forEach((tool) => {
        const val = temp[tool as Tool | "bed" | "chamber"];
        if (val.actual) {
          if (!tool.includes("time")) {
            if (newStr.length > 0)
              newStr += ", ";
            if (tool.includes("tool")) {
              newStr += `Tool `;
            }
            newStr += `${titleCase(tool.replace("tool", ""))}: ${val.actual}°C/${val.target}°C`;
          }
        }
      });
      setText(newStr);
    }
  }, [temp]);

  return <ListItem title={text} icon={{ source: Icon.Circle, tintColor: hot ? Color.Red : Color.Blue }} />;
}
