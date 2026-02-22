import { useState, useCallback, useEffect, useRef } from 'react'

export default function WelcomeScreen({ recentProjects, onSelectProject, onOpenFolder, onCreateProject }) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef(null)

  const filtered = recentProjects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
  })

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filtered.length > 0) {
      e.preventDefault()
      onSelectProject(filtered[selectedIndex].path)
    }
  }, [filtered, selectedIndex, onSelectProject])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex]
    if (item) item.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  return (
    <div className="welcome-screen">
      <div className="welcome-screen__card">
        <div className="welcome-screen__header">
          <h1 className="welcome-screen__title">Claude Terminal</h1>
          <p className="welcome-screen__subtitle">Select a project to get started</p>
        </div>

        <div className="welcome-screen__actions">
          <button className="welcome-screen__btn welcome-screen__btn--primary" onClick={onOpenFolder}>
            <span className="welcome-screen__btn-icon">&#x1F4C2;</span>
            Open Project
          </button>
          <button className="welcome-screen__btn welcome-screen__btn--secondary" onClick={onCreateProject}>
            <span className="welcome-screen__btn-icon">+</span>
            Create New Project
          </button>
        </div>

        {recentProjects.length > 0 && (
          <div className="welcome-screen__recent">
            <div className="welcome-screen__recent-header">Recent Projects</div>
            <input
              className="welcome-screen__search"
              type="text"
              placeholder="Search recent projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="welcome-screen__list" ref={listRef}>
              {filtered.length === 0 ? (
                <div className="welcome-screen__empty">No matching projects</div>
              ) : (
                filtered.map((project, i) => (
                  <button
                    key={project.path}
                    className={`welcome-screen__project ${i === selectedIndex ? 'welcome-screen__project--selected' : ''}`}
                    onClick={() => onSelectProject(project.path)}
                    onMouseEnter={() => setSelectedIndex(i)}
                  >
                    <span className="welcome-screen__project-name">{project.name}</span>
                    <span className="welcome-screen__project-path">{project.path}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
