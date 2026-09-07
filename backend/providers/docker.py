"""Provider stubs - Docker, Kubectl, AMP, Local"""

from backend.providers.base import BaseProvider

class DockerProvider(BaseProvider):
    """Provider dla Docker/podman."""
    pass

class KubectlProvider(BaseProvider):
    """Provider dla k3s/K8s."""
    pass

class AMPProvider(BaseProvider):
    """Provider dla CubeCoders AMP."""
    pass

class LocalProvider(BaseProvider):
    """Provider dla bare metal/LGSM."""
    pass
