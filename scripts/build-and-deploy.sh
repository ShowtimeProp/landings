#!/bin/bash
# Build y deploy de landings.showtimeprop.com
set -e

cd /srv/landings
docker build --no-cache --build-arg NEXT_PUBLIC_BACKEND_URL=https://agent.showtimeprop.com -t landings:v1.0.0 .

echo ""
echo "Build OK. Siguiente paso:"
echo "1. En Portainer: crear stack 'landings' con docker-compose.yml"
echo "2. O: docker stack deploy -c docker-compose.yml landings"
echo "3. Verificar: https://landings.showtimeprop.com/v/TENANT_SLUG/SLOT"
