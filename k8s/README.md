# RentOrbit Kubernetes Manifests

These manifests are rendered by Jenkins with `envsubst`.

Required variables:

- `KUBE_NAMESPACE`
- `WEB_IMAGE`
- `API_IMAGE`
- `WEB_REPLICAS`
- `API_REPLICAS`
- `APP_URL`
- `NEXT_PUBLIC_API_URL`
- `API_INTERNAL_URL`
- `INGRESS_CLASS`
- `INGRESS_HOST`

`secret.example.yaml` is a template only. Do not apply it with real values committed to Git.
