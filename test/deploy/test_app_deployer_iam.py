"""Regression guard for ECS ListTasks IAM resource scoping (no AWS access)."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'infra' / 'lib' / 'foundation-stack.ts'


class GaiaListTasksIamTests(unittest.TestCase):
    def test_list_tasks_is_scoped_to_cluster_container_instances(self):
        source = SOURCE.read_text()
        self.assertIn(
            "add('ListClusterTasks',['ecs:ListTasks'],[`${ecs}:container-instance/${cluster}/*`]",
            source,
        )
        self.assertIn("'ArnEquals':{'ecs:cluster':clusterArn}", source)
        self.assertNotIn("add('ListClusterTasks',['ecs:ListTasks'],[clusterArn])", source)

    def test_task_health_verification_keeps_read_only_scoped_iam(self):
        source = SOURCE.read_text()
        self.assertIn("add('ReadEcsTasks',['ecs:DescribeTasks'],[`${ecs}:task/${cluster}/*`])", source)
        self.assertIn("add('ReadEcsInstances',['ecs:DescribeContainerInstances'],[`${ecs}:container-instance/${cluster}/*`])", source)
        self.assertNotIn("add('ListClusterTasks',['ecs:ListTasks'],['*'])", source)


if __name__ == '__main__':
    unittest.main()
