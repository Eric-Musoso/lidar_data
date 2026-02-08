import { useState, useCallback } from 'react';
import './UrlInput.css';

interface Props {
    onUrlSubmit: (url: string) => void;
    loading: boolean;
}

export default function UrlInput({ onUrlSubmit, loading }: Props) {
    const [url, setUrl] = useState('');

    const handleSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onUrlSubmit(url.trim());
            setUrl(''); // Clear input after submit
        }
    }, [url, onUrlSubmit]);

    return (
        <form onSubmit={handleSubmit} className="url-input-form">
            <input
                type="text"
                className="url-input"
                placeholder="Enter .laz URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
            />
            <button type="submit" className="url-submit-button" disabled={loading || !url.trim()}>
                Load
            </button>
        </form>
    );
}
