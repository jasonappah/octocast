import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit, Response } from "node-fetch";

// TODO: Handle users that only have some permissions for reading/writing data

async function octoFetch(request: RequestInfo, init?: RequestInit | undefined): Promise<Response> {
  // TODO: Error handling with toasts n stuff
  const prefs = getPreferenceValues();
  if (!init)
    init = {};

  init.headers = {
    Authorization: `Bearer ${prefs["octoprint-api-key"]}`,
    "Content-Type": "application/json",
    ...init.headers,
  };

  if (typeof request === "string") {
    return await fetch(prefs["octoprint-base-url"] + request, init);
  } else {
    return await fetch(request, init);
  }
}

export async function getCurrentJob() {
  const response = await octoFetch("/api/job");
  const json = await response.json();
  return json as PrintJob;
}

interface Filament {
  length: number;
  volume: number;
}

export interface PrintJob {
  job: {
    averagePrintTime: number | null;
    estimatedPrintTime: number;
    filament: {
      [key: string]: Filament;
    },
    file: AbridgedFileFolder
    lastPrintTime: number | null;
    user: string;
  };
  progress: {
    completion: number;
    filepos: number;
    printTime: number;
    printTimeLeft: number;
  };
  state: string;
}

export async function getJobs() {
  const response = await octoFetch("/api/files");
  const json = await response.json();
  return json as {files: FileFolder[]};
}

export interface FileFolder extends AbridgedFileFolder {
  refs: [{
    resource: string;
    download: string;
    model: string;
  }];
  type: "model" | "machinecode" | "folder";
  typePath: string;
  hash: string;
  // TODO: better type for gcode analysis
  gcodeAnalysis: Record<string, any>;
  prints: PrintHistory[];
  statistics: {averagePrintTime: ProfileTime, lastPrintTime: ProfileTime};
}

export interface AbridgedFileFolder {
  size: number;
  name: string;
  date: number;
  display: string;
  path: string;
  origin: "local" | "sdcard";
}

interface ProfileTime {
  [key: string]: number;
}

interface PrintHistory {
  success: number;
  failure: number;
  last: {
    success: boolean;
    date: number;
    printTime: number;
  }
}

