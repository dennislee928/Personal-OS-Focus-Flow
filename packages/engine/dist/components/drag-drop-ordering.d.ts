/**
 * Drag and Drop Ordering Component - Handles task reordering with drag-and-drop
 */
export interface DragDropConfig {
    container: HTMLElement;
    itemSelector: string;
    handleSelector?: string;
    dragClass?: string;
    dropZoneClass?: string;
    placeholderClass?: string;
    enableTouch?: boolean;
    enableKeyboard?: boolean;
    onReorder?: (fromIndex: number, toIndex: number, itemId: string) => void;
    onDragStart?: (itemId: string, index: number) => void;
    onDragEnd?: (itemId: string, index: number) => void;
}
export interface DragDropState {
    isDragging: boolean;
    draggedItem: HTMLElement | null;
    draggedIndex: number;
    dropIndex: number;
    placeholder: HTMLElement | null;
}
export declare class DragDropOrdering {
    private config;
    private state;
    private touchStartPos;
    private keyboardFocusIndex;
    private longPressTimer;
    private longPressDelay;
    constructor(config: DragDropConfig);
    /**
     * Initialize drag and drop functionality
     */
    private initialize;
    /**
     * Refresh the drag-drop setup (call when items change)
     */
    refresh(): void;
    /**
     * Destroy the drag-drop functionality
     */
    destroy(): void;
    private setupMouseEvents;
    private setupTouchEvents;
    private setupKeyboardEvents;
    private handleMouseDown;
    private handleMouseMove;
    private handleMouseUp;
    private handleTouchStart;
    private handleTouchMoveEarly;
    private handleTouchEndEarly;
    private cancelLongPress;
    private handleTouchMove;
    private handleTouchEnd;
    private handleKeyDown;
    private findDraggableItem;
    private getDraggableItems;
    private getItemId;
    private getItemIndex;
    private startDrag;
    private addDragVisualIndicators;
    private removeDragVisualIndicators;
    private updateDragVisualPosition;
    private updatePlaceholderContent;
    private getPlaceholderIndex;
    private updateDragPosition;
    private endDrag;
    private moveItem;
    private announceMove;
    private focusItem;
    private createPlaceholder;
}
