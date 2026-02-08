import { useState, useCallback } from 'react';
import './FileDropZone.css';

interface Props {
    onFileSelect: (file: File) => void;
    loading: boolean;
}

export default function FileDropZone({ onFileSelect, loading }: Props) {
    const [isDragActive, setIsDragActive] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        if (!loading) setIsDragActive(true);
    }, [loading]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragActive(false);

        if (loading) return;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            // Basic check for file extension?
            // For now, accept anything, the loader will try to parse.
            //  if (file.name.toLowerCase().endsWith('.laz') || file.name.toLowerCase().endsWith('.las')) {
            onFileSelect(file);
            //  } else {
            //     alert('Please select a .las or .laz file.');
            //  }
        }
    }, [loading, onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFileSelect(e.target.files[0]);
        }
    }, [onFileSelect]);

    return (
        <div
            className={`drop-zone ${isDragActive ? 'active' : ''} ${loading ? 'disabled' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                id="file-upload"
                className="file-input"
                accept=".las,.laz"
                onChange={handleFileInput}
                disabled={loading}
            />
            <label htmlFor="file-upload" className="drop-label">
                {loading ? (
                    <span>Loading...</span>
                ) : (
                    <>
                        <span className="drop-icon">📁</span>
                        <span>Drag & drop .laz file or click to browse</span>
                    </>
                )}
            </label>
        </div>
    );
}
