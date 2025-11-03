/**
 * Drag and Drop Ordering Component - Handles task reordering with drag-and-drop
 */
export class DragDropOrdering {
    config;
    state;
    touchStartPos = null;
    keyboardFocusIndex = -1;
    constructor(config) {
        this.config = {
            dragClass: 'dragging',
            dropZoneClass: 'drop-zone',
            placeholderClass: 'drag-placeholder',
            enableTouch: true,
            enableKeyboard: true,
            ...config
        };
        this.state = {
            isDragging: false,
            draggedItem: null,
            draggedIndex: -1,
            dropIndex: -1,
            placeholder: null
        };
        this.initialize();
    }
    /**
     * Initialize drag and drop functionality
     */
    initialize() {
        this.setupMouseEvents();
        if (this.config.enableTouch) {
            this.setupTouchEvents();
        }
        if (this.config.enableKeyboard) {
            this.setupKeyboardEvents();
        }
        this.createPlaceholder();
    }
    /**
     * Refresh the drag-drop setup (call when items change)
     */
    refresh() {
        this.setupMouseEvents();
    }
    /**
     * Destroy the drag-drop functionality
     */
    destroy() {
        this.config.container.removeEventListener('mousedown', this.handleMouseDown);
        this.config.container.removeEventListener('touchstart', this.handleTouchStart);
        this.config.container.removeEventListener('keydown', this.handleKeyDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
    }
    setupMouseEvents() {
        // Remove existing listeners
        this.config.container.removeEventListener('mousedown', this.handleMouseDown);
        // Add new listeners
        this.config.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    }
    setupTouchEvents() {
        this.config.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    }
    setupKeyboardEvents() {
        this.config.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    handleMouseDown = (e) => {
        const item = this.findDraggableItem(e.target);
        if (!item)
            return;
        // Check if we clicked on the handle (if specified)
        if (this.config.handleSelector) {
            const handle = e.target.closest(this.config.handleSelector);
            if (!handle || !item.contains(handle))
                return;
        }
        e.preventDefault();
        this.startDrag(item, e.clientX, e.clientY);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
    };
    handleMouseMove = (e) => {
        if (!this.state.isDragging)
            return;
        e.preventDefault();
        this.updateDragPosition(e.clientX, e.clientY);
    };
    handleMouseUp = (e) => {
        if (this.state.isDragging) {
            this.endDrag();
        }
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
    };
    handleTouchStart = (e) => {
        if (e.touches.length !== 1)
            return;
        const touch = e.touches[0];
        const item = this.findDraggableItem(touch.target);
        if (!item)
            return;
        // Store initial touch position for gesture detection
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        // Start drag after a short delay to distinguish from scrolling
        setTimeout(() => {
            if (this.touchStartPos) {
                e.preventDefault();
                this.startDrag(item, touch.clientX, touch.clientY);
                document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
                document.addEventListener('touchend', this.handleTouchEnd);
            }
        }, 150);
    };
    handleTouchMove = (e) => {
        if (!this.state.isDragging || e.touches.length !== 1)
            return;
        e.preventDefault();
        const touch = e.touches[0];
        this.updateDragPosition(touch.clientX, touch.clientY);
    };
    handleTouchEnd = (e) => {
        this.touchStartPos = null;
        if (this.state.isDragging) {
            this.endDrag();
        }
        document.removeEventListener('touchmove', this.handleTouchMove);
        document.removeEventListener('touchend', this.handleTouchEnd);
    };
    handleKeyDown = (e) => {
        const items = this.getDraggableItems();
        if (items.length === 0)
            return;
        const focusedItem = document.activeElement;
        const currentIndex = Array.from(items).indexOf(focusedItem.closest(this.config.itemSelector));
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Move item up
                    if (currentIndex > 0) {
                        this.moveItem(currentIndex, currentIndex - 1);
                    }
                }
                else {
                    // Focus previous item
                    this.focusItem(Math.max(0, currentIndex - 1));
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (e.ctrlKey || e.metaKey) {
                    // Move item down
                    if (currentIndex < items.length - 1) {
                        this.moveItem(currentIndex, currentIndex + 1);
                    }
                }
                else {
                    // Focus next item
                    this.focusItem(Math.min(items.length - 1, currentIndex + 1));
                }
                break;
            case 'Home':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Move to top
                    if (currentIndex > 0) {
                        this.moveItem(currentIndex, 0);
                    }
                }
                break;
            case 'End':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    // Move to bottom
                    if (currentIndex < items.length - 1) {
                        this.moveItem(currentIndex, items.length - 1);
                    }
                }
                break;
        }
    };
    findDraggableItem(element) {
        return element.closest(this.config.itemSelector);
    }
    getDraggableItems() {
        return this.config.container.querySelectorAll(this.config.itemSelector);
    }
    getItemId(item) {
        return item.dataset.taskId || item.dataset.itemId || item.id || '';
    }
    getItemIndex(item) {
        const items = this.getDraggableItems();
        return Array.from(items).indexOf(item);
    }
    startDrag(item, x, y) {
        this.state.isDragging = true;
        this.state.draggedItem = item;
        this.state.draggedIndex = this.getItemIndex(item);
        // Add dragging class
        item.classList.add(this.config.dragClass);
        // Add drop zone class to container
        this.config.container.classList.add(this.config.dropZoneClass);
        // Insert placeholder
        if (this.state.placeholder) {
            item.parentNode?.insertBefore(this.state.placeholder, item.nextSibling);
        }
        // Notify drag start
        this.config.onDragStart?.(this.getItemId(item), this.state.draggedIndex);
    }
    updateDragPosition(x, y) {
        if (!this.state.draggedItem || !this.state.placeholder)
            return;
        // Find the item under the cursor
        const elementBelow = document.elementFromPoint(x, y);
        const targetItem = elementBelow ? this.findDraggableItem(elementBelow) : null;
        if (targetItem && targetItem !== this.state.draggedItem) {
            const targetIndex = this.getItemIndex(targetItem);
            const draggedIndex = this.getItemIndex(this.state.draggedItem);
            // Determine insertion point
            const rect = targetItem.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const insertAfter = y > midpoint;
            // Move placeholder
            if (insertAfter) {
                targetItem.parentNode?.insertBefore(this.state.placeholder, targetItem.nextSibling);
            }
            else {
                targetItem.parentNode?.insertBefore(this.state.placeholder, targetItem);
            }
            this.state.dropIndex = insertAfter ? targetIndex + 1 : targetIndex;
            // Adjust for the dragged item's current position
            if (this.state.dropIndex > draggedIndex) {
                this.state.dropIndex--;
            }
        }
    }
    endDrag() {
        if (!this.state.draggedItem || !this.state.isDragging)
            return;
        const draggedItem = this.state.draggedItem;
        const fromIndex = this.state.draggedIndex;
        let toIndex = this.state.dropIndex;
        // Remove dragging classes
        draggedItem.classList.remove(this.config.dragClass);
        this.config.container.classList.remove(this.config.dropZoneClass);
        // Move the actual item if position changed
        if (toIndex >= 0 && toIndex !== fromIndex && this.state.placeholder) {
            this.state.placeholder.parentNode?.insertBefore(draggedItem, this.state.placeholder);
            // Recalculate final index
            toIndex = this.getItemIndex(draggedItem);
            // Notify reorder
            this.config.onReorder?.(fromIndex, toIndex, this.getItemId(draggedItem));
        }
        // Remove placeholder
        if (this.state.placeholder && this.state.placeholder.parentNode) {
            this.state.placeholder.parentNode.removeChild(this.state.placeholder);
        }
        // Notify drag end
        this.config.onDragEnd?.(this.getItemId(draggedItem), toIndex >= 0 ? toIndex : fromIndex);
        // Reset state
        this.state.isDragging = false;
        this.state.draggedItem = null;
        this.state.draggedIndex = -1;
        this.state.dropIndex = -1;
    }
    moveItem(fromIndex, toIndex) {
        const items = this.getDraggableItems();
        if (fromIndex < 0 || fromIndex >= items.length || toIndex < 0 || toIndex >= items.length) {
            return;
        }
        const item = items[fromIndex];
        const targetItem = items[toIndex];
        const itemId = this.getItemId(item);
        // Move DOM element
        if (toIndex > fromIndex) {
            targetItem.parentNode?.insertBefore(item, targetItem.nextSibling);
        }
        else {
            targetItem.parentNode?.insertBefore(item, targetItem);
        }
        // Focus the moved item
        this.focusItem(toIndex);
        // Notify reorder
        this.config.onReorder?.(fromIndex, toIndex, itemId);
    }
    focusItem(index) {
        const items = this.getDraggableItems();
        if (index >= 0 && index < items.length) {
            const item = items[index];
            item.focus();
            this.keyboardFocusIndex = index;
        }
    }
    createPlaceholder() {
        this.state.placeholder = document.createElement('div');
        this.state.placeholder.className = this.config.placeholderClass;
        this.state.placeholder.innerHTML = '<div class="placeholder-content">Drop here</div>';
    }
}
