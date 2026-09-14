# Copyright (c) 2026 Kruzio
# Licensed under the PolyForm Noncommercial License 1.0.0.
# Non-commercial use only. Commercial use and selling of this code are prohibited.
# https://polyformproject.org/licenses/noncommercial/1.0.0/

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
