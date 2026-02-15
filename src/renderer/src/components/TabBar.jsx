import React from 'react'

export default function TabBar({ tabs, activeTabId, onSelectTab, onAddTab, onCloseTab }) {
  return (
    <div className="tab-bar">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`tab ${tab.id === activeTabId ? 'tab--active' : ''}`}
          onClick={() => onSelectTab(tab.id)}
        >
          <span className="tab__dot" style={{ background: tab.color }} />
          <span>{tab.name}</span>
          {tabs.length > 1 && (
            <span
              className="tab__close"
              onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id) }}
            >
              &#x2715;
            </span>
          )}
        </button>
      ))}
      <button className="tab tab--add" onClick={onAddTab} title="New Tab">
        +
      </button>
    </div>
  )
}
