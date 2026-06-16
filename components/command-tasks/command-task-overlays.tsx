"use client"

import { useCommandTasks } from "./command-task-provider"
import { CommandExecutionPanel } from "./command-execution-panel"

export function CommandTaskOverlays() {
  const { tasks, activeTaskId, minimizeTask, closeTask } = useCommandTasks()

  const visible = tasks.filter((t) => t.panelOpen && t.id === activeTaskId)

  return (
    <>
      {visible.map((task) => (
        <CommandExecutionPanel
          key={task.id}
          task={task}
          onMinimize={() => minimizeTask(task.id)}
          onClose={() => closeTask(task.id)}
        />
      ))}
    </>
  )
}
