import React from 'react'
import { Panel, Group, Separator } from 'react-resizable-panels'
import TerminalPane from './TerminalPane'

export default function PaneContainer({ panes, onClosePane, cwd, onPaneActivate, direction, fontSize, autoStart, claudeState }) {
  if (panes.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--fg-dim)'
      }}>
        No panes open. Click "Split H" or "Split V" to add one.
      </div>
    )
  }

  if (panes.length === 1) {
    return (
      <TerminalPane
        pane={panes[0]}
        onClose={onClosePane}
        cwd={cwd}
        canClose={false}
        onActivate={() => onPaneActivate?.(panes[0].id)}
        fontSize={fontSize}
        autoStart={autoStart}
        claudeState={claudeState}
      />
    )
  }

  return (
    <Group direction={direction || 'horizontal'} style={{ height: '100%' }}>
      {panes.map((pane, i) => (
        <React.Fragment key={pane.id}>
          {i > 0 && <Separator />}
          <Panel minSize={15}>
            <TerminalPane
              pane={pane}
              onClose={onClosePane}
              cwd={cwd}
              canClose={panes.length > 1}
              onActivate={() => onPaneActivate?.(pane.id)}
              fontSize={fontSize}
              autoStart={autoStart}
              claudeState={claudeState}
            />
          </Panel>
        </React.Fragment>
      ))}
    </Group>
  )
}
