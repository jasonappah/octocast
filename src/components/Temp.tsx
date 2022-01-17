import { Icon, Color, ListItem } from "@raycast/api";
import { useState, useEffect } from "react";
import { Tool, CurrentTemp } from "../types";
import { titleCase } from "../lib";

enum Hot {
  No,
  BedOrChamber,
  Tool,
}

export function Temp({ temp }: { temp?: CurrentTemp }) {
  // TODO: Instead of waiting, use API to pull initial temp data then refresh with sock data
  const [text, setText] = useState("Waiting for temperature update...");
  const [color, setColor] = useState(Color.Blue);

  const updateHeat = (newH: Hot, original: Hot) => {
    if (original === Hot.Tool) {
      return original;
    } else {
      return newH;
    }
  };

  useEffect(() => {
    if (temp) {
      let newStr = "";
      let hot: Hot = Hot.No;
      Object.keys(temp).forEach((tool) => {
        const val = temp[tool as Tool | "bed" | "chamber"];
        if (val.actual) {
          if (!tool.includes("time")) {
            if (newStr.length > 0) newStr += ", ";
            if (tool.includes("tool")) {
              newStr += `Tool `;
              if (val.actual > 30) {
                hot = updateHeat(Hot.Tool, hot);
              }
            } else if (val.actual > 30) {
              hot = updateHeat(Hot.BedOrChamber, hot);
            }
            newStr += `${titleCase(tool.replace("tool", ""))}: ${val.actual}°C/${val.target}°C`;
          }
        }
      });
      if (newStr.length === 0) {
        newStr = "No temperature data";
      }
      setText(newStr);
      setColor(hot === Hot.No ? Color.Blue : hot === Hot.BedOrChamber ? Color.Yellow : Color.Red);
    }
  }, [temp]);

  return <ListItem title={text} icon={{ source: Icon.Circle, tintColor: color }} />;
}
