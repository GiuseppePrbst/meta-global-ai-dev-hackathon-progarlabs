#!/usr/bin/env bash
# Bosque Vivo API on Google Cloud: the exact commands used for the first deploy.
# Idempotent enough to re-read, not to re-run blindly: each "create" fails if the
# resource exists. Secrets are never arguments: they come from stdin or files outside Git.
#
#   ACCOUNT=you@example.com bash infra/gcp/deploy.sh <step>
set -euo pipefail
P=nice-carving-513619-t4
R=southamerica-west1
ACCOUNT=${ACCOUNT:?set ACCOUNT to an Owner of $P}
A=(--account="$ACCOUNT" --project="$P" --billing-project="$P")
IMAGE=$R-docker.pkg.dev/$P/bosque-vivo/api
RUN_SA=bosque-vivo-api@$P.iam.gserviceaccount.com
BUILD_SA=bosque-vivo-build@$P.iam.gserviceaccount.com
SQL=bosque-vivo-pg

case "${1:-}" in
apis)
  gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com \
    cloudbuild.googleapis.com secretmanager.googleapis.com compute.googleapis.com \
    servicenetworking.googleapis.com iam.googleapis.com cloudresourcemanager.googleapis.com \
    cloudbilling.googleapis.com billingbudgets.googleapis.com "${A[@]}" ;;
network)
  # Private IP for Cloud SQL (no public IPv4 charge); Cloud Run reaches it by Direct VPC egress.
  gcloud compute networks create bosque-vivo-vpc --subnet-mode=custom "${A[@]}"
  gcloud compute networks subnets create bosque-vivo-run --network=bosque-vivo-vpc --region=$R \
    --range=10.10.0.0/26 --enable-private-ip-google-access "${A[@]}"
  gcloud compute addresses create bosque-vivo-psa --global --purpose=VPC_PEERING --prefix-length=24 \
    --network=bosque-vivo-vpc "${A[@]}"
  gcloud services vpc-peerings connect --service=servicenetworking.googleapis.com \
    --ranges=bosque-vivo-psa --network=bosque-vivo-vpc "${A[@]}" ;;
accounts)
  gcloud artifacts repositories create bosque-vivo --repository-format=docker --location=$R "${A[@]}"
  gcloud iam service-accounts create bosque-vivo-build --display-name="Bosque Vivo Cloud Build" "${A[@]}"
  gcloud iam service-accounts create bosque-vivo-api --display-name="Bosque Vivo API runtime" "${A[@]}"
  gcloud storage buckets add-iam-policy-binding "gs://${P}_cloudbuild" --member="serviceAccount:$BUILD_SA" \
    --role=roles/storage.objectViewer "${A[@]}"
  gcloud artifacts repositories add-iam-policy-binding bosque-vivo --location=$R \
    --member="serviceAccount:$BUILD_SA" --role=roles/artifactregistry.writer "${A[@]}"
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$BUILD_SA" \
    --role=roles/logging.logWriter --condition=None "${A[@]}"
  gcloud projects add-iam-policy-binding $P --member="serviceAccount:$RUN_SA" \
    --role=roles/cloudsql.client --condition=None "${A[@]}" ;;
build)
  gcloud builds submit --region=$R --config=infra/gcp/cloudbuild.yaml \
    --substitutions="_TAG=$(git rev-parse --short=12 HEAD)" \
    --service-account="projects/$P/serviceAccounts/$BUILD_SA" "${A[@]}" . ;;
sql)
  # Smallest shared-core Enterprise instance, zonal, private IP only, TLS required,
  # daily backups (7 kept) and point-in-time recovery for the ledger.
  gcloud beta sql instances create $SQL --database-version=POSTGRES_16 --edition=ENTERPRISE \
    --tier=db-f1-micro --region=$R --storage-type=SSD --storage-size=10 --storage-auto-increase --storage-auto-increase-limit=20 \
    --network="projects/$P/global/networks/bosque-vivo-vpc" --no-assign-ip \
    --ssl-mode=ENCRYPTED_ONLY --backup-start-time=07:00 --retained-backups-count=7 \
    --enable-point-in-time-recovery --deletion-protection "${A[@]}"
  gcloud sql databases create bosque_vivo --instance=$SQL "${A[@]}" ;;
# secrets / db-user / migrate / run: see infra/gcp/README.md (they read values from stdin).
*) echo "steps: apis network accounts build sql" >&2; exit 2 ;;
esac
