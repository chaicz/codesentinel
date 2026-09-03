/**
 * ============================================================================
 * FILE: ProjectManager.tsx
 * TYPE: Project Management / File Organization Component
 * ============================================================================
 * 
 * PURPOSE:
 * Allows users to create, organize, and manage multiple projects with
 * multiple source files. Provides import/export functionality.
 * 
 * DESIGN NOTES:
 * - Modal overlay design with dark theme
 * - Expandable project tree view
 * - Context menu for quick actions
 * - Local storage persistence (no backend required)
 * 
 * BACKEND INTEGRATION:
 * - NO BACKEND REQUIRED: All data stored in localStorage
 * - Uses STORAGE_KEY = 'sentinel_projects' and CURRENT_PROJECT_KEY
 * - Export formats: ZIP (via JSZip CDN), JSON backup
 * - Import: JSON project files
 * 
 * KEY PROPS:
 * - isOpen, onClose: Modal visibility control
 * - currentFile: Currently open file in editor
 * - onLoadProject: Callback to load project into workspace
 * 
 * DATA STRUCTURE (stored in localStorage):
 * - Project: { id, name, description, files[], createdAt, updatedAt }
 * - ProjectFile: { id, name, language, content }
 * 
 * EXPORT FEATURES:
 * - Single file download (.py, .js, etc.)
 * - Entire project as .zip archive
 * - All projects as JSON backup
 * 
 * HELPER FUNCTIONS:
 * - getExtension(): Extract file extension
 * - extensionToLanguage(): Map extension to Monaco language ID
 * - getStarterCode(): Get boilerplate code for new files
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  FolderPlus, 
  FilePlus, 
  Download, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  File,
  Folder,
  MoreVertical,
  Copy,
  Upload,
  Settings,
  ExternalLink
} from 'lucide-react';
import { Project, ProjectFile } from '../types';

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentFile: { name: string; language: string; content: string } | null;
  onLoadProject: (project: Project) => void;
}

const STORAGE_KEY = 'sentinel_projects';
const CURRENT_PROJECT_KEY = 'sentinel_current_project';

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  isOpen,
  onClose,
  currentFile,
  onLoadProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingFile, setIsCreatingFile] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; projectId: string; fileId?: string } | null>(null);

  // Load projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch {
        setProjects([]);
      }
    }
    const current = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (current) {
      setActiveProjectId(current);
    }
  }, []);

  // Save projects to localStorage
  const saveProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newProjects));
  }, []);

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Create new project
  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const project: Project = {
      id: `proj_${Date.now()}`,
      name: newProjectName.trim(),
      description: '',
      files: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProjects([...projects, project]);
    setNewProjectName('');
    setIsCreatingProject(false);
    setActiveProjectId(project.id);
    localStorage.setItem(CURRENT_PROJECT_KEY, project.id);
  };

  // Create new file in project
  const handleCreateFile = (projectId: string) => {
    if (!newFileName.trim()) return;

    const fileExtension = getExtension(newFileName);
    const file: ProjectFile = {
      id: `file_${Date.now()}`,
      name: newFileName.trim(),
      language: extensionToLanguage(fileExtension),
      content: getStarterCode(fileExtension),
    };

    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          files: [...p.files, file],
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });

    saveProjects(updatedProjects);
    setNewFileName('');
    setIsCreatingFile(null);
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    const updatedProjects = projects.filter((p) => p.id !== projectId);
    saveProjects(updatedProjects);
    if (activeProjectId === projectId) {
      setActiveProjectId(null);
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
    setContextMenu(null);
  };

  // Delete file from project
  const handleDeleteFile = (projectId: string, fileId: string) => {
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          files: p.files.filter((f) => f.id !== fileId),
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveProjects(updatedProjects);
    setContextMenu(null);
  };

  // Export single file (local download)
  const exportFile = (file: ProjectFile) => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  // Export entire project as ZIP (using JSZip)
  const exportProjectAsZip = async (project: Project) => {
    try {
      // Dynamically load JSZip
      if (!(window as any).JSZip) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(script);
        await new Promise((resolve) => (script.onload = resolve));
      }

      const JSZip = (window as any).JSZip;
      const zip = new JSZip();
      
      // Create folder structure
      const folder = zip.folder(project.name);
      if (folder) {
        project.files.forEach((file) => {
          folder.file(file.name, file.content);
        });
        
        // Add README if no files
        if (project.files.length === 0) {
          folder.file('README.txt', `${project.name}\n\nNo files in this project.`);
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export project:', err);
      // Fallback: export as JSON
      const projectJson = JSON.stringify(project, null, 2);
      const blob = new Blob([projectJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${project.name}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
    setShowExportMenu(null);
  };

  // Export all projects as JSON backup
  const exportAllProjects = () => {
    const data = JSON.stringify(projects, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentinel-projects-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(null);
  };

  // Import projects from JSON
  const importProjects = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const merged = [...projects, ...imported];
          saveProjects(merged);
        }
      } catch {
        alert('Invalid project file format');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Load project into editor
  const handleLoadProject = (project: Project) => {
    onLoadProject(project);
    onClose();
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-12 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div 
        className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-dim)' }}
            >
              <Folder className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Project Manager
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {projects.length} projects · {projects.reduce((acc, p) => acc + p.files.length, 0)} files
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={importProjects} className="hidden" />
            </label>
            <button
              onClick={exportAllProjects}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Create Project Form */}
        {isCreatingProject && (
          <div 
            className="px-6 py-4"
            style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Project name..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                className="flex-1 px-3 py-2 rounded-lg text-sm"
                style={{ 
                  backgroundColor: 'var(--bg-base)', 
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={handleCreateProject}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                Create
              </button>
              <button
                onClick={() => { setIsCreatingProject(false); setNewProjectName(''); }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Projects List */}
        <div className="max-h-[400px] overflow-y-auto">
          {projects.length === 0 && !isCreatingProject && (
            <div className="px-6 py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                <FolderPlus className="w-6 h-6" style={{ color: 'var(--text-muted)' }} />
              </div>
              <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>No projects yet</h3>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>Create a project to organize your programs</p>
              <button
                onClick={() => setIsCreatingProject(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ backgroundColor: 'var(--accent)', color: 'white' }}
              >
                <FolderPlus className="w-4 h-4" />
                Create Project
              </button>
            </div>
          )}

          {projects.map((project) => (
            <div key={project.id} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {/* Project Header */}
              <div 
                className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-[var(--bg-elevated)]"
                onClick={() => toggleProject(project.id)}
              >
                <div className="flex items-center gap-3">
                  <button className="p-1">
                    {expandedProjects.has(project.id) ? (
                      <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    ) : (
                      <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                  <Folder className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  <div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {project.name}
                    </span>
                    <span className="ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {project.files.length} file{project.files.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsCreatingFile(project.id); }}
                    className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-muted)' }}
                    title="Add file"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowExportMenu(showExportMenu === project.id ? null : project.id); }}
                      className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                      style={{ color: 'var(--text-muted)' }}
                      title="Export"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {showExportMenu === project.id && (
                      <div 
                        className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[140px]"
                        style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                      >
                        <button
                          onClick={() => exportProjectAsZip(project)}
                          className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Export as .zip
                        </button>
                        <button
                          onClick={() => exportFile({ id: 'backup', name: `${project.name}.json`, language: 'json', content: JSON.stringify(project, null, 2) })}
                          className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          Export as JSON
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, projectId: project.id }); }}
                    className="p-1.5 rounded hover:bg-[var(--bg-hover)]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Files List */}
              {expandedProjects.has(project.id) && (
                <div className="pl-14 pr-6 pb-3 space-y-1">
                  {/* Create File Form */}
                  {isCreatingFile === project.id && (
                    <div className="flex items-center gap-2 py-1">
                      <File className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="filename.py"
                        value={newFileName}
                        onChange={(e) => setNewFileName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateFile(project.id)}
                        className="flex-1 px-2 py-1 text-xs rounded"
                        style={{ backgroundColor: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
                        autoFocus
                      />
                      <button onClick={() => handleCreateFile(project.id)} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>Add</button>
                      <button onClick={() => { setIsCreatingFile(null); setNewFileName(''); }} className="text-xs px-2 py-1" style={{ color: 'var(--text-muted)' }}>Cancel</button>
                    </div>
                  )}

                  {project.files.length === 0 && isCreatingFile !== project.id && (
                    <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>No files yet. Click + to add one.</p>
                  )}

                  {project.files.map((file) => (
                    <div 
                      key={file.id}
                      className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-[var(--bg-elevated)] group"
                    >
                      <div className="flex items-center gap-2">
                        <File className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{file.name}</span>
                        <span className="text-[10px] px-1 rounded" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)' }}>
                          {file.language}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => handleLoadProject({ ...project, files: [file] })}
                          className="p-1 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--accent)' }}
                          title="Open file"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => exportFile(file)}
                          className="p-1 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--text-muted)' }}
                          title="Download file"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(project.id, file.id)}
                          className="p-1 rounded hover:bg-[var(--bg-hover)]"
                          style={{ color: 'var(--error)' }}
                          title="Delete file"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            onClick={() => setIsCreatingProject(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: 'white' }}
          >
            <FolderPlus className="w-4 h-4" />
            New Project
          </button>
          
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Files are stored locally on your device
          </p>
        </div>

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="fixed py-1 rounded-lg shadow-lg z-50 min-w-[160px]"
            style={{ 
              left: contextMenu.x, 
              top: contextMenu.y,
              backgroundColor: 'var(--bg-elevated)', 
              border: '1px solid var(--border)' 
            }}
          >
            <button
              onClick={() => { handleLoadProject(projects.find(p => p.id === contextMenu.projectId)!); setContextMenu(null); }}
              className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] flex items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Project
            </button>
            <button
              onClick={() => exportProjectAsZip(projects.find(p => p.id === contextMenu.projectId)!)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] flex items-center gap-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <Download className="w-3.5 h-3.5" />
              Export Project
            </button>
            <div className="my-1" style={{ borderTop: '1px solid var(--border)' }} />
            <button
              onClick={() => handleDeleteProject(contextMenu.projectId)}
              className="w-full px-3 py-2 text-xs text-left hover:bg-[var(--bg-hover)] flex items-center gap-2"
              style={{ color: 'var(--error)' }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

function extensionToLanguage(ext: string): string {
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', ts: 'typescript', tsx: 'typescript',
    c: 'c', cpp: 'cpp', h: 'c', java: 'java', cs: 'csharp',
    go: 'go', rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift',
    kt: 'kotlin', scala: 'scala', sh: 'bash', bash: 'bash',
    sql: 'sql', html: 'html', css: 'css', json: 'json', xml: 'xml',
    yaml: 'yaml', yml: 'yaml', md: 'markdown', txt: 'plaintext',
    dockerfile: 'dockerfile',
  };
  return map[ext] || 'plaintext';
}

function getStarterCode(ext: string): string {
  const starters: Record<string, string> = {
    py: '# Python file\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n',
    js: '// JavaScript file\n\nconsole.log("Hello, World!");\n',
    ts: '// TypeScript file\n\nfunction main(): void {\n    console.log("Hello, World!");\n}\n\nmain();\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n',
    rust: 'fn main() {\n    println!("Hello, World!");\n}\n',
    html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n',
    css: '/* CSS Styles */\n\n.element {\n    /* styles */\n}\n',
    json: '{\n    \n}\n',
    sql: '-- SQL Query\n\nSELECT * FROM table_name;\n',
    yaml: '# YAML Configuration\n\nkey: value\n',
    md: '# Title\n\nContent here.\n',
    sh: '#!/bin/bash\n\necho "Hello, World!"\n',
  };
  return starters[ext] || '// New file\n\n';
}
