# ShowtimeProp Landings

App de landings y loader para QR de carteles. Ubicado en `backend-api/landings`; puede moverse a `/srv/landings` para deploy independiente.

## Rutas

- `/v/[tenant_slug]/[slot]` - Loader: resuelve slot, registra qr_scan, redirige al tour

## Desarrollo

```bash
cd landings && npm install && npm run dev
```

## Variables de entorno

- `NEXT_PUBLIC_BACKEND_URL` - URL del backend (default: https://agent.showtimeprop.com)
