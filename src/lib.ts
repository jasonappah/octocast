import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import type { RequestInfo, RequestInit, Response } from "node-fetch";
import { PrintJob, FileFolder, Login } from "./types";
// for types, see https://docs.octoprint.org/en/master/api/datamodel.html
// and https://docs.octoprint.org/en/master/api/push.html

// TODO: Handle users that only have some permissions for reading/writing data

export async function octoFetch(request: RequestInfo, init?: RequestInit | undefined): Promise<Response> {
  // TODO: Error handling with toasts n stuff
  const prefs = getPreferenceValues();
  if (!init) init = {};

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
export async function getJobs() {
  const response = await octoFetch("/api/files");
  const json = await response.json();
  return json as {files: FileFolder[]};
}

export async function login() {
  const response = await octoFetch("/api/login", {
    method: "POST",
    body: JSON.stringify({
      passive: true,
    }),
  });
  const json = await response.json();
  return json as Login;
}