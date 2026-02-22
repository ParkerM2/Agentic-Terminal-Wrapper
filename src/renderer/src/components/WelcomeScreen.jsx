import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'

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
    <div data-slot="welcome-screen" className="flex items-center justify-center h-full bg-background/50 p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Claude Terminal</CardTitle>
          <CardDescription>Select a project to get started</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex gap-3">
            <Button className="flex-1 gap-2" onClick={onOpenFolder}>
              <span>&#x1F4C2;</span>
              Open Project
            </Button>
            <Button variant="secondary" className="flex-1 gap-2" onClick={onCreateProject}>
              <span>+</span>
              Create New Project
            </Button>
          </div>

          {recentProjects.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Recent Projects</h3>
              <Input
                type="text"
                placeholder="Search recent projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <ScrollArea className="max-h-64">
                <div className="space-y-1" ref={listRef}>
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No matching projects</p>
                  ) : (
                    filtered.map((project, i) => (
                      <button
                        key={project.path}
                        className={cn(
                          'w-full flex flex-col items-start gap-0.5 px-3 py-2 rounded-md text-left hover:bg-accent transition-colors',
                          i === selectedIndex && 'bg-accent'
                        )}
                        onClick={() => onSelectProject(project.path)}
                        onMouseEnter={() => setSelectedIndex(i)}
                      >
                        <span className="text-sm font-medium text-foreground">{project.name}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-full">{project.path}</span>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
