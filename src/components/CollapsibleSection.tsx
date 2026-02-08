import { useState, ReactNode } from 'react';
import './CollapsibleSection.css';

interface Props {
  title: string;
  children: ReactNode;
  initialExpanded?: boolean;
}

export default function CollapsibleSection({ title, children, initialExpanded = true }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded);

  return (
    <div className={`collapsible-section ${expanded ? 'expanded' : 'collapsed'}`}>
      <button className="section-header" onClick={() => setExpanded(!expanded)}>
        <span className="section-title">{title}</span>
        <span className="section-icon">{expanded ? '▼' : '▶'}</span>
      </button>
      {expanded && <div className="section-content">{children}</div>}
    </div>
  );
}
