"use client";

import { createContext, useContext, useCallback, useMemo, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

type SelectionContextType = {
    selectedFiles: Set<string>;
    selectedFolders: Set<string>;
    toggleFile: (id: string) => void;
    toggleFolder: (id: string) => void;
    selectAllFiles: (ids: string[]) => void;
    selectAllFolders: (ids: string[]) => void;
    clearSelection: () => void;
    selectionCount: number;
    isFileSelected: (id: string) => boolean;
    isFolderSelected: (id: string) => boolean;
};

const SelectionContext = createContext<SelectionContextType | null>(null);

export { SelectionContext };

export function useSelectionState() {
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
    const pathname = usePathname();

    // Clear selection on route change
    useEffect(() => {
        setSelectedFiles(new Set());
        setSelectedFolders(new Set());
    }, [pathname]);

    const toggleFile = useCallback((id: string) => {
        setSelectedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const toggleFolder = useCallback((id: string) => {
        setSelectedFolders((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const selectAllFiles = useCallback((ids: string[]) => {
        setSelectedFiles((prev) => {
            const allSelected = ids.every((id) => prev.has(id));
            if (allSelected) return new Set();
            return new Set(ids);
        });
    }, []);

    const selectAllFolders = useCallback((ids: string[]) => {
        setSelectedFolders((prev) => {
            const allSelected = ids.every((id) => prev.has(id));
            if (allSelected) return new Set();
            return new Set(ids);
        });
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedFiles(new Set());
        setSelectedFolders(new Set());
    }, []);

    const selectionCount = selectedFiles.size + selectedFolders.size;

    const isFileSelected = useCallback((id: string) => selectedFiles.has(id), [selectedFiles]);
    const isFolderSelected = useCallback((id: string) => selectedFolders.has(id), [selectedFolders]);

    return useMemo(
        () => ({
            selectedFiles,
            selectedFolders,
            toggleFile,
            toggleFolder,
            selectAllFiles,
            selectAllFolders,
            clearSelection,
            selectionCount,
            isFileSelected,
            isFolderSelected,
        }),
        [selectedFiles, selectedFolders, toggleFile, toggleFolder, selectAllFiles, selectAllFolders, clearSelection, selectionCount, isFileSelected, isFolderSelected]
    );
}

export function useSelection() {
    const context = useContext(SelectionContext);
    if (!context) {
        throw new Error("useSelection must be used within a SelectionProvider");
    }
    return context;
}
