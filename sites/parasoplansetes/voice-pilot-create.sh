#!/usr/bin/env bash
# REVIEW FIRST: creates only the named, automatically deleted acceptance VM.
set -euo pipefail
project='project-7bff0837-ffcc-4f4d-822'
region='europe-west4'
zone='europe-west4-a'
name='pinet-voice-pilot-20261009'
startup="$HOME/voice-pilot-startup.sh"
bash -n "$startup"
# Never reuse or reconfigure an unrelated resource with the same name.
if gcloud compute networks describe "$name" --project="$project" >/dev/null 2>&1; then
  printf '%s\n' 'Pilot network already exists; inspect its ownership before proceeding.' >&2
  exit 1
fi
gcloud compute networks create "$name" --project="$project" --subnet-mode=custom
gcloud compute networks subnets create "$name" --project="$project" --network="$name" --region="$region" --range=10.77.0.0/28
gcloud compute firewall-rules create "${name}-iap" --project="$project" --network="$name" --direction=INGRESS --action=ALLOW --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags="$name"
gcloud compute firewall-rules create "${name}-media" --project="$project" --network="$name" --direction=INGRESS --action=ALLOW --rules=tcp:7881,udp:7882 --source-ranges=0.0.0.0/0 --target-tags="$name"
gcloud compute instances create "$name" --project="$project" --zone="$zone" --machine-type=e2-small \
  --subnet="$name" --tags="$name" --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=10GB --boot-disk-type=pd-standard --boot-disk-auto-delete \
  --no-service-account --no-scopes --shielded-secure-boot \
  --metadata=enable-oslogin=TRUE,block-project-ssh-keys=TRUE \
  --metadata-from-file="startup-script=$startup" \
  --max-run-duration=2h --instance-termination-action=DELETE --no-restart-on-failure --maintenance-policy=TERMINATE \
  --labels=application=parasoplansetes,purpose=acceptance-pilot
gcloud compute instances describe "$name" --project="$project" --zone="$zone" \
  --format='yaml(name,status,machineType,scheduling.maxRunDuration,scheduling.instanceTerminationAction,networkInterfaces.accessConfigs.natIP)'
