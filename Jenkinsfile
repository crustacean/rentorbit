pipeline {
    agent any

    environment {
        APP_NAME = 'rentorbit'
        WEB_IMAGE_NAME = 'em22435/rentorbit-web'
        API_IMAGE_NAME = 'em22435/rentorbit-api'
        NODE_BUILD_IMAGE = 'node:22-bookworm-slim'
        IMAGE_TAG = "${env.BUILD_NUMBER}"

        DOCKER_CREDENTIALS = 'docker-hub-credentials'

        KUBE_CA_CERT = 'minikube-ca-cert'
        KUBE_CLUSTER = 'minikube'
        KUBE_CONTEXT = 'minikube'
        KUBE_CREDENTIALS = 'minikube-jenkins-secret'
        KUBE_NAMESPACE = 'dev'
        KUBE_SERVER_URL = 'https://192.168.49.2:8443'

        WEB_REPLICAS = '2'
        API_REPLICAS = '2'
        NEXT_PUBLIC_API_URL = '/api'
        API_INTERNAL_URL = 'http://rentorbit-api:4000'
        INGRESS_CLASS = 'nginx'
        INGRESS_HOST = 'rentorbit.local'
        APP_URL = 'https://rentorbit.local'
        API_REWRITE_TARGET = '$2'
    }

    stages {
        stage('Install') {
            steps {
                script {
                    runNode('node --version && npm --version && npm ci')
                }
            }
        }

        stage('Validate') {
            steps {
                script {
                    runNode('npm run typecheck && npm test --workspaces --if-present')
                }
            }
        }

        stage('Build Workspaces') {
            steps {
                script {
                    runNode('npm run build --workspaces --if-present')
                }
            }
        }

        stage('Build Images') {
            steps {
                script {
                    env.WEB_IMAGE = "${env.WEB_IMAGE_NAME}:${env.IMAGE_TAG}"
                    env.API_IMAGE = "${env.API_IMAGE_NAME}:${env.IMAGE_TAG}"

                    webImage = docker.build(
                        env.WEB_IMAGE,
                        "--target web --build-arg NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL} --build-arg API_INTERNAL_URL=${env.API_INTERNAL_URL} -f Dockerfile ."
                    )
                    apiImage = docker.build(
                        env.API_IMAGE,
                        "--target api --build-arg NEXT_PUBLIC_API_URL=${env.NEXT_PUBLIC_API_URL} --build-arg API_INTERNAL_URL=${env.API_INTERNAL_URL} -f Dockerfile ."
                    )
                }
            }
        }

        stage('Push Images') {
            steps {
                script {
                    docker.withRegistry('', env.DOCKER_CREDENTIALS) {
                        webImage.push()
                        webImage.push('latest')
                        apiImage.push()
                        apiImage.push('latest')
                    }
                }
            }
        }

        stage('Deploy to Sandbox') {
            when {
                branch 'dev'
            }
            environment {
                KUBE_NAMESPACE = 'sandbox'
                INGRESS_HOST = 'sandbox.rentorbit.local'
                APP_URL = 'https://sandbox.rentorbit.local'
            }
            steps {
                script {
                    deployToKubernetes()
                }
            }
        }

        stage('Deploy to Dev') {
            when {
                branch 'main'
            }
            environment {
                KUBE_NAMESPACE = 'dev'
                INGRESS_HOST = 'dev.rentorbit.local'
                APP_URL = 'https://dev.rentorbit.local'
            }
            steps {
                script {
                    deployToKubernetes()
                }
            }
        }

        stage('Promote to UAT') {
            when {
                branch 'main'
            }
            environment {
                KUBE_NAMESPACE = 'uat'
                INGRESS_HOST = 'uat.rentorbit.local'
                APP_URL = 'https://uat.rentorbit.local'
            }
            steps {
                input message: "Deploy version ${IMAGE_TAG} to UAT?", ok: 'Deploy to UAT'
                script {
                    deployToKubernetes()
                }
            }
        }

        stage('Promote to Prod') {
            when {
                branch 'main'
            }
            environment {
                KUBE_NAMESPACE = 'prod'
                INGRESS_HOST = 'rentorbit.local'
                APP_URL = 'https://rentorbit.local'
                WEB_REPLICAS = '3'
                API_REPLICAS = '3'
            }
            steps {
                input message: "Deploy version ${IMAGE_TAG} to Prod?", ok: 'Deploy to Prod'
                script {
                    deployToKubernetes()
                }
            }
        }
    }

    post {
        always {
            sh "docker rmi ${WEB_IMAGE_NAME}:${IMAGE_TAG} || true"
            sh "docker rmi ${WEB_IMAGE_NAME}:latest || true"
            sh "docker rmi ${API_IMAGE_NAME}:${IMAGE_TAG} || true"
            sh "docker rmi ${API_IMAGE_NAME}:latest || true"
            sh 'rm -rf prepared-k8s'
        }
    }
}

def runNode(String command) {
    docker.image(env.NODE_BUILD_IMAGE).inside('-u root') {
        sh command
    }
}

def deployToKubernetes() {
    env.WEB_IMAGE = "${env.WEB_IMAGE_NAME}:${env.IMAGE_TAG}"
    env.API_IMAGE = "${env.API_IMAGE_NAME}:${env.IMAGE_TAG}"

    withKubeConfig(
        caCertificateId: env.KUBE_CA_CERT,
        clusterName: env.KUBE_CLUSTER,
        contextName: env.KUBE_CONTEXT,
        credentialsId: env.KUBE_CREDENTIALS,
        namespace: env.KUBE_NAMESPACE,
        restrictKubeConfigAccess: false,
        serverUrl: env.KUBE_SERVER_URL
    ) {
        sh '''
            set -eu
            rm -rf prepared-k8s
            mkdir -p prepared-k8s

            for manifest in namespace configmap services web-deployment api-deployment web-ingress api-ingress; do
                envsubst < "k8s/${manifest}.yaml" > "prepared-k8s/${manifest}.yaml"
            done

            kubectl apply -f prepared-k8s/namespace.yaml
            kubectl apply -f prepared-k8s/configmap.yaml
            kubectl apply -f prepared-k8s/services.yaml
            kubectl apply -f prepared-k8s/web-deployment.yaml
            kubectl apply -f prepared-k8s/api-deployment.yaml
            kubectl apply -f prepared-k8s/web-ingress.yaml
            kubectl apply -f prepared-k8s/api-ingress.yaml

            kubectl -n "${KUBE_NAMESPACE}" rollout status deployment/rentorbit-api
            kubectl -n "${KUBE_NAMESPACE}" rollout status deployment/rentorbit-web
        '''
    }
}
