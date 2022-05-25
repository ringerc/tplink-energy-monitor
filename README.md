# TPLink Energy Monitor
[![Build Status](https://travis-ci.org/jamesbarnett91/tplink-energy-monitor.svg?branch=master)](https://travis-ci.org/jamesbarnett91/tplink-energy-monitor)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=tplink-monitor&metric=alert_status)](https://sonarcloud.io/dashboard?id=tplink-monitor)

A web based monitoring dashboard displaying energy usage data and statistics for TP-Link HS110 smart plugs.

Written in Node.js + Express, and fully responsive so works well on mobile devices.

<p align="center">
  <img alt="Screenshot" src="https://jamesbarnett.io/files/tplink-monitor/screenshots/em-res.png">
</p>

# Features
- Automatically scans for TP-Link smart plug devices on your local network on server start.
- Realtime current, voltage, power readings.
- Recent power usage trend chart.
- Configurable power usage history logger.
- Plug on/off state and uptime.
- Daily & monthly energy usage totals and averages.
- Historical daily and monthly energy usage charts.

# Setup
You can use any of the following methods to get the project running:

### Packaged executable
The easiest way to run the project is to download one of the packaged executables from the [releases page](https://github.com/jamesbarnett91/tplink-monitor/releases). These are zip files containing a single executable file and some config. Just download the relevant file for your OS (Windows, Linux and MacOS available), extract the zip somewhere and double click executable. Then go to `localhost:3000` in your browser to access the dashboard.

### Docker

Alternatively, you can pull the `jbarnett/tplink-energy-monitor` image and run that. You will need [Docker CE](https://docs.docker.com/engine/install) or a similar Docker-compatible container runtime.

Note that because the server needs access to your local network to scan for TP-Link devices, you must run the image using [host networking](https://docs.docker.com/network/host/) e.g.:

```
$ sudo docker run -d --network host -n tplink-energy-monitor --init jbarnett/tplink-energy-monitor
```

Connect to it at `https://localhost:3000`.

⚠️  The above command line will *not* preserve your data log history long term, it's only suitable for trying the app out easily.

See [Running with Docker](#running-with-docker) for details on how to customise the config file, make your data storage persistent, configure the listening port, build your own container images, etc.

### Node + NPM

To run directly via NPM, [install nodejs and npm](https://nodejs.org/en/download/) then:

```sh
$ git clone https://github.com/jamesbarnett91/tplink-energy-monitor && cd tplink-energy-monitor
$ npm install
$ npm start
```

# Configuration

## Listening port and address

| env-var name          | default value | Description |
|-----------------------|---------------|-------------|
| `TEM_PORT`            | `3000`        | TCP/IP port to listen for connections on. Older versions used `PORT` instead, which is still supported for backwards compatibility. |
| `TEM_LISTEN_ADDRESS` | `::`          | Local network interface address to listen on. The default value `::` means "all interfaces" - like `0.0.0.0`, but it includes IPv6 interfaces too. To only listen for connections on the local host loopback address use `::1`. |

See [`app.listen(...)`](https://expressjs.com/en/api.html#app.listen) for details on accepted values.

## Logging Configuration File

By default this app will log the current power usage of each plug every minute, and store 24 hours worth of entries (removing the older entries as new ones are added) to files in the root project directory. 

This log interval, max retention limit and log directory are configurable in the `logger-config.json` file in the root project directory:

```
{
  "logDirPath": "path/to/logs",
  "logIntervalSeconds": 60,
  "maxLogEntries": 1440 // 24hrs at 1 log/min
}
```

Comments are *not* supported in the config file. Keys are *case sensitive*.

Available settings:

| `loger-config.json` key | env-var name               | type    | default value   | Description |
|-------------------------|----------------------------|-------- |-----------------|-------------|
| `logDirPath`            | `TEM_LOG_DIR_PATH`         | string  | `"."`           | Directory path specifying where log files should be stored. It will be created if it doesn't already exist. Defaults to the application directory. |
| `logIntervalSeconds`    | `TEM_LOG_INTERVAL_SECONDS` | integer | `60`            | The number of seconds between each log entry. |
| `maxLogEntries`         | `TEM_MAX_LOG_ENTRIES`      | integer | `1440`          | The maximum number of log entries to store for each monitor. |


ℹ️ Editing `logger-config.json` or setting environment variables locally will not have any effect if you are running the app in Docker. See [Running with Docker](#running-with-docker) for how to customize the app config under Docker.

You can also specify the path to a custom logger config file as a command line argument. If specified, the application will load that config rather than the default one in the project root e.g.

```
npm start /home/username/tplink-logger-config.json
```

The logged data is shown on the 'Logged Usage' graph on the dashboard.

## Data Log Storage

Logs of captured data are written in JSON format, with the filename `<plug-id>-log.json` e.g. `8FCA808B79-log.json`, at the path specified by the data logger configuration. Each file contains all the log entries for that plug, up to the maximum configured number, at which point it will remove the oldest entry when adding a new one.

Each logfile is a JSON array of entries. Each entry contains a timestamp in unix/epoch format `ts`, and a power reading in watts `pw`.

If you want to analyse the log files in Excel or similar office tools you can convert the JSON file into csv format. This can be done numerous ways including online converters such as [konklone.io/json](https://konklone.io/json/) or using the [`jq`](https://stedolan.github.io/jq/download/) commandline json processor:

```sh
jq -M '.|[.ts, .pw]|@csv' 8FCA808B79-log.json > 8FCA808B79-log.csv 
```

# Running with Docker

To run the application persistently under Docker, with a custom config file,
persistent data retention, automatic restart on reboot, and explicitly set
listening port and address:

```
$ docker run --name tplink-energy-monitor \
             --detach \
             --network host \
             --restart=unless-stopped \
             --env TEM_PORT=3000 \
             --env TEM_LISTEN_ADDRESS="::" \
             --env TEM_LOG_INTERVAL_SECONDS=60 \
             --env TEM_MAX_LOG_ENTRIES=1440 \
             --env TEM_LOG_DIR_PATH="/var/lib/tplink-monitor" \
             --mount type=volume,source=tplink-energy-monitor-data,target=/var/lib/tplink-monitor \
             --init \
             jbarnett/tplink-energy-monitor
```

*The above assumes your normal user account can run `docker` without
permissions errors. If not, on Linux you can run `sudo adduser docker $(id
-un)`, then log out and back in again to enable it.*

In this example the container data will be stored in a Docker Volume named
`tplink-energy-monitor-data` to avoid the complexity of dealing with
permissions, user-id mappings and Docker bind mounts. This cannot be mounted
directly on the host. To extract data from the volume see [backup a
volume](https://docs.docker.com/storage/volumes/#back-up-a-volume).

## Runtime control

Check that it is running with

```
$ docker ps -a --filter name=tplink-energy-monitor
```

Shut down, start, or restart the app with `docker stop`, `docker start`, and `docker restart` respectively.

### Error amd request logs

In case of problems, inspect the container's error and access log stream (stdout and stderr) with:

```
$ docker logs tplink-energy-monitor
```

### Delete

⚠️ *This assumes assume you used a `-v` bind mount and `TEM_LOG_DIR_PATH` to bind mount your logs to a host directory. If you did not, they will delete your logged data.* ⚠️

To *delete* the app instance use `docker kill tplink-energy-monitor && docker rm tplink-energy-monitor`.

### Update to a new version

To update the app instance, `docker kill` it, `docker rm` the container (note the caveat on "Delete" above), `docker pull jbarnett/tplink-energy-monitor`, and `docker run ...` again.

## Custom `logger-config.json` in a Docker container

Most of the time it's easier to use env-vars to override the configuration when running in Docker, but it's possible to add your own config file if you wish. You will need to create a copy of the file on the host running docker, bind-mount it into the container, then tell the app where to find the config file within the container file system.

For example, you might make a local copy in `/etc/tplink-monitor`:

```
$ app_dir=$HOME/tplink-monitor
$ mkdir -p $app_dir $app_dir/data
$ curl -sSLf https://raw.githubusercontent.com/jamesbarnett91/tplink-energy-monitor/master/logger-config.json \
       -o  $app_dir/logger-config.json
```

and edit it there. Then add a `-v` bind-mount argument to the `docker run` command *before* the image name *and* specify the config file path as an app comamndline argument *after* the image name, e.g.

`docker run` *...* `-v /etc/tplink-monitor/logger-config.json:/etc/tplink-monitor/logger-config.json:z` *...* `jbarnett/tplink-energy-monitor /etc/tplink-monitor/logger-config.json`

(The local and container paths do not have to be the same, but it's usually less confusing if they are).

## Bind-mount data store to the host

The config file `logDirPath` or the env-var `TEM_LOG_DIR_PATH` may be set to
point to a container path that is bind-mounted to the host using a docker `-v`
or `--mount type=bind` option. This will expose the log files written by the
app for direct access on the host.

For this to work correctly, the host path must be writeable by the user-id
inside the container.

Doing this securely is not simple with Docker because it [does not offer clean,
simple to use support for mapping uids between guest and
host](https://docs.docker.com/engine/security/userns-remap/). You have to
rebuild your container to run node as a the same numeric uid or gid as the host
or make the directory world-writeable, so it's beyond the scope of this guide.
See [Docker Volumes](https://docs.docker.com/storage/volumes/) for options.

## Building Docker images

Pre-built container images are supplied on Docker Hub for `x86_64` and popular
ARM architectures, so you don't usually need to build your own. In particular,
container images are supplied for most Raspberry Pi variants.

[Install Docker CE](https://docs.docker.com/engine/install/debian/) then:

```
$ git clone https://github.com/jamesbarnett91/tplink-energy-monitor && cd tplink-energy-monitor
$ docker buildx build -t tplink-energy-monitor .
```

Once built, follow the instructions in [Running with Docker](#running-with-docker),
but use the image name `tplink-energy-monitor` instead of the upstream image
name `jbarnett/tplink-energy-monitor`.

To free disk space used by docker caches on a system like an rPi where space
may be at a premium, you can run:

```
$ docker buildx prune -f
$ docker system prune -f
```

# Notes

## Network discovery

Because the server needs access to your local network to scan for TP-Link device, you must run the server on the same network which your TP Link plugs are connected to. For the vast majority of people this shouldn't be an issue, and you can still use different network interfaces (i.e. plug(s) on WiFi and server on ethernet) as long as they all connect to the same network.

If you run a firewall service or application that restricts outbound traffic you might have to explicitly add firewall rules to permit the application to make the required network requests.

A note for Windows users: There seems to be an issue with the UDP broadcast the server performs to scan for devices which occurs when you also have VirtualBox installed on your Windows machine. I think this is because the response from the plug is routed to the VirtualBox Host-Only network adapter, rather than your primary network interface (for some reason).

If you hit this issue you can try disabling the VirtualBox adapter in `Control Panel > Network and Internet > Network Connections` and see if that solves the problem.

# TODOs
- [x] Show historical data
- [x] Build dists
- [x] Docker image
- [x] Support switching between multiple plugs
- [x] Switch to websockets
- [x] Configurable realtime usage logging
- [ ] Show cumulative energy usage form all devices
- [ ] Rescan for devices on the fly
- [ ] Add daily cost metrics
