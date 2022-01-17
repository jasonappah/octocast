# OctoCast

OctoCast is a [Raycast](https://raycast.com) extension to monitor and manage your 3D prints via [OctoPrint](https://octoprint.com).

## Features

- Start/stop/pause jobs
- Monitor temperature, time and progress of current job
- Manage printer connections
- Control printhead and extruder

### Future features

- Upload new jobs
- Monitor camera streams
- View temperature graphs

## Caveats

The plugin requires an OctoPrint API key to be passed in during initial set up. If you have access control disabled on your OctoPrint instance ([which is a bad idea btw](https://docs.octoprint.org/en/1.7.2/features/accesscontrol.html#if-you-are-using-a-vpn-and-your-setup-absolutely-requires-disabling-internal-octoprint-access-controls)), you may enter any random string of your preference, as OctoPrint will [ignore the Authorization header](https://docs.octoprint.org/en/1.7.2/api/general.html#authorization) in this case.
