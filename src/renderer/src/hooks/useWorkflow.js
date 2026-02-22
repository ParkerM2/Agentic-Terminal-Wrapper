import { useState, useEffect, useCallback, useRef } from 'react'

export function useWorkflow(projectPath) {
  const [workflow, setWorkflow] = useState(null)
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState(null)
  const [hasWorkflow, setHasWorkflow] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  // Load workflow definition and progress
  const loadWorkflow = useCallback(async () => {
    if (!projectPath) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Check if project has workflow
      const has = await window.electronAPI.workflowHasWorkflow(projectPath)
      setHasWorkflow(has)

      if (!has) {
        setWorkflow(null)
        setSteps([])
        setProgress(null)
        setLoading(false)
        return
      }

      // Load workflow definition
      const wf = await window.electronAPI.workflowGetWorkflow(projectPath)
      setWorkflow(wf)

      if (wf && wf.steps) {
        setSteps(wf.steps.map(step => ({
          ...step,
          status: 'pending' // Will be updated from progress
        })))
      }

      // Load progress
      const prog = await window.electronAPI.workflowGetProgress(projectPath)
      setProgress(prog)

      setLoading(false)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }, [projectPath])

  // Initial load
  useEffect(() => {
    loadWorkflow()
  }, [loadWorkflow])

  // Watch for progress changes
  useEffect(() => {
    if (!projectPath || !hasWorkflow) return

    window.electronAPI.workflowWatchProgress(projectPath).then(({ watchId }) => {
      watchIdRef.current = watchId
    })

    const unsub = window.electronAPI.onWorkflowProgressChanged(() => {
      // Reload progress on any change
      window.electronAPI.workflowGetProgress(projectPath).then(prog => {
        setProgress(prog)
      })
    })

    return () => {
      unsub()
      if (watchIdRef.current) {
        window.electronAPI.workflowUnwatchProgress(watchIdRef.current)
      }
    }
  }, [projectPath, hasWorkflow])

  // Get step content
  const getStepContent = useCallback(async (stepFile) => {
    if (!projectPath) return { content: null, error: 'No project path' }
    return window.electronAPI.workflowGetStepContent(projectPath, stepFile)
  }, [projectPath])

  // Save step content
  const saveStepContent = useCallback(async (stepFile, content) => {
    if (!projectPath) return { error: 'No project path' }
    return window.electronAPI.workflowSaveStepContent(projectPath, stepFile, content)
  }, [projectPath])

  // Scaffold workflow for project
  const scaffoldWorkflow = useCallback(async () => {
    if (!projectPath) return { error: 'No project path' }
    const result = await window.electronAPI.workflowScaffold(projectPath)
    if (result.success) {
      await loadWorkflow() // Reload after scaffold
    }
    return result
  }, [projectPath, loadWorkflow])

  // Refresh
  const refresh = useCallback(() => {
    loadWorkflow()
  }, [loadWorkflow])

  return {
    workflow,
    steps,
    progress,
    hasWorkflow,
    loading,
    error,
    getStepContent,
    saveStepContent,
    scaffoldWorkflow,
    refresh
  }
}
