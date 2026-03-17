"use client";

import { SelectionContext, useSelectionState } from "@/hooks/use-selection";

export default function SelectionProvider({ children }: { children: React.ReactNode }) {
    const selectionState = useSelectionState();

    return (
        <SelectionContext.Provider value={selectionState}>
            {children}
        </SelectionContext.Provider>
    );
}
