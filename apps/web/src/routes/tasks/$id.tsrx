import { TaskDetailPage } from "../../components/pages/task-detail-page";

/** Entry de `/tasks/:id` (PR-F / WU13): página de detalle de la task. */
export function TaskDetailRoute(props: { params: { id: string }; url: string }) @{
  <TaskDetailPage taskId={props.params.id} url={props.url} />
}
