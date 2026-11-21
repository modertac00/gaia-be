"""Version-controlled Gaia ECS resource policy with validated GitHub environment overrides.

No instance IDs, database identifiers, or secret values are stored here. This
module deliberately does not contact AWS and can be tested without credentials.
"""
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULTS = ROOT / 'config/resources/production.json'


class ResourceConfigError(ValueError):
    """Rejected before an AWS task definition or service is changed."""


def _integer(name, default, low, high):
    text = os.environ.get(name)
    if text is None or text == '':
        value = default
    else:
        if not re.fullmatch(r'[0-9]+', text):
            raise ResourceConfigError(f'{name} must be a whole number')
        value = int(text)
    if type(value) is not int or not low <= value <= high:
        raise ResourceConfigError(f'{name} must be between {low} and {high}')
    return value


@dataclass(frozen=True)
class ContainerResources:
    cpu: int
    reservation: int
    limit: int


@dataclass(frozen=True)
class DeploymentPolicy:
    minimum_healthy: int
    maximum_percent: int
    az_rebalancing: str

    def aws_args(self):
        return [
            '--deployment-configuration',
            (f'maximumPercent={self.maximum_percent},'
             f'minimumHealthyPercent={self.minimum_healthy},'
             'deploymentCircuitBreaker={enable=true,rollback=true}'),
            '--availability-zone-rebalancing', self.az_rebalancing,
        ]


def _defaults():
    return json.loads(DEFAULTS.read_text())


def container_resources(kind):
    if kind not in ('api', 'schema'):
        raise ResourceConfigError('Invalid container resource kind')
    defaults = _defaults()[kind]
    prefix = 'ECS_' if kind == 'api' else 'ECS_SCHEMA_'
    cpu_name = prefix + 'CPU_UNITS'
    reservation_name = prefix + 'MEMORY_RESERVATION'
    limit_name = prefix + 'MEMORY_LIMIT'
    cpu = _integer(cpu_name, defaults['cpuUnits'], 64, 4096)
    reservation = _integer(reservation_name, defaults['memoryReservationMiB'], 64, 16384)
    limit = _integer(limit_name, defaults['memoryLimitMiB'], 64, 16384)
    if reservation > limit:
        raise ResourceConfigError(f'{reservation_name} must not exceed {limit_name}')
    return ContainerResources(cpu, reservation, limit)


def deployment_policy():
    defaults = _defaults()['deployment']
    minimum = _integer('ECS_MIN_HEALTHY_PERCENT', defaults['minHealthyPercent'], 0, 100)
    maximum = _integer('ECS_MAX_PERCENT', defaults['maxPercent'], 100, 200)
    az = os.getenv('ECS_AZ_REBALANCING') or defaults['availabilityZoneRebalancing']
    if az not in ('ENABLED', 'DISABLED'):
        raise ResourceConfigError('ECS_AZ_REBALANCING must be ENABLED or DISABLED')
    if maximum <= 100 and az != 'DISABLED':
        raise ResourceConfigError('maximumPercent=100 requires ECS_AZ_REBALANCING=DISABLED')
    # desiredCount is one. 100/150 cannot start a second task and cannot stop
    # the existing task, because ECS rounds the task-count limits.
    if minimum == 100 and maximum < 200:
        raise ResourceConfigError('For one Gaia task, minHealthy=100 requires maxPercent=200')
    return DeploymentPolicy(minimum, maximum, az)


def main():
    api = container_resources('api')
    schema = container_resources('schema')
    policy = deployment_policy()
    print('GAIA_ECS_RESOURCE_CONFIG_OK', json.dumps({
        'api': {'cpu': api.cpu, 'memoryReservationMiB': api.reservation,
                'memoryLimitMiB': api.limit},
        'schema': {'cpu': schema.cpu, 'memoryReservationMiB': schema.reservation,
                   'memoryLimitMiB': schema.limit},
        'deployment': {'minimumHealthyPercent': policy.minimum_healthy,
                       'maximumPercent': policy.maximum_percent,
                       'availabilityZoneRebalancing': policy.az_rebalancing},
    }, sort_keys=True))


if __name__ == '__main__':
    main()
