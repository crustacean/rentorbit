# RentOrbit Kubernetes Manifests

The application manifests are rendered by Jenkins with `envsubst`.
`rbac.yaml` is a cluster bootstrap manifest and must be applied once by a cluster admin for each deployment namespace before Jenkins deploys there.

Required Jenkins deploy variables:

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

Required RBAC bootstrap variables:

- `KUBE_NAMESPACE`
- `KUBE_SERVICE_ACCOUNT_NAME`
- `KUBE_SERVICE_ACCOUNT_NAMESPACE`

Example RBAC bootstrap:

```sh
export KUBE_NAMESPACE=sandbox
export KUBE_SERVICE_ACCOUNT_NAME=jenkins
export KUBE_SERVICE_ACCOUNT_NAMESPACE=default
envsubst < k8s/rbac.yaml | kubectl apply -f -
```

`secret.example.yaml` is a template only. Do not apply it with real values committed to Git.
