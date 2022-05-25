#!/bin/sh
#
# This shell script provides a convenient way to build and launch the app
# in a Docker container for development purposes.
#
set -e -u -x

docker buildx build -t tplink-energy-monitor .

docker ps --filter name=tplink-energy-monitor -q | xargs -r docker kill
docker ps -a --filter name=tplink-energy-monitor -q | xargs -r docker rm

if [ "${TEM_BACKGROUND:-}" == "true" ]
then
	echo "TEM_BACKGROUND!=true. Running in background." 
	extra_run_args="--detach --restart=unless-stopped"
else
	echo "TEM_BACKGROUND!=true. Running in foreground. Exit with control-C."
	extra_run_args="--rm -it"
fi

docker run --name tplink-energy-monitor \
            --network host \
            --env TEM_PORT=${TEM_PORT:-3000} \
            --env TEM_LISTEN_ADDRESS="${TEM_LISTEN_ADDRESS:-::}" \
            --env TEM_LOG_INTERVAL_SECONDS="${TEM_LOG_INTERVAL_SECONDS:-60}" \
            --env TEM_MAX_LOG_ENTRIES="${TEM_MAX_LOG_ENTRIES:-1440}" \
            --env TEM_LOG_DIR_PATH="/var/lib/tplink-monitor" \
            --mount type=volume,source=tplink-energy-monitor-data,target=/var/lib/tplink-monitor \
	    ${extra_run_args} \
            --init \
            tplink-energy-monitor

if [ "${TEM_BACKGROUND:-}" == "true" ]
	docker ps --filter name=tplink-energy-monitor
	sleep 5
	echo "Recent logs:"
	echo "-----------"
	docker logs tplink-energy-monitor
	echo "-----------"
	echo
	echo "Container is running in background"
	echo
	echo "Exit with:"
	echo "    docker kill tplink-energy-monitor && docker rm tplink-energy-monitor"
fi
