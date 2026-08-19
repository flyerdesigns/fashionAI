#!/usr/bin/env sh
set -e

case "${RAILWAY_SERVICE_NAME:-}" in
  fashionai-staging-image-worker)
    exec npm run worker:image
    ;;
  fashionai-staging-video-worker)
    exec npm run worker:video
    ;;
  *)
    exec npm start
    ;;
esac
